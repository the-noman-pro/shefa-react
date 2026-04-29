# Step 05: Wallet, Waqf, Payment & Donation Apps

## Agent Instructions
Build the financial core of the platform: wallets hold donor balances, payments process transactions, donations link donors to campaigns, and waqf handles endowment products. These models are interconnected — follow the order in this file. All commands run from `~/code/shefa-react/backend/`.

---

## What We're Building

- **Wallet**: each donor has a wallet with balance; can top up and spend
- **Payment**: records of payment transactions (top-ups, donations)
- **Donation**: links a user to a campaign with an amount
- **Waqf**: endowment products users can purchase
- **Signals**: auto-update wallet balance after donation

---

## PART A: Wallet App

## A1. Wallet Models

```python
# apps/wallet/models.py
from django.db import models
from django.conf import settings
from apps.common.models import TimestampedModel
from decimal import Decimal


class TransactionType(models.TextChoices):
    CREDIT = 'credit', 'Credit'      # money added to wallet
    DEBIT = 'debit', 'Debit'         # money spent from wallet


class TransactionSource(models.TextChoices):
    TOP_UP = 'top_up', 'Top Up'
    DONATION = 'donation', 'Donation'
    WAQF_PURCHASE = 'waqf_purchase', 'Waqf Purchase'
    REFUND = 'refund', 'Refund'


class Wallet(TimestampedModel):
    """
    One wallet per user (OneToOne).
    Balance is always non-negative.
    Never update balance directly — use WalletTransaction.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='wallet',
    )
    balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00'),
    )

    class Meta:
        db_table = 'wallet'

    def __str__(self):
        return f"Wallet of {self.user.email} — Balance: {self.balance}"

    def can_afford(self, amount):
        return self.balance >= Decimal(str(amount))

    def credit(self, amount, source, reference='', description=''):
        """Add money to wallet. Returns the WalletTransaction."""
        amount = Decimal(str(amount))
        self.balance += amount
        self.save(update_fields=['balance', 'updated_at'])
        return WalletTransaction.objects.create(
            wallet=self,
            amount=amount,
            transaction_type=TransactionType.CREDIT,
            source=source,
            reference=reference,
            description=description,
            balance_after=self.balance,
        )

    def debit(self, amount, source, reference='', description=''):
        """Remove money from wallet. Raises ValueError if insufficient balance."""
        amount = Decimal(str(amount))
        if not self.can_afford(amount):
            raise ValueError(
                f"Insufficient balance. Available: {self.balance}, Required: {amount}"
            )
        self.balance -= amount
        self.save(update_fields=['balance', 'updated_at'])
        return WalletTransaction.objects.create(
            wallet=self,
            amount=amount,
            transaction_type=TransactionType.DEBIT,
            source=source,
            reference=reference,
            description=description,
            balance_after=self.balance,
        )


class WalletTransaction(TimestampedModel):
    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.PROTECT,
        related_name='transactions',
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    source = models.CharField(max_length=20, choices=TransactionSource.choices)
    reference = models.CharField(max_length=200, blank=True)
    description = models.CharField(max_length=500, blank=True)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        db_table = 'wallet_transaction'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_type} {self.amount} — {self.wallet.user.email}"
```

## A2. Wallet Signals (Auto-create wallet on user creation)

```python
# apps/wallet/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Wallet


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_wallet(sender, instance, created, **kwargs):
    """Automatically create a wallet when a new user is registered."""
    if created:
        Wallet.objects.get_or_create(user=instance)
```

## A3. Wallet App Config (to connect signals)

```python
# apps/wallet/apps.py
from django.apps import AppConfig


class WalletConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.wallet'

    def ready(self):
        import apps.wallet.signals  # noqa — connects signals
```

## A4. Wallet Serializers

```python
# apps/wallet/serializers.py
from rest_framework import serializers
from .models import Wallet, WalletTransaction


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = [
            'id', 'amount', 'transaction_type', 'source',
            'description', 'balance_after', 'created_at',
        ]
        read_only_fields = fields


class WalletSerializer(serializers.ModelSerializer):
    transactions = WalletTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Wallet
        fields = ['id', 'balance', 'transactions', 'updated_at']
        read_only_fields = fields


class TopUpSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=10)
    payment_reference = serializers.CharField(max_length=200, required=False, default='')
```

## A5. Wallet Views

