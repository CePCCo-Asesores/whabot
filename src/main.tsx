import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './features/auth/AuthProvider';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof Error && 'status' in error) {
          const status = Number((error as { status?: number }).status);
          if ([401, 403, 404].includes(status)) return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider queryClient={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
