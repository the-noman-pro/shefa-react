# Shefa React + Django Learning Guide

## Purpose

This directory is a **step-by-step interactive learning guide** for building a charity/waqf/donation platform using React 18 + Django 4.2. It replicates the Shefa platform — a real production system.

## How to Use This Guide (Agent Instructions)

**CRITICAL: Load files ONE AT A TIME. Do not load all files at once.**

### Loading Order

| Step | File | Topic |
|------|------|-------|
| 1 | `01-setup.md` | Environment setup — tools, databases, project scaffolding |
| 2 | `02-django-foundation.md` | Django project architecture, settings, common app |
| 3 | `03-django-auth.md` | Custom user model, JWT auth, registration/login |
| 4 | `04-django-charity-campaign.md` | Charity + Campaign apps |
| 5 | `05-django-wallet-waqf.md` | Wallet, Waqf, Payment, Donation apps |
| 6 | `06-react-foundation.md` | React project structure, Redux, Router, Axios |
| 7 | `07-react-auth.md` | Auth UI, protected routes, interceptors |
| 8 | `08-react-charity-campaign.md` | Charity & Campaign feature pages |
| 9 | `09-react-donation-wallet.md` | Donation flow, Wallet UI, charts |
| 10 | `10-react-waqf-dashboard.md` | Waqf products, admin dashboard |
| 11 | `11-advanced-patterns.md` | Custom hooks, RTL, i18n, performance |
| 12 | `12-deployment.md` | Docker, Docker Compose, Nginx, production |

### Agent Behavior Rules

1. **Start by loading ONLY `01-setup.md`**
2. Walk the user through each command **one at a time** — ask them to run it and confirm success
3. If a command fails, debug it before moving on — never skip failing steps
4. After the user completes all steps in a file, say: `"Great! Setup complete. Ready to load [next file]? Type 'yes' to continue."`
5. Only load the next file after user confirms
6. Include "verify this works" checkpoints — ask the user to confirm output before proceeding
7. When showing code to write, show the **full file content** — not fragments

### Teaching-First Rules (CRITICAL — apply to every single step)

Before showing any command, always explain:
- **What** the command does in plain English
- **Why** we need it at this point in the project
- **Each flag/option** — e.g. `-u` in `sudo -u postgres` means "run as this user"; `--dev` in `uv add --dev` means "development-only dependency"
- **What would break** if we skipped this step
- **Any tradeoffs** — e.g. why we chose this tool over alternatives

After each command, explain:
- **What just happened** — what files were created, what changed
- **Any output worth noting** — what each line means

When explaining code (Python, TypeScript, SQL, config files):
- Explain every non-obvious line
- Explain design decisions — why this structure, not another
- Connect it to real-world patterns ("this is the Repository pattern", "this is why Django separates apps")
- Highlight what an interviewer might ask about this code

The goal is not just to run commands — it is to deeply understand what is being built and why every decision was made.

### What We Are Building

A mini version of the Shefa platform:
- **Backend**: Django 4.2 REST API (uv, DRF, SimpleJWT, Celery, PostgreSQL, Redis)
- **Frontend**: React 18 SPA (Vite, TypeScript, Redux Toolkit, React Router v6, Tailwind CSS, PrimeReact)

### Tech Stack Rationale

| Original (Vue/Poetry) | Our Version (React/uv) | Why |
|-----------------------|------------------------|-----|
| Poetry | **uv** | Faster, modern Python package manager |
| Django 3.2 | **Django 4.2 LTS** | Latest LTS, better async, security updates |
| drf-yasg | **drf-spectacular** | More actively maintained, better OpenAPI 3.0 |
| Vue 3 | **React 18** | Learning React specifically |
| Vue CLI/Webpack | **Vite** | Much faster HMR, modern bundler |
| Vuex 4 | **Redux Toolkit** | Industry standard React state management |
| Vue Router | **React Router v6** | Standard React routing |
| Vuelidate | **React Hook Form + Zod** | Better DX, type-safe validation |
| Axios (bare) | **Axios + TanStack Query** | Caching, loading states, refetching |
| PrimeVue | **PrimeReact** | Direct equivalent, same company |
| Bootstrap 5 | **Tailwind CSS + shadcn/ui** | Modern utility-first approach |
| vue-chartjs | **Recharts** | Popular React chart library |

---

**Begin:** Load `01-setup.md` and start guiding the user through environment setup.
