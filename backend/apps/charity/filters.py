import django_filters
from django.db import models
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