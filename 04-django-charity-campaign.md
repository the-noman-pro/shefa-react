# Step 04: Charity & Campaign Apps

## Agent Instructions
Build the Charity and Campaign domain apps. These are the core content of the platform — charities are organizations, campaigns are fundraising drives that belong to charities. Show full file contents. After building each app, test its endpoints.

---

## What We're Building

**Charity App:**
- Organization model (name, logo, description, city, category)
- Public listing + detail endpoints
- Admin-only create/update/delete

**Campaign App:**
- Campaign model (belongs to charity, has target amount, progress tracking)
- Status lifecycle (ACTIVE → COMPLETED/PAUSED/CANCELLED)
- Public listing with filters
- Celery task to auto-complete campaigns at deadline

---

## PART A: Charity App

## A1. Charity Models

```python
# apps/charity/models.py
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
    """
    A charity organization registered on the platform.
    Charities own campaigns and receive donations.
    """
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
```

## A2. Charity Serializers

```python
# apps/charity/serializers.py
from rest_framework import serializers
from .models import Charity


class CharityListSerializer(serializers.ModelSerializer):
    """Compact serializer for listing charities."""
    logo_url = serializers.SerializerMethodField()
    active_campaigns_count = serializers.ReadOnlyField()

    class Meta:
        model = Charity
        fields = [
            'id', 'name', 'name_ar', 'slug', 'category', 'city',
            'logo_url', 'is_featured', 'active_campaigns_count', 'total_raised',
        ]

    def get_logo_url(self, obj):
        request = self.context.get('request')
        if obj.logo and request:
            return request.build_absolute_uri(obj.logo.url)
        return None


class CharityDetailSerializer(CharityListSerializer):
    """Full serializer for charity detail view."""

    class Meta(CharityListSerializer.Meta):
        fields = CharityListSerializer.Meta.fields + [
            'description', 'description_ar', 'cover_image',
            'email', 'phone', 'website', 'registration_number', 'created_at',
        ]


class CharityWriteSerializer(serializers.ModelSerializer):
    """For creating/updating charities (admin only)."""

    class Meta:
        model = Charity
        fields = [
            'name', 'name_ar', 'slug', 'description', 'description_ar',
            'logo', 'cover_image', 'category', 'city', 'email', 'phone',
            'website', 'is_active', 'is_featured', 'registration_number',
        ]
```

## A3. Charity Filters

```python
# apps/charity/filters.py
import django_filters
from .models import Charity, CharityCategory, City


class CharityFilter(django_filters.FilterSet):
    category = django_filters.ChoiceFilter(choices=CharityCategory.choices)
    city = django_filters.ChoiceFilter(choices=City.choices)
    is_featured = django_filters.BooleanFilter()
    search = django_filters.CharFilter(method='filter_search')

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            models.Q(name__icontains=value) | models.Q(description__icontains=value)
        )

    class Meta:
        model = Charity
        fields = ['category', 'city', 'is_featured']
```

Fix the import — add `from django.db import models` at top of `filters.py`.

## A4. Charity Views

```python
# apps/charity/views.py
from rest_framework import generics, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from apps.common.permissions import IsSystemAdmin
from .models import Charity
from .serializers import CharityListSerializer, CharityDetailSerializer, CharityWriteSerializer
from .filters import CharityFilter


class CharityListView(generics.ListAPIView):
    """
    GET /api/charities/
    Public endpoint — lists active charities.
    Supports filtering by category, city, is_featured.
    Supports search by name/description.
    """
    serializer_class = CharityListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CharityFilter
    search_fields = ['name', 'name_ar', 'description']
    ordering_fields = ['name', 'created_at', 'total_raised']
    ordering = ['-is_featured', '-created_at']

    def get_queryset(self):
        return Charity.objects.filter(is_active=True)

    def get_serializer_context(self):
        return {'request': self.request}


class CharityDetailView(generics.RetrieveAPIView):
    """
    GET /api/charities/<id>/
    GET /api/charities/<slug>/
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CharityDetailSerializer
    queryset = Charity.objects.filter(is_active=True)
    lookup_field = 'slug'

    def get_serializer_context(self):
        return {'request': self.request}


class CharityCreateView(generics.CreateAPIView):
    """
    POST /api/charities/   — admin only
    """
    serializer_class = CharityWriteSerializer
    permission_classes = [IsSystemAdmin]


class CharityUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """
    PUT/PATCH/DELETE /api/charities/<slug>/manage/   — admin only
    """
    serializer_class = CharityWriteSerializer
    permission_classes = [IsSystemAdmin]
    queryset = Charity.objects.all()
    lookup_field = 'slug'
```

## A5. Charity URLs

