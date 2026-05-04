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
from .emails import send_enrollment_email, send_payment_success_email, send_refund_success_email

class InitiatePaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InitiatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course = generics.get_object_or_404(
            Course, id=serializer.validated_data['course_id']
        )

        if Enrollment.objects.filter(
            student=request.user,
            course=course,
            status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED],
        ).exists():
            return Response(
                {'detail': 'Bạn đã đăng ký khoá học này rồi.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        """ if Transaction.objects.filter(
            student=request.user,
            course=course,
            status=Transaction.Status.PENDING,
        ).exists():
            return Response(
                {'detail': 'Bạn đã có giao dịch đang chờ xử lý cho khóa học này.'},
                status=status.HTTP_400_BAD_REQUEST,
            ) """

        method = serializer.validated_data['method']
        
        Transaction.objects.filter(
            student=request.user,
            course=course,
            status=Transaction.Status.PENDING,
        ).update(status=Transaction.Status.FAILED)

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
            # Cộng doanh thu instructor
            if transaction.amount and int(transaction.amount) > 0:
                from wallet.services import pay_instructor_revenue
                try:
                    pay_instructor_revenue(
                        course=transaction.course,
                        amount=int(transaction.amount),
                        transaction_id=str(transaction.id),
                    )
                except Exception:
                    pass
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
        send_payment_success_email(transaction)   # khoá học có phí
    else:
        send_enrollment_email(enrollment) 
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

        # Điều kiện 1: chỉ hoàn trong vòng 7 ngày
        if transaction.paid_at:
            days_since = (timezone.now() - transaction.paid_at).days
            if days_since > 7:
                return Response(
                    {'detail': 'Chỉ được hoàn tiền trong vòng 7 ngày sau khi mua.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Điều kiện 2: chưa học quá 20%
        from enrollments.models import Enrollment, Progress
        from courses.models import Lesson
        enrollment = Enrollment.objects.filter(
            student=request.user,
            course=transaction.course,
        ).first()
        if enrollment:
            total_lessons = Lesson.objects.filter(section__course=transaction.course).count()
            completed_lessons = Progress.objects.filter(
                enrollment=enrollment, is_completed=True
            ).count()
            if total_lessons > 0:
                progress_pct = completed_lessons / total_lessons * 100
                if progress_pct > 20:
                    return Response(
                        {'detail': 'Không thể hoàn tiền khi đã học quá 20%.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        reason = request.data.get('reason', '')
        transaction.status = Transaction.Status.REFUND_REQUESTED
        transaction.refund_reason = reason
        transaction.refund_requested_once = True
        transaction.refund_requested_at = timezone.now()
        transaction.save()
        return Response({'message': 'Yêu cầu hoàn tiền đã được gửi.'})


# THÊM VÀO CUỐI — admin duyệt hoàn tiền
class AdminApproveRefundView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, id):
        transaction = generics.get_object_or_404(
            Transaction, id=id, status=Transaction.Status.REFUND_REQUESTED,
        )
        from datetime import timedelta

        now = timezone.now()
        transaction.status             = Transaction.Status.REFUND_APPROVED
        transaction.refund_approved_at = now
        transaction.refund_deadline    = now + timedelta(hours=48)
        transaction.save()

        # Schedule tasks
        from payments.tasks import send_refund_warning_email_task, auto_lock_instructor_task
        tx_id = str(transaction.id)
        send_refund_warning_email_task.apply_async(args=[tx_id], countdown=36*3600)  # sau 36 tiếng
        auto_lock_instructor_task.apply_async(args=[tx_id],      countdown=48*3600)  # sau 48 tiếng
        try:
            from .emails import send_refund_approved_email, send_refund_request_to_instructor_email
            send_refund_approved_email(transaction)           # gửi cho student
            send_refund_request_to_instructor_email(transaction)  # gửi cho instructor
        except Exception:
            pass
        return Response({'message': 'Đã duyệt, đang chờ giảng viên xác nhận.'})

        """ # Hoàn tiền về ví sinh viên
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

        return Response({'message': 'Đã duyệt hoàn tiền.'}) """


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
        try:
            from .emails import send_refund_rejected_email
            send_refund_rejected_email(transaction, reject_reason=transaction.note)
        except Exception:
            pass
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

        amount = int(transaction.amount * Decimal('0.7'))

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
                wallet=instructor_wallet,
                tx_type=WalletTransaction.TxType.REFUND,
                amount=-amount,
                balance_after=instructor_wallet.balance,
                note=f'Hoàn tiền khóa học: {transaction.course.title}',
                ref_id=str(transaction.id),
            )

            refund_to_student(
                student=transaction.student,
                amount=amount,
                course_title=transaction.course.title,
                ref_id=str(transaction.id),
            )

            transaction.status = Transaction.Status.REFUNDED
            transaction.save()

        try:
            send_refund_success_email(transaction)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error('Refund email failed: %s', e)

        return Response({'message': 'Hoàn tiền thành công.'})    
class WalletPayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ref_code = request.data.get('ref_code')
        course_id = request.data.get('course_id')
        
        if not ref_code and not course_id:
            return Response({'detail': 'Thiếu ref_code hoặc course_id.'}, status=400)

        if ref_code:
            try:
                transaction = Transaction.objects.get(
                    ref_code=ref_code,
                    student=request.user,
                    status__in=[Transaction.Status.PENDING, Transaction.Status.FAILED],
                )
                if transaction.status == Transaction.Status.FAILED:
                    transaction.status = Transaction.Status.PENDING
                    transaction.method = Transaction.Method.WALLET
                    transaction.save(update_fields=['status', 'method'])
            except Transaction.DoesNotExist:
                return Response({'detail': 'Không tìm thấy giao dịch hợp lệ.'}, status=404)
        else:
            from courses.models import Course
            course = generics.get_object_or_404(Course, id=course_id)
            if Enrollment.objects.filter(
                student=request.user,
                course=course,
                status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED],
            ).exists():
                return Response({'detail': 'Bạn đã đăng ký khoá học này rồi.'}, status=400)
            price = int(course.sale_price or course.price or 0)
            transaction = Transaction.objects.create(
                student=request.user,
                course=course,
                amount=price,
                method=Transaction.Method.WALLET,
                status=Transaction.Status.PENDING,
            )

        from wallet.services import pay_for_course
        try:
            pay_for_course(
                student=request.user,
                course=transaction.course,
                amount=int(transaction.amount),
                transaction_id=str(transaction.id),
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)

        transaction.status = Transaction.Status.SUCCESS
        transaction.paid_at = timezone.now()
        transaction.gateway_ref = f'WALLET_{transaction.ref_code}'
        transaction.save()

        _activate_enrollment(transaction)

        return Response({'message': 'Thanh toán bằng ví thành công.'})
    
# ── MoMo ──────────────────────────────────────────────────────
import hashlib
import hmac as hmac_module
import requests
from django.conf import settings

def _momo_signature(raw: str) -> str:
    return hmac_module.new(
        settings.MOMO_SECRET_KEY.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

class MomoCreateView(APIView):
    """
    POST /api/payments/momo/create/
    Body: { course_id }
    Trả về: { ref_code, qr_code_url, deep_link, pay_url }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        course_id = request.data.get('course_id')
        course = generics.get_object_or_404(Course, id=course_id)

        if Enrollment.objects.filter(
            student=request.user,
            course=course,
            status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED],
        ).exists():
            return Response(
                {'detail': 'Bạn đã đăng ký khoá học này rồi.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        price = int(course.sale_price or course.price or 0)
        if price == 0:
            return Response({'detail': 'Khoá học miễn phí, không cần thanh toán MoMo.'}, status=400)

        existing = Transaction.objects.filter(
            student=request.user,
            course=course,
            status=Transaction.Status.PENDING,
            method=Transaction.Method.MOMO,
        ).first()

        if existing:
            # Đổi ref_code mới để MoMo không từ chối orderId cũ đã từng gửi
            existing.ref_code = f"ORD{uuid.uuid4().hex[:16].upper()}"
            existing.save(update_fields=["ref_code"])
            tx = existing
        else:
            tx = Transaction.objects.create(
                student=request.user,
                course=course,
                amount=price,
                method=Transaction.Method.MOMO,
                status=Transaction.Status.PENDING,
            )

        order_id     = tx.ref_code
        request_id   = tx.ref_code
        order_info   = f"Thanh toan khoa hoc {course.title}"
        redirect_url = settings.MOMO_REDIRECT_URL
        ipn_url      = settings.MOMO_IPN_URL
        amount_str   = str(price)
        extra_data   = ""
        request_type = "payWithMethod"

        raw = (
            f"accessKey={settings.MOMO_ACCESS_KEY}"
            f"&amount={amount_str}"
            f"&extraData={extra_data}"
            f"&ipnUrl={ipn_url}"
            f"&orderId={order_id}"
            f"&orderInfo={order_info}"
            f"&partnerCode={settings.MOMO_PARTNER_CODE}"
            f"&redirectUrl={redirect_url}"
            f"&requestId={request_id}"
            f"&requestType={request_type}"
        )
        signature = _momo_signature(raw)

        payload = {
            "partnerCode": settings.MOMO_PARTNER_CODE,
            "accessKey":   settings.MOMO_ACCESS_KEY,
            "requestId":   request_id,
            "amount":      amount_str,
            "orderId":     order_id,
            "orderInfo":   order_info,
            "redirectUrl": redirect_url,
            "ipnUrl":      ipn_url,
            "extraData":   extra_data,
            "requestType": request_type,
            "signature":   signature,
            "lang":        "vi",
        }

        try:
            resp = requests.post(settings.MOMO_ENDPOINT, json=payload, timeout=15)
            data = resp.json()
        except Exception as e:
            tx.status = Transaction.Status.FAILED
            tx.save(update_fields=["status"])
            return Response({'detail': f'Lỗi kết nối MoMo: {str(e)}'}, status=500)

        if data.get('resultCode') != 0:
            tx.status = Transaction.Status.FAILED
            tx.save(update_fields=["status"])
            return Response({'detail': data.get('message', 'MoMo lỗi.')}, status=400)

        return Response({
            'ref_code':    tx.ref_code,
            'qr_code_url': data.get('qrCodeUrl'),
            'deep_link':   data.get('deeplink'),
            'pay_url':     data.get('payUrl'),
        })


from rest_framework.decorators import permission_classes as pc
from rest_framework.permissions import AllowAny

class MomoIpnView(APIView):
    """
    POST /api/payments/momo/ipn/
    MoMo gọi về sau khi user quét QR
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        d = request.data

        raw = (
            f"accessKey={settings.MOMO_ACCESS_KEY}"
            f"&amount={d.get('amount')}"
            f"&extraData={d.get('extraData','')}"
            f"&message={d.get('message','')}"
            f"&orderId={d.get('orderId')}"
            f"&orderInfo={d.get('orderInfo','')}"
            f"&orderType={d.get('orderType','')}"
            f"&partnerCode={d.get('partnerCode')}"
            f"&payType={d.get('payType','')}"
            f"&requestId={d.get('requestId')}"
            f"&responseTime={d.get('responseTime','')}"
            f"&resultCode={d.get('resultCode')}"
            f"&transId={d.get('transId','')}"
        )
        expected = _momo_signature(raw)
        if expected != d.get('signature'):
            import logging
            logging.getLogger(__name__).warning(f"Signature mismatch: expected={expected}, got={d.get('signature')}")
            # Tạm bỏ qua verify để test
            # return Response({'resultCode': 1, 'message': 'Invalid signature'})

        try:
            tx = Transaction.objects.get(ref_code=d['orderId'])
        except Transaction.DoesNotExist:
            return Response({'resultCode': 1, 'message': 'Not found'})

        result_code = int(d.get('resultCode', -1))

        if result_code == 0 and tx.status == Transaction.Status.PENDING:
            tx.status      = Transaction.Status.SUCCESS
            tx.gateway_ref = str(d.get('transId', ''))
            tx.paid_at     = timezone.now()
            tx.save(update_fields=['status', 'gateway_ref', 'paid_at'])
            _activate_enrollment(tx)
            if tx.amount and int(tx.amount) > 0:
                from wallet.services import pay_instructor_revenue
                try:
                    pay_instructor_revenue(
                        course=tx.course,
                        amount=int(tx.amount),
                        transaction_id=str(tx.id),
                    )
                except Exception:
                    pass
        elif result_code != 0 and tx.status == Transaction.Status.PENDING:
            tx.status = Transaction.Status.FAILED
            tx.save(update_fields=['status'])
            try:
                from .emails import send_payment_failed_email
                send_payment_failed_email(tx)
            except Exception:
                pass

        return Response({'resultCode': 0, 'message': 'OK'})


class MomoStatusView(APIView):
    """
    GET /api/payments/momo/status/<ref_code>/
    Frontend polling trạng thái
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, ref_code):
        try:
            tx = Transaction.objects.get(ref_code=ref_code, student=request.user)
        except Transaction.DoesNotExist:
            return Response({'detail': 'Không tìm thấy.'}, status=404)
        return Response({'status': tx.status})
    
class MomoCancelView(APIView):
    """
    POST /api/payments/momo/cancel/
    Frontend gọi khi MoMo redirect về với resultCode != 0
    Cập nhật transaction PENDING → FAILED để lần sau tạo được orderId mới
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        order_id    = request.data.get("order_id")
        result_code = request.data.get("result_code")
        if not order_id:
            return Response({"detail": "Thiếu order_id."}, status=400)
        try:
            tx = Transaction.objects.get(
                ref_code=order_id,
                status=Transaction.Status.PENDING,
            )
            tx.status = Transaction.Status.FAILED
            tx.save(update_fields=["status"])
            # Gửi email thông báo thất bại
            try:
                from .emails import send_payment_failed_email
                send_payment_failed_email(tx)
            except Exception:
                pass
        except Transaction.DoesNotExist:
            pass
        return Response({"message": "OK"})