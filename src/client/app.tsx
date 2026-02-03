import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import LoginPage from './pages/login';
import SignupPage from './pages/signup';
import ForgotPasswordPage from './pages/forgot-password';
import ResetPasswordPage from './pages/reset-password';
import AppLayout from './layouts/app-layout';
import { JsonPageRenderer } from './layouts/json-page-renderer';
import { loadAllRoutes, loadNavigationMenu, getPageLoader } from './lib/config-loader';
import type { RouteDef, NavCategory } from './lib/config-loader';
import { useAppConfig } from './lib/app-config';

// Set document title dynamically based on app config
function DocumentTitle() {
  const { app } = useAppConfig();

  useEffect(() => {
    if (app?.name) {
      document.title = `${app.name} - ${app.subtitle || app.description || ''}`;
    }
  }, [app]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/**
 * Lazily loads a page config JSON and renders it via JsonPageRenderer.
 * Each page reference (e.g., "departments/list") maps to a config file
 * discovered by import.meta.glob at build time.
 */
function LazyPage({ page }: { page: string }) {
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loader = getPageLoader(page);
    if (!loader) {
      setError(`Page config not found: ${page}`);
      return;
    }
    loader()
      .then((m) => setConfig(m.default))
      .catch((err) => setError(err.message));
  }, [page]);

  if (error) return <div className="text-destructive p-4">Error: {error}</div>;
  if (!config)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );

  return <JsonPageRenderer config={config} />;
}

export default function App() {
  const [routes, setRoutes] = useState<RouteDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllRoutes().then((r) => {
      setRoutes(r);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Separate the index route (path "/") from other routes
  const indexRoute = routes.find((r) => r.path === '/');
  const childRoutes = routes.filter((r) => r.path !== '/');

  return (
    <>
      <DocumentTitle />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          {indexRoute && (
            <Route index element={<LazyPage page={indexRoute.page} />} />
          )}
          {childRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path.startsWith('/') ? route.path.slice(1) : route.path}
              element={<LazyPage page={route.page} />}
            />
          ))}
        </Route>
      </Routes>
    </>
  );
}

// Export a hook to access navigation menu (used by AppLayout sidebar)
export function useNavigationMenu() {
  const [menu, setMenu] = useState<NavCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNavigationMenu().then((loadedMenu) => {
      setMenu(loadedMenu);
      setLoading(false);
    });
  }, []);

  return { menu, loading };
}
