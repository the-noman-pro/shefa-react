from django.contrib.auth.models import AbstractUser
from django.db import models

class UserType(models.TextChoices):
    DONOR = 'donor', 'Donor'
    CHARITY_MANAGER = 'charity_manager', 'Charity Manager'
    AMBASSADOR = 'ambassador', 'Ambassador'
    ADMIN = 'admin', 'Admin'

class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True, unique=True)
    user_type = models.CharField(
        max_length=20,
        choices=UserType.choices,
        default=UserType.DONOR,
    )
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    national_id = models.CharField(max_length=20, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    bio = models.TextField(blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'account_user'
        ordering = ['-date_joined']
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    @property
    def full_name(self):
        return self.get_full_name() or self.username

    @property
    def is_donor(self):
        return self.user_type == UserType.DONOR

    @property
    def is_charity_manager(self):
        return self.user_type == UserType.CHARITY_MANAGER

    @property
    def is_ambassador(self):
        return self.user_type == UserType.AMBASSADOR