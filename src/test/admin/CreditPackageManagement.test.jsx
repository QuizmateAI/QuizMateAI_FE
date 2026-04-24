import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreditPackageManagement from '@/Pages/Admin/CreditPackageManagement';
import {
  createCreditPackage,
  deleteCreditPackage,
  getAllCreditPackages,
  getAllSystemSettings,
  updateCreditPackage,
  updateCreditPackageStatus,
} from '@/api/ManagementSystemAPI';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
      if (fallbackOrOptions && typeof fallbackOrOptions === 'object' && 'defaultValue' in fallbackOrOptions) {
        return fallbackOrOptions.defaultValue;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/hooks/useDarkMode', () => ({
  useDarkMode: () => ({ isDarkMode: false }),
}));

vi.mock('@/hooks/useAdminPermissions', () => ({
  useAdminPermissions: () => ({
    permissions: new Set(['credit-package:write']),
    loading: false,
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('@/api/ManagementSystemAPI', () => ({
  createCreditPackage: vi.fn(),
  deleteCreditPackage: vi.fn(),
  getAllCreditPackages: vi.fn(),
  getAllSystemSettings: vi.fn(),
  updateCreditPackage: vi.fn(),
  updateCreditPackageStatus: vi.fn(),
}));

describe('CreditPackageManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllCreditPackages.mockResolvedValue({ data: [] });
    getAllSystemSettings.mockResolvedValue({
      data: [{ key: 'credit.unit_price_vnd', value: '300' }],
    });
    createCreditPackage.mockResolvedValue({ data: {} });
    updateCreditPackage.mockResolvedValue({ data: {} });
    updateCreditPackageStatus.mockResolvedValue({ data: {} });
    deleteCreditPackage.mockResolvedValue({ data: {} });
  });

  it('calculates credit package price from the system unit price setting', async () => {
    render(<CreditPackageManagement />);

    await waitFor(() => expect(getAllSystemSettings).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /add package/i }));
    fireEvent.change(screen.getByPlaceholderText('VD: Starter, Pro, Enterprise...'), {
      target: { value: 'Starter' },
    });
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '100' },
    });

    expect(screen.getByDisplayValue('30.000')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /create package/i }));

    await waitFor(() => {
      expect(createCreditPackage).toHaveBeenCalledWith(expect.objectContaining({
        baseCredit: 100,
        bonusCredit: 10,
        price: 30_000,
      }));
    });
  });
});
