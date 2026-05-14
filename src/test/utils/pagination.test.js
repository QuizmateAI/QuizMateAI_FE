import { describe, it, expect } from 'vitest';
import {
  PAGINATION_PAGE_MIN,
  PAGINATION_SIZE_MAX,
  PAGINATION_SIZE_MIN,
  applyPaginationBounds,
  clampPaginationPage,
  clampPaginationSize,
} from '@/utils/pagination';

describe('clampPaginationSize', () => {
  it('clamps to upper bound when above max', () => {
    expect(clampPaginationSize(500)).toBe(PAGINATION_SIZE_MAX);
  });

  it('clamps to lower bound when below min', () => {
    expect(clampPaginationSize(0)).toBe(PAGINATION_SIZE_MIN);
    expect(clampPaginationSize(-10)).toBe(PAGINATION_SIZE_MIN);
  });

  it('returns value unchanged when within bounds', () => {
    expect(clampPaginationSize(20)).toBe(20);
    expect(clampPaginationSize(100)).toBe(100);
    expect(clampPaginationSize(1)).toBe(1);
  });

  it('coerces numeric strings', () => {
    expect(clampPaginationSize('250')).toBe(PAGINATION_SIZE_MAX);
    expect(clampPaginationSize('25')).toBe(25);
  });

  it('returns original value for non-numeric input (no silent corruption)', () => {
    expect(clampPaginationSize('abc')).toBe('abc');
    expect(clampPaginationSize(null)).toBe(null);
  });
});

describe('clampPaginationPage', () => {
  it('clamps negative page to 0', () => {
    expect(clampPaginationPage(-3)).toBe(PAGINATION_PAGE_MIN);
  });

  it('leaves valid page unchanged', () => {
    expect(clampPaginationPage(0)).toBe(0);
    expect(clampPaginationPage(7)).toBe(7);
  });

  it('coerces numeric strings', () => {
    expect(clampPaginationPage('-1')).toBe(PAGINATION_PAGE_MIN);
    expect(clampPaginationPage('5')).toBe(5);
  });
});

describe('applyPaginationBounds', () => {
  it('clamps axios params object in place', () => {
    const config = { params: { page: -1, size: 500, sort: 'asc' } };
    applyPaginationBounds(config);
    expect(config.params).toEqual({ page: 0, size: 100, sort: 'asc' });
  });

  it('clamps query string embedded in url', () => {
    const config = { url: '/group/1/members?page=-2&size=999&extra=keep' };
    applyPaginationBounds(config);
    expect(config.url).toBe('/group/1/members?page=0&size=100&extra=keep');
  });

  it('leaves url alone when already within bounds', () => {
    const config = { url: '/items?page=0&size=20' };
    applyPaginationBounds(config);
    expect(config.url).toBe('/items?page=0&size=20');
  });

  it('respects skipPaginationClamp opt-out', () => {
    const config = { url: '/items?size=500', params: { size: 500 }, skipPaginationClamp: true };
    applyPaginationBounds(config);
    expect(config.url).toBe('/items?size=500');
    expect(config.params.size).toBe(500);
  });

  it('does not add page/size when missing', () => {
    const config = { url: '/items?keyword=test' };
    applyPaginationBounds(config);
    expect(config.url).toBe('/items?keyword=test');
  });

  it('handles url without query string', () => {
    const config = { url: '/items' };
    applyPaginationBounds(config);
    expect(config.url).toBe('/items');
  });
});
