import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JSONUIProvider, Renderer, VisibilityProvider } from '@json-render/react';
import { componentRegistry } from '../components/json-render/registry';
import { convertToUITree } from '../components/json-render/utils/convertToUITree';
import { createActionHandlers } from '../lib/action-handlers';
import { ValidationProvider } from '../components/json-render/ValidationContext';
import api from '../lib/api';
import { catalog } from '../lib/catalog';

interface PageConfig {
  dataSources?: Record<string, { url: string }>;
  children: any[];
}

/**
 * Strip /api prefix from config URLs since the API client already adds it
 */
function stripApiPrefix(url: string): string {
  return url.startsWith('/api/') ? url.slice(4) : url;
}

/**
 * JsonPageRenderer - Renders page configs using json-render library
 *
 * This replaces the custom PageRenderer with json-render's Renderer component.
 * It handles:
 * - Fetching data from dataSources
 * - Converting nested page config to flat UITree
 * - Setting up action handlers
 * - Providing data and action contexts via JSONUIProvider
 */
export function JsonPageRenderer({ config }: { config: PageConfig }) {
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const navigate = useNavigate();

  /**
   * Fetch data from all dataSources defined in config
   */
  const fetchData = useCallback(async () => {
    if (!config.dataSources) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const results: Record<string, any> = {};

    await Promise.all(
      Object.entries(config.dataSources).map(async ([key, source]) => {
        try {
          let url = stripApiPrefix(source.url);
          // Replace route params (e.g., :id)
          if (params.id) url = url.replace(':id', params.id);

          const res = await api.get<any>(url);

          // Flatten success responses but preserve meta for paginated data
          if (res?.success && res.data !== undefined) {
            results[key] = res.meta
              ? { data: res.data, meta: res.meta }
              : res.data;
          } else if (res && res.data !== undefined) {
            results[key] = res.data;
          } else {
            results[key] = res;
          }
        } catch (err) {
          console.error(`Failed to fetch ${key}:`, err);
          results[key] = null;
        }
      })
    );

    setData(results);
    setLoading(false);
  }, [config.dataSources, params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Convert nested page config to flat UITree structure
  const uiTree = convertToUITree(config);

  // Create action handlers with navigation and data refresh
  const actionHandlers = createActionHandlers(navigate, params, fetchData);

  // Don't render until data is loaded
  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <JSONUIProvider
      registry={componentRegistry}
      initialData={data}
      actionHandlers={actionHandlers}
      navigate={navigate}
      catalog={catalog}
    >
      <VisibilityProvider>
        <ValidationProvider>
          <Renderer
            tree={uiTree}
            registry={componentRegistry}
            loading={false}
          />
        </ValidationProvider>
      </VisibilityProvider>
    </JSONUIProvider>
  );
}
