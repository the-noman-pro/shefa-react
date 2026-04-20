from rest_framework import serializers
from .models import Campaign
from apps.charity.serializers import CharityListSerializer


class CampaignListSerializer(serializers.ModelSerializer):
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
    from apps.charity.models import Charity as CharityModel
    charity = serializers.PrimaryKeyRelatedField(
        queryset=CharityModel.objects.filter(is_active=True)
    )

    class Meta:
        model = Campaign
        fields = [
            'charity', 'title', 'title_ar', 'slug', 'description', 'description_ar',
            'image', 'category', 'status', 'target_amount', 'start_date', 'end_date',
            'is_featured', 'allow_anonymous', 'minimum_donation',
        ]