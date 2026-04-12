# Step 12: Docker & Deployment

## Agent Instructions
This final step containerizes both projects using Docker and Docker Compose, mirrors the original Shefa's Makefile-based Docker workflow. After this, the user can run the entire stack with a single command.

---

## What We're Building

- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-compose.yml` (postgres, redis, backend, celery, frontend, nginx)
- Nginx configuration (serves React + proxies /api/ to Django)
- Production Django settings
- Makefile for common operations

---

## 1. Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency files first (layer caching)
COPY pyproject.toml uv.lock* ./

# Install dependencies (no dev deps in production)
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Collect static files
RUN uv run python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["uv", "run", "gunicorn", "project.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--timeout", "120", \
     "--access-logfile", "-"]
```

Install gunicorn:
```bash
cd ~/code/shefa-react/backend
uv add gunicorn
```

---

## 2. Frontend Dockerfile

```dockerfile
# frontend/Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage — serve with nginx
FROM nginx:alpine AS production

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Create `frontend/nginx.conf`:
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    # React Router — serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets — long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
```

---

## 3. Docker Compose

Create `~/code/shefa-react/docker-compose.yml`:

```yaml
# docker-compose.yml
version: '3.9'

services:
  # ─────── Databases ───────
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: shefa_db
      POSTGRES_USER: shefa_user
      POSTGRES_PASSWORD: shefa_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U shefa_user -d shefa_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # ─────── Backend ───────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DEBUG: "False"
      SECRET_KEY: "change-me-in-production-use-a-real-secret"
      DATABASE_URL: "postgres://shefa_user:shefa_password@postgres:5432/shefa_db"
      REDIS_URL: "redis://redis:6379/0"
      ALLOWED_HOSTS: "localhost,127.0.0.1,backend"
      CORS_ALLOWED_ORIGINS: "http://localhost,http://localhost:80"
      DJANGO_SETTINGS_MODULE: "project.settings.production"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - media_files:/app/media
      - static_files:/app/staticfiles
    ports:
      - "8000:8000"

  # ─────── Celery Worker ───────
  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: ["uv", "run", "celery", "-A", "project", "worker", "-l", "info"]
    environment:
      DEBUG: "False"
      SECRET_KEY: "change-me-in-production-use-a-real-secret"
      DATABASE_URL: "postgres://shefa_user:shefa_password@postgres:5432/shefa_db"
      REDIS_URL: "redis://redis:6379/0"
      DJANGO_SETTINGS_MODULE: "project.settings.production"
    depends_on:
      - backend
      - redis
    volumes:
      - media_files:/app/media

  # ─────── Frontend ───────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: "/api"  # proxied through nginx
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
  media_files:
  static_files:
```

---

## 4. Nginx Reverse Proxy (Full Stack)

For production, a single Nginx proxies both frontend and backend. Create `docker-compose.prod.yml`:

```yaml
# docker-compose.prod.yml — replace frontend service with full nginx
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/conf.d/default.conf
      - static_files:/static
      - media_files:/media
    depends_on:
      - backend
      - frontend
```

Create `nginx.prod.conf` at the root:
```nginx
upstream django_backend {
    server backend:8000;
}

server {
    listen 80;
    server_name localhost;

    client_max_body_size 20M;

    # Serve React frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
    }

    # Proxy API calls to Django
    location /api/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Django admin
    location /admin/ {
        proxy_pass http://django_backend;
        proxy_set_header Host $host;
    }

    # Django static files
    location /static/ {
        alias /static/;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Django media files
    location /media/ {
        alias /media/;
    }
}
```

---

## 5. Production Django Settings

```python
# project/settings/production.py
from .base import *
import os

DEBUG = False
SECRET_KEY = os.environ['SECRET_KEY']

ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())

# Security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Only set these if behind HTTPS
# SECURE_SSL_REDIRECT = True
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True

# Static files served by Nginx
STATIC_ROOT = '/app/staticfiles'
MEDIA_ROOT = '/app/media'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
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
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

---

## 6. Database Migrations in Docker

Add a migrate command to your workflow. Create `backend/entrypoint.sh`:

```bash
#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until pg_isready -h postgres -U shefa_user -d shefa_db; do
  sleep 1
done

echo "Running migrations..."
uv run python manage.py migrate --noinput

