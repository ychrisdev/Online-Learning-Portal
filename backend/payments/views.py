"""
payments/views.py
"""
import uuid
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminUser
from courses.models import Course
from enrollments.models import Enrollment
from .models import Transaction
from .serializers import (
    AdminTransactionSerializer,
    InitiatePaymentSerializer,
    TransactionSerializer,
)


# ── Student ───────────────────────────────────────────────────────────────────

class InitiatePaymentView(APIView):
    """
    POST /api/payments/initiate/
    Tạo transaction pending và trả về thông tin để redirect sang gateway — 5.1.5

    Với khoá học FREE (price=0): tự động kích hoạt enrollment luôn.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InitiatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course = generics.get_object_or_404(Course, id=serializer.validated_data['course_id'])

        # Kiểm tra đã enrolled chưa
        if request.user.enrollments.filter(course=course).exists():
            return Response(
                {'detail': 'Bạn đã đăng ký khoá học này rồi.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        method   = serializer.validated_data['method']
        ref_code = f'TXN-{str(uuid.uuid4())[:12].upper()}'

        transaction = Transaction.objects.create(
            student  = request.user,
            course   = course,
            amount   = course.price,
            method   = method,
            ref_code = ref_code,
        )

        # Khoá học miễn phí → kích hoạt ngay
        if course.price == 0:
            _activate_enrollment(transaction)
            return Response(
                {
                    'message'     : 'Đăng ký khoá học miễn phí thành công.',
                    'transaction' : TransactionSerializer(transaction).data,
                },
                status=status.HTTP_201_CREATED,
            )

        # Trả về ref_code để frontend redirect sang gateway
        return Response(
            {
                'ref_code'   : ref_code,
                'amount'     : course.price,
                'course'     : course.title,
                'transaction': TransactionSerializer(transaction).data,
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentCallbackView(APIView):
    """
    POST /api/payments/callback/
    Gateway gọi về sau khi xử lý thanh toán.
    Body: { ref_code, gateway_ref, result: 'success' | 'failed' }

    Trong thực tế cần xác thực chữ ký (HMAC) từ gateway.
    """
    permission_classes = []   # gateway không gửi JWT

    def post(self, request):
        ref_code    = request.data.get('ref_code')
        gateway_ref = request.data.get('gateway_ref', '')
        result      = request.data.get('result')

        transaction = generics.get_object_or_404(
            Transaction, ref_code=ref_code, status=Transaction.Status.PENDING
        )

        if result == 'success':
            transaction.status      = Transaction.Status.SUCCESS
            transaction.gateway_ref = gateway_ref
            transaction.paid_at     = timezone.now()
            transaction.save()
            _activate_enrollment(transaction)
        else:
            transaction.status      = Transaction.Status.FAILED
            transaction.gateway_ref = gateway_ref
            transaction.save()

        return Response({'message': 'Callback nhận thành công.'})


def _activate_enrollment(transaction: Transaction):
    """Tạo hoặc kích hoạt Enrollment sau khi thanh toán thành công."""
    transaction.status  = Transaction.Status.SUCCESS
    transaction.paid_at = transaction.paid_at or timezone.now()
    transaction.save(update_fields=['status', 'paid_at'])

    Enrollment.objects.get_or_create(
        student = transaction.student,
        course  = transaction.course,
        defaults={
            'status'      : Enrollment.Status.ACTIVE,
            'paid_amount' : transaction.amount,
        },
    )

    # Cập nhật total_students
    course = transaction.course
    course.total_students = course.enrollments.filter(
        status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED]
    ).count()
    course.save(update_fields=['total_students'])


class MyTransactionListView(generics.ListAPIView):
    """
    GET /api/payments/history/
    Lịch sử giao dịch của học viên — 5.1.5
    """
    serializer_class   = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Transaction.objects
            .filter(student=self.request.user)
            .select_related('course')
            .order_by('-created_at')
        )


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminTransactionListView(generics.ListAPIView):
    """
    GET /api/payments/admin/
    Admin xem toàn bộ giao dịch, lọc theo status — 5.3.3
    """
    serializer_class   = AdminTransactionSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs = Transaction.objects.all().select_related('student', 'course').order_by('-created_at')
        s  = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        return qs


class AdminRevenueStatsView(APIView):
    """
    GET /api/payments/admin/stats/
    Thống kê doanh thu — 5.3.3
    Trả về: tổng doanh thu, số giao dịch thành công, theo tháng (12 tháng gần nhất)
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        from django.db.models.functions import TruncMonth

        success_qs = Transaction.objects.filter(status=Transaction.Status.SUCCESS)

        total_revenue = success_qs.aggregate(total=Sum('amount'))['total'] or 0
        total_txn     = success_qs.count()
        total_students = Enrollment.objects.filter(
            status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED]
        ).values('student').distinct().count()
        total_courses  = Course.objects.filter(status=Course.Status.PUBLISHED).count()

        monthly = (
            success_qs
            .annotate(month=TruncMonth('paid_at'))
            .values('month')
            .annotate(revenue=Sum('amount'), count=Count('id'))
            .order_by('-month')[:12]
        )

        return Response({
            'total_revenue' : total_revenue,
            'total_txn'     : total_txn,
            'total_students': total_students,
            'total_courses' : total_courses,
            'monthly'       : list(monthly),
        })


class AdminRefundView(APIView):
    """
    POST /api/payments/admin/<id>/refund/
    Admin hoàn tiền — cập nhật Transaction + Enrollment cùng lúc.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, id):
        transaction = generics.get_object_or_404(
            Transaction, id=id, status=Transaction.Status.SUCCESS
        )
        transaction.status = Transaction.Status.REFUNDED
        transaction.save()

        # Đồng bộ Enrollment
        Enrollment.objects.filter(
            student=transaction.student,
            course=transaction.course,
        ).update(status=Enrollment.Status.REFUNDED)

        return Response({'message': 'Hoàn tiền thành công.'})