```python
# apps/wallet/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Wallet, TransactionSource
from .serializers import WalletSerializer, WalletTransactionSerializer, TopUpSerializer


class WalletDetailView(generics.RetrieveAPIView):
    """
    GET /api/wallet/
    Returns the current user's wallet balance + recent transactions.
    """
    serializer_class = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        wallet, _ = Wallet.objects.get_or_create(user=self.request.user)
        return wallet


class WalletTopUpView(APIView):
    """
    POST /api/wallet/top-up/
    Add funds to the wallet (in production this would be after payment gateway confirmation).
    """
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
            description=f"Wallet top-up of {amount} SAR",
        )

        return Response({
            'message': f"Wallet topped up with {amount} SAR.",
            'balance': str(wallet.balance),
            'transaction_id': transaction.id,
        })


class WalletTransactionListView(generics.ListAPIView):
    """
    GET /api/wallet/transactions/
    List all transactions for the current user's wallet.
    """
    serializer_class = WalletTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        wallet, _ = Wallet.objects.get_or_create(user=self.request.user)
        return wallet.transactions.all()
```

## A6. Wallet URLs

```python
# apps/wallet/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.WalletDetailView.as_view(), name='wallet-detail'),
    path('top-up/', views.WalletTopUpView.as_view(), name='wallet-top-up'),
    path('transactions/', views.WalletTransactionListView.as_view(), name='wallet-transactions'),
]
```

---

## PART B: Payment & Donation App

## B1. Payment & Donation Models

```python
# apps/payment/models.py
from django.db import models
from django.conf import settings
from apps.common.models import TimestampedModel
from apps.campaign.models import Campaign
from decimal import Decimal


class PaymentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'
    REFUNDED = 'refunded', 'Refunded'


class PaymentMethod(models.TextChoices):
    WALLET = 'wallet', 'Wallet Balance'
    CARD = 'card', 'Credit/Debit Card'
    BANK = 'bank', 'Bank Transfer'


class DonationType(models.TextChoices):
    ONE_TIME = 'one_time', 'One-time'
    PERIODIC = 'periodic', 'Periodic (Monthly)'


class Donation(TimestampedModel):
    """
    Records a donor's donation to a campaign.
    Created after a successful payment.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,  # allow anonymous donations
        related_name='donations',
    )
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.PROTECT,
        related_name='donations',
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    donation_type = models.CharField(
        max_length=20,
        choices=DonationType.choices,
        default=DonationType.ONE_TIME,
    )
    is_anonymous = models.BooleanField(default=False)
    note = models.TextField(blank=True)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.WALLET,
    )
    payment_reference = models.CharField(max_length=200, blank=True)
    is_confirmed = models.BooleanField(default=False)

    class Meta:
        db_table = 'donation'
        ordering = ['-created_at']

    def __str__(self):
        donor = self.user.email if self.user else 'Anonymous'
        return f"{donor} donated {self.amount} to {self.campaign.title}"
```

## B2. Donation Signals (Update Campaign Stats)

```python
# apps/payment/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Donation


@receiver(post_save, sender=Donation)
def update_campaign_stats(sender, instance, created, **kwargs):
    """
    After a confirmed donation is saved, update the campaign's
    raised_amount and donors_count.
    """
    if instance.is_confirmed:
        from django.db.models import Sum
        campaign = instance.campaign
        
        agg = Donation.objects.filter(
            campaign=campaign,
            is_confirmed=True,
        ).aggregate(total=Sum('amount'))
        
        campaign.raised_amount = agg['total'] or 0
        campaign.donors_count = Donation.objects.filter(
            campaign=campaign,
            is_confirmed=True,
            is_anonymous=False,
        ).values('user').distinct().count()
        campaign.save(update_fields=['raised_amount', 'donors_count', 'updated_at'])
        
        # Also update charity total_raised
        from django.db.models import Sum as SumF
        from apps.campaign.models import Campaign as CampaignModel
        charity = campaign.charity
        total = Donation.objects.filter(
            campaign__charity=charity,
            is_confirmed=True,
        ).aggregate(total=SumF('amount'))['total'] or 0
        charity.total_raised = total
        charity.save(update_fields=['total_raised', 'updated_at'])
```

## B3. Payment App Config

```python
# apps/payment/apps.py
from django.apps import AppConfig


class PaymentConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.payment'

    def ready(self):
        import apps.payment.signals  # noqa
```

