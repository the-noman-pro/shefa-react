from django.db import models
from apps.common.models import TimestampedModel


class CharityCategory(models.TextChoices):
    HEALTH = 'health', 'Health'
    EDUCATION = 'education', 'Education'
    FOOD = 'food', 'Food & Water'
    SHELTER = 'shelter', 'Shelter'
    ORPHANS = 'orphans', 'Orphans'
    ELDERLY = 'elderly', 'Elderly'
    DISABILITY = 'disability', 'People with Disability'
    GENERAL = 'general', 'General'


class City(models.TextChoices):
    RIYADH = 'riyadh', 'Riyadh'
    JEDDAH = 'jeddah', 'Jeddah'
    MECCA = 'mecca', 'Mecca'
    MEDINA = 'medina', 'Medina'
    DAMMAM = 'dammam', 'Dammam'
    KHOBAR = 'khobar', 'Al Khobar'
    TAIF = 'taif', 'Taif'
    OTHER = 'other', 'Other'


class Charity(TimestampedModel):
    name = models.CharField(max_length=200)
    name_ar = models.CharField(max_length=200, blank=True)
    slug = models.SlugField(unique=True, max_length=200)
    description = models.TextField()
    description_ar = models.TextField(blank=True)
    logo = models.ImageField(upload_to='charities/logos/', blank=True, null=True)
    cover_image = models.ImageField(upload_to='charities/covers/', blank=True, null=True)
    category = models.CharField(
        max_length=30,
        choices=CharityCategory.choices,
        default=CharityCategory.GENERAL,
    )
    city = models.CharField(
        max_length=30,
        choices=City.choices,
        blank=True,
    )
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    registration_number = models.CharField(max_length=50, blank=True)
    total_raised = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = 'charity'
        verbose_name_plural = 'charities'
        ordering = ['-is_featured', '-created_at']

    def __str__(self):
        return self.name

    @property
    def active_campaigns_count(self):
        return self.campaigns.filter(status='active').count()