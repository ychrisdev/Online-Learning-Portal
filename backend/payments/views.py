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
from .models import Transaction
from django.db.models.functions import TruncMonth

from accounts.permissions import IsAdminUser, IsInstructor
from courses.models import Course
from enrollments.models import Enrollment
from .models import Transaction
from .serializers import (
    AdminTransactionSerializer,
    InitiatePaymentSerializer,
    TransactionSerializer,
    AdminTransactionDetailSerializer
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

        # Chỉ chặn nếu đang active hoặc completed, cho phép đăng ký lại nếu refunded/cancelled
        if request.user.enrollments.filter(course=course, status__in=['active', 'completed']).exists():
            return Response(
                {'detail': 'Bạn đã đăng ký khoá học này rồi.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        method   = serializer.validated_data['method']
        ref_code = f'TXN-{str(uuid.uuid4())[:12].upper()}'

        transaction = Transaction.objects.create(
            student  = request.user,
            course   = course,
            amount   = course.sale_price,
            method   = method,
            ref_code = ref_code,
        )

        # Khoá học miễn phí → kích hoạt ngay
        if course.sale_price == 0:
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

#signal thay hàm cũ
def _activate_enrollment(transaction: Transaction):
    """Signal payments/signals.py sẽ tự tạo Enrollment + cập nhật total_students.
    Hàm này chỉ cần đảm bảo status=SUCCESS được lưu để trigger signal."""
    if transaction.status != Transaction.Status.SUCCESS:
        transaction.status  = Transaction.Status.SUCCESS
        transaction.paid_at = transaction.paid_at or timezone.now()
        transaction.save(update_fields=['status', 'paid_at'])


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
        return Response({'message': 'Hoàn tiền thành công.'})

# THÊM VÀO CUỐI — học viên yêu cầu hoàn tiền
class RequestRefundView(APIView):
    """
    POST /api/payments/<id>/request-refund/
    Học viên yêu cầu hoàn tiền — chỉ được khi status=success
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        transaction = generics.get_object_or_404(
            Transaction,
            id=id,
            student=request.user,
            status=Transaction.Status.SUCCESS,
        )
        reason = request.data.get('reason', '')
        transaction.status = Transaction.Status.REFUND_REQUESTED
        transaction.refund_reason = reason
        transaction.save()
        return Response({'message': 'Yêu cầu hoàn tiền đã được gửi.'})


# THÊM VÀO CUỐI — admin duyệt hoàn tiền
class AdminApproveRefundView(APIView):
    """
    POST /api/payments/admin/<id>/approve-refund/
    Admin duyệt hoàn tiền
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, id):
        transaction = generics.get_object_or_404(
            Transaction,
            id=id,
            status=Transaction.Status.REFUND_REQUESTED,
        )
        transaction.status = Transaction.Status.REFUNDED
        transaction.save()
        return Response({'message': 'Đã duyệt hoàn tiền.'})


# THÊM VÀO CUỐI — admin từ chối hoàn tiền
class AdminRejectRefundView(APIView):
    """
    POST /api/payments/admin/<id>/reject-refund/
    Admin từ chối yêu cầu hoàn tiền → trả về success
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, id):
        transaction = generics.get_object_or_404(
            Transaction,
            id=id,
            status=Transaction.Status.REFUND_REQUESTED,
        )
        transaction.status = Transaction.Status.SUCCESS
        transaction.note   = request.data.get('reason', '')
        transaction.save()
        return Response({'message': 'Đã từ chối yêu cầu hoàn tiền.'})
    
class InstructorRevenueMonthlyView(APIView):
    def get(self, request):
        user = request.user

        # Lượt đăng ký có phí (qua payment)
        paid_qs = (
            Transaction.objects
            .filter(course__instructor=user, status='success')
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(revenue=Sum('amount'), enrollments=Count('id'))
            .order_by('month')
        )
        paid_map = {
            item['month']: {'revenue': item['revenue'] or 0, 'enrollments': item['enrollments']}
            for item in paid_qs
        }

        # Lượt đăng ký miễn phí (qua enrollment trực tiếp)
        free_qs = (
            Enrollment.objects
            .filter(
                course__instructor=user,
                course__price=0,  # ← đổi sale_price thành price
                status__in=['active', 'completed']
            )
            .annotate(month=TruncMonth('enrolled_at'))
            .values('month')
            .annotate(enrollments=Count('id'))
            .order_by('month')
        )
        for item in free_qs:
            m = item['month']
            if m in paid_map:
                paid_map[m]['enrollments'] += item['enrollments']
            else:
                paid_map[m] = {'revenue': 0, 'enrollments': item['enrollments']}

        # Sắp xếp theo tháng
        data = [
            {
                "month": month.strftime("%m/%Y"),
                "revenue": val['revenue'],
                "enrollments": val['enrollments'],
            }
            for month, val in sorted(paid_map.items())
        ]
        return Response(data)
      
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from .models import Transaction

@api_view(['GET'])
def revenue_stats(request):
    # Tổng doanh thu
    total = Transaction.objects.filter(status='success').aggregate(
        total=Sum('amount')
    )['total'] or 0

    # Doanh thu theo tháng
    monthly = (
        Transaction.objects
        .filter(status='success', paid_at__isnull=False)
        .annotate(month=TruncMonth('paid_at'))
        .values('month')
        .annotate(total=Sum('amount'))
        .order_by('month')
    )

    return Response({
        "total_revenue": total,
        "monthly_revenue": monthly
    })

class AdminTransactionDetailView(generics.RetrieveAPIView):
    """
    GET /api/payments/admin/<id>/
    Admin xem chi tiết 1 giao dịch
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class   = AdminTransactionDetailSerializer   # import thêm bên dưới
    lookup_field       = 'id'

    def get_queryset(self):
        return Transaction.objects.all().select_related('student', 'course')
    
class InstructorTransactionListView(generics.ListAPIView):
    serializer_class   = AdminTransactionSerializer  # dùng lại serializer admin
    permission_classes = [IsAuthenticated, IsInstructor]

    def get_queryset(self):
        return Transaction.objects.filter(
            course__instructor=self.request.user
        ).select_related('student', 'course').order_by('-created_at')


class InstructorTransactionDetailView(generics.RetrieveAPIView):
    serializer_class   = AdminTransactionDetailSerializer  
    permission_classes = [IsAuthenticated, IsInstructor]
    lookup_field       = 'id'

    def get_queryset(self):
        return Transaction.objects.filter(
            course__instructor=self.request.user
        ).select_related('student', 'course')