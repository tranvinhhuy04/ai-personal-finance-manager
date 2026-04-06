import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { ThemeProvider } from './contexts/theme-context.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount, error) => {
        const status =
          typeof error === 'object' && error && 'status' in error
            ? Number((error as { status?: number }).status)
            : undefined;

        if (status === 429) {
          return false;
        }

        return failureCount < 1;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        const status =
          typeof error === 'object' && error && 'status' in error
            ? Number((error as { status?: number }).status)
            : undefined;

        if (status === 429) {
          return false;
        }

        return failureCount < 1;
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
