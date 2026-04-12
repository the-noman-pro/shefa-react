# Step 01: Environment Setup

## Agent Instructions
Walk the user through EVERY step below in order. Run one command at a time. Ask them to confirm output before proceeding. This file covers everything needed before writing any application code.

---

## What We're Setting Up

- uv (Python package manager)
- Node.js 20 via nvm
- PostgreSQL 15
- Redis
- Django 4.2 backend project (in `backend/`)
- React 18 + Vite frontend project (in `frontend/`)

---

## 1. Install uv (Python Package Manager)

uv replaces pip, virtualenv, and poetry. It is dramatically faster.

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Restart your shell or run:
```bash
source $HOME/.cargo/env
```

Verify:
```bash
uv --version
# Expected: uv 0.4.x or higher
```

---

## 2. Install Node.js 20 via nvm

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell
source ~/.bashrc   # or ~/.zshrc if using zsh

# Install Node 20 LTS
nvm install 20
nvm use 20
nvm alias default 20
```

Verify:
```bash
node --version   # v20.x.x
npm --version    # 10.x.x
```

---

## 3. Install PostgreSQL 15

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Create Database and User

```bash
sudo -u postgres psql
```

Inside psql:
```sql
CREATE USER shefa_user WITH PASSWORD 'shefa_password';
CREATE DATABASE shefa_db OWNER shefa_user;
GRANT ALL PRIVILEGES ON DATABASE shefa_db TO shefa_user;
\q
```

Verify:
```bash
psql -U shefa_user -d shefa_db -h localhost -c "SELECT version();"
# Should print PostgreSQL version
```

---

## 4. Install Redis

**Ubuntu/Debian:**
```bash
sudo apt install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**macOS:**
```bash
brew install redis
brew services start redis
```

Verify:
```bash
redis-cli ping
# Expected: PONG
```

---

## 5. Create Project Directory Structure

```bash
mkdir -p ~/code/shefa-react
cd ~/code/shefa-react
```

We'll have:
```
shefa-react/
├── backend/     ← Django 4.2 project
├── frontend/    ← React 18 + Vite project
├── docker-compose.yml  (created in step 12)
└── CLAUDE.md
```

---

## 6. Create the Django Backend Project

```bash
cd ~/code/shefa-react

# Create backend directory and init uv project
mkdir backend
cd backend
uv init .
```

This creates `pyproject.toml` and `.python-version`. Now add all dependencies:

```bash
uv add \
  django==4.2.* \
  djangorestframework \
  djangorestframework-simplejwt \
  drf-spectacular \
  django-cors-headers \
  django-filter \
  django-redis \
  celery \
  redis \
  psycopg2-binary \
  python-decouple \
  Pillow \
  django-extensions \
  sentry-sdk \
  pandas \
  openpyxl \
  hijri-converter \
  unidecode \
  geopy \
  tenacity
```

Add dev dependencies:
```bash
uv add --dev \
  pytest \
  pytest-django \
  factory-boy \
  pytest-factoryboy \
  pytest-cov \
  black \
  isort \
  flake8 \
  freezegun
```

Verify your `pyproject.toml` has all packages listed.

### Create the Django Project

```bash
# Still in ~/code/shefa-react/backend/
uv run django-admin startproject project .
```

This creates:
```
backend/
├── project/
│   ├── __init__.py
│   ├── settings.py      ← we'll restructure this
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── manage.py
└── pyproject.toml
```

Verify Django is installed:
```bash
uv run python manage.py --version
# Expected: 4.2.x
```

---

## 7. Create Django App Structure

```bash
# Create apps directory
mkdir -p apps

# Create all domain apps
cd apps
uv run ../manage.py startapp account
uv run ../manage.py startapp charity
uv run ../manage.py startapp campaign
uv run ../manage.py startapp wallet
uv run ../manage.py startapp waqf
uv run ../manage.py startapp payment
uv run ../manage.py startapp auditlog
uv run ../manage.py startapp common
cd ..
```

Verify:
```bash
ls apps/
# account  charity  campaign  wallet  waqf  payment  auditlog  common
```

---

## 8. Create Backend .env File

```bash
# In ~/code/shefa-react/backend/
cat > .env << 'EOF'
DEBUG=True
SECRET_KEY=django-insecure-change-this-in-production-use-long-random-string
DATABASE_URL=postgres://shefa_user:shefa_password@localhost:5432/shefa_db
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
EOF
```

---

## 9. Configure Django Settings (Quick Version for Now)

Edit `project/settings.py` — replace the entire file:

```python
# project/settings.py
from decouple import config, Csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost', cast=Csv())

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'drf_spectacular',
    'corsheaders',
    'django_filters',
    'django_extensions',
]

LOCAL_APPS = [
    'apps.common',
    'apps.account',
    'apps.charity',
    'apps.campaign',
    'apps.wallet',
    'apps.waqf',
    'apps.payment',
    'apps.auditlog',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'project.wsgi.application'

# Database
import dj_database_url
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL'),
        conn_max_age=600,
    )
}
```

