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
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InitiatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course = generics.get_object_or_404(Course, id=serializer.validated_data['course_id'])

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

        if course.price == 0:
            _activate_enrollment(transaction)
            return Response(
                {
                    'message'     : 'Đăng ký khoá học miễn phí thành công.',
                    'transaction' : TransactionSerializer(transaction).data,
                },
                status=status.HTTP_201_CREATED,
            )

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
    """
    permission_classes = []

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
    if transaction.status != Transaction.Status.SUCCESS:
        transaction.status  = Transaction.Status.SUCCESS
        transaction.paid_at = transaction.paid_at or timezone.now()
        transaction.save(update_fields=['status', 'paid_at'])


class MyTransactionListView(generics.ListAPIView):
    """
    GET /api/payments/history/
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


class RequestRefundView(APIView):
    """
    POST /api/payments/<id>/request-refund/
    Học viên yêu cầu hoàn tiền cho giao dịch SUCCESS của chính mình.
    Body (optional): { "reason": "Lý do hoàn tiền" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        transaction = generics.get_object_or_404(
            Transaction,
            id=id,
            student=request.user,
            status=Transaction.Status.SUCCESS,
        )
        reason = request.data.get('reason', '').strip()
        transaction.status        = Transaction.Status.REFUND_REQUESTED
        transaction.refund_reason = reason
        transaction.save(update_fields=['status', 'refund_reason'])

        return Response({'message': 'Yêu cầu hoàn tiền đã được gửi.'})


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminTransactionListView(generics.ListAPIView):
    """
    GET /api/payments/admin/
    Lọc theo status, ví dụ: ?status=refund_requested
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
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        from django.db.models.functions import TruncMonth

        success_qs = Transaction.objects.filter(status=Transaction.Status.SUCCESS)

        total_revenue  = success_qs.aggregate(total=Sum('amount'))['total'] or 0
        total_txn      = success_qs.count()
        total_students = Enrollment.objects.filter(
            status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED]
        ).values('student').distinct().count()
        total_courses  = Course.objects.filter(status=Course.Status.PUBLISHED).count()

        # Số yêu cầu hoàn tiền đang chờ
        pending_refunds = Transaction.objects.filter(
            status=Transaction.Status.REFUND_REQUESTED
        ).count()

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
            'pending_refunds': pending_refunds,
            'monthly'       : list(monthly),
        })


class AdminRefundView(APIView):
    """
    POST /api/payments/admin/<id>/refund/
    Admin duyệt hoàn tiền — chấp nhận cả SUCCESS lẫn REFUND_REQUESTED.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, id):
        transaction = generics.get_object_or_404(
            Transaction,
            id=id,
            status__in=[
                Transaction.Status.SUCCESS,
                Transaction.Status.REFUND_REQUESTED,
            ],
        )
        transaction.status = Transaction.Status.REFUNDED
        transaction.save(update_fields=['status'])

        Enrollment.objects.filter(
            student=transaction.student,
            course=transaction.course,
        ).update(status=Enrollment.Status.REFUNDED)

        return Response({'message': 'Hoàn tiền thành công.'})


class AdminRejectRefundView(APIView):
    """
    POST /api/payments/admin/<id>/reject-refund/
    Admin từ chối yêu cầu hoàn tiền → trả về SUCCESS.
    Body (optional): { "note": "Lý do từ chối" }
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, id):
        transaction = generics.get_object_or_404(
            Transaction,
            id=id,
            status=Transaction.Status.REFUND_REQUESTED,
        )
        note = request.data.get('note', '').strip()
        transaction.status = Transaction.Status.SUCCESS
        if note:
            transaction.note = note
        transaction.save(update_fields=['status', 'note'])

        return Response({'message': 'Đã từ chối yêu cầu hoàn tiền.'})