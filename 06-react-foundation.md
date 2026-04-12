# Step 06: React Project Foundation

## Agent Instructions
Set up the React project architecture. This mirrors the Vue project's structure (views → pages, services, store, composables → hooks, router). Show every file in full. After each section, verify the dev server still runs without TypeScript errors.

---

## What We're Building

- File structure (feature-based, mirrors Vue architecture)
- Redux Toolkit store (like Vuex modules)
- React Router v6 configuration (like Vue Router)
- Axios instance with interceptors (like main.ts interceptors)
- TanStack Query setup
- TypeScript types
- Main app entry point

---

## 1. Final Project File Structure

Create this structure inside `~/code/shefa-react/frontend/src/`:

```
src/
├── assets/                    # images, fonts, icons
├── components/
│   ├── layout/                # shared layout (Navbar, Footer, Sidebar)
│   └── ui/                    # reusable UI primitives (Button, Card, Badge, etc.)
├── features/                  # feature-based grouping (key pattern)
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── hooks/
│   ├── charity/
│   │   ├── CharityListPage.tsx
│   │   ├── CharityDetailPage.tsx
│   │   └── components/
│   ├── campaign/
│   │   ├── CampaignListPage.tsx
│   │   ├── CampaignDetailPage.tsx
│   │   └── components/
│   ├── donation/
│   │   └── DonateModal.tsx
│   ├── wallet/
│   │   └── WalletPage.tsx
│   └── waqf/
│       └── WaqfListPage.tsx
├── hooks/                     # shared custom hooks (like Vue composables)
│   ├── useAuth.ts
│   └── useToast.ts
├── services/                  # API layer (class-based static methods — same pattern as Vue)
│   ├── api.ts                 # Axios instance
│   ├── auth.service.ts
│   ├── charity.service.ts
│   ├── campaign.service.ts
│   ├── wallet.service.ts
│   ├── donation.service.ts
│   └── waqf.service.ts
├── store/                     # Redux Toolkit (like Vuex modules)
│   ├── index.ts
│   ├── auth.slice.ts
│   └── ui.slice.ts
├── router/
│   └── index.tsx              # all routes
├── types/                     # TypeScript interfaces
│   ├── auth.types.ts
│   ├── charity.types.ts
│   ├── campaign.types.ts
│   └── api.types.ts
├── utils/
│   ├── formatters.ts          # date, currency formatters
│   └── storage.ts             # localStorage helpers
├── styles/
│   └── primereact-custom.css  # PrimeReact theme overrides
├── App.tsx
└── main.tsx
```

Create all directories:
```bash
cd ~/code/shefa-react/frontend/src
mkdir -p assets components/layout components/ui \
  features/auth/hooks features/charity/components \
  features/campaign/components features/donation \
  features/wallet features/waqf \
  hooks services store router types utils styles
```

---

## 2. TypeScript Types

### `src/types/api.types.ts`

```typescript
// src/types/api.types.ts

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  total_pages: number;
  current_page: number;
  results: T[];
}

export interface ApiError {
  errors: string[];
  status_code: number;
}
```

### `src/types/auth.types.ts`

```typescript
// src/types/auth.types.ts

export type UserType = 'donor' | 'charity_manager' | 'ambassador' | 'admin';

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string | null;
  user_type: UserType;
  avatar_url: string | null;
  is_verified: boolean;
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone?: string;
  password: string;
  password_confirm: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

### `src/types/charity.types.ts`

```typescript
// src/types/charity.types.ts

export type CharityCategory =
  | 'health' | 'education' | 'food' | 'shelter'
  | 'orphans' | 'elderly' | 'disability' | 'general';

export interface Charity {
  id: number;
  name: string;
  name_ar: string;
  slug: string;
  description?: string;
  description_ar?: string;
  category: CharityCategory;
  city: string;
  logo_url: string | null;
  cover_image?: string | null;
  is_featured: boolean;
  active_campaigns_count: number;
  total_raised: string;
  email?: string;
  phone?: string;
  website?: string;
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';

export interface Campaign {
  id: number;
  charity: Charity;
  title: string;
  title_ar: string;
  slug: string;
  description?: string;
  category: string;
  status: CampaignStatus;
  image_url: string | null;
  target_amount: string;
  raised_amount: string;
  donors_count: number;
  progress_percentage: number;
  remaining_amount: string;
  days_remaining: number | null;
  start_date: string;
  end_date: string | null;
  is_featured: boolean;
  minimum_donation?: string;
}
```

---

## 3. localStorage Helper

```typescript
// src/utils/storage.ts

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'shefa_access_token',
  REFRESH_TOKEN: 'shefa_refresh_token',
  USER: 'shefa_user',
} as const;

