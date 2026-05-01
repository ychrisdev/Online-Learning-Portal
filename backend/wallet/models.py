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
        db_table = 'wallets'

    def __str__(self):
        return f"{self.user.username} — {self.balance}đ"


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
    tx_type       = models.CharField(max_length=20, choices=TxType.choices)
    amount        = models.DecimalField(max_digits=12, decimal_places=0)
    balance_after = models.DecimalField(max_digits=12, decimal_places=0)
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.COMPLETED)
    note          = models.TextField(blank=True)
    ref_id        = models.CharField(max_length=255, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'wallet_transactions'
        ordering = ['-created_at']


class WithdrawalRequest(models.Model):
    class Status(models.TextChoices):
        PENDING  = 'pending',  'Chờ duyệt'
        APPROVED = 'approved', 'Đã duyệt'
        REJECTED = 'rejected', 'Từ chối'

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet       = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='withdrawals')
    amount       = models.DecimalField(max_digits=12, decimal_places=0)
    bank_name    = models.CharField(max_length=100)
    bank_account = models.CharField(max_length=50)
    account_name = models.CharField(max_length=100)
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    note         = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    resolved_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'withdrawal_requests'
        ordering = ['-created_at']