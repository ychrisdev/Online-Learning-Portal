from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Wallet, WithdrawalRequest
from .serializers import (
    DepositSerializer, WalletSerializer,
    WalletTransactionSerializer, WithdrawalRequestSerializer,
)
from . import services


class WalletDetailView(APIView):
    """GET /api/wallet/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet = services.get_or_create_wallet(request.user)
        return Response(WalletSerializer(wallet).data)


class WalletDepositView(APIView):
    """POST /api/wallet/deposit/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        wallet = services.deposit(request.user, serializer.validated_data['amount'])
        return Response({'balance': wallet.balance})


class WalletTransactionListView(generics.ListAPIView):
    """GET /api/wallet/transactions/"""
    serializer_class   = WalletTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        wallet = services.get_or_create_wallet(self.request.user)
        return wallet.transactions.all()

class WithdrawalRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        wallet = services.get_or_create_wallet(request.user)
        serializer = WithdrawalRequestSerializer(
            data=request.data, context={'wallet': wallet}
        )
        serializer.is_valid(raise_exception=True)
        try:
            withdrawal = services.withdraw(
                user         = request.user,
                amount       = serializer.validated_data['amount'],
                bank_name    = serializer.validated_data['bank_name'],
                bank_account = serializer.validated_data['bank_account'],
                account_name = serializer.validated_data['account_name'],
            )
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)
        return Response(WithdrawalRequestSerializer(withdrawal).data, status=201)

class WithdrawalListView(generics.ListAPIView):
    """GET /api/wallet/withdrawals/"""
    serializer_class   = WithdrawalRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        wallet = services.get_or_create_wallet(self.request.user)
        return wallet.withdrawals.all()
    