export const storage = {
  getAccessToken: (): string | null => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
  getRefreshToken: (): string | null => localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
  
  setTokens: (access: string, refresh: string): void => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
  },
  
  clearTokens: (): void => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },
  
  getUser: <T>(): T | null => {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  
  setUser: (user: unknown): void => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },
};
```

---

## 4. Formatters

```typescript
// src/utils/formatters.ts
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const formatCurrency = (amount: string | number, currency = 'SAR'): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatDate = (date: string, format = 'MMM D, YYYY'): string => {
  return dayjs(date).format(format);
};

export const formatRelativeTime = (date: string): string => {
  return dayjs(date).fromNow();
};

export const formatNumber = (num: number | string): string => {
  const n = typeof num === 'string' ? parseInt(num) : num;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};
```

---

## 5. Axios Instance (Service Layer Base)

```typescript
// src/services/api.ts
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { storage } from '@/utils/storage';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Configured Axios instance.
 * All service files import this instead of raw axios.
 * This mirrors the approach in the Vue project's main.ts interceptors.
 */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor — attach JWT access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = storage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — handle 401 token refresh
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = storage.getRefreshToken();
      if (!refreshToken) {
        storage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue other requests until refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });
        const { access, refresh } = response.data;
        storage.setTokens(access, refresh);
        
        // Replay queued requests
        refreshQueue.forEach((cb) => cb(access));
        refreshQueue = [];
        
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        storage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
```

---

## 6. Redux Store

### `src/store/auth.slice.ts`

```typescript
// src/store/auth.slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, User, AuthTokens } from '@/types/auth.types';
import { storage } from '@/utils/storage';

const initialState: AuthState = {
  user: storage.getUser<User>(),
  tokens: storage.getAccessToken()
    ? { access: storage.getAccessToken()!, refresh: storage.getRefreshToken()! }
    : null,
  isAuthenticated: !!storage.getAccessToken(),
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ user: User; tokens: AuthTokens }>) => {
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
      state.isLoading = false;
      storage.setTokens(action.payload.tokens.access, action.payload.tokens.refresh);
      storage.setUser(action.payload.user);
    },
    logout: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      storage.clearTokens();
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      storage.setUser(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { loginSuccess, logout, updateUser, setLoading } = authSlice.actions;
export default authSlice.reducer;
```

### `src/store/ui.slice.ts`

```typescript
// src/store/ui.slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface UIState {
  toasts: Toast[];
  isLoading: boolean;
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: { toasts: [], isLoading: false } as UIState,
  reducers: {
    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      state.toasts.push({
        ...action.payload,
        id: Date.now().toString(),
      });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { addToast, removeToast } = uiSlice.actions;
export default uiSlice.reducer;
```

### `src/store/index.ts`

```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import authReducer from './auth.slice';
import uiReducer from './ui.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks — use these instead of plain useSelector/useDispatch
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

---

## 7. React Router

```typescript
// src/router/index.tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store';
import MainLayout from '@/components/layout/MainLayout';

// Lazy-loaded pages (like Vue Router dynamic imports)
const HomePage = lazy(() => import('@/features/home/HomePage'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
const CharityListPage = lazy(() => import('@/features/charity/CharityListPage'));
const CharityDetailPage = lazy(() => import('@/features/charity/CharityDetailPage'));
const CampaignListPage = lazy(() => import('@/features/campaign/CampaignListPage'));
const CampaignDetailPage = lazy(() => import('@/features/campaign/CampaignDetailPage'));
const WalletPage = lazy(() => import('@/features/wallet/WalletPage'));
const WaqfListPage = lazy(() => import('@/features/waqf/WaqfListPage'));
const ProfilePage = lazy(() => import('@/features/auth/ProfilePage'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand" />
  </div>
);

// Protected route wrapper
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Suspense fallback={<PageLoader />}><HomePage /></Suspense>,
      },
      {
        path: 'charities',
        element: <Suspense fallback={<PageLoader />}><CharityListPage /></Suspense>,
      },
      {
        path: 'charities/:slug',
        element: <Suspense fallback={<PageLoader />}><CharityDetailPage /></Suspense>,
      },
      {
        path: 'campaigns',
        element: <Suspense fallback={<PageLoader />}><CampaignListPage /></Suspense>,
      },
      {
        path: 'campaigns/:slug',
        element: <Suspense fallback={<PageLoader />}><CampaignDetailPage /></Suspense>,
      },
      {
        path: 'waqf',
        element: <Suspense fallback={<PageLoader />}><WaqfListPage /></Suspense>,
      },
      // Protected routes
      {
        path: 'wallet',
        element: (
          <RequireAuth>
            <Suspense fallback={<PageLoader />}><WalletPage /></Suspense>
          </RequireAuth>
        ),
      },
      {
        path: 'profile',
        element: (
          <RequireAuth>
            <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>
          </RequireAuth>
        ),
      },
    ],
  },
  {
    path: '/login',
    element: <Suspense fallback={<PageLoader />}><LoginPage /></Suspense>,
  },
  {
    path: '/register',
    element: <Suspense fallback={<PageLoader />}><RegisterPage /></Suspense>,
  },
]);
```

---

## 8. Main Layout Component

```typescript
// src/components/layout/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
```

```typescript
// src/components/layout/Navbar.tsx
import { Link, NavLink } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store';
import { logout } from '@/store/auth.slice';

export default function Navbar() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-brand">Shefa</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink
              to="/charities"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-brand' : 'text-gray-600 hover:text-brand'
                }`
              }
            >
              Charities
            </NavLink>
            <NavLink
              to="/campaigns"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-brand' : 'text-gray-600 hover:text-brand'
                }`
              }
            >
              Campaigns
            </NavLink>
            <NavLink
              to="/waqf"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-brand' : 'text-gray-600 hover:text-brand'
                }`
              }
            >
              Waqf
            </NavLink>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/wallet" className="text-sm text-gray-600 hover:text-brand">
                  Wallet
                </Link>
                <Link to="/profile" className="text-sm text-gray-600 hover:text-brand">
                  {user?.first_name || user?.email}
                </Link>
                <button
                  onClick={() => dispatch(logout())}
                  className="btn-secondary text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm">Login</Link>
                <Link to="/register" className="btn-primary text-sm">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

