import type { ContentfulStatusCode } from 'hono/utils/http-status';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function success<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return { success: true, data, ...(meta ? { meta } : {}) };
}

export function error(message: string, status: ContentfulStatusCode = 400): { body: ApiResponse<never>; status: ContentfulStatusCode } {
  return { body: { success: false, error: message }, status };
}
