/**
 * Dynamic API Config Loader
 *
 * Configs are imported at build time via generated index
 */

import { apiConfigs } from './configs.generated';

export interface ApiConfig {
  resource: string;
  table: string;
  basePath: string;
  [key: string]: any;
}

/**
 * Load all API configs
 */
export function loadApiConfigs(): ApiConfig[] {
  apiConfigs.forEach(config => {
    console.log(`✓ Loaded API config: ${config.resource} (${config.basePath})`);
  });

  return apiConfigs;
}
