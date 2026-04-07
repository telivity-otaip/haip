import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { PropertyProvider } from './context/PropertyContext';
import { ToastProvider } from './components/ui/Toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <PropertyProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </PropertyProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
