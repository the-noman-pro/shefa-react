# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

This `frontend/` is the React SPA for the Shefa charity/waqf/donation platform. It pairs with a Django REST API in `../backend/`. The parent `../CLAUDE.md` describes a step-by-step learning guide; this file is for working *inside* the frontend codebase, not for teaching.

## Commands

```bash
npm run dev       # Vite dev server on :5173, proxies /api → http://localhost:8000
npm run build     # tsc -b && vite build (typecheck + production build)
npm run lint      # ESLint flat config (eslint.config.js)
npm run preview   # Preview production build
```

No test runner is configured.

The dev server expects the Django API at `http://localhost:8000`. Override with `VITE_API_URL`. The Vite proxy on `/api` is the recommended dev path; `services/api.ts` falls back to the absolute `BASE_URL` when called directly.

## Path alias

`@/*` resolves to `src/*` (configured in both `tsconfig.app.json` and `vite.config.ts`). Always import via `@/...` rather than relative paths across feature boundaries.

## Architecture

### Provider stack (`src/App.tsx`)

`HelmetProvider → Redux Provider → QueryClientProvider → PrimeReactProvider → RouterProvider`. A single global PrimeReact `<Toast>` is mounted here and exposed via `setGlobalToastRef` in `@/hooks/useToast` — call `useToast()` from anywhere instead of mounting per-page toasts.

TanStack Query defaults: `staleTime: 5min`, `retry: 1`.

### State split — Redux vs TanStack Query

- **Redux Toolkit** (`src/store/`) holds *client* state only: `auth` (user + JWT flags) and `ui` (toast/modal). Use `useAppSelector` / `useAppDispatch` (typed in `store/index.ts`).
- **TanStack Query** owns all server state. Service functions in `src/services/*.service.ts` return raw data; components/hooks wrap them in `useQuery` / `useMutation`. Do not duplicate server data into Redux.

### API layer (`src/services/api.ts`)

Single shared Axios instance with two interceptors:
1. **Request**: attaches `Bearer <access>` from `storage.getAccessToken()`.
2. **Response**: on 401, performs single-flight refresh via `/auth/token/refresh/`. Concurrent 401s queue in `refreshQueue` and replay with the new token; refresh failure clears tokens and hard-redirects to `/login`.

Tokens live in `src/utils/storage.ts` (localStorage). Never read tokens elsewhere — go through `storage`.

### Routing (`src/router/index.tsx`)

`createBrowserRouter` with all pages `lazy()`-loaded inside `<Suspense fallback={<PageLoader />}>`. Public routes nest under `MainLayout`; auth-gated routes (`/wallet`, `/profile`, `/donations`, `/admin`) wrap children in `<RequireAuth>` which reads `state.auth.isAuthenticated` and redirects to `/login`. `/login` and `/register` sit outside `MainLayout`.

### Feature folders (`src/features/<domain>/`)

Vertical slices: `auth`, `charity`, `campaign`, `donation`, `wallet`, `waqf`, `admin`, `home`. A feature owns its pages and feature-specific components. Cross-feature primitives live in `src/components/ui/` and layout chrome in `src/components/layout/`.

### Forms & validation

React Hook Form + Zod via `@hookform/resolvers`. Keep schemas colocated with the form component.

### UI libraries

PrimeReact (lara-light-teal theme, imported in `App.tsx`) for complex widgets (DataTable, Toast, Dialog, charts surface). Tailwind v4 (`@tailwindcss/postcss`) for layout/utility styling. Recharts for analytics. `clsx` + `tailwind-merge` for conditional classes.

### TypeScript config notes

`verbatimModuleSyntax: true` — type-only imports must use `import type`. `noUnusedLocals` / `noUnusedParameters` are on; prefix intentionally unused params with `_`. `erasableSyntaxOnly` forbids enums and namespaces.
