from django.contrib.admin.helpers import Fieldset
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'full_name', 'user_type', 'is_verified', 'is_active', 'date_joined']
    list_filter = ['user_type', 'is_verified', 'is_active', 'is_staff']
    search_fields = ['email', 'username', 'first_name', 'last_name', 'phone']
    ordering = ['-date_joined']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Shefa Profile', {
            'fields': ('phone', 'user_type', 'avatar', 'national_id', 'is_verified', 'bio', 'date_of_birth'),
        }),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Shefa Profile', {
            'fields': ('email', 'phone', 'user_type'),
        }),
    )