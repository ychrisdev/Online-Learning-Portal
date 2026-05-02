from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from .models import Wallet, WalletTransaction, WithdrawalRequest


# ─── INLINE ──────────────────────────────────────────────────────────────────

class WalletTransactionInline(admin.TabularInline):
    model           = WalletTransaction
    extra           = 0
    can_delete      = False
    verbose_name        = 'Giao dịch ví'
    verbose_name_plural = 'Lịch sử giao dịch ví'
    readonly_fields = ['tx_type', 'amount', 'balance_after', 'status', 'note', 'ref_id', 'created_at']
    fields          = ['tx_type', 'amount', 'balance_after', 'status', 'note', 'ref_id', 'created_at']
    ordering        = ['-created_at']

    def has_add_permission(self, request, obj=None):
        return False


class WithdrawalRequestInline(admin.TabularInline):
    model           = WithdrawalRequest
    extra           = 0
    can_delete      = False
    verbose_name        = 'Yêu cầu rút tiền'
    verbose_name_plural = 'Yêu cầu rút tiền'
    readonly_fields = ['amount', 'bank_name', 'bank_account', 'account_name', 'status', 'created_at', 'resolved_at']
    fields          = ['amount', 'bank_name', 'bank_account', 'account_name', 'status', 'created_at', 'resolved_at']

    def has_add_permission(self, request, obj=None):
        return False


# ─── WALLET ──────────────────────────────────────────────────────────────────

@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display    = ['get_user', 'get_user_role', 'colored_balance', 'updated_at']
    search_fields   = ['user__username', 'user__email', 'user__full_name']
    readonly_fields = ['user', 'balance', 'created_at', 'updated_at']
    inlines         = [WalletTransactionInline, WithdrawalRequestInline]
    ordering        = ['-balance']
    fieldsets = (
        ('Thông tin ví', {
            'fields': ('user', 'balance', 'created_at', 'updated_at'),
        }),
    )

    @admin.display(description='Người dùng')
    def get_user(self, obj):
        return obj.user.full_name or obj.user.username

    @admin.display(description='Vai trò')
    def get_user_role(self, obj):
        return obj.user.get_role_display()

    @admin.display(description='Số dư')
    def colored_balance(self, obj):
        color = 'green' if obj.balance > 0 else 'gray'
        return format_html('<b style="color:{}">{}</b>', color, f'{int(obj.balance):,}đ')


# ─── WALLET TRANSACTION ───────────────────────────────────────────────────────

@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display    = ['get_user', 'get_tx_type_display_vn', 'get_amount', 'get_balance_after', 'status', 'ref_id', 'created_at']
    list_filter     = ['tx_type', 'status']
    search_fields   = ['wallet__user__username', 'wallet__user__full_name', 'ref_id', 'note']
    readonly_fields = ['wallet', 'tx_type', 'amount', 'balance_after', 'status', 'note', 'ref_id', 'created_at']
    ordering        = ['-created_at']
    fieldsets = (
        ('Thông tin giao dịch', {
            'fields': ('wallet', 'tx_type', 'ref_id', 'note'),
        }),
        ('Số tiền', {
            'fields': ('amount', 'balance_after', 'status'),
        }),
        ('Thời gian', {
            'fields': ('created_at',),
        }),
    )

    def has_add_permission(self, request):
        return False

    @admin.display(description='Người dùng')
    def get_user(self, obj):
        return obj.wallet.user.full_name or obj.wallet.user.username

    @admin.display(description='Loại giao dịch')
    def get_tx_type_display_vn(self, obj):
        return obj.get_tx_type_display()

    @admin.display(description='Số tiền')
    def get_amount(self, obj):
        color = 'green' if obj.amount >= 0 else 'red'
        return format_html('<b style="color:{}">{}</b>', color, f'{int(obj.amount):,}đ')

    @admin.display(description='Số dư sau GD')
    def get_balance_after(self, obj):
        return f'{int(obj.balance_after):,}đ'


# ─── WITHDRAWAL REQUEST ───────────────────────────────────────────────────────

@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display    = ['get_user', 'get_amount', 'bank_name', 'bank_account',
                       'account_name', 'get_status_badge', 'created_at', 'resolved_at']
    list_filter     = ['status', 'bank_name']
    search_fields   = ['wallet__user__username', 'wallet__user__full_name', 'bank_account', 'account_name']
    readonly_fields = ['wallet', 'amount', 'bank_name', 'bank_account', 'account_name', 'created_at']
    ordering        = ['-created_at']
    fieldsets = (
        ('Thông tin người rút', {
            'fields': ('wallet', 'amount', 'created_at'),
        }),
        ('Thông tin ngân hàng', {
            'fields': ('bank_name', 'bank_account', 'account_name'),
        }),
        ('Xét duyệt', {
            'fields': ('status', 'note', 'resolved_at'),
        }),
    )

    @admin.display(description='Người dùng')
    def get_user(self, obj):
        return obj.wallet.user.full_name or obj.wallet.user.username

    @admin.display(description='Số tiền')
    def get_amount(self, obj):
        return f'{int(obj.amount):,}đ'

    @admin.display(description='Trạng thái')
    def get_status_badge(self, obj):
        colors = {
            WithdrawalRequest.Status.PENDING:  ('orange', 'Chờ duyệt'),
            WithdrawalRequest.Status.APPROVED: ('green',  'Đã duyệt'),
            WithdrawalRequest.Status.REJECTED: ('red',    'Từ chối'),
        }
        color, label = colors.get(obj.status, ('gray', obj.status))
        return format_html('<b style="color:{}">{}</b>', color, label)

    @admin.action(description='Duyệt yêu cầu rút tiền đã chọn')
    def approve_withdrawals(self, request, queryset):
        queryset.filter(status=WithdrawalRequest.Status.PENDING).update(
            status=WithdrawalRequest.Status.APPROVED,
            resolved_at=timezone.now(),
        )

    @admin.action(description='Từ chối yêu cầu rút tiền đã chọn')
    def reject_withdrawals(self, request, queryset):
        queryset.filter(status=WithdrawalRequest.Status.PENDING).update(
            status=WithdrawalRequest.Status.REJECTED,
            resolved_at=timezone.now(),
        )

    actions = ['approve_withdrawals', 'reject_withdrawals']