import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiModelsManagement from '@/Pages/SuperAdmin/AiModelsManagement';
import { getAiModels, getUsdVndExchangeRate } from '@/api/ManagementSystemAPI';

let mockPermissions = new Set();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      const translations = {
        'aiModels.add': 'Add model',
        'aiModels.empty': 'No models',
        'aiModels.refresh': 'Refresh',
        'aiModels.exchangeRate.refresh': 'Refresh exchange rate',
      };
      if (key in translations) return translations[key];
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
    permissions: mockPermissions,
    loading: false,
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('@/Utils/getErrorMessage', () => ({
  getErrorMessage: () => 'Unexpected error',
}));

vi.mock('@/api/ManagementSystemAPI', () => ({
  addAiModelPriceVersion: vi.fn(),
  createAiModel: vi.fn(),
  deleteAiModel: vi.fn(),
  getAiModelOfficialPricing: vi.fn(),
  getAiModels: vi.fn(),
  getUsdVndExchangeRate: vi.fn(),
  updateAiModel: vi.fn(),
  updateAiModelStatus: vi.fn(),
}));

describe('AiModelsManagement permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissions = new Set();
    getAiModels.mockResolvedValue({ data: [] });
    getUsdVndExchangeRate.mockResolvedValue({ data: { rate: 25000 } });
  });

  it('shows write actions for ai-model:write permission', async () => {
    mockPermissions = new Set(['ai-model:write']);

    render(<AiModelsManagement />);

    await waitFor(() => expect(getAiModels).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /add model/i })).toBeInTheDocument();
  });

  it('does not use system-settings:write as AI model write permission', async () => {
    mockPermissions = new Set(['system-settings:write']);

    render(<AiModelsManagement />);

    await waitFor(() => expect(getAiModels).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /add model/i })).not.toBeInTheDocument();
  });
});
