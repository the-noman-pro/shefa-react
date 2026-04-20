from rest_framework import serializers
from .models import Charity


class CharityListSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    active_campaigns_count = serializers.ReadOnlyField()

    class Meta:
        model = Charity
        fields = [
            'id', 'name', 'name_ar', 'slug', 'category', 'city', 'logo_url', 'is_featured',
            'active_campaigns_count', 'total_raised'
        ]

    def get_logo_url(self, obj):
        request = self.context.get('request')
        if obj.logo and request:
            return request.build_absolute_uri(obj.logo.url)
        return None


class CharityDetailSerializer(CharityListSerializer):
    class Meta(CharityListSerializer.Meta):
        fields = CharityListSerializer.Meta.fields + [
            'description', 'description_ar', 'cover_image', 'email', 'phone', 'website',
            'registration_number', 'created_at',
        ]


class CharityWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Charity
        fields = [
            'name', 'name_ar', 'slug', 'description', 'description_ar',
            'logo', 'cover_image', 'category', 'city', 'email', 'phone',
            'website', 'is_active', 'is_featured', 'registration_number',
        ]