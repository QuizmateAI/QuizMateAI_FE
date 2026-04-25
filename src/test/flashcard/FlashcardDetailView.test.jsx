import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FlashcardDetailView from '@/pages/Users/Individual/Workspace/Components/FlashcardDetailView';
import { getFlashcardDetail } from '@/api/FlashcardAPI';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      const translations = {
        'workspace.flashcard.frontContent': 'Front',
        'workspace.flashcard.backContent': 'Back',
        'workspace.flashcard.items': 'items',
        'workspace.flashcard.createVia': 'Create via',
        'workspace.flashcard.statusACTIVE': 'Active',
        'workspace.flashcard.feedback': 'Feedback',
        'workspace.flashcard.itemsList': 'Flashcards in this set',
        'workspace.flashcard.assignComingSoon': 'Assign is coming soon',
      };

      return translations[key] ?? (typeof fallbackOrOptions === 'string' ? fallbackOrOptions : key);
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/components/feedback/DirectFeedbackButton', () => ({
  default: ({ label }) => <button type="button">{label}</button>,
}));

vi.mock('@/api/FlashcardAPI', () => ({
  addFlashcardItem: vi.fn(),
  deleteFlashcardItem: vi.fn(),
  getFlashcardDetail: vi.fn(),
  updateFlashcardItem: vi.fn(),
  updateFlashcardSetName: vi.fn(),
  updateFlashcardSetStatus: vi.fn(),
}));

describe('FlashcardDetailView layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFlashcardDetail.mockResolvedValue({
      data: {
        flashcardSetId: 55,
        flashcardSetName: 'Biology terms',
        createVia: 'AI',
        status: 'ACTIVE',
        items: [
          {
            flashcardItemId: 1001,
            frontContent: 'What is osmosis?',
            backContent: 'Movement of water across a semipermeable membrane.',
          },
        ],
      },
    });
  });

  it('keeps a fixed card viewport and non-overlapping face layout for group flashcards', async () => {
    const { container } = render(
      <FlashcardDetailView
        flashcard={{ flashcardSetId: 55 }}
        onBack={vi.fn()}
        hideEditButton
        contextType="GROUP"
      />,
    );

    await screen.findByText('Biology terms');

    const cardViewport = Array.from(container.querySelectorAll('div')).find(
      (element) =>
        typeof element.className === 'string'
        && element.className.includes('h-[320px]')
        && element.className.includes('sm:h-[360px]')
        && element.className.includes('lg:h-[400px]'),
    );

    const faceGrid = Array.from(container.querySelectorAll('div')).find(
      (element) =>
        typeof element.className === 'string'
        && element.className.includes('grid-rows-[auto_1fr_auto]'),
    );

    expect(cardViewport).toBeTruthy();
    expect(faceGrid).toBeTruthy();
    expect(screen.getAllByText('Front').length).toBeGreaterThan(0);
    expect(screen.getAllByText('What is osmosis?').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Click to flip this card').length).toBeGreaterThan(0);
    expect(screen.getByText('Assign is coming soon')).toBeInTheDocument();

    await waitFor(() => {
      expect(getFlashcardDetail).toHaveBeenCalledWith(55);
    });
  });
});
