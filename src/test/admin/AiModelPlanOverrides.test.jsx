import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiModelPlanOverrides from '@/pages/SuperAdmin/AiModelPlanOverrides';
import {
  deletePlanAiModelOverride,
  getAiModels,
  getAllAiActionPolicies,
  getPlanAiModelOverrides,
  getPlansLite,
  upsertPlanAiModelOverride,
} from '@/api/ManagementSystemAPI';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      if (fallbackOrOptions && typeof fallbackOrOptions === 'object' && 'plan' in fallbackOrOptions) {
        return `${key}|${fallbackOrOptions.plan}`;
      }
      if (fallbackOrOptions && typeof fallbackOrOptions === 'object' && 'id' in fallbackOrOptions) {
        return `${key}|#${fallbackOrOptions.id}`;
      }
      if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/hooks/useDarkMode', () => ({
  useDarkMode: () => ({ isDarkMode: false }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('@/utils/getErrorMessage', () => ({
  getErrorMessage: () => 'Unexpected error',
}));

vi.mock('@/api/ManagementSystemAPI', () => ({
  getPlansLite: vi.fn(),
  getAiModels: vi.fn(),
  getAllAiActionPolicies: vi.fn(),
  getPlanAiModelOverrides: vi.fn(),
  upsertPlanAiModelOverride: vi.fn(),
  deletePlanAiModelOverride: vi.fn(),
}));

const FREE_PLAN = { planCatalogId: 10, code: 'FREE', displayName: 'Free' };
const PRO_PLAN = { planCatalogId: 20, code: 'PRO', displayName: 'Pro' };

const SAMPLE_MODELS = [
  { aiModelId: 100, provider: 'OPENAI', modelGroup: 'TEXT_GENERATION', displayName: 'GPT-4o', modelCode: 'gpt-4o' },
  { aiModelId: 101, provider: 'GEMINI', modelGroup: 'TEXT_GENERATION', displayName: 'Gemini Pro', modelCode: 'gemini-pro' },
];

const SAMPLE_POLICY = {
  actionKey: 'GENERATE_QUIZ',
  defaultModelId: 100,
};

describe('AiModelPlanOverrides', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPlansLite.mockResolvedValue({ data: [FREE_PLAN, PRO_PLAN] });
    getAiModels.mockResolvedValue({ data: SAMPLE_MODELS });
    getAllAiActionPolicies.mockResolvedValue({ data: [SAMPLE_POLICY] });
    getPlanAiModelOverrides.mockResolvedValue({ data: [] });
    upsertPlanAiModelOverride.mockResolvedValue({ data: {} });
    deletePlanAiModelOverride.mockResolvedValue({ data: {} });
  });

  it('shows the empty state when the selected plan has no overrides', async () => {
    render(<AiModelPlanOverrides />);

    await waitFor(() => {
      expect(getPlanAiModelOverrides).toHaveBeenCalledWith(String(FREE_PLAN.planCatalogId));
    });

    expect(await screen.findByText('aiPlanOverride.empty')).toBeInTheDocument();
  });

  it('renders existing action-group overrides with the model display name', async () => {
    getPlanAiModelOverrides.mockResolvedValue({
      data: [
        { actionKey: 'GENERATE_QUIZ', modelGroup: 'TEXT_GENERATION', modelId: 101 },
      ],
    });

    render(<AiModelPlanOverrides />);

    expect(await screen.findByText('Gemini Pro')).toBeInTheDocument();
    expect(screen.getAllByText('GENERATE_QUIZ').length).toBeGreaterThan(0);
  });

  it('keeps legacy override creation read-only', async () => {
    render(<AiModelPlanOverrides />);

    await waitFor(() => {
      expect(getPlanAiModelOverrides).toHaveBeenCalled();
    });

    expect(screen.getByText(/read-only for legacy override review/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aiPlanOverride\.addOverride/ })).toBeDisabled();
    expect(upsertPlanAiModelOverride).not.toHaveBeenCalled();
  });

  it('keeps legacy override reset read-only', async () => {
    getPlanAiModelOverrides.mockResolvedValue({
      data: [
        { actionKey: 'GENERATE_QUIZ', modelGroup: 'TEXT_GENERATION', modelId: 100 },
      ],
    });

    render(<AiModelPlanOverrides />);

    const resetButton = await screen.findByRole('button', { name: /aiPlanOverride\.reset/ });
    expect(resetButton).toBeDisabled();
    expect(deletePlanAiModelOverride).not.toHaveBeenCalled();
  });
});
