from django.db import models
from django.utils import timezone
from apps.common.models import TimestampedModel
from apps.charity.models import Charity


class CampaignStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    ACTIVE = 'active', 'Active'
    PAUSED = 'paused', 'Paused'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'


class CampaignCategory(models.TextChoices):
    MEDICAL = 'medical', 'Medical Treatment'
    ORPHAN = 'orphan', 'Orphan Sponsorship'
    EDUCATION = 'education', 'Education'
    FOOD = 'food', 'Food Aid'
    SHELTER = 'shelter', 'Shelter'
    WATER = 'water', 'Water Projects'
    ZAKAT = 'zakat', 'Zakat'
    SADAQAH = 'sadaqah', 'Sadaqah'
    WAQF = 'waqf', 'Waqf'
    GENERAL = 'general', 'General'


class Campaign(TimestampedModel):
    charity = models.ForeignKey(
        Charity,
        on_delete=models.PROTECT,
        related_name='campaigns',
    )
    title = models.CharField(max_length=300)
    title_ar = models.CharField(max_length=300, blank=True)
    slug = models.SlugField(unique=True, max_length=300)
    description = models.TextField()
    description_ar = models.TextField(blank=True)
    image = models.ImageField(upload_to='campaigns/', blank=True, null=True)
    category = models.CharField(
        max_length=30,
        choices=CampaignCategory.choices,
        default=CampaignCategory.GENERAL,
    )
    status = models.CharField(
        max_length=20,
        choices=CampaignStatus.choices,
        default=CampaignStatus.DRAFT,
    )
    target_amount = models.DecimalField(max_digits=14, decimal_places=2)
    raised_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    donors_count = models.PositiveIntegerField(default=0)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    is_featured = models.BooleanField(default=False)
    allow_anonymous = models.BooleanField(default=True)
    minimum_donation = models.DecimalField(max_digits=10, decimal_places=2, default=10)

    class Meta:
        db_table = 'campaign'
        ordering = ['-is_featured', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.charity.name})"

    @property
    def progress_percentage(self):
        if self.target_amount <= 0:
            return 0
        pct = (self.raised_amount / self.target_amount) * 100
        return min(float(pct), 100)

    @property
    def remaining_amount(self):
        return max(self.target_amount - self.raised_amount, 0)

    @property
    def is_active(self):
        return self.status == CampaignStatus.ACTIVE

    @property
    def days_remaining(self):
        if not self.end_date:
            return None
        delta = self.end_date - timezone.now().date()
        return max(delta.days, 0)

    def complete(self):
        self.status = CampaignStatus.COMPLETED
        self.save(update_fields=['status', 'updated_at'])