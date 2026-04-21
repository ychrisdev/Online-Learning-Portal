from rest_framework import serializers
from .models import Wallet, WalletTransaction, WithdrawalRequest


class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Wallet
        fields = ['id', 'balance', 'updated_at']


class WalletTransactionSerializer(serializers.ModelSerializer):
    tx_type_display = serializers.CharField(source='get_tx_type_display', read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = WalletTransaction
        fields = ['id', 'tx_type', 'tx_type_display', 'amount', 'balance_after',
                  'status', 'status_display', 'note', 'ref_id', 'created_at']


class DepositSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=10000, max_value=100_000_000)


class WithdrawalRequestSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = WithdrawalRequest
        fields = ['id', 'amount', 'bank_name', 'bank_account', 'account_name',
                  'status', 'status_display', 'note', 'created_at', 'resolved_at']
        read_only_fields = ['id', 'status', 'status_display', 'note', 'created_at', 'resolved_at']

    def validate_amount(self, value):
        wallet = self.context['wallet']
        if value > wallet.balance:
            raise serializers.ValidationError('Số dư không đủ.')
        if value < 50000:
            raise serializers.ValidationError('Số tiền rút tối thiểu là 50,000đ.')
        return value