Wait — we need `dj-database-url` too:
```bash
uv add dj-database-url
```

Continue `settings.py`:
```python
# Add to the end of settings.py

AUTH_USER_MODEL = 'account.User'  # Custom user model (created in step 03)

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Riyadh'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'apps.common.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# Simple JWT
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# DRF Spectacular (Swagger)
SPECTACULAR_SETTINGS = {
    'TITLE': 'Shefa API',
    'DESCRIPTION': 'Charity, Waqf, and Donation Platform API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# CORS
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173', cast=Csv())
CORS_ALLOW_CREDENTIALS = True

# Redis Cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://localhost:6379/0'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
    }
}

# Celery
CELERY_BROKER_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
```

---

## 10. Create the React Frontend Project

```bash
cd ~/code/shefa-react

# Create Vite + React + TypeScript project
npm create vite@latest frontend -- --template react-ts

cd frontend
npm install
```

### Install All Frontend Dependencies

```bash
# Routing
npm install react-router-dom

# State management
npm install @reduxjs/toolkit react-redux

# Data fetching
npm install axios @tanstack/react-query

# Forms + validation
npm install react-hook-form @hookform/resolvers zod

# UI — PrimeReact (equivalent of PrimeVue)
npm install primereact primeicons

# UI — Tailwind CSS
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms
npx tailwindcss init -p

# UI components utilities
npm install clsx tailwind-merge lucide-react

# Charts
npm install recharts

# Date handling
npm install dayjs

# SEO / head management
npm install react-helmet-async

# Type definitions
npm install -D @types/node
```

---

## 11. Configure Tailwind CSS

Edit `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        brand: {
          DEFAULT: '#1a7a4a',
          light: '#22a05e',
          dark: '#14532d',
        }
      },
      fontFamily: {
        arabic: ['Noto Sans Arabic', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

Edit `src/index.css` — replace with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --font-sans: 'Inter', system-ui, sans-serif;
  }
  
  body {
    @apply bg-gray-50 text-gray-900;
    font-family: var(--font-sans);
  }
}

@layer components {
  .btn-primary {
    @apply bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors font-medium;
  }
  
  .btn-secondary {
    @apply bg-white text-brand border border-brand px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors font-medium;
  }
  
  .card {
    @apply bg-white rounded-xl shadow-sm border border-gray-100 p-6;
  }
  
  .input-field {
    @apply block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm 
           focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent;
  }
}
```

---

## 12. Create Frontend .env File

```bash
# In ~/code/shefa-react/frontend/
cat > .env << 'EOF'
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=Shefa
VITE_APP_VERSION=1.0.0
EOF
```

---

## 13. Update Vite Config

Edit `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

Add to `tsconfig.json` (inside `compilerOptions`):
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 14. Verify Both Projects Start

### Test Django (won't fully work yet — needs migrations from step 03, but should start):

We need to create a placeholder User model first or temporarily comment out `apps.account` from INSTALLED_APPS. For now, just verify the Python environment:

```bash
cd ~/code/shefa-react/backend
uv run python -c "import django; print(django.__version__)"
# Expected: 4.2.x

uv run python -c "import rest_framework; print(rest_framework.__version__)"
# Expected: 3.x.x
```

### Test React:

```bash
cd ~/code/shefa-react/frontend
npm run dev
```

Open browser at http://localhost:5173 — should see Vite + React default page.

Press `Ctrl+C` to stop.

---

## 15. Git Setup

```bash
# Backend
cd ~/code/shefa-react/backend
git init
cat > .gitignore << 'EOF'
.env
*.pyc
__pycache__/
.venv/
staticfiles/
media/
*.sqlite3
.pytest_cache/
.coverage
htmlcov/
dist/
*.egg-info/
EOF
git add .
git commit -m "Initial Django backend setup with uv"

# Frontend
cd ~/code/shefa-react/frontend
git init
# (Vite already created a .gitignore)
echo ".env" >> .gitignore
git add .
git commit -m "Initial React frontend setup with Vite"
```

---

## Checkpoint: Setup Complete ✓

Confirm you have:
- [ ] `uv --version` works
- [ ] `node --version` shows v20.x
- [ ] PostgreSQL running and `shefa_db` exists
- [ ] Redis `ping` returns PONG
- [ ] `~/code/shefa-react/backend/` has Django project
- [ ] `~/code/shefa-react/frontend/` shows React app at localhost:5173
- [ ] Both git repos initialized

---

## NEXT

Tell the agent: **"Setup complete, load 02-django-foundation.md"**
