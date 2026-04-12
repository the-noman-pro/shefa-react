# Step 03: Django Authentication System

## Agent Instructions
Build the complete auth system. Show full file contents. After creating each file, ask the user to run the migrations and test the endpoints with curl. The `apps/account/` app is the core of auth.

---

## What We're Building

- Full custom User model (extending AbstractUser)
- UserType enum (DONOR, CHARITY_MANAGER, AMBASSADOR, ADMIN)
- Registration endpoint
- Login endpoint (returns JWT access + refresh tokens)
- Token refresh endpoint
- User profile endpoint (get/update)
- Change password
- Logout (token blacklist)

---

## 1. Full User Model

Replace the placeholder in `apps/account/models.py`:

```python
# apps/account/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from apps.common.models import TimestampedModel


class UserType(models.TextChoices):
    DONOR = 'donor', 'Donor'
    CHARITY_MANAGER = 'charity_manager', 'Charity Manager'
    AMBASSADOR = 'ambassador', 'Ambassador'
    ADMIN = 'admin', 'Admin'


class User(AbstractUser):
    """
    Custom user model for the Shefa platform.
    
    Extends AbstractUser (which already has: username, email, first_name, 
    last_name, password, is_active, is_staff, is_superuser, date_joined).
    
    We add: phone, user_type, avatar, national_id, is_verified.
    """
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

    # Use email as the login field instead of username
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
```

---

## 2. Auth Serializers

```python
# apps/account/serializers.py
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Read-only user info — returned in auth responses and profile endpoint."""
    full_name = serializers.ReadOnlyField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'phone', 'user_type', 'avatar_url',
            'is_verified', 'date_joined',
        ]
        read_only_fields = ['id', 'email', 'date_joined', 'is_verified']

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


class RegisterSerializer(serializers.ModelSerializer):
    """User registration — creates a new DONOR account by default."""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
    )
    tokens = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'phone', 'password', 'password_confirm', 'tokens',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value.lower()

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            **validated_data,
            user_type='donor',
        )
        user.set_password(password)
        user.save()
        return user

    def get_tokens(self, obj):
        refresh = RefreshToken.for_user(obj)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }


class LoginSerializer(serializers.Serializer):
    """Email + password login — returns JWT tokens."""
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(style={'input_type': 'password'})
    new_password = serializers.CharField(
        style={'input_type': 'password'},
        validators=[validate_password],
    )
    new_password_confirm = serializers.CharField(style={'input_type': 'password'})

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password': 'Passwords do not match.'})
        return attrs


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'bio', 'date_of_birth', 'avatar']
```

---

## 3. Auth Views

```python
# apps/account/views.py
from django.contrib.auth import get_user_model, authenticate
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from drf_spectacular.utils import extend_schema

from .serializers import (
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    UpdateProfileSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Create a new user account. Returns user data + JWT tokens.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'user': UserSerializer(user, context={'request': request}).data,
                'tokens': serializer.data['tokens'],
                'message': 'Registration successful.',
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/auth/login/
    Authenticate with email + password. Returns JWT tokens.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer

    @extend_schema(request=LoginSerializer, responses={200: UserSerializer})
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        user = authenticate(request, username=email, password=password)

        if user is None:
            return Response(
                {'errors': ['Invalid email or password.']},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {'errors': ['Your account has been disabled.']},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
        })


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklist the refresh token (invalidate session).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'errors': ['Refresh token is required.']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            pass  # Token already invalid — that's fine
        return Response({'message': 'Logged out successfully.'})


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/auth/profile/   — get current user's profile
    PATCH /api/auth/profile/  — update current user's profile
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UpdateProfileSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_context(self):
        return {'request': self.request}


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Change the current user's password.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not request.user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'errors': ['Current password is incorrect.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Password changed successfully.'})


class UserListView(generics.ListAPIView):
    """
    GET /api/auth/users/   — admin only
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all().order_by('-date_joined')
    filterset_fields = ['user_type', 'is_active', 'is_verified']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
```

---

## 4. URL Configuration for Auth

