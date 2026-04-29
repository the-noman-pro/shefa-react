from django.db import models
from django.conf import settings
from apps.common.models import TimestampedModel
from decimal import Decimal


class TransactionType(models.TextChoices):
    CREDIT = 'credit', 'Credit'
    DEBIT = 'debit', 'Debit'


class TransactionSource(models.TextChoices):
    TOP_UP = 'top_up', 'Top Up'
    DONATION = 'donation', 'Donation'
    WAQF_PURCHASE = 'waqf_purchase', 'Waqf Purchase'
    REFUND = 'refund', 'Refund'


class Wallet(TimestampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='wallet'
    )
    balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00')
    )

    class Meta:
        db_table = 'wallet'

    def __str__(self):
        return f"Wallet of {self.user.email} - Balance: {self.balance}"

    def can_afford(self, amount):
        return self.balance >= Decimal(str(amount))

    def credit(self, amount, source, reference='', description=''):
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
        amount = Decimal(str(amount))
        if not self.can_afford(amount):
            raise ValueError(
                f"Insufficient balance. Available: {self.balance}"
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
            balance_after=self.balance
        )


class WalletTransaction(TimestampedModel):
    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.PROTECT,
        related_name='transactions'
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
        return f"{self.transaction_type} {self.amount} - {self.wallet.user.email}"