import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateFlashcardForm from '@/Pages/Users/Individual/Workspace/Components/CreateFlashcardForm';
import { generateAIFlashcardSet } from '@/api/FlashcardAPI';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => (typeof fallbackOrOptions === 'string' ? fallbackOrOptions : key),
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/api/FlashcardAPI', () => ({
  generateAIFlashcardSet: vi.fn(),
}));

describe('CreateFlashcardForm AI payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateAIFlashcardSet.mockResolvedValue({ data: { flashcardSetId: 801 } });
  });

  it('TC-A02 (adapted): sends a cloze-heavy flashcard payload when Cloze is chosen', async () => {
    render(
      <CreateFlashcardForm
        isDarkMode={false}
        onCreateFlashcard={vi.fn()}
        onBack={vi.fn()}
        contextId={55}
        selectedSourceIds={[91]}
        sources={[{ id: 91, name: 'Grammar.pdf', status: 'ACTIVE' }]}
      />
    );

    const spinbuttons = screen.getAllByRole('spinbutton');
    fireEvent.change(spinbuttons[3], { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: 'workspace.flashcard.generateAI' }));

    await waitFor(() => {
      expect(generateAIFlashcardSet).toHaveBeenCalledWith(expect.objectContaining({
        materialId: 91,
        workspaceId: 55,
        quantity: 20,
        termPercent: 0,
        qaPercent: 0,
        clozePercent: 100,
        imagePercent: 0,
      }));
    });
  });
});
