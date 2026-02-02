/**
 * Apps DSL Parser
 *
 * Converts Apps DSL → JSON format matching apps schema
 *
 * DSL Format:
 *   app <appId>
 *     name "<display_name>"
 *     subtitle "<subtitle>"
 *     prefix "<url_prefix>"
 *     [auth required]
 *
 *     nav <category_title>
 *       item "<title>" "<path>" <page> [icon=<icon>] [badge=<badge>] [auth] [role=<role>]
 *
 *     route "<path>" <page> [auth] [role=<role>]
 *
 *     defaults
 *       <category>
 *         <key>=<value>
 */

interface AppConfig {
  id: string;
  name?: string;
  subtitle?: string;
  shortName?: string;
  description?: string;
  prefix?: string;
  requiresAuth?: boolean;
  branding?: any;
  layout?: any;
  theme?: any;
  navigation?: {
    categories: NavCategory[];
  };
  routes?: Route[];
  defaults?: Record<string, any>;
  schemaSource?: string;
  apiConfigPath?: string;
  pagesConfigPath?: string;
}

interface NavCategory {
  id: string;
  title: string;
  order?: number;
  items: NavItem[];
}

interface NavItem {
  title: string;
  path: string;
  page: string;
  icon?: string;
  badge?: string;
  badgeVariant?: string;
  requiresAuth?: boolean;
  requiresRole?: string;
}

interface Route {
  path: string;
  page: string;
  requiresAuth?: boolean;
  requiresRole?: string;
}

export function parseApp(dsl: string): AppConfig {
  const lines = dsl.split('\n').map(l => l.trimEnd()).filter(l => l && !l.trim().startsWith('#'));

  let config: AppConfig = {
    id: '',
    navigation: { categories: [] },
    routes: []
  };

  let i = 0;

  // Parse app declaration
  if (lines[i].trim().startsWith('app ')) {
    config.id = lines[i].trim().substring(4).trim();
    i++;
  }

  let currentCategory: NavCategory | null = null;
  let currentDefaults: any = null;
  let currentDefaultsSection: string | null = null;

  // Parse app properties
  while (i < lines.length) {
    const line = lines[i];
    const indent = getIndent(line);
    const trimmed = line.trim();

    // App-level properties
    if (indent <= 2 && trimmed.startsWith('name ')) {
      const match = trimmed.match(/^name\s+"([^"]+)"/);
      if (match) config.name = match[1];
      i++;
    } else if (indent <= 2 && trimmed.startsWith('subtitle ')) {
      const match = trimmed.match(/^subtitle\s+"([^"]+)"/);
      if (match) config.subtitle = match[1];
      i++;
    } else if (indent <= 2 && trimmed.startsWith('prefix ')) {
      const match = trimmed.match(/^prefix\s+"([^"]+)"/);
      if (match) config.prefix = match[1];
      i++;
    } else if (indent <= 2 && trimmed === 'auth required') {
      config.requiresAuth = true;
      i++;
    }
    // Navigation category
    else if (indent <= 2 && trimmed.startsWith('nav ')) {
      const title = trimmed.substring(4).trim();
      currentCategory = {
        id: title.toLowerCase().replace(/\s+/g, '-'),
        title,
        items: []
      };
      config.navigation!.categories.push(currentCategory);
      i++;
    }
    // Navigation item
    else if (indent > 2 && trimmed.startsWith('item ') && currentCategory) {
      const item = parseNavItem(trimmed);
      currentCategory.items.push(item);
      i++;
    }
    // Route
    else if (indent <= 2 && trimmed.startsWith('route ')) {
      const route = parseRoute(trimmed);
      config.routes!.push(route);
      i++;
    }
    // Defaults
    else if (indent <= 2 && trimmed === 'defaults') {
      currentDefaults = {};
      config.defaults = currentDefaults;
      i++;
    }
    // Defaults section (table, form, etc.)
    else if (currentDefaults && indent > 2 && !trimmed.includes('=')) {
      currentDefaultsSection = trimmed;
      currentDefaults[currentDefaultsSection] = {};
      i++;
    }
    // Defaults property
    else if (currentDefaults && currentDefaultsSection && indent > 4 && trimmed.includes('=')) {
      const [key, value] = trimmed.split('=');
      currentDefaults[currentDefaultsSection][key.trim()] = parseValue(value.trim());
      i++;
    } else {
      i++;
    }
  }

  // Wrap in apps array to match apps-format.json schema
  return { apps: [config] };
}

function parseNavItem(line: string): NavItem {
  // item "<title>" "<path>" <page> [icon=<icon>] [badge=<badge>] [auth] [role=<role>]
  const parts = line.substring(5).trim().split(/\s+/);

  const item: NavItem = {
    title: '',
    path: '',
    page: ''
  };

  // Extract quoted strings
  const titleMatch = line.match(/"([^"]+)"/);
  if (titleMatch) {
    item.title = titleMatch[1];
  }

  const pathMatch = line.match(/"([^"]+)"\s+"([^"]+)"/);
  if (pathMatch) {
    item.path = pathMatch[2];
  }

  // Find page (first non-quoted, non-key=value part)
  for (const part of parts) {
    if (!part.includes('=') && !part.includes('"') && part !== 'auth' && !part.startsWith('role=') && !part.startsWith('icon=') && !part.startsWith('badge=')) {
      item.page = part;
      break;
    }
  }

  // Parse props
  for (const part of parts) {
    if (part.startsWith('icon=')) {
      item.icon = part.substring(5);
    } else if (part.startsWith('badge=')) {
      const badgeValue = part.substring(6);
      item.badge = badgeValue.replace(/"/g, '');
    } else if (part.startsWith('badgeVariant=')) {
      item.badgeVariant = part.substring(13).replace(/"/g, '');
    } else if (part.startsWith('role=')) {
      item.requiresRole = part.substring(5);
    } else if (part === 'auth') {
      item.requiresAuth = true;
    }
  }

  return item;
}

function parseRoute(line: string): Route {
  // route "<path>" <page> [auth] [role=<role>]
  const parts = line.substring(6).trim().split(/\s+/);

  const route: Route = {
    path: '',
    page: ''
  };

  // Extract path
  const pathMatch = line.match(/"([^"]+)"/);
  if (pathMatch) {
    route.path = pathMatch[1];
  }

  // Find page (first non-quoted, non-key=value part)
  for (const part of parts) {
    if (!part.includes('=') && !part.includes('"') && part !== 'auth' && !part.startsWith('role=')) {
      route.page = part;
      break;
    }
  }

  // Parse props
  for (const part of parts) {
    if (part.startsWith('role=')) {
      route.requiresRole = part.substring(5);
    } else if (part === 'auth') {
      route.requiresAuth = true;
    }
  }

  return route;
}

function getIndent(line: string): number {
  return line.search(/\S/);
}

function parseValue(str: string): any {
  // Handle quoted strings
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }

  // Handle boolean
  if (str === 'true') return true;
  if (str === 'false') return false;

  // Handle number
  const num = Number(str);
  if (!isNaN(num)) return num;

  // Handle comma-separated arrays
  if (str.includes(',')) {
    return str.split(',').map(s => {
      const trimmed = s.trim();
      const n = Number(trimmed);
      return isNaN(n) ? trimmed : n;
    });
  }

  // Return as string
  return str;
}
