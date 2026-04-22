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
from decimal import Decimal

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

        course = generics.get_object_or_404(
            Course, id=serializer.validated_data['course_id']
        )

        # ✅ Dùng Enrollment.objects trực tiếp, tránh AttributeError
        if Enrollment.objects.filter(
            student=request.user,
            course=course,
            status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED],
        ).exists():
            return Response(
                {'detail': 'Bạn đã đăng ký khoá học này rồi.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        method = serializer.validated_data['method']

        # ✅ Xử lý sale_price an toàn khi None
        sale_price = course.sale_price
        if sale_price is None:
            sale_price = course.price or 0
        sale_price = int(sale_price)

        transaction = Transaction.objects.create(
            student=request.user,
            course=course,
            amount=sale_price,
            method=method,
        )

        if sale_price == 0:
            _activate_enrollment(transaction)
            return Response(
                {
                    'message': 'Đăng ký khoá học miễn phí thành công.',
                    'transaction': TransactionSerializer(transaction).data,
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {
                'ref_code': transaction.ref_code,
                'amount': sale_price,
                'course': course.title,
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

def _activate_enrollment(transaction):
    from django.utils import timezone as tz

    if transaction.status != Transaction.Status.SUCCESS:
        transaction.status = Transaction.Status.SUCCESS
        transaction.paid_at = transaction.paid_at or tz.now()
        transaction.save(update_fields=['status', 'paid_at'])

    enrollment, created = Enrollment.objects.get_or_create(
        student=transaction.student,
        course=transaction.course,
        defaults={
            'status': Enrollment.Status.ACTIVE,
            'paid_amount': transaction.amount,
        },
    )
    if not created and enrollment.status not in [
        Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED
    ]:
        enrollment.status = Enrollment.Status.ACTIVE
        enrollment.paid_amount = transaction.amount
        enrollment.save(update_fields=['status', 'paid_amount'])

    if transaction.amount and int(transaction.amount) > 0:
        try:
            from wallet.models import Wallet, WalletTransaction
            from wallet.services import INSTRUCTOR_REVENUE_RATE
            revenue = int(int(transaction.amount) * INSTRUCTOR_REVENUE_RATE)
            instructor = transaction.course.instructor
            if instructor:
                instructor_wallet, _ = Wallet.objects.get_or_create(user=instructor)
                instructor_wallet.balance += revenue
                instructor_wallet.save(update_fields=['balance'])
                WalletTransaction.objects.create(
                    wallet=instructor_wallet,
                    tx_type=WalletTransaction.TxType.REVENUE,
                    amount=revenue,
                    balance_after=instructor_wallet.balance,
                    note=f'Doanh thu từ: {transaction.course.title}',
                    ref_id=str(transaction.id),
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"Wallet update failed for transaction {transaction.id}: {e}"
            )
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
        if transaction.refund_requested_once:
            return Response(
                {'detail': 'Bạn đã yêu cầu hoàn tiền cho giao dịch này rồi.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = request.data.get('reason', '')
        transaction.status = Transaction.Status.REFUND_REQUESTED
        transaction.refund_reason = reason
        transaction.refund_requested_once = True
        transaction.save()
        return Response({'message': 'Yêu cầu hoàn tiền đã được gửi.'})


# THÊM VÀO CUỐI — admin duyệt hoàn tiền
class AdminApproveRefundView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, id):
        transaction = generics.get_object_or_404(
            Transaction, id=id, status=Transaction.Status.REFUND_REQUESTED,
        )
        transaction.status = Transaction.Status.REFUND_APPROVED  # ← trạng thái mới
        transaction.refund_approved_at = timezone.now()
        transaction.save()
        return Response({'message': 'Đã duyệt, đang chờ giảng viên xác nhận.'})

        # Hoàn tiền về ví sinh viên
        from wallet.services import refund_to_student
        try:
            refund_to_student(
                student      = transaction.student,
                amount       = int(transaction.amount),
                course_title = transaction.course.title,
                ref_id       = str(transaction.id),
            )
        except Exception:
            pass

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
    
class InstructorConfirmRefundView(APIView):
    """
    POST /api/payments/instructor/<id>/confirm-refund/
    Instructor xác nhận hoàn tiền → trừ ví instructor, cộng ví student
    Nếu không đủ tiền → trả 400 kèm số tiền thiếu
    """
    permission_classes = [IsAuthenticated, IsInstructor]

    def post(self, request, id):
        from django.db import transaction as db_tx
        from wallet.models import Wallet, WalletTransaction
        from wallet.services import refund_to_student

        transaction = generics.get_object_or_404(
            Transaction,
            id=id,
            status=Transaction.Status.REFUND_APPROVED,
            course__instructor=request.user,
        )

        amount = int(transaction.amount * Decimal('0.7'))  # 70% instructor đã nhận

        with db_tx.atomic():
            instructor_wallet = Wallet.objects.select_for_update().get_or_create(
                user=request.user
            )[0]

            if instructor_wallet.balance < amount:
                shortage = amount - int(instructor_wallet.balance)
                return Response({
                    'detail': f'Số dư không đủ. Cần nạp thêm {shortage:,}đ trong vòng 2 ngày.',
                    'shortage': shortage,
                    'deadline': (timezone.now() + timezone.timedelta(days=2)).isoformat(),
                }, status=status.HTTP_400_BAD_REQUEST)

            instructor_wallet.balance -= amount
            instructor_wallet.save()

            WalletTransaction.objects.create(
                wallet        = instructor_wallet,
                tx_type       = WalletTransaction.TxType.REFUND,
                amount        = -amount,
                balance_after = instructor_wallet.balance,
                note          = f'Hoàn tiền khóa học: {transaction.course.title}',
                ref_id        = str(transaction.id),
            )

            refund_to_student(
                student      = transaction.student,
                amount       = int(transaction.amount),
                course_title = transaction.course.title,
                ref_id       = str(transaction.id),
            )

            transaction.status = Transaction.Status.REFUNDED
            transaction.save()

        return Response({'message': 'Hoàn tiền thành công.'})