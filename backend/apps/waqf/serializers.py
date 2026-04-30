from rest_framework import serializers
from .models import WaqfProduct, WaqfPurchase


class WaqfProductSerializer(serializers.ModelSerializer):
    available_units = serializers.ReadOnlyField()
    progress_percentage = serializers.ReadOnlyField()
    raised_amount = serializers.ReadOnlyField()

    class Meta:
        model = WaqfProduct
        fields = [
            'id', 'name', 'name_ar', 'description', 'image',
            'price_per_unit', 'total_units', 'sold_units', 'available_units',
            'progress_percentage', 'raised_amount', 'is_active',
        ]


class BuyWaqfSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    units = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        try:
            product = WaqfProduct.objects.get(id=attrs['product_id'], is_active=True)
        except WaqfProduct.DoesNotExist:
            raise serializers.ValidationError({'product_id': 'Waqf product not found.'})

        if attrs['units'] > product.available_units:
            raise serializers.ValidationError(
                {'units': f'Only {product.available_units} units available.'}
            )
        attrs['product'] = product
        return attrs