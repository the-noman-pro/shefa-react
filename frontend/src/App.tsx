import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { store } from '@/store';
import { router } from '@/router';
import { useRef, useEffect } from 'react';
import { Toast } from 'primereact/toast';
import { setGlobalToastRef } from '@/hooks/useToast';

import { PrimeReactProvider } from 'primereact/api';
import 'primereact/resources/themes/lara-light-teal/theme.css';
import 'primeicons/primeicons.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function App() {
  const toastRef = useRef<Toast>(null);

  useEffect(() => {
    setGlobalToastRef(toastRef);
  }, []);

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
}