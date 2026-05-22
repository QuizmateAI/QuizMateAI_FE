export const PAGINATION_SIZE_MIN = 1;
export const PAGINATION_SIZE_MAX = 100;
export const PAGINATION_PAGE_MIN = 0;

export function clampPaginationSize(value) {
  if (value === null || value === undefined || value === '') return value;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return value;
  return Math.min(PAGINATION_SIZE_MAX, Math.max(PAGINATION_SIZE_MIN, n));
}

export function clampPaginationPage(value) {
  if (value === null || value === undefined || value === '') return value;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return value;
  return Math.max(PAGINATION_PAGE_MIN, n);
}

function clampParamsObject(params) {
  if (!params || typeof params !== 'object') return false;
  let changed = false;
  if (params.size !== undefined && params.size !== null && params.size !== '') {
    const next = clampPaginationSize(params.size);
    if (next !== params.size) {
      params.size = next;
      changed = true;
    }
  }
  if (params.page !== undefined && params.page !== null && params.page !== '') {
    const next = clampPaginationPage(params.page);
    if (next !== params.page) {
      params.page = next;
      changed = true;
    }
  }
  return changed;
}

function clampUrlQueryString(url) {
  if (typeof url !== 'string') return url;
  const qIndex = url.indexOf('?');
  if (qIndex < 0) return url;

  const path = url.slice(0, qIndex);
  const search = new URLSearchParams(url.slice(qIndex + 1));
  let changed = false;

  if (search.has('size')) {
    const raw = search.get('size');
    const clamped = clampPaginationSize(raw);
    if (String(clamped) !== raw) {
      search.set('size', String(clamped));
      changed = true;
    }
  }
  if (search.has('page')) {
    const raw = search.get('page');
    const clamped = clampPaginationPage(raw);
    if (String(clamped) !== raw) {
      search.set('page', String(clamped));
      changed = true;
    }
  }

  return changed ? `${path}?${search.toString()}` : url;
}

export function applyPaginationBounds(config) {
  if (!config || config.skipPaginationClamp) return config;
  clampParamsObject(config.params);
  const nextUrl = clampUrlQueryString(config.url);
  if (nextUrl !== config.url) {
    config.url = nextUrl;
  }
  return config;
}
