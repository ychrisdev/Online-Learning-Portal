"""
payments/models.py
==================
Chức năng liên quan:
  - 5.1.5  Thanh toán khoá học, xem lịch sử giao dịch (Student)
  - 5.3.3  Thống kê doanh thu (Admin)
"""
import uuid
from django.db import models
from django.conf import settings


class Transaction(models.Model):
    """
    Giao dịch thanh toán khoá học.
    Luồng trạng thái:
      pending → success  (gateway xác nhận → kích hoạt Enrollment)
      pending → failed   (gateway từ chối)
      success → refunded (admin hoặc hệ thống hoàn tiền)

    Khi chuyển sang refunded, service layer phải đồng thời cập nhật
    Enrollment.status → 'refunded' tương ứng.

    ref_code:    mã tham chiếu gửi lên payment gateway (VNPay, Momo, Stripe…).
    gateway_ref: mã giao dịch phía gateway trả về sau khi xử lý.
    """
    class Status(models.TextChoices):
        PENDING  = 'pending',  'Chờ xử lý'
        SUCCESS  = 'success',  'Thành công'
        FAILED   = 'failed',   'Thất bại'
        REFUNDED = 'refunded', 'Đã hoàn tiền'

    class Method(models.TextChoices):
        VNPAY  = 'vnpay',  'VNPay'
        MOMO   = 'momo',   'MoMo'
        STRIPE = 'stripe', 'Stripe'
        BANK   = 'bank',   'Chuyển khoản'
        FREE   = 'free',   'Miễn phí'

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name='Học viên',
        limit_choices_to={'role': 'student'},   # FIX: thêm ràng buộc role
    )
    course      = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name='Khoá học',
    )
    amount      = models.DecimalField('Số tiền (VNĐ)', max_digits=12, decimal_places=0)
    status      = models.CharField('Trạng thái', max_length=20, choices=Status.choices, default=Status.PENDING)  # FIX: bỏ max_digits=20 thừa
    method      = models.CharField('Phương thức', max_length=20, choices=Method.choices, default=Method.VNPAY)
    ref_code    = models.CharField('Mã tham chiếu (gửi gateway)', max_length=64, unique=True)
    gateway_ref = models.CharField('Mã giao dịch (gateway trả về)', max_length=128, blank=True)
    note        = models.TextField('Ghi chú', blank=True)
    created_at  = models.DateTimeField('Tạo lúc', auto_now_add=True)
    paid_at     = models.DateTimeField('Thanh toán lúc', null=True, blank=True)

    class Meta:
        db_table            = 'transactions'
        verbose_name        = 'Giao dịch'
        verbose_name_plural = 'Giao dịch'
        ordering            = ['-created_at']
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['status', 'paid_at']),   # thống kê doanh thu 5.3.3
        ]

    def __str__(self):
        return f"{self.ref_code} | {self.student.username} | {self.amount:,}đ | {self.get_status_display()}"