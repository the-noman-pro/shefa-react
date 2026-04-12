# Step 02: Django Project Foundation

## Agent Instructions
Guide the user through restructuring the Django project. All commands run from `~/code/shefa-react/backend/`. Show full file contents when asking user to create files — no fragments. After each section, ask the user to confirm it worked before moving on.

---

## What We're Building

The Django project foundation:
- Restructured settings (base/development/production)
- Custom pagination class
- Common app: shared permissions, pagination, base models
- URL structure
- Celery configuration
- Swagger/OpenAPI docs
- First working `manage.py runserver`

---

## 1. Restructure Settings

The original Shefa project uses a single `settings.py`. We'll use a split structure for better environment management.

```bash
cd ~/code/shefa-react/backend
mkdir -p project/settings
touch project/settings/__init__.py
```

### Create `project/settings/base.py`

Move everything from `project/settings.py` into `project/settings/base.py`. The file should already exist from step 01 — rename it:

```bash
mv project/settings.py project/settings/base.py
```

### Create `project/settings/development.py`

```python
# project/settings/development.py
from .base import *

DEBUG = True

INSTALLED_APPS += [
    'django_extensions',
]

# Show SQL queries in development
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
        },
    },
}
```

### Create `project/settings/production.py`

```python
# project/settings/production.py
from .base import *

DEBUG = False

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

### Update `manage.py`

Edit `manage.py` — change the settings module line:

```python
# Change this line:
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')

# To this:
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings.development')
```

Also update `project/wsgi.py` and `project/asgi.py` the same way.

---

## 2. Create the Common App Foundation

The `common` app holds shared code used across all other apps: base models, pagination, permissions, exceptions.

### `apps/common/models.py` — Base Model

```python
# apps/common/models.py
from django.db import models
import uuid


class TimestampedModel(models.Model):
    """Abstract base model with created_at and updated_at fields.
    
    All domain models should inherit from this.
    The original Shefa uses sitech-django-models for this — we implement it directly.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']


class UUIDModel(TimestampedModel):
    """Abstract base model with UUID primary key."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True
```

### `apps/common/pagination.py`

```python
# apps/common/pagination.py
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    """Standard pagination used across all list endpoints.
    
    Returns: { count, next, previous, results }
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'results': data,
        })


class LargePagination(PageNumberPagination):
    """For endpoints that return more items, e.g. dropdowns."""
    page_size = 100
    max_page_size = 500
```

### `apps/common/permissions.py`

```python
# apps/common/permissions.py
from rest_framework.permissions import BasePermission


class IsSystemAdmin(BasePermission):
    """Only allow system admins (staff or superuser)."""
    
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser)
        )


class IsOwner(BasePermission):
    """Only allow the owner of an object."""
    
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class IsOwnerOrAdmin(BasePermission):
    """Allow owner or admin."""
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or request.user.is_superuser:
            return True
        return obj.user == request.user


class ReadOnly(BasePermission):
    """Allow GET, HEAD, OPTIONS only."""
    
    def has_permission(self, request, view):
        return request.method in ('GET', 'HEAD', 'OPTIONS')
```

### `apps/common/exceptions.py`

```python
# apps/common/exceptions.py
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """Custom exception handler that formats errors consistently."""
    response = exception_handler(exc, context)

    if response is not None:
        # Normalize all errors to { "errors": [...] }
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                response.data = {
                    'errors': [str(response.data['detail'])],
                    'status_code': response.status_code,
                }
            else:
                errors = []
                for field, messages in response.data.items():
                    if isinstance(messages, list):
                        for msg in messages:
                            errors.append(f"{field}: {msg}")
                    else:
                        errors.append(f"{field}: {messages}")
                response.data = {
                    'errors': errors,
                    'status_code': response.status_code,
                }
        elif isinstance(response.data, list):
            response.data = {
                'errors': [str(e) for e in response.data],
                'status_code': response.status_code,
            }

    return response
```

Add to `base.py` settings:
```python
# In REST_FRAMEWORK config, add:
'EXCEPTION_HANDLER': 'apps.common.exceptions.custom_exception_handler',
```

### `apps/common/apps.py`

```python
# apps/common/apps.py
from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.common'
```

### `apps/__init__.py`

```bash
touch apps/__init__.py
```

Each app needs its `apps.py` updated. For each app under `apps/`, update `apps.py`:

```python
# Example: apps/charity/apps.py
from django.apps import AppConfig

class CharityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.charity'
```

Do the same for: account, campaign, wallet, waqf, payment, auditlog (change `name` to `apps.<appname>`).

---

## 3. Set Up Celery

```python
# project/celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings.development')

app = Celery('shefa')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
```

Update `project/__init__.py`:
```python
# project/__init__.py
from .celery import app as celery_app

__all__ = ('celery_app',)
```

---

## 4. Root URL Configuration

```python
# project/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API schema
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API routes (added as we build each app)
    path('api/auth/', include('apps.account.urls')),
    path('api/charities/', include('apps.charity.urls')),
    path('api/campaigns/', include('apps.campaign.urls')),
    path('api/wallet/', include('apps.wallet.urls')),
    path('api/waqf/', include('apps.waqf.urls')),
    path('api/payments/', include('apps.payment.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
```

Create empty URL files for each app:
```bash
for app in account charity campaign wallet waqf payment auditlog; do
    echo "from django.urls import path
urlpatterns = []" > apps/$app/urls.py
done
```

---

## 5. Create a Placeholder User Model

Before we can run migrations, Django needs the `AUTH_USER_MODEL = 'account.User'` to exist.

Create a minimal placeholder in `apps/account/models.py`:

```python
# apps/account/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model — extended in step 03."""
    pass
```

And `apps/account/apps.py`:
```python
from django.apps import AppConfig

class AccountConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.account'
```

---

## 6. Run First Migration

```bash
cd ~/code/shefa-react/backend

uv run python manage.py makemigrations
uv run python manage.py migrate
```

Expected output: a list of applied migrations including auth, admin, contenttypes, etc.

Create superuser:
```bash
uv run python manage.py createsuperuser
# Enter: admin / admin@shefa.com / password123
```

---

## 7. Start Django Dev Server

```bash
uv run python manage.py runserver 8000
```

Test these URLs in your browser:
- http://localhost:8000/admin/ — Django admin (login with superuser)
- http://localhost:8000/api/schema/swagger-ui/ — Swagger UI (should show empty API)
- http://localhost:8000/api/schema/redoc/ — ReDoc

---

## 8. Configure pytest

Create `pytest.ini`:
```ini
[pytest]
DJANGO_SETTINGS_MODULE = project.settings.development
python_files = tests/*.py tests/**/*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
```

Create `tests/` directory:
```bash
mkdir -p tests
touch tests/__init__.py
```

Test that pytest works:
```bash
uv run pytest
# Expected: "no tests ran" with exit 0
```

---

## Checkpoint: Django Foundation ✓

Confirm:
- [ ] `manage.py runserver` starts without errors
- [ ] Admin at /admin/ works
- [ ] Swagger UI at /api/schema/swagger-ui/ loads
- [ ] `manage.py migrate` ran successfully
- [ ] `pytest` runs (even with 0 tests)

---

## NEXT

Tell the agent: **"Django foundation done, load 03-django-auth.md"**
