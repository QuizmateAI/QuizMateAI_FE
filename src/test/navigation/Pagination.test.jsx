import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Pagination from '@/pages/Users/Home/Components/Pagination';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (key === 'home.pagination.showing') {
        return `Showing ${options?.start}-${options?.end} of ${options?.total}`;
      }
      if (key === 'home.pagination.page') {
        return 'page';
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

describe('Pagination', () => {
  it('TC-N01 (adapted): emits the requested page index and page size', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        totalElements={25}
        pageSize={10}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        isDarkMode={false}
      />
    );

    expect(screen.getByText('Showing 11-20 of 25')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '20' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });
});
