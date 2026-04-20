from rest_framework import generics, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from apps.common.permissions import IsSystemAdmin
from .models import Campaign, CampaignStatus
from .serializers import CampaignListSerializer, CampaignDetailSerializer, CampaignWriteSerializer
from .filters import CampaignFilter


class CampaignListView(generics.ListAPIView):
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
    permission_classes = [permissions.AllowAny]
    serializer_class = CampaignDetailSerializer
    queryset = Campaign.objects.select_related('charity')
    lookup_field = 'slug'

    def get_serializer_context(self):
        return {'request': self.request}


class CampaignCreateView(generics.CreateAPIView):
    serializer_class = CampaignWriteSerializer
    permission_classes = [IsSystemAdmin]


class CampaignUpdateView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CampaignWriteSerializer
    permission_classes = [IsSystemAdmin]
    queryset = Campaign.objects.all()
    lookup_field = 'slug'