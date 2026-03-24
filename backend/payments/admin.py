"""
payments/admin.py
"""
from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display   = ['ref_code', 'student', 'course', 'amount', 'status', 'method', 'paid_at']
    list_filter    = ['status', 'method']
    search_fields  = ['ref_code', 'student__username', 'course__title']
    readonly_fields = ['id', 'ref_code', 'gateway_ref', 'created_at', 'paid_at']
    ordering       = ['-created_at']