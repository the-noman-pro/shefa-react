import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store';
import MainLayout from '@/components/layout/MainLayout';

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
const MyDonationsPage = lazy(() => import('@/features/donation/MyDonationsPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand" />
  </div>
);

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
      {
        path: 'donations',
        element: (
          <RequireAuth>
            <Suspense fallback={<PageLoader />}><MyDonationsPage /></Suspense>
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