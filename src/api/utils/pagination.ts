export interface PaginationParams {
  page: number;
  limit: number;
}

export function getPaginationParams(url: URL): PaginationParams {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
  return { page, limit };
}

export function getOffset(params: PaginationParams): number {
  return (params.page - 1) * params.limit;
}

export function buildMeta(params: PaginationParams, total: number) {
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.ceil(total / params.limit),
  };
}
