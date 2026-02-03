import type { ActionHandler } from '@json-render/core';

/**
 * Create action handlers for json-render ActionProvider
 * @param navigate React Router navigate function
 * @param params React Router params object
 * @param refreshData Function to refresh page data
 * @returns Record of action handlers
 */
export function createActionHandlers(
  navigate: any,
  params: any,
  refreshData: () => void
): Record<string, ActionHandler> {
  return {
    navigate: async ({ to }: any) => {
      let url = to;
      if (params.id) url = url.replace(':id', params.id);
      navigate(url);
    },

    api_call: async ({ url, method, body }: any) => {
      const api = (await import('./api')).default;
      let apiUrl = url;
      if (params.id) apiUrl = apiUrl.replace(':id', params.id);

      const response = await api.request(apiUrl, { method, body });
      return response;
    },

    submit_form: async ({ url, method, data }: any) => {
      const api = (await import('./api')).default;
      let apiUrl = url;
      if (params.id) apiUrl = apiUrl.replace(':id', params.id);

      const response = await api.request(apiUrl, {
        method: method || 'POST',
        body: data
      });

      return response;
    },

    delete_confirm: async ({ url }: any) => {
      const api = (await import('./api')).default;
      let apiUrl = url;
      if (params.id) apiUrl = apiUrl.replace(':id', params.id);

      const response = await api.request(apiUrl, { method: 'DELETE' });
      return response;
    },

    update: async ({ url, method, data }: any) => {
      const api = (await import('./api')).default;
      let apiUrl = url;
      if (params.id) apiUrl = apiUrl.replace(':id', params.id);

      const response = await api.request(apiUrl, {
        method: method || 'PUT',
        body: data
      });

      return response;
    },

    batch_delete: async ({ url, method, ids }: any) => {
      const api = (await import('./api')).default;
      let apiUrl = url;
      if (params.id) apiUrl = apiUrl.replace(':id', params.id);

      await api.request(apiUrl, {
        method: method || 'DELETE',
        body: { ids }
      });

      refreshData();
    },

    batch_update: async ({ url, method, ids, data }: any) => {
      const api = (await import('./api')).default;
      let apiUrl = url;
      if (params.id) apiUrl = apiUrl.replace(':id', params.id);

      await api.request(apiUrl, {
        method: method || 'PATCH',
        body: { ids, data }
      });

      refreshData();
    },

    refresh_data: async () => {
      refreshData();
    }
  };
}
