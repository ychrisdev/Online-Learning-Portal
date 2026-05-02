"""
payments/admin.py
"""
from django.contrib import admin
from django.utils import timezone
from .models import Transaction

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display    = ['ref_code', 'student', 'course', 'amount', 'status', 'method', 'paid_at', 'refund_requested_once']
    list_filter     = ['status', 'method', 'refund_requested_once']   # ← thêm refund_requested_once
    search_fields   = ['ref_code', 'gateway_ref', 'student__username', 'course__title']  # ← thêm gateway_ref
    readonly_fields = ['id', 'ref_code', 'gateway_ref', 'created_at', 'paid_at',
                       'refund_requested_at', 'refund_approved_at', 'refund_deadline',
                       'refund_requested_once']                        # ← thêm các refund fields
    ordering        = ['-created_at']
    fieldsets = (
        ('Thông tin giao dịch', {
            'fields': ('id', 'student', 'course', 'amount', 'method', 'ref_code', 'gateway_ref'),
        }),
        ('Trạng thái', {
            'fields': ('status', 'note', 'paid_at', 'created_at'),
        }),
        ('Hoàn tiền', {
            'fields': ('refund_reason', 'refund_requested_once',
                       'refund_requested_at', 'refund_deadline', 'refund_approved_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.action(description='Duyệt hoàn tiền đã chọn')
    def approve_refunds(self, request, queryset):
        queryset.filter(status=Transaction.Status.REFUND_REQUESTED).update(
            status=Transaction.Status.REFUND_APPROVED,
            refund_approved_at=timezone.now(),
        )

    @admin.action(description='Đánh dấu đã hoàn tiền')
    def mark_refunded(self, request, queryset):
        queryset.filter(status=Transaction.Status.REFUND_APPROVED).update(
            status=Transaction.Status.REFUNDED,
        )

    actions = ['approve_refunds', 'mark_refunded']