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