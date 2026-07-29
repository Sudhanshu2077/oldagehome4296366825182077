export interface PageQuery {
  page: number;
  pageSize: number;
}

export interface SortClause {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterClause {
  field: string;
  op: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte' | 'regex' | 'exists';
  value: unknown;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 200;

export function normalizePageQuery(raw: {
  page?: unknown;
  pageSize?: unknown;
  limit?: unknown;
  offset?: unknown;
}): PageQuery {
  let page = DEFAULT_PAGE;
  let pageSize = DEFAULT_PAGE_SIZE;

  if (typeof raw.page === 'string') {
    const n = Number.parseInt(raw.page, 10);
    if (Number.isFinite(n) && n > 0) page = n;
  } else if (typeof raw.page === 'number' && raw.page > 0) {
    page = raw.page;
  }

  if (typeof raw.pageSize === 'string') {
    const n = Number.parseInt(raw.pageSize, 10);
    if (Number.isFinite(n) && n > 0) pageSize = Math.min(n, MAX_PAGE_SIZE);
  } else if (typeof raw.pageSize === 'number' && raw.pageSize > 0) {
    pageSize = Math.min(raw.pageSize, MAX_PAGE_SIZE);
  } else if (typeof raw.limit === 'number' && raw.limit > 0) {
    pageSize = Math.min(raw.limit, MAX_PAGE_SIZE);
    page = typeof raw.offset === 'number' && raw.offset > 0 ? Math.floor(raw.offset / pageSize) + 1 : 1;
  }

  return { page, pageSize };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  query: PageQuery,
): PaginatedResult<T> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);
  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages,
  };
}
