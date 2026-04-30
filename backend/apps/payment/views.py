from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Donation, PaymentMethod
from .serializers import DonationSerializer, CreateDonationSerializer
from apps.wallet.models import Wallet, TransactionSource


class DonateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateDonationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        campaign = serializer.validated_data['campaign']
        amount = serializer.validated_data['amount']

        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        if not wallet.can_afford(amount):
            return Response(
                {'errors': [f'Insufficient wallet balance, Your balance: {wallet.balance} SAR.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                wallet.debit(
                    amount=amount,
                    source=TransactionSource.DONATION,
                    reference=f"campaign:{campaign.id}",
                    description=f"Donation to {campaign.title}",
                )

                donation = Donation.objects.create(
                    user=request.user,
                    campaign=campaign,
                    amount=amount,
                    donation_type=serializer.validated_data.get('donation_type', 'one_time'),
                    is_anonymous=serializer.validated_data.get('is_anonymous', False),
                    note=serializer.validated_data.get('note', ''),
                    payment_method=PaymentMethod.WALLET,
                    is_confirmed=True,
                )
        except ValueError as e:
            return Response({'errors': [str(e)]}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            DonationSerializer(donation, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class UserDonationListView(generics.ListAPIView):
    serializer_class = DonationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Donation.objects.filter(
            user=self.request.user,
            is_confirmed=True,
        ).select_related('campaign', 'campaign__charity')

    def get_serializer_context(self):
        return {'request': self.request}


class CampaignDonorsView(generics.ListAPIView):
    serializer_class = DonationSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        slug = self.kwargs['slug']
        return Donation.objects.filter(
            campaign__slug=slug,
            is_confirmed=True,
        ).select_related('user', 'campaign')