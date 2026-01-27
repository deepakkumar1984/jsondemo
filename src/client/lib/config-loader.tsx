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
}

export interface NavCategory {
  id: string;
  title: string;
  icon: string;
  order: number;
  items: NavItem[];
}

export interface RouteDef {
  path: string;
  page: string;
}

export interface AppConfig {
  id: string;
  name: string;
  subtitle?: string;
  shortName?: string;
  icon?: string;
  logo?: string;
  description?: string;
  prefix: string;
  schemaSource?: string;
  apiConfigPath: string;
  pagesConfigPath: string;
  navigation?: {
    categories: NavCategory[];
  };
  routes?: RouteDef[];
  demoCredentials?: {
    email: string;
    password: string;
  };
}

export interface AppsConfig {
  apps: AppConfig[];
}

// Use Vite's import.meta.glob to discover all page configs at build time.
// Adding a new page JSON is all that's needed — no code changes required.
const pageModules = import.meta.glob(
  '../../../config/pages/**/*.json'
) as Record<string, () => Promise<{ default: PageConfig }>>;

/**
 * Get a lazy loader for a page config by its reference name (e.g., "departments/list").
 */
export function getPageLoader(page: string): (() => Promise<{ default: PageConfig }>) | undefined {
  const key = `../../../config/pages/${page}.json`;
  return pageModules[key];
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
