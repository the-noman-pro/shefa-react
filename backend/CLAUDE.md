# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context

Backend for the Shefa charity / waqf / donation platform. Built as part of a step-by-step learning guide (see `../CLAUDE.md` and `../0X-*.md` files) — the guide drives feature ordering and teaching style. When users invoke the guide, follow `../CLAUDE.md` rules (one file at a time, explain every flag, etc.). For direct code work in this dir, the conventions below apply.

## Commands

Package manager is **uv** (not pip/poetry). Always prefix Django/test commands with `uv run`.

```bash
# Install / sync deps
uv sync

# Add a runtime dep
uv add <package>

# Add a dev-only dep
uv add --dev <package>

# Django management
uv run python manage.py runserver
uv run python manage.py makemigrations
uv run python manage.py migrate
uv run python manage.py createsuperuser
uv run python manage.py shell_plus           # django-extensions
uv run python manage.py collectstatic

# Tests (pytest + pytest-django)
uv run pytest                                # all tests
uv run pytest tests/test_auth.py             # single file
uv run pytest tests/test_auth.py::TestName::test_method   # single test
uv run pytest -k <expr>                      # by name pattern
uv run pytest --cov=apps                     # with coverage

# Lint / format
uv run black .
uv run isort .
uv run flake8

# Celery worker (broker = Redis)
uv run celery -A project worker -l info
uv run celery -A project beat -l info
```

`manage.py` defaults `DJANGO_SETTINGS_MODULE` to `project.settings.development`. `pytest.ini` does the same. Production uses `project.settings.production`.

Required env vars (read via `python-decouple` from `.env`): `SECRET_KEY`, `DATABASE_URL`, `DEBUG`, `ALLOWED_HOSTS`, `REDIS_URL`, `CORS_ALLOWED_ORIGINS`.

API schema served at `/api/schema/swagger-ui/` and `/api/schema/redoc/`.

## Architecture

### Layout
- `project/` — Django config. `settings/` split into `base.py` + `development.py` / `production.py`. `urls.py` mounts every app under `/api/<app>/`. `celery.py` bootstraps the Celery app named `shefa`.
- `apps/` — domain apps, each a Django app with the standard `models.py`, `serializers.py`, `views.py`, `urls.py`, `filters.py`, `admin.py`, `migrations/`. Apps are registered as `apps.<name>` (note dotted path) in `INSTALLED_APPS`.
- `tests/` — top-level test dir. `pytest.ini` discovers `tests/*.py` and `tests/**/*.py`. Per-app `tests.py` files exist but are stubs; new tests go under `tests/`.

### Domain apps
- `account` — custom `User` model (`AUTH_USER_MODEL = 'account.User'`). Email is `USERNAME_FIELD`. `UserType` enum: donor / charity_manager / ambassador / admin.
- `common` — shared infra: `TimestampedModel`, `UUIDModel` abstract bases; `pagination.StandardPagination`; `exceptions.custom_exception_handler` (wired as DRF `EXCEPTION_HANDLER`); `permissions`. Inherit from these abstract models for new domain models.
- `charity`, `campaign`, `waqf`, `wallet`, `payment`, `auditlog` — domain modules. Cross-app references should go through FK to the app's model (not duplicate fields).

### Cross-cutting conventions
- Auth: SimpleJWT (`Bearer` header). Access token 1h, refresh 7d, rotates on refresh, no blacklist on rotation. Default DRF permission is `IsAuthenticated` — public endpoints must opt out explicitly.
- Pagination: `StandardPagination` with `PAGE_SIZE = 20` applies globally.
- Filtering: `DjangoFilterBackend`, `SearchFilter`, `OrderingFilter` enabled by default — define `filterset_class` / `search_fields` / `ordering_fields` on `ViewSet`s.
- Cache & Celery broker: both use `REDIS_URL` (django-redis backend, Celery JSON serializer, `Asia/Riyadh` tz).
- Errors: route through `apps.common.exceptions.custom_exception_handler` so responses stay uniform; do not bypass with raw `Response(status=...)` for error cases.
- New app checklist: create under `apps/`, set `name = 'apps.<x>'` in `apps.py`, add to `LOCAL_APPS`, mount in `project/urls.py` under `/api/<x>/`.