```python
# apps/charity/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.CharityListView.as_view(), name='charity-list'),
    path('create/', views.CharityCreateView.as_view(), name='charity-create'),
    path('<slug:slug>/', views.CharityDetailView.as_view(), name='charity-detail'),
    path('<slug:slug>/manage/', views.CharityUpdateView.as_view(), name='charity-manage'),
]
```

## A6. Charity Admin

```python
# apps/charity/admin.py
from django.contrib import admin
from .models import Charity


@admin.register(Charity)
class CharityAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'city', 'is_active', 'is_featured', 'total_raised', 'created_at']
    list_filter = ['category', 'city', 'is_active', 'is_featured']
    search_fields = ['name', 'email', 'registration_number']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['total_raised', 'created_at', 'updated_at']
```

---

## PART B: Campaign App

## B1. Campaign Models

```python
# apps/campaign/models.py
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
    """
    A fundraising campaign run by a charity.
    Tracks donation progress toward a target amount.
    """
    charity = models.ForeignKey(
        Charity,
        on_delete=models.CASCADE,
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
        from django.utils import timezone
        delta = self.end_date - timezone.now().date()
        return max(delta.days, 0)

    def complete(self):
        """Mark campaign as completed."""
        self.status = CampaignStatus.COMPLETED
        self.save(update_fields=['status', 'updated_at'])
```

## B2. Campaign Serializers

```python
# apps/campaign/serializers.py
from rest_framework import serializers
from .models import Campaign
from apps.charity.serializers import CharityListSerializer


class CampaignListSerializer(serializers.ModelSerializer):
    """Compact serializer for campaign lists."""
    charity = CharityListSerializer(read_only=True)
    charity_id = serializers.PrimaryKeyRelatedField(
        source='charity',
        read_only=True,
    )
    progress_percentage = serializers.ReadOnlyField()
    remaining_amount = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            'id', 'charity', 'charity_id', 'title', 'title_ar', 'slug',
            'category', 'status', 'image_url',
            'target_amount', 'raised_amount', 'donors_count',
            'progress_percentage', 'remaining_amount', 'days_remaining',
            'start_date', 'end_date', 'is_featured',
        ]

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class CampaignDetailSerializer(CampaignListSerializer):
    class Meta(CampaignListSerializer.Meta):
        fields = CampaignListSerializer.Meta.fields + [
            'description', 'description_ar', 'minimum_donation',
            'allow_anonymous', 'created_at',
        ]


class CampaignWriteSerializer(serializers.ModelSerializer):
    """For creating/updating campaigns (charity managers/admins)."""
    from apps.charity.models import Charity as CharityModel
    charity = serializers.PrimaryKeyRelatedField(queryset=CharityModel.objects.filter(is_active=True))

    class Meta:
        model = Campaign
        fields = [
            'charity', 'title', 'title_ar', 'slug', 'description', 'description_ar',
            'image', 'category', 'status', 'target_amount', 'start_date', 'end_date',
            'is_featured', 'allow_anonymous', 'minimum_donation',
        ]
```

## B3. Campaign Filters

```python
# apps/campaign/filters.py
import django_filters
from .models import Campaign, CampaignStatus, CampaignCategory


class CampaignFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=CampaignStatus.choices)
    category = django_filters.ChoiceFilter(choices=CampaignCategory.choices)
    charity = django_filters.NumberFilter(field_name='charity__id')
    charity_slug = django_filters.CharFilter(field_name='charity__slug')
    is_featured = django_filters.BooleanFilter()
    min_target = django_filters.NumberFilter(field_name='target_amount', lookup_expr='gte')
    max_target = django_filters.NumberFilter(field_name='target_amount', lookup_expr='lte')

    class Meta:
        model = Campaign
        fields = ['status', 'category', 'charity', 'is_featured']
```

## B4. Campaign Views

```python
# apps/campaign/views.py
from rest_framework import generics, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from apps.common.permissions import IsSystemAdmin
from .models import Campaign, CampaignStatus
from .serializers import CampaignListSerializer, CampaignDetailSerializer, CampaignWriteSerializer
from .filters import CampaignFilter


class CampaignListView(generics.ListAPIView):
    """
    GET /api/campaigns/
    Public — lists active campaigns. Filter by charity, category, status.
    """
    serializer_class = CampaignListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CampaignFilter
    search_fields = ['title', 'title_ar', 'description']
    ordering_fields = ['created_at', 'raised_amount', 'target_amount', 'end_date']
    ordering = ['-is_featured', '-created_at']

    def get_queryset(self):
        return Campaign.objects.filter(
            status=CampaignStatus.ACTIVE,
        ).select_related('charity')

    def get_serializer_context(self):
        return {'request': self.request}


class CampaignDetailView(generics.RetrieveAPIView):
    """GET /api/campaigns/<slug>/"""
    permission_classes = [permissions.AllowAny]
    serializer_class = CampaignDetailSerializer
    queryset = Campaign.objects.select_related('charity')
    lookup_field = 'slug'

    def get_serializer_context(self):
        return {'request': self.request}


class CampaignCreateView(generics.CreateAPIView):
    """POST /api/campaigns/  — admin/charity manager only"""
    serializer_class = CampaignWriteSerializer
    permission_classes = [IsSystemAdmin]


class CampaignUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """PUT/PATCH/DELETE /api/campaigns/<slug>/manage/"""
    serializer_class = CampaignWriteSerializer
    permission_classes = [IsSystemAdmin]
    queryset = Campaign.objects.all()
    lookup_field = 'slug'
```

