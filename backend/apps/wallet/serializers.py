from rest_framework import serializers
from .models import Wallet, WalletTransaction


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = [
            'id', 'amount', 'transaction_type', 'source',
            'description', 'balance_after', 'created_at',
        ]
        read_only_fields = [
            'id', 'amount', 'transaction_type', 'source',
            'description', 'balance_after', 'created_at',
        ]


class WalletSerializer(serializers.ModelSerializer):
    transactions = WalletTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Wallet
        fields = ['id', 'balance', 'transactions', 'updated_at']
        read_only_fields = ['id', 'balance', 'transactions', 'updated_at']


class TopUpSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=10)
    payment_reference = serializers.CharField(max_length=200, required=False, default='')