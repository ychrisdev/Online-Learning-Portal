"""
payments/models.py
"""
import uuid
from django.db import models
from django.conf import settings


def _gen_ref_code() -> str:
    """Sinh mã tham chiếu duy nhất 16 ký tự hex viết hoa."""
    return uuid.uuid4().hex.upper()[:16]


class Transaction(models.Model):

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
        limit_choices_to={'role': 'student'},
    )
    course      = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name='Khoá học',
    )
    amount      = models.DecimalField('Số tiền (VNĐ)', max_digits=12, decimal_places=0)
    status      = models.CharField('Trạng thái', max_length=20, choices=Status.choices, default=Status.PENDING)
    method      = models.CharField('Phương thức', max_length=20, choices=Method.choices, default=Method.VNPAY)
    # blank=True để Django Admin không bắt buộc nhập tay — save() sẽ tự điền
    ref_code    = models.CharField('Mã tham chiếu (gửi gateway)', max_length=64, unique=True, blank=True)
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
            models.Index(fields=['status', 'paid_at']),
        ]

    def save(self, *args, **kwargs):
        # Tự sinh ref_code nếu chưa có (tạo mới qua Admin hoặc API)
        if not self.ref_code:
            for _ in range(10):                         # thử tối đa 10 lần phòng collision
                code = _gen_ref_code()
                if not Transaction.objects.filter(ref_code=code).exists():
                    self.ref_code = code
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ref_code} | {self.student.username} | {self.amount:,}đ | {self.get_status_display()}"