```python
# apps/account/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Registration & Login
    path('register/', views.RegisterView.as_view(), name='auth-register'),
    path('login/', views.LoginView.as_view(), name='auth-login'),
    path('logout/', views.LogoutView.as_view(), name='auth-logout'),
    
    # Token management
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # Profile
    path('profile/', views.ProfileView.as_view(), name='auth-profile'),
    path('change-password/', views.ChangePasswordView.as_view(), name='auth-change-password'),
    
    # Admin
    path('users/', views.UserListView.as_view(), name='auth-users'),
]
```

---

## 5. Enable JWT Token Blacklist

To support logout (token invalidation), add to `INSTALLED_APPS` in `settings/base.py`:

```python
THIRD_PARTY_APPS = [
    ...
    'rest_framework_simplejwt.token_blacklist',  # add this
]
```

---

## 6. Register User Model in Admin

```python
# apps/account/admin.py
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
```

---

## 7. Run Migrations

```bash
cd ~/code/shefa-react/backend

uv run python manage.py makemigrations account
uv run python manage.py makemigrations
uv run python manage.py migrate
```

Expected: migrations for `account`, `token_blacklist`.

---

## 8. Test Auth Endpoints

Start the server:
```bash
uv run python manage.py runserver 8000
```

In a new terminal, test with curl:

### Register
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "donor@test.com",
    "username": "testdonor",
    "first_name": "Ahmed",
    "last_name": "Ali",
    "phone": "+966501234567",
    "password": "TestPass123!",
    "password_confirm": "TestPass123!"
  }'
```

Expected response:
```json
{
  "user": { "id": 2, "email": "donor@test.com", ... },
  "tokens": {
    "access": "eyJ0...",
    "refresh": "eyJ0..."
  },
  "message": "Registration successful."
}
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "donor@test.com", "password": "TestPass123!"}'
```

### Get Profile (copy your access token)
```bash
curl http://localhost:8000/api/auth/profile/ \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

### Refresh Token
```bash
curl -X POST http://localhost:8000/api/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "<YOUR_REFRESH_TOKEN>"}'
```

---

## 9. Write a Basic Test

```python
# tests/test_auth.py
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_data():
    return {
        'email': 'test@shefa.com',
        'username': 'testuser',
        'first_name': 'Test',
        'last_name': 'User',
        'password': 'TestPass123!',
        'password_confirm': 'TestPass123!',
    }


@pytest.mark.django_db
class TestRegistration:
    def test_register_success(self, api_client, user_data):
        url = reverse('auth-register')
        response = api_client.post(url, user_data, format='json')
        assert response.status_code == 201
        assert 'tokens' in response.data
        assert 'access' in response.data['tokens']
        assert User.objects.filter(email='test@shefa.com').exists()

    def test_register_duplicate_email(self, api_client, user_data):
        User.objects.create_user(
            email='test@shefa.com',
            username='existing',
            password='Pass123!',
        )
        url = reverse('auth-register')
        response = api_client.post(url, user_data, format='json')
        assert response.status_code == 400


@pytest.mark.django_db
class TestLogin:
    def test_login_success(self, api_client):
        User.objects.create_user(
            email='login@shefa.com',
            username='loginuser',
            password='TestPass123!',
        )
        url = reverse('auth-login')
        response = api_client.post(url, {
            'email': 'login@shefa.com',
            'password': 'TestPass123!',
        }, format='json')
        assert response.status_code == 200
        assert 'tokens' in response.data

    def test_login_wrong_password(self, api_client):
        url = reverse('auth-login')
        response = api_client.post(url, {
            'email': 'login@shefa.com',
            'password': 'WrongPass!',
        }, format='json')
        assert response.status_code == 401
```

Run tests:
```bash
uv run pytest tests/test_auth.py -v
```

---

## Checkpoint: Auth System ✓

Confirm:
- [ ] Registration endpoint returns tokens
- [ ] Login endpoint works
- [ ] Profile endpoint requires auth token
- [ ] Token refresh works
- [ ] Tests pass

---

## NEXT

Tell the agent: **"Auth done, load 04-django-charity-campaign.md"**