echo "Starting server..."
exec "$@"
```

Update `backend/Dockerfile` CMD:
```dockerfile
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
CMD ["uv", "run", "gunicorn", "project.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

---

## 7. Makefile

Create `~/code/shefa-react/Makefile`:

```makefile
# Shefa React Makefile — mirrors the original Shefa project's workflow

.PHONY: build up down logs migrate shell-backend shell-frontend test lint

# Build all images
build:
	docker compose build

# Start all services (background)
up:
	docker compose up -d
	@echo "Frontend: http://localhost"
	@echo "Backend API: http://localhost:8000"
	@echo "Swagger: http://localhost:8000/api/schema/swagger-ui/"

# Start with logs
up-logs:
	docker compose up

# Stop all services
down:
	docker compose down

# Rebuild and restart
restart: down build up

# View logs
logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

# Run migrations
migrate:
	docker compose exec backend uv run python manage.py migrate

# Make migrations
makemigrations:
	docker compose exec backend uv run python manage.py makemigrations

# Django shell
shell-backend:
	docker compose exec backend uv run python manage.py shell

# Create superuser
createsuperuser:
	docker compose exec backend uv run python manage.py createsuperuser

# Run tests
test:
	docker compose exec backend uv run pytest

# Lint backend
lint:
	docker compose exec backend uv run flake8 apps/

# Frontend shell
shell-frontend:
	docker compose exec frontend sh

# Remove all containers and volumes (DESTRUCTIVE)
clean:
	docker compose down -v

# Local dev (without Docker)
dev-backend:
	cd backend && uv run python manage.py runserver 8000

dev-frontend:
	cd frontend && npm run dev
```

---

## 8. Build and Run

```bash
cd ~/code/shefa-react

# Build all images (first time takes ~3-5 minutes)
make build

# Start everything
make up

# Check logs
make logs-backend
```

Wait for "Starting server..." in the backend logs, then:
- http://localhost:5173 (or http://localhost if using nginx)
- http://localhost:8000/api/schema/swagger-ui/
- http://localhost:8000/admin/

Run migrations:
```bash
make migrate
make createsuperuser
```

---

## 9. Environment Variables for Production

Create `.env.production` files (never commit these):

```bash
# ~/code/shefa-react/backend/.env.production
DEBUG=False
SECRET_KEY=your-very-long-random-secret-key-here
DATABASE_URL=postgres://shefa_user:strong_password@postgres:5432/shefa_db
REDIS_URL=redis://redis:6379/0
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

```bash
# ~/code/shefa-react/frontend/.env.production
VITE_API_URL=https://yourdomain.com/api
VITE_APP_NAME=Shefa
```

---

## 10. CI/CD Basics (GitHub Actions)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: shefa_test
          POSTGRES_USER: shefa_user
          POSTGRES_PASSWORD: shefa_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - name: Install dependencies
        working-directory: backend
        run: uv sync
      - name: Run tests
        working-directory: backend
        env:
          DATABASE_URL: postgres://shefa_user:shefa_password@localhost:5432/shefa_test
          REDIS_URL: redis://localhost:6379/0
          SECRET_KEY: test-secret-key
        run: uv run pytest

  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install and build
        working-directory: frontend
        run: |
          npm ci
          npm run build
      - name: TypeScript check
        working-directory: frontend
        run: npx tsc --noEmit
```

---

## Final Project Structure

```
shefa-react/
├── CLAUDE.md                    ← agent loading instructions
├── 01-setup.md through 12-deployment.md
├── docker-compose.yml
├── nginx.prod.conf
├── Makefile
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── pyproject.toml          ← uv dependencies
│   ├── uv.lock
│   ├── manage.py
│   ├── project/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── celery.py
│   │   └── urls.py
│   ├── apps/
│   │   ├── account/
│   │   ├── charity/
│   │   ├── campaign/
│   │   ├── wallet/
│   │   ├── payment/
│   │   ├── waqf/
│   │   └── common/
│   └── tests/
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── features/
        │   ├── auth/
        │   ├── charity/
        │   ├── campaign/
        │   ├── donation/
        │   ├── wallet/
        │   ├── waqf/
        │   └── admin/
        ├── components/
        │   ├── layout/
        │   └── ui/
        ├── services/
        ├── store/
        ├── hooks/
        ├── types/
        └── utils/
```

---

## Congratulations! 🎉

You have built a full-stack charity/waqf/donation platform from scratch:

**What you learned:**
- Django 4.2 with uv (modern Python packaging)
- Django REST Framework with JWT auth
- Custom User model, per-app architecture
- Domain-driven app design (account, charity, campaign, wallet, waqf, payment)
- Django signals for reactive data updates
- Celery for async tasks
- React 18 with TypeScript and Vite
- Redux Toolkit for state management
- React Router v6 with lazy loading
- React Hook Form + Zod for validation
- TanStack Query for data fetching
- Axios interceptors for auth
- PrimeReact for data-heavy components
- Tailwind CSS for utility-first styling
- Recharts for data visualization
- Custom hooks (React's composables)
- Error boundaries
- Docker + Docker Compose for deployment
- GitHub Actions for CI

**What to explore next:**
- Add Stripe/HyperPay payment gateway integration
- Add push notifications with Firebase
- Add real-time updates with Django Channels (WebSockets)
- Add full Arabic localization
- Add PDF invoice generation
- Deploy to AWS/GCP/DigitalOcean
