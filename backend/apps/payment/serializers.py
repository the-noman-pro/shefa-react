from rest_framework import serializers
from .models import Donation
from apps.campaign.serializers import CampaignListSerializer


class DonationSerializer(serializers.ModelSerializer):
    campaign_info = CampaignListSerializer(source='campaign', read_only=True)
    donor_name = serializers.SerializerMethodField()

    class Meta:
        model = Donation
        fields = [
            'id', 'campaign', 'campaign_info', 'amount', 'donation_type',
            'is_anonymous', 'note', 'payment_method', 'is_confirmed',
            'donor_name', 'created_at',
        ]
        read_only_fields = ['id', 'is_confirmed', 'created_at']

    def get_donor_name(self, obj):
        if obj.is_anonymous or not obj.user:
            return 'Anonymous'
        return obj.user.full_name


class CreateDonationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donation
        fields = ['campaign', 'amount', 'donation_type', 'is_anonymous', 'note']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive.")
        return value

    def validate(self, attrs):
        campaign = attrs['campaign']
        if not campaign.is_active:
            raise serializers.ValidationError(
                {'campaign': 'This campaign is not currently accepting donations'}
            )
        if attrs['amount'] < campaign.minimum_donation:
            raise serializers.ValidationError(
                {'amount': f'Minimum donation is {campaign.minimum_donation} SAR.'}
            )
        return attrs