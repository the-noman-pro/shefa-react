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
    readonly_fields = ['raised_amount', 'donors_count', 'created_at', 'updated_at']
    list_editable = ['status', 'is_featured']
    raw_id_fields = ['charity']