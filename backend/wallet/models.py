import uuid
from django.db import models
from django.conf import settings


class Wallet(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet')
    balance    = models.DecimalField('Số dư', max_digits=12, decimal_places=0, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table            = 'wallets'
        verbose_name        = 'Ví điện tử'
        verbose_name_plural = 'Ví điện tử'

    def __str__(self):
        return f"{self.user.full_name or self.user.username} — {int(self.balance):,}đ"


class WalletTransaction(models.Model):
    class TxType(models.TextChoices):
        DEPOSIT    = 'deposit',    'Nạp tiền'
        PAYMENT    = 'payment',    'Thanh toán'
        REFUND     = 'refund',     'Hoàn tiền'
        REVENUE    = 'revenue',    'Nhận doanh thu'
        WITHDRAWAL = 'withdrawal', 'Rút tiền'

    class Status(models.TextChoices):
        PENDING   = 'pending',   'Chờ xử lý'
        COMPLETED = 'completed', 'Hoàn thành'
        FAILED    = 'failed',    'Thất bại'

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet        = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    tx_type       = models.CharField('Loại giao dịch', max_length=20, choices=TxType.choices)
    amount        = models.DecimalField('Số tiền', max_digits=12, decimal_places=0)
    balance_after = models.DecimalField('Số dư sau GD', max_digits=12, decimal_places=0)
    status        = models.CharField('Trạng thái', max_length=20, choices=Status.choices, default=Status.COMPLETED)
    note          = models.TextField('Ghi chú', blank=True)
    ref_id        = models.CharField('Mã tham chiếu', max_length=255, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table            = 'wallet_transactions'
        ordering            = ['-created_at']
        verbose_name        = 'Giao dịch ví'
        verbose_name_plural = 'Giao dịch ví'

    def __str__(self):
        return f"{self.wallet.user.username} | {self.get_tx_type_display()} | {int(self.amount):,}đ"


class WithdrawalRequest(models.Model):
    class Status(models.TextChoices):
        PENDING  = 'pending',  'Chờ duyệt'
        APPROVED = 'approved', 'Đã duyệt'
        REJECTED = 'rejected', 'Từ chối'

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet       = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='withdrawals')
    amount       = models.DecimalField('Số tiền rút', max_digits=12, decimal_places=0)
    bank_name    = models.CharField('Ngân hàng', max_length=100)
    bank_account = models.CharField('Số tài khoản', max_length=50)
    account_name = models.CharField('Tên chủ tài khoản', max_length=100)
    status       = models.CharField('Trạng thái', max_length=20, choices=Status.choices, default=Status.PENDING)
    note         = models.TextField('Ghi chú', blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    resolved_at  = models.DateTimeField('Ngày xử lý', null=True, blank=True)

    class Meta:
        db_table            = 'withdrawal_requests'
        ordering            = ['-created_at']
        verbose_name        = 'Yêu cầu rút tiền'
        verbose_name_plural = 'Yêu cầu rút tiền'

    def __str__(self):
        return f"{self.wallet.user.username} — {int(self.amount):,}đ ({self.get_status_display()})"