```typescript
// src/components/layout/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-400 py-8 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm">
        <p>© {new Date().getFullYear()} Shefa Platform. All rights reserved.</p>
      </div>
    </footer>
  );
}
```

---

## 9. App Entry Point

```typescript
// src/App.tsx
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { store } from '@/store';
import { router } from '@/router';

// PrimeReact setup
import { PrimeReactProvider } from 'primereact/api';
import 'primereact/resources/themes/lara-light-teal/theme.css';
import 'primeicons/primeicons.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <HelmetProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <PrimeReactProvider>
            <RouterProvider router={router} />
          </PrimeReactProvider>
        </QueryClientProvider>
      </Provider>
    </HelmetProvider>
  );
}
```

```typescript
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

---

## 10. Create Placeholder Pages So Router Works

Create minimal placeholder files for each lazy-loaded page:

```bash
# Run this in src/features/
for dir in home auth charity campaign wallet waqf; do
  mkdir -p $dir
done
```

```typescript
// src/features/home/HomePage.tsx
export default function HomePage() {
  return <div className="py-8"><h1 className="text-3xl font-bold">Welcome to Shefa</h1></div>;
}
```

```typescript
// src/features/auth/ProfilePage.tsx
export default function ProfilePage() {
  return <div className="py-8"><h1 className="text-2xl font-bold">Profile</h1></div>;
}
```

Create similar placeholder files for:
- `src/features/wallet/WalletPage.tsx`
- `src/features/waqf/WaqfListPage.tsx`
- `src/features/charity/CharityListPage.tsx`
- `src/features/charity/CharityDetailPage.tsx`
- `src/features/campaign/CampaignListPage.tsx`
- `src/features/campaign/CampaignDetailPage.tsx`

Each just returns: `<div className="py-8"><h1 className="text-2xl font-bold">[PageName]</h1></div>`

Auth pages (LoginPage, RegisterPage) will be built in step 07.

---

## 11. Verify the App Runs

```bash
cd ~/code/shefa-react/frontend
npm run dev
```

Open http://localhost:5173:
- Should see Navbar with "Shefa" logo
- Navigation links (Charities, Campaigns, Waqf)
- Login/Register buttons
- Home page content

Check browser console — should have zero errors.

---

## Checkpoint: React Foundation ✓

Confirm:
- [ ] `npm run dev` runs without TypeScript errors
- [ ] http://localhost:5173 shows the Navbar
- [ ] All nav links work (placeholder pages load)
- [ ] Redux store initialized (check React DevTools if installed)
- [ ] No console errors

---

## NEXT

Tell the agent: **"React foundation done, load 07-react-auth.md"**
