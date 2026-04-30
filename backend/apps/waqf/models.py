from django.db import models
from django.conf import settings
from apps.common.models import TimestampedModel
from decimal import Decimal


class WaqfProduct(TimestampedModel):
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
        return f"{self.user.email} - {self.units} units of {self.product.name}"