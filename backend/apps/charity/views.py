from rest_framework import generics, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from apps.common.permissions import IsSystemAdmin
from .models import Charity
from .serializers import CharityListSerializer, CharityDetailSerializer, CharityWriteSerializer
from .filters import CharityFilter


class CharityListView(generics.ListAPIView):
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
    permission_classes = [permissions.AllowAny]
    serializer_class = CharityDetailSerializer
    queryset = Charity.objects.filter(is_active=True)
    lookup_field = 'slug'

    def get_serializer_context(self):
        return {'request': self.request}


class CharityCreateView(generics.CreateAPIView):
    serializer_class = CharityWriteSerializer
    permission_classes = [IsSystemAdmin]
    queryset = Charity.objects.all()
    lookup_field = 'slug'

class CharityUpdateView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CharityWriteSerializer
    permission_classes = [IsSystemAdmin]
    queryset = Charity.objects.all()
    lookup_field = 'slug'