## B5. Campaign Celery Task

```python
# apps/campaign/tasks.py
from celery import shared_task
from django.utils import timezone


@shared_task
def auto_complete_expired_campaigns():
    """
    Periodic task: check campaigns that have passed their end_date
    and auto-complete them.
    
    Schedule this in settings or beat_schedule.
    """
    from .models import Campaign, CampaignStatus
    
    today = timezone.now().date()
    expired = Campaign.objects.filter(
        status=CampaignStatus.ACTIVE,
        end_date__lt=today,
    )
    count = expired.count()
    expired.update(status=CampaignStatus.COMPLETED)
    return f"Auto-completed {count} campaigns."


@shared_task
def update_campaign_raised_amount(campaign_id):
    """
    Recalculate a campaign's raised_amount from all confirmed donations.
    Called after each successful donation.
    """
    from .models import Campaign
    from django.db.models import Sum
    
    try:
        campaign = Campaign.objects.get(id=campaign_id)
    except Campaign.DoesNotExist:
        return
    
    # Will aggregate from Donation model (built in step 05)
    # For now, just a placeholder
    pass
```

## B6. Campaign URLs

```python
# apps/campaign/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.CampaignListView.as_view(), name='campaign-list'),
    path('create/', views.CampaignCreateView.as_view(), name='campaign-create'),
    path('<slug:slug>/', views.CampaignDetailView.as_view(), name='campaign-detail'),
    path('<slug:slug>/manage/', views.CampaignUpdateView.as_view(), name='campaign-manage'),
]
```

## B7. Campaign Admin

```python
# apps/campaign/admin.py
from django.contrib import admin
from .models import Campaign


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'charity', 'category', 'status',
        'target_amount', 'raised_amount', 'progress_percentage',
        'start_date', 'end_date', 'is_featured',
    ]
    list_filter = ['status', 'category', 'is_featured', 'charity']
    search_fields = ['title', 'description']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['raised_amount', 'donors_count', 'progress_percentage', 'created_at']
    list_editable = ['status', 'is_featured']
    raw_id_fields = ['charity']
```

---

## C. Run Migrations and Create Test Data

```bash
cd ~/code/shefa-react/backend

uv run python manage.py makemigrations charity campaign
uv run python manage.py migrate
```

Create test data via Django shell:
```bash
uv run python manage.py shell
```

Inside shell:
```python
from apps.charity.models import Charity
from apps.campaign.models import Campaign
from django.utils import timezone

# Create a charity
c = Charity.objects.create(
    name="Hope Foundation",
    slug="hope-foundation",
    description="Helping those in need since 2010.",
    category="health",
    city="riyadh",
    email="info@hope.org",
    is_active=True,
    is_featured=True,
)

# Create a campaign
from datetime import date, timedelta
camp = Campaign.objects.create(
    charity=c,
    title="Medical Aid for Children",
    slug="medical-aid-children",
    description="Providing medical care for underprivileged children.",
    category="medical",
    status="active",
    target_amount=50000,
    raised_amount=12500,
    donors_count=45,
    start_date=date.today(),
    end_date=date.today() + timedelta(days=30),
    is_featured=True,
)
print("Created:", c, camp)
exit()
```

---

## D. Test the Endpoints

```bash
# List charities
curl http://localhost:8000/api/charities/

# List campaigns
curl http://localhost:8000/api/campaigns/

# Campaign detail
curl http://localhost:8000/api/campaigns/medical-aid-children/

# Filter campaigns by category
curl "http://localhost:8000/api/campaigns/?category=medical"

# Filter by charity
curl "http://localhost:8000/api/campaigns/?charity_slug=hope-foundation"
```

---

## Checkpoint: Charity & Campaign ✓

Confirm:
- [ ] `/api/charities/` returns list of charities
- [ ] `/api/campaigns/` returns list of active campaigns
- [ ] `/api/campaigns/medical-aid-children/` returns campaign detail with progress data
- [ ] Filtering by category/charity works
- [ ] Migrations ran without errors

---

## NEXT

Tell the agent: **"Charity and Campaign done, load 05-django-wallet-waqf.md"**
