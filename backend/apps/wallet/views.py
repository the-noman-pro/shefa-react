from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Wallet, TransactionSource
from .serializers import WalletSerializer, WalletTransactionSerializer, TopUpSerializer


class WalletDetailView(generics.RetrieveAPIView):
    serializer_class = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        wallet, _ = Wallet.objects.get_or_create(user=self.request.user)
        return wallet


class WalletTopUpView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TopUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        amount = serializer.validated_data['amount']
        reference = serializer.validated_data.get('payment_reference', '')

        transaction = wallet.credit(
            amount=amount,
            source=TransactionSource.TOP_UP,
            reference=reference,
            description=f"Wallet Top-up of {amount} SAR"
        )

        return Response({
            'message': f"Wallet topped up with {amount} SAR.",
            'balance': str(wallet.balance),
            'transaction_id': transaction.id,
        })


class WalletTransactionListView(generics.ListAPIView):
    serializer_class = WalletTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        wallet, _ = Wallet.objects.get_or_create(user=self.request.user)
        return wallet.transactions.all()