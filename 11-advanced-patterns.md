# Step 11: Advanced React Patterns

## Agent Instructions
This step teaches important patterns used in production React apps. These are the equivalents of Vue's composables, watchers, and optimization techniques. Each section is self-contained — guide the user through them one by one.

---

## What We're Learning

1. Custom hooks (React's composables)
2. Error boundaries
3. Toast notifications (PrimeReact Toast)
4. RTL support (Arabic)
5. i18n with react-i18next
6. Performance patterns (memo, useMemo, useCallback)
7. Optimistic updates with TanStack Query
8. Form with complex validation (Zod)
9. Infinite scroll / pagination pattern

---

## 1. Custom Hooks (Vue Composables Equivalent)

In Vue, composables are functions using `ref`, `computed`, `watch`.
In React, custom hooks are functions using `useState`, `useEffect`, `useMemo`, `useCallback`.

**Rule: If logic is reused across 2+ components, extract to a hook.**

### `src/hooks/useDebounce.ts`

```typescript
// Replaces Vue's debounceMixin
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

Use in CampaignListPage to replace the manual debounce:
```typescript
// Replace manual debounce with:
import { useDebounce } from '@/hooks/useDebounce';

const debouncedSearch = useDebounce(search, 400);

// Remove the manual setTimeout in handleSearch:
const handleSearch = (value: string) => {
  setSearch(value);
  setPage(1);
};

// queryKey now uses debouncedSearch automatically
```

### `src/hooks/usePagination.ts`

```typescript
import { useState } from 'react';

interface UsePaginationReturn {
  page: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPage: () => void;
}

export function usePagination(initialPage = 1): UsePaginationReturn {
  const [page, setPage] = useState(initialPage);
  return {
    page,
    setPage,
    nextPage: () => setPage((p) => p + 1),
    prevPage: () => setPage((p) => Math.max(1, p - 1)),
    resetPage: () => setPage(1),
  };
}
```

### `src/hooks/useWallet.ts`

```typescript
// Domain-specific hook — returns wallet data + top-up mutation
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WalletService from '@/services/wallet.service';

export function useWallet() {
  const queryClient = useQueryClient();

  const { data: wallet, isLoading, error } = useQuery({
    queryKey: ['wallet'],
    queryFn: WalletService.getWallet,
  });

  const topUpMutation = useMutation({
    mutationFn: (amount: string) => WalletService.topUp(amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallet'] }),
  });

  return {
    wallet,
    balance: wallet?.balance ?? '0.00',
    transactions: wallet?.transactions ?? [],
    isLoading,
    error,
    topUp: topUpMutation.mutate,
    isTopUpLoading: topUpMutation.isPending,
    topUpError: topUpMutation.error,
  };
}
```

---

## 2. Error Boundary

React doesn't auto-recover from component errors — you need an Error Boundary.

```typescript
// src/components/ui/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
    // In production: send to Sentry
    // Sentry.captureException(error, { extra: info });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="card text-center py-12">
          <p className="text-5xl mb-4">⚠️</p>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn-secondary text-sm"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Wrap pages in ErrorBoundary in `MainLayout.tsx`:
```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Wrap Outlet:
<main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
  <ErrorBoundary>
    <Outlet />
  </ErrorBoundary>
</main>
```

---

## 3. Global Toast Notifications (PrimeReact)

PrimeReact's Toast is equivalent to PrimeVue's Toast.

### Add Toast to App

Update `src/App.tsx` — add Toast component:
```typescript
import { Toast } from 'primereact/toast';
import { useRef } from 'react';

// Inside App component:
const toastRef = useRef<Toast>(null);

// In JSX:
return (
  <HelmetProvider>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <PrimeReactProvider>
          <Toast ref={toastRef} position="top-right" />
          <RouterProvider router={router} />
        </PrimeReactProvider>
      </QueryClientProvider>
    </Provider>
  </HelmetProvider>
);
```

### `src/hooks/useToast.ts`

```typescript
// This is a simplified approach using PrimeReact's useToast hook
// PrimeReact 10+ provides useToast directly
import { useRef } from 'react';
import type { Toast } from 'primereact/toast';

// A global toast reference — set this in App.tsx
let globalToastRef: React.RefObject<Toast | null> | null = null;

export function setGlobalToastRef(ref: React.RefObject<Toast | null>) {
  globalToastRef = ref;
}

export function useToast() {
  const show = (options: {
    severity: 'success' | 'error' | 'info' | 'warn';
    summary?: string;
    detail: string;
    life?: number;
  }) => {
    globalToastRef?.current?.show({
      severity: options.severity,
      summary: options.summary || options.severity.charAt(0).toUpperCase() + options.severity.slice(1),
      detail: options.detail,
      life: options.life || 3000,
    });
  };

  return {
    success: (detail: string) => show({ severity: 'success', detail }),
    error: (detail: string) => show({ severity: 'error', detail }),
    info: (detail: string) => show({ severity: 'info', detail }),
    warn: (detail: string) => show({ severity: 'warn', detail }),
  };
}
```

In `App.tsx`, set the ref:
```typescript
import { setGlobalToastRef } from '@/hooks/useToast';
// After creating toastRef:
setGlobalToastRef(toastRef);
```

Use in any component:
```typescript
const toast = useToast();
toast.success('Donation submitted!');
toast.error('Something went wrong.');
```

---

## 4. Performance Patterns

### When to Use `React.memo`

`React.memo` prevents re-renders when props haven't changed — like `computed` preventing recalculation in Vue.

```typescript
// Wrap expensive list items that receive stable props
import { memo } from 'react';

export const CampaignCard = memo(function CampaignCard({ campaign }: CampaignCardProps) {
  // ... same component as before
  // Now won't re-render unless `campaign` object changes
});

// IMPORTANT: memo only helps when:
// 1. The component re-renders often
// 2. The parent re-renders with the same props
// 3. The component is "expensive" to render
// Don't memo everything — only where you observe issues
```

### `useMemo` — Cache Expensive Computations

```typescript
// Like Vue's computed properties — memoize derived state
import { useMemo } from 'react';

function WalletPage() {
  const { transactions } = useWallet();
  
  // Expensive: computing chart data from long transaction list
  // Without useMemo, this runs on every render
  const chartData = useMemo(
    () => buildChartData(transactions),
    [transactions], // only recompute when transactions change
  );
  
  // ...
}
```

### `useCallback` — Cache Function References

```typescript
// Prevents new function references on every render
// Important when passing callbacks to memo'd children
import { useCallback } from 'react';

function CampaignListPage() {
  const [category, setCategory] = useState('');
  
  // Without useCallback: new function reference on every render
  // → CampaignCard gets new prop → re-renders even if category didn't change
  const handleCategoryChange = useCallback((newCategory: string) => {
    setCategory(newCategory);
  }, []); // empty deps = stable reference
  
  // ...
}
```

### Rule of Thumb
> Measure first, optimize second. Use React DevTools Profiler to identify actual slow renders before adding memo/useMemo/useCallback.

---

## 5. RTL Support (Arabic)

The original Shefa app is Arabic-first. Add RTL support:

### Update `index.html`

```html
<!-- In index.html — add lang and dir support -->
<html lang="ar" dir="rtl">
```

Or toggle dynamically in a language hook:
```typescript
// src/hooks/useLocale.ts
import { useState, useEffect } from 'react';

type Locale = 'en' | 'ar';

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(
    () => (localStorage.getItem('locale') as Locale) || 'en'
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('locale', locale);
  }, [locale]);

  return { locale, setLocale, isRTL: locale === 'ar' };
}
```

### Tailwind RTL Classes

Tailwind supports RTL via `rtl:` prefix:
```html
<!-- Margins/padding flip in RTL -->
<div class="ms-4 rtl:mr-4">  <!-- ms = margin-start, respects dir -->
```

Install `tailwindcss-rtl` plugin (optional) or use Tailwind's built-in logical properties:
```
ms-* / me-* / ps-* / pe-*   → margin/padding start/end (dir-aware)
```

Update `tailwind.config.js`:
```javascript
export default {
  // ... existing config
  // Tailwind 3.3+ has built-in RTL support with logical properties
};
```

---

## 6. i18n with react-i18next

```bash
cd ~/code/shefa-react/frontend
npm install react-i18next i18next i18next-browser-languagedetector
```

Create translation files:
```bash
mkdir -p public/locales/en public/locales/ar
```

```json
// public/locales/en/translation.json
{
  "nav": {
    "charities": "Charities",
    "campaigns": "Campaigns",
    "waqf": "Waqf",
    "wallet": "Wallet",
    "login": "Login",
    "register": "Register",
    "logout": "Logout"
  },
  "campaign": {
    "donateNow": "Donate Now",
    "raised": "raised",
    "goal": "goal",
    "donors": "donors",
    "daysLeft": "days left",
    "fullyFunded": "Fully Funded"
  },
  "wallet": {
    "balance": "Available Balance",
    "topUp": "Top Up",
    "transactions": "Transaction History"
  }
}
```

```json
// public/locales/ar/translation.json
{
  "nav": {
    "charities": "الجمعيات",
    "campaigns": "الحملات",
    "waqf": "الوقف",
    "wallet": "المحفظة",
    "login": "تسجيل الدخول",
    "register": "إنشاء حساب",
    "logout": "تسجيل الخروج"
  },
  "campaign": {
    "donateNow": "تبرع الآن",
    "raised": "تم جمعه",
    "goal": "الهدف",
    "donors": "متبرع",
    "daysLeft": "يوم متبقي",
    "fullyFunded": "مكتمل التمويل"
  },
  "wallet": {
    "balance": "الرصيد المتاح",
    "topUp": "شحن المحفظة",
    "transactions": "سجل المعاملات"
  }
}
```

```typescript
// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    resources: {
      en: { translation: {} }, // loaded from public/ in production
      ar: { translation: {} },
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
```

In `src/main.tsx`:
```typescript
import './i18n'; // import before App
```

Use in components:
```typescript
import { useTranslation } from 'react-i18next';

function Navbar() {
  const { t, i18n } = useTranslation();
  
  return (
    <nav>
      <Link to="/charities">{t('nav.charities')}</Link>
      <button onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}>
        {i18n.language === 'ar' ? 'EN' : 'AR'}
      </button>
    </nav>
  );
}
```

---

## 7. Optimistic Updates

Update wallet balance instantly before server confirms:

```typescript
// In DonateModal — optimistic update
const queryClient = useQueryClient();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // OPTIMISTIC: deduct from displayed balance immediately
  queryClient.setQueryData(['wallet'], (old: any) => {
    if (!old) return old;
    return {
      ...old,
      balance: (parseFloat(old.balance) - parseFloat(selectedAmount)).toFixed(2),
    };
  });
  
  try {
    await DonationService.donate({...});
    // Server confirmed — refetch actual balance
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
  } catch (err) {
    // Rollback: refetch actual balance from server
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    setError('Donation failed');
  }
};
```

---

## 8. Key React vs Vue Comparison Table

| Concept | Vue 3 | React 18 |
|---------|-------|----------|
| Reactive state | `ref()`, `reactive()` | `useState()` |
| Computed values | `computed()` | `useMemo()` |
| Watchers | `watch()`, `watchEffect()` | `useEffect()` |
| Lifecycle (mount) | `onMounted()` | `useEffect(() => {}, [])` |
| Lifecycle (unmount) | `onUnmounted()` | `useEffect(() => { return cleanup }, [])` |
| Reusable logic | Composable functions | Custom hooks |
| Global state | Vuex / Pinia | Redux Toolkit / Zustand |
| Template refs | `const el = ref(null)` with `ref="el"` | `const el = useRef(null)` with `ref={el}` |
| Props | `defineProps<{}>()` | `interface Props {}` passed to function |
| Events | `defineEmits(['update'])` | Callback props `onUpdate: () => void` |
| Slots | `<slot>` | `children` prop or render props |
| Provide/Inject | `provide()`, `inject()` | `createContext()`, `useContext()` |
| Route params | `useRoute().params.id` | `useParams().id` |
| Navigation | `useRouter().push(path)` | `useNavigate()(path)` |
| Data fetching | `onMounted + ref` | `useQuery` (TanStack) |
| Form validation | Vuelidate | React Hook Form + Zod |

---

## Checkpoint: Advanced Patterns ✓

Confirm:
- [ ] `useDebounce` hook works in search (check Network tab — only 1 request per 400ms)
- [ ] Error boundary shows fallback on component crash
- [ ] Toast notifications work from DonateModal
- [ ] `React.memo` applied to CampaignCard
- [ ] `useWallet` hook abstracts wallet logic

---

## NEXT

Tell the agent: **"Advanced patterns done, load 12-deployment.md"**
