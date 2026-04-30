from django.db import models
from django.conf import settings
from apps.common.models import TimestampedModel
from apps.campaign.models import Campaign


class PaymentMethod(models.TextChoices):
    WALLET = 'wallet', 'Wallet Balance'
    CARD = 'card', 'Credit/Debit Card'
    BANK = 'bank', 'Bank Transfer'


class DonationType(models.TextChoices):
    ONE_TIME = 'one_time', 'One-time'
    PERIODIC = 'periodic', 'Periodic (Monthly)'


class Donation(TimestampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
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