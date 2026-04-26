import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiActionPolicyManagement from '@/pages/Admin/AiActionPolicyManagement';
import { getAiModels, getAllAiActionPolicies, updateAiActionPolicy } from '@/api/ManagementSystemAPI';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      const translations = {
        'aiActionPolicy.edit': 'Edit',
        'aiActionPolicy.editTitle': 'Edit AI Policy',
        'aiActionPolicy.editDescription': 'Update the policy',
        'aiActionPolicy.displayName': 'Display name',
        'aiActionPolicy.description': 'Description',
        'aiActionPolicy.costMode.label': 'Cost mode',
        'aiActionPolicy.actionKey': 'Action key',
        'aiActionPolicy.active': 'Active',
        'aiActionPolicy.unitField': 'Unit',
        'aiActionPolicy.defaultModel': 'Default model',
        'aiActionPolicy.defaultModelUnsetOption': 'No default model',
        'aiActionPolicy.defaultModelHint': 'Used when a plan has no override.',
        'aiActionPolicy.save': 'Save',
        'aiActionPolicy.saving': 'Saving...',
        'aiActionPolicy.cancel': 'Cancel',
        'aiActionPolicy.title': 'AI Action Policies',
        'aiActionPolicy.subtitle': 'Configure credit costs',
        'aiActionPolicy.refresh': 'Refresh',
        'aiActionPolicy.sectionAiFunctions': 'AI-powered features',
        'aiActionPolicy.colAction': 'Action',
        'aiActionPolicy.colCostMode': 'Cost mode',
        'aiActionPolicy.colFormula': 'Formula',
        'aiActionPolicy.colDefaultModel': 'Default model',
        'aiActionPolicy.colStatus': 'Status',
        'aiActionPolicy.colActions': 'Actions',
        'aiActionPolicy.statusActive': 'Active',
        'aiActionPolicy.statusInactive': 'Inactive',
        'aiActionPolicy.costMode.FIXED': 'Fixed',
        'aiActionPolicy.costMode.PER_ITEM': 'Per item',
        'aiActionPolicy.actions.generateFlashcards.title': 'Generate Flashcards',
        'aiActionPolicy.actions.generateFlashcards.baseCost': 'Flashcard set fee',
        'aiActionPolicy.actions.generateFlashcards.unitSize': 'Cards per unit',
      };

      if (key in translations) {
        return translations[key];
      }
      if (typeof fallbackOrOptions === 'string') {
        return fallbackOrOptions;
      }
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
    permissions: new Set(['system-settings:write']),
    loading: false,
  }),
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
  getAllAiActionPolicies: vi.fn(),
  updateAiActionPolicy: vi.fn(),
  getAiModels: vi.fn(),
}));

describe('AiActionPolicyManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllAiActionPolicies.mockResolvedValue({
      data: [
        {
          actionKey: 'GENERATE_FLASHCARDS',
          displayName: 'Generate Flashcards',
          costMode: 'PER_ITEM',
          baseCreditCost: 5,
          unitCreditCost: 1,
          unitSize: 1,
          isActive: true,
          description: 'Flashcard pricing',
        },
      ],
    });
    updateAiActionPolicy.mockResolvedValue({
      data: {
        actionKey: 'GENERATE_FLASHCARDS',
        baseCreditCost: 5,
        unitCreditCost: 1,
        unitSize: 1000,
      },
    });
    getAiModels.mockResolvedValue({ data: [] });
  });

  it('keeps raw numeric typing stable and normalizes whole numbers before saving', async () => {
    render(<AiActionPolicyManagement />);

    fireEvent.click(await screen.findByTitle('Edit'));

    const unitInput = screen.getByText('Unit').parentElement.querySelector('input');
    const unitSizeInput = screen.getByText('Cards per unit').parentElement.querySelector('input');

    fireEvent.change(unitInput, { target: { value: '001' } });
    fireEvent.change(unitSizeInput, { target: { value: '1000' } });

    expect(unitInput).toHaveValue('001');
    expect(unitSizeInput).toHaveValue('1000');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateAiActionPolicy).toHaveBeenCalledWith('GENERATE_FLASHCARDS', expect.objectContaining({
        baseCreditCost: 5,
        unitCreditCost: 1,
        unitSize: 1000,
      }));
    });
  });

  it('uses aiModelId from API models for default model options and payload', async () => {
    getAllAiActionPolicies.mockResolvedValue({
      data: [
        {
          actionKey: 'GENERATE_FLASHCARDS',
          displayName: 'Generate Flashcards',
          costMode: 'PER_ITEM',
          baseCreditCost: 5,
          unitCreditCost: 1,
          unitSize: 1,
          isActive: true,
          description: 'Flashcard pricing',
          defaultModelId: 100,
        },
      ],
    });
    getAiModels.mockResolvedValue({
      data: [
        {
          aiModelId: 100,
          provider: 'OPENAI',
          modelGroup: 'TEXT_GENERATION',
          displayName: 'GPT-4o',
          modelCode: 'gpt-4o',
        },
      ],
    });

    render(<AiActionPolicyManagement />);

    expect(await screen.findByText('GPT-4o')).toBeInTheDocument();
    fireEvent.click(await screen.findByTitle('Edit'));

    const defaultModelLabel = screen.getAllByText('Default model')
      .find((node) => node.tagName.toLowerCase() === 'label');
    const defaultModelSelect = defaultModelLabel.parentElement.querySelector('select');
    expect(defaultModelSelect).toHaveValue('100');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateAiActionPolicy).toHaveBeenCalledWith('GENERATE_FLASHCARDS', expect.objectContaining({
        defaultModelId: 100,
      }));
    });
  });

  it('renders restored roadmap and companion policy actions', async () => {
    getAllAiActionPolicies.mockResolvedValue({
      data: [
        {
          actionKey: 'GENERATE_ROADMAP',
          displayName: 'Create Roadmap',
          costMode: 'FIXED',
          baseCreditCost: 2,
          unitCreditCost: 0,
          unitSize: 1,
          isActive: true,
          description: 'Roadmap pricing',
        },
        {
          actionKey: 'COMPANION_INTERPRET',
          displayName: 'Companion Answer',
          costMode: 'FIXED',
          baseCreditCost: 1,
          unitCreditCost: 0,
          unitSize: 1,
          isActive: true,
          description: 'Companion pricing',
        },
      ],
    });

    render(<AiActionPolicyManagement />);

    expect(await screen.findByText('Create Roadmap')).toBeInTheDocument();
    expect(screen.getByText('Companion Answer')).toBeInTheDocument();
  });
});
