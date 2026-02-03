/**
 * Dynamic Configuration Loader (Client-side)
 *
 * Loads page and app configurations dynamically from config files.
 * Everything is config-driven — no hardcoded pages, routes, or navigation.
 *
 * Page configs are discovered at build time via import.meta.glob.
 * Navigation and routes are defined in config/apps.json.
 */

export interface PageConfig {
  dataSources?: Record<string, { url: string }>;
  children?: any[] | any;
}

export interface NavItem {
  title: string;
  path: string;
  page: string;
  icon?: string;
  iconLibrary?: string;
}

export interface NavCategory {
  id: string;
  title: string;
  icon: string;
  iconLibrary?: string;
  order: number;
  items: NavItem[];
}

export interface RouteDef {
  path: string;
  page: string;
}

export interface BrandingConfig {
  logo: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  companyName: string;
  tagline?: string;
  showPoweredBy?: boolean;
}

export interface LayoutConfig {
  type: 'sidebar' | 'topnav' | 'hybrid';
  sidebarPosition?: 'left' | 'right';
  sidebarWidth?: string;
  sidebarCollapsible?: boolean;
  sidebarDefaultCollapsed?: boolean;
  headerPosition?: 'top' | 'none';
  headerHeight?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  footerText?: string;
  contentMaxWidth?: string | null;
  contentPadding?: string;
  showBreadcrumbs?: boolean;
}

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  muted: string;
  mutedForeground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  border: string;
  input: string;
  ring: string;
  background: string;
  foreground: string;
}

export interface ThemeConfig {
  mode: 'light' | 'dark';
  allowModeToggle?: boolean;
  colors?: {
    light?: ThemeColors;
    dark?: ThemeColors;
  };
  fonts?: {
    heading?: string;
    body?: string;
    mono?: string;
  };
  fontSizes?: Record<string, string>;
  spacing?: {
    scale?: number;
  };
  radius?: Record<string, string>;
  shadows?: Record<string, string>;
}

export interface IconConfig {
  library: 'lucide' | 'heroicons' | 'fontawesome';
  size?: string;
  strokeWidth?: number;
}

export interface DefaultsConfig {
  table?: {
    pageSize?: number;
    pageSizes?: number[];
    showPagination?: boolean;
    showSearch?: boolean;
    emptyMessage?: string;
  };
  form?: {
    requiredIndicator?: string;
    validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
    showCancelButton?: boolean;
    cancelButtonText?: string;
    submitButtonText?: string;
  };
  notifications?: {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    duration?: number;
    showCloseButton?: boolean;
  };
  dateFormat?: string;
  timeFormat?: string;
  currency?: {
    code: string;
    symbol: string;
    position: 'before' | 'after';
  };
  language?: string;
}

export interface AppConfig {
  id: string;
  name: string;
  subtitle?: string;
  shortName?: string;
  description?: string;
  prefix: string;
  schemaSource?: string;
  apiConfigPath: string;
  pagesConfigPath: string;
  branding?: BrandingConfig;
  layout?: LayoutConfig;
  theme?: ThemeConfig;
  icons?: IconConfig;
  navigation?: {
    categories: NavCategory[];
  };
  routes?: RouteDef[];
  defaults?: DefaultsConfig;
  demoCredentials?: {
    email: string;
    password: string;
  };
}

export interface AppsConfig {
  apps: AppConfig[];
}

// Use Vite's import.meta.glob to discover all page components at build time.
// Adding a new page .tsx file is all that's needed — no code changes required.
const pageModules = import.meta.glob(
  '../../../config/pages/**/*.{tsx,jsx}'
) as Record<string, () => Promise<{ default: React.ComponentType }>>;

/**
 * Get a lazy loader for a page component by its reference name (e.g., "dashboard/index").
 * Supports both .tsx and .jsx files organized in module folders.
 */
export function getPageLoader(page: string): (() => Promise<{ default: React.ComponentType }>) | undefined {
  // Try .tsx first, then .jsx
  const tsxKey = `../../../config/pages/${page}.tsx`;
  const jsxKey = `../../../config/pages/${page}.jsx`;

  return pageModules[tsxKey] || pageModules[jsxKey];
}

/**
 * Load all apps configuration.
 */
export async function loadAppsConfig(): Promise<AppsConfig> {
  const module = await import('@config/apps.json');
  return module.default as AppsConfig;
}

/**
 * Load navigation menu structure from apps.json config.
 */
export async function loadNavigationMenu(): Promise<NavCategory[]> {
  const appsConfig = await loadAppsConfig();
  const app = appsConfig.apps[0];
  if (!app?.navigation?.categories) return [];

  return [...app.navigation.categories].sort((a, b) => a.order - b.order);
}

/**
 * Load all route definitions from apps.json config.
 * Combines navigation item routes + additional routes (create, edit, detail pages).
 */
export async function loadAllRoutes(): Promise<RouteDef[]> {
  const appsConfig = await loadAppsConfig();
  const app = appsConfig.apps[0];
  if (!app) return [];

  const routes: RouteDef[] = [];

  // Collect routes from navigation items
  if (app.navigation?.categories) {
    for (const cat of app.navigation.categories) {
      for (const item of cat.items) {
        routes.push({ path: item.path, page: item.page });
      }
    }
  }

  // Add additional routes (CRUD pages not shown in navigation)
  if (app.routes) {
    for (const route of app.routes) {
      routes.push({ path: route.path, page: route.page });
    }
  }

  return routes;
}
