/**
 * App Config Hook
 *
 * Provides access to the current app configuration from config/apps.json.
 * For now, we support a single app, but this is designed to be multi-app ready.
 */

import { useState, useEffect } from 'react';
import type { AppConfig, AppsConfig } from './config-loader';

/**
 * Hook to load and access the current app configuration.
 * For now, returns the first (and only) app from the config.
 */
export function useAppConfig(): { app: AppConfig | null; loading: boolean } {
  const [app, setApp] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppsConfig().then((config) => {
      if (config.apps && config.apps.length > 0) {
        setApp(config.apps[0]);
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
