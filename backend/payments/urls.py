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
    RequestRefundView,
    AdminApproveRefundView,
    AdminRejectRefundView,
    InstructorRevenueMonthlyView,
    revenue_stats,
    AdminTransactionDetailView,
    InstructorTransactionListView,    # ← thêm
    InstructorTransactionDetailView,  # ← thêm
)

urlpatterns = [
    # Student
    path('initiate/',   InitiatePaymentView.as_view(),   name='payment-initiate'),
    path('callback/',   PaymentCallbackView.as_view(),   name='payment-callback'),
    path('history/',    MyTransactionListView.as_view(),  name='transaction-history'),

    # Admin
    path('admin/',               AdminTransactionListView.as_view(), name='admin-transaction-list'),
    path('admin/stats/',         AdminRevenueStatsView.as_view(),    name='admin-revenue-stats'),
    path('admin/<uuid:id>/',     AdminTransactionDetailView.as_view(), name='admin-transaction-detail'),
    path('admin/<uuid:id>/refund/', AdminRefundView.as_view(),       name='admin-refund'),

    path('<uuid:id>/request-refund/', RequestRefundView.as_view()),

    path('admin/<uuid:id>/approve-refund/', AdminApproveRefundView.as_view()),
    path('admin/<uuid:id>/reject-refund/',  AdminRejectRefundView.as_view()),

    path('analytics/revenue/monthly/', InstructorRevenueMonthlyView.as_view()),

    path('revenue/', revenue_stats),

     # Instructor
    path('instructor/',           InstructorTransactionListView.as_view(),  name='instructor-transaction-list'),
    path('instructor/<uuid:id>/', InstructorTransactionDetailView.as_view(), name='instructor-transaction-detail'),
]