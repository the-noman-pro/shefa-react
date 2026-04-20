from django.contrib import admin
from .models import Charity


@admin.register(Charity)
class CharityAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'city', 'is_active', 'is_featured', 'total_raised', 'created_at']
    list_filter = ['category', 'city', 'is_active', 'is_featured']
    search_fields = ['name', 'email', 'registration_number']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['total_raised', 'created_at', 'updated_at']
    list_editable = ['is_active', 'is_featured']