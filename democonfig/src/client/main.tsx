import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme-provider';
import { ToastProvider } from './components/ui/toast';
import App from './app';
import './globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  </BrowserRouter>
);