## B4. Donation Serializers

```python
# apps/payment/serializers.py
from rest_framework import serializers
from .models import Donation, DonationType, PaymentMethod
from apps.campaign.serializers import CampaignListSerializer


class DonationSerializer(serializers.ModelSerializer):
    campaign_info = CampaignListSerializer(source='campaign', read_only=True)
    donor_name = serializers.SerializerMethodField()

    class Meta:
        model = Donation
        fields = [
            'id', 'campaign', 'campaign_info', 'amount', 'donation_type',
            'is_anonymous', 'note', 'payment_method', 'is_confirmed',
            'donor_name', 'created_at',
        ]
        read_only_fields = ['id', 'is_confirmed', 'created_at']

    def get_donor_name(self, obj):
        if obj.is_anonymous or not obj.user:
            return 'Anonymous'
        return obj.user.full_name


class CreateDonationSerializer(serializers.ModelSerializer):
    """For creating a donation via wallet balance."""

    class Meta:
        model = Donation
        fields = ['campaign', 'amount', 'donation_type', 'is_anonymous', 'note']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value

    def validate(self, attrs):
        campaign = attrs['campaign']
        if not campaign.is_active:
            raise serializers.ValidationError(
                {'campaign': 'This campaign is not currently accepting donations.'}
            )
        if attrs['amount'] < campaign.minimum_donation:
            raise serializers.ValidationError(
                {'amount': f'Minimum donation is {campaign.minimum_donation} SAR.'}
            )
        return attrs
```

## B5. Donation Views

```python
# apps/payment/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Donation, PaymentMethod, TransactionSource
from .serializers import DonationSerializer, CreateDonationSerializer
from apps.wallet.models import Wallet, TransactionSource as WalletSource


class DonateView(APIView):
    """
    POST /api/payments/donate/
    Donate to a campaign using wallet balance.
    Deducts from wallet and creates a confirmed donation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateDonationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        campaign = serializer.validated_data['campaign']
        amount = serializer.validated_data['amount']

        # Get or create wallet
        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        # Check balance
        if not wallet.can_afford(amount):
            return Response(
                {'errors': [f'Insufficient wallet balance. Your balance: {wallet.balance} SAR.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Debit wallet
        try:
            wallet.debit(
                amount=amount,
                source=WalletSource.DONATION,
                reference=f"campaign:{campaign.id}",
                description=f"Donation to {campaign.title}",
            )
        except ValueError as e:
            return Response({'errors': [str(e)]}, status=status.HTTP_400_BAD_REQUEST)

        # Create confirmed donation
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

        return Response(
            DonationSerializer(donation, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class UserDonationListView(generics.ListAPIView):
    """GET /api/payments/my-donations/"""
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
    """
    GET /api/payments/campaign/<slug>/donors/
    Public: list of donors for a campaign (anonymous donors shown as Anonymous).
    """
    serializer_class = DonationSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        slug = self.kwargs['slug']
        return Donation.objects.filter(
            campaign__slug=slug,
            is_confirmed=True,
        ).select_related('user', 'campaign')
```

## B6. Payment URLs

```python
# apps/payment/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('donate/', views.DonateView.as_view(), name='donate'),
    path('my-donations/', views.UserDonationListView.as_view(), name='my-donations'),
    path('campaign/<slug:slug>/donors/', views.CampaignDonorsView.as_view(), name='campaign-donors'),
]
```

---

## PART C: Waqf App

## C1. Waqf Models

```python
# apps/waqf/models.py
from django.db import models
from django.conf import settings
from apps.common.models import TimestampedModel
from decimal import Decimal


class WaqfProduct(TimestampedModel):
    """
    A waqf (endowment) product. Users buy units to contribute to the waqf.
    When all units are sold, the waqf is funded.
    """
    name = models.CharField(max_length=200)
    name_ar = models.CharField(max_length=200, blank=True)
    description = models.TextField()
    description_ar = models.TextField(blank=True)
    image = models.ImageField(upload_to='waqf/', blank=True, null=True)
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    total_units = models.PositiveIntegerField()
    sold_units = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'waqf_product'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def available_units(self):
        return self.total_units - self.sold_units

    @property
    def progress_percentage(self):
        if self.total_units == 0:
            return 0
        return min((self.sold_units / self.total_units) * 100, 100)

    @property
    def total_value(self):
        return self.price_per_unit * self.total_units

    @property
    def raised_amount(self):
        return self.price_per_unit * self.sold_units


class WaqfPurchase(TimestampedModel):
    """Record of a user purchasing waqf units."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='waqf_purchases',
    )
    product = models.ForeignKey(
        WaqfProduct,
        on_delete=models.PROTECT,
        related_name='purchases',
    )
    units = models.PositiveIntegerField()
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'waqf_purchase'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} — {self.units} units of {self.product.name}"
```

