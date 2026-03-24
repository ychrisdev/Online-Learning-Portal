"""
payments/urls.py
"""
from django.urls import path
from .views import (
    AdminRefundView,
    AdminRevenueStatsView,
    AdminTransactionListView,
    InitiatePaymentView,
    MyTransactionListView,
    PaymentCallbackView,
)

urlpatterns = [
    # Student
    path('initiate/',   InitiatePaymentView.as_view(),   name='payment-initiate'),
    path('callback/',   PaymentCallbackView.as_view(),   name='payment-callback'),
    path('history/',    MyTransactionListView.as_view(),  name='transaction-history'),

    # Admin
    path('admin/',               AdminTransactionListView.as_view(), name='admin-transaction-list'),
    path('admin/stats/',         AdminRevenueStatsView.as_view(),    name='admin-revenue-stats'),
    path('admin/<uuid:id>/refund/', AdminRefundView.as_view(),       name='admin-refund'),
]