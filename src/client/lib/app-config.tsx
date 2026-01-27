/**
 * App Config Hook
 *
 * Provides access to the current app configuration from config/apps.json
 * For now, we only support a single app, but this is designed to be multi-app ready.
 */

import { useState, useEffect } from 'react';
import {
  Users,
  Building,
  Briefcase,
  DollarSign,
  FileText,
  Star,
  Clock,
  Calendar,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import type { AppsConfig } from './config-loader';

export interface AppInfo {
  id: string;
  name: string;
  subtitle: string;
  shortName: string;
  icon: string;
  logo: string;
  description: string;
  prefix: string;
  demoCredentials: {
    email: string;
    password: string;
  };
  navigation: {
    categories: Array<{
      id: string;
      title: string;
      paths?: string[];
      order: number;
    }>;
  };
}

// Icon mapping for navigation icons
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Building,
  Briefcase,
  DollarSign,
  FileText,
  Star,
  Clock,
  Calendar,
  Settings,
  LayoutDashboard,
};

export function getAppIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return iconMap[iconName] || Users;
}

/**
 * Hook to load and access the current app configuration.
 * For now, returns the first (and only) app from the config.
 */
export function useAppConfig(): { app: AppInfo | null; loading: boolean } {
  const [app, setApp] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppsConfig().then((config) => {
      if (config.apps && config.apps.length > 0) {
        setApp(config.apps[0] as unknown as AppInfo);
      }
      setLoading(false);
    });
  }, []);

  return { app, loading };
}

/**
 * Load the apps configuration file.
 */
async function loadAppsConfig(): Promise<AppsConfig> {
  const module = await import('@config/apps.json');
  return module.default as AppsConfig;
}