## C2. Waqf Serializers + Views + URLs

```python
# apps/waqf/serializers.py
from rest_framework import serializers
from .models import WaqfProduct, WaqfPurchase


class WaqfProductSerializer(serializers.ModelSerializer):
    available_units = serializers.ReadOnlyField()
    progress_percentage = serializers.ReadOnlyField()
    raised_amount = serializers.ReadOnlyField()

    class Meta:
        model = WaqfProduct
        fields = [
            'id', 'name', 'name_ar', 'description', 'image',
            'price_per_unit', 'total_units', 'sold_units', 'available_units',
            'progress_percentage', 'raised_amount', 'is_active',
        ]


class BuyWaqfSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    units = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        try:
            product = WaqfProduct.objects.get(id=attrs['product_id'], is_active=True)
        except WaqfProduct.DoesNotExist:
            raise serializers.ValidationError({'product_id': 'Waqf product not found.'})
        
        if attrs['units'] > product.available_units:
            raise serializers.ValidationError(
                {'units': f'Only {product.available_units} units available.'}
            )
        attrs['product'] = product
        return attrs
```

```python
# apps/waqf/views.py
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
    """POST /api/waqf/buy/ — purchase waqf units from wallet balance."""
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
                {'errors': [f'Insufficient balance. Need {total_cost} SAR, have {wallet.balance} SAR.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        wallet.debit(
            amount=total_cost,
            source=TransactionSource.WAQF_PURCHASE,
            description=f"Waqf: {units} units of {product.name}",
        )

        purchase = WaqfPurchase.objects.create(
            user=request.user,
            product=product,
            units=units,
            amount_paid=total_cost,
        )
        product.sold_units += units
        product.save(update_fields=['sold_units', 'updated_at'])

        return Response({
            'message': f'Successfully purchased {units} unit(s) of {product.name}.',
            'amount_paid': str(total_cost),
            'remaining_balance': str(wallet.balance),
        }, status=status.HTTP_201_CREATED)
```

```python
# apps/waqf/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.WaqfProductListView.as_view(), name='waqf-list'),
    path('<int:pk>/', views.WaqfProductDetailView.as_view(), name='waqf-detail'),
    path('buy/', views.BuyWaqfView.as_view(), name='waqf-buy'),
]
```

---

## D. Run All Migrations

```bash
cd ~/code/shefa-react/backend
uv run python manage.py makemigrations wallet payment waqf
uv run python manage.py migrate
```

---

## E. Test Wallet + Donation Flow

```bash
# First login and get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"donor@test.com","password":"TestPass123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['tokens']['access'])")

echo "Token: $TOKEN"

# Check wallet (should be 0.00)
curl http://localhost:8000/api/wallet/ -H "Authorization: Bearer $TOKEN"

# Top up wallet
curl -X POST http://localhost:8000/api/wallet/top-up/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": "500.00"}'

# Check balance again
curl http://localhost:8000/api/wallet/ -H "Authorization: Bearer $TOKEN"

# Donate to a campaign (use slug from step 04)
curl -X POST http://localhost:8000/api/payments/donate/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"campaign": 1, "amount": "100.00", "donation_type": "one_time"}'

# Check wallet — balance should be 400.00
curl http://localhost:8000/api/wallet/ -H "Authorization: Bearer $TOKEN"

# Check campaign raised amount was updated
curl http://localhost:8000/api/campaigns/medical-aid-children/
```

---

## Checkpoint: Wallet, Payment & Waqf ✓

Confirm:
- [ ] Wallet auto-created when user registered
- [ ] Top-up adds to balance
- [ ] Donation deducts from wallet
- [ ] Campaign raised_amount updated after donation
- [ ] Signal fires correctly (check campaign endpoint after donation)
- [ ] Waqf products list at /api/waqf/

---

## NEXT

Tell the agent: **"Wallet and Waqf done, load 06-react-foundation.md"**
