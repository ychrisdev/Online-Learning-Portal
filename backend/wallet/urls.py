from django.urls import path
from . import views

urlpatterns = [
    path('',              views.WalletDetailView.as_view()),
    path('deposit/',      views.WalletDepositView.as_view()),
    path('transactions/', views.WalletTransactionListView.as_view()),
    path('withdraw/',     views.WithdrawalRequestView.as_view()),
    path('withdrawals/',  views.WithdrawalListView.as_view()),
]