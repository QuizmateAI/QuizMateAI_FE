import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ManualFlashcardEditor from '@/pages/Users/Individual/Workspace/Components/ManualFlashcardEditor';
import {
  createManualFlashcardBulk,
  getFlashcardPasteImportPromptTemplate,
} from '@/api/FlashcardAPI';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
      if (fallbackOrOptions && typeof fallbackOrOptions === 'object') {
        return fallbackOrOptions.defaultValue ?? key;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/api/FlashcardAPI', () => ({
  createManualFlashcardBulk: vi.fn(),
  updateManualFlashcardBulk: vi.fn(),
  getFlashcardDetail: vi.fn(),
  getFlashcardPasteImportPromptTemplate: vi.fn(),
}));

const showSuccess = vi.fn();
const showError = vi.fn();
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showSuccess,
    showError,
    showWarning: vi.fn(),
    showInfo: vi.fn(),
  }),
}));

function renderEditor(props = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ManualFlashcardEditor
        isDarkMode={false}
        workspaceId={42}
        contextType="WORKSPACE"
        contextId={42}
        canActivate
        {...props}
      />
    </QueryClientProvider>
  );
}

describe('ManualFlashcardEditor — JSON paste import persists immediately', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFlashcardPasteImportPromptTemplate.mockResolvedValue({ data: { content: 'STUB PROMPT' } });
    createManualFlashcardBulk.mockResolvedValue({
      data: {
        flashcardSetId: 999,
        flashcardSetName: 'Imported set',
        items: [
          { flashcardItemId: 1, frontContent: 'Front A', backContent: 'Back A' },
          { flashcardItemId: 2, frontContent: 'Front B', backContent: 'Back B' },
        ],
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clicking "Apply to draft" calls createManualFlashcardBulk immediately (DRAFT, no debounce)', async () => {
    renderEditor();

    // Wait for paste import panel to mount (template fetch resolved).
    const textarea = await screen.findByPlaceholderText(
      'workspace.flashcard.pasteImport.placeholder',
    );

    const validJson = JSON.stringify({
      flashcardSetName: 'Imported set',
      items: [
        { frontContent: 'Front A', backContent: 'Back A' },
        { frontContent: 'Front B', backContent: 'Back B' },
      ],
    });

    fireEvent.change(textarea, { target: { value: validJson } });

    // Apply button must enable once JSON is valid.
    const applyButton = await screen.findByRole('button', {
      name: 'workspace.flashcard.pasteImport.apply',
    });
    await waitFor(() => expect(applyButton).not.toBeDisabled());

    fireEvent.click(applyButton);

    // Save must fire immediately — not after a 1.5s debounce.
    await waitFor(() => {
      expect(createManualFlashcardBulk).toHaveBeenCalledTimes(1);
    });

    const payload = createManualFlashcardBulk.mock.calls[0][0];
    expect(payload).toMatchObject({
      workspaceId: 42,
      flashcardSetName: 'Imported set',
      activate: false, // DRAFT, not activated
    });
    expect(payload.items).toHaveLength(2);
    expect(payload.items[0]).toMatchObject({ frontContent: 'Front A', backContent: 'Back A' });

    // Success toast surfaced (proves the toast wiring is correct).
    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalled();
    });
  });

  it('keeps the raw JSON in the textarea when save fails so user can retry', async () => {
    createManualFlashcardBulk.mockRejectedValueOnce({
      response: { data: { message: 'Backend rejected' } },
    });

    renderEditor();

    const textarea = await screen.findByPlaceholderText(
      'workspace.flashcard.pasteImport.placeholder',
    );
    const validJson = JSON.stringify({
      flashcardSetName: 'Will fail',
      items: [{ frontContent: 'Q', backContent: 'A' }],
    });
    fireEvent.change(textarea, { target: { value: validJson } });

    const applyButton = await screen.findByRole('button', {
      name: 'workspace.flashcard.pasteImport.apply',
    });
    await waitFor(() => expect(applyButton).not.toBeDisabled());
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith('Backend rejected');
    });

    // Raw JSON should still be in the textarea so user can fix and retry.
    expect(textarea.value).toBe(validJson);
  });
});
