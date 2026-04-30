from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import WaqfProduct, WaqfPurchase
from .serializers import WaqfProductSerializer, BuyWaqfSerializer
from apps.wallet.models import Wallet, TransactionSource


class WaqfProductListView(generics.ListAPIView):
    serializer_class = WaqfProductSerializer
    permission_classes = [permissions.AllowAny]
    queryset = WaqfProduct.objects.filter(is_active=True)


class WaqfProductDetailView(generics.RetrieveAPIView):
    serializer_class = WaqfProductSerializer
    permission_classes = [permissions.AllowAny]
    queryset = WaqfProduct.objects.filter(is_active=True)


class BuyWaqfView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BuyWaqfSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = serializer.validated_data['product']
        units = serializer.validated_data['units']
        total_cost = product.price_per_unit * units

        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        if not wallet.can_afford(total_cost):
            return Response(
                {'errors': [f'Insufficient balance, Need {total_cost} SAR, have {wallet.balance}']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                # Lock the product row to prevent overselling
                product = WaqfProduct.objects.select_for_update().get(pk=product.pk)

                if units > product.available_units:
                    raise ValueError(f'Only {product.available_units} units available.')

                wallet.debit(
                    amount=total_cost,
                    source=TransactionSource.WAQF_PURCHASE,
                    description=f"Waqf: {units} units of {product.name}"
                )

                purchase = WaqfPurchase.objects.create(
                    user=request.user,
                    product=product,
                    units=units,
                    amount_paid=total_cost,
                )

                product.sold_units += units
                product.save(update_fields=['sold_units', 'updated_at'])
        except ValueError as e:
            return Response({'errors': [str(e)]}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'message': f'Successfully purchased {units} unit(s) of {product.name}.',
            'amount_paid': str(total_cost),
            'remaining_balance': str(wallet.balance),
        }, status=status.HTTP_201_CREATED)