import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UploadSourceDialogBase from '@/Components/features/Workspace/UploadSourceDialogBase';
import { getSuggestedResources, importSuggestedResources } from '@/api/AIAPI';

const toastSpy = {
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showInfo: vi.fn(),
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
      if (fallbackOrOptions?.defaultValue) return fallbackOrOptions.defaultValue;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => toastSpy,
}));

vi.mock('@/api/AIAPI', () => ({
  getSuggestedResources: vi.fn(),
  suggestResourcesByWorkspace: vi.fn(),
  importSuggestedResources: vi.fn(),
  processYoutubeResource: vi.fn(),
}));

vi.mock('@/Components/plan/PlanUpgradeModal', () => ({
  default: ({ open, featureName }) => (open ? <div data-testid="plan-upgrade-modal">{featureName}</div> : null),
}));

describe('UploadSourceDialogBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSuggestedResources.mockResolvedValue({
      data: {
        content: [
          {
            suggestionId: 11,
            title: 'Community PDF Source',
            link: 'https://example.com/source',
            snippet: 'snippet',
            importable: true,
            relevanceScore: 85,
          },
        ],
      },
    });
    importSuggestedResources.mockResolvedValue({ data: {} });
  });

  it('opens plan-upgrade modal when blocked file type is selected', async () => {
    render(
      <UploadSourceDialogBase
        open
        onOpenChange={vi.fn()}
        isDarkMode={false}
        workspaceId={42}
        onUploadFiles={vi.fn()}
        planEntitlements={{
          canUploadPdf: false,
          canUploadWord: true,
          canUploadSlide: true,
          canUploadExcel: true,
          canUploadText: true,
          canUploadImage: true,
          canUploadAudio: true,
          canUploadVideo: true,
        }}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();

    fireEvent.change(fileInput, {
      target: {
        files: [new File(['pdf'], 'locked.pdf', { type: 'application/pdf' })],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId('plan-upgrade-modal')).toBeInTheDocument();
    });
  });

  it('uploads local files and imports selected suggested resources in upload-all flow', async () => {
    const onUploadFiles = vi.fn().mockResolvedValue(undefined);
    const onSuggestedImported = vi.fn().mockResolvedValue(undefined);

    render(
      <UploadSourceDialogBase
        open
        onOpenChange={vi.fn()}
        isDarkMode={false}
        workspaceId={42}
        onUploadFiles={onUploadFiles}
        onSuggestedImported={onSuggestedImported}
        planEntitlements={{
          canUploadPdf: true,
          canUploadWord: true,
          canUploadSlide: true,
          canUploadExcel: true,
          canUploadText: true,
          canUploadImage: true,
          canUploadAudio: true,
          canUploadVideo: true,
        }}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['local'], 'source.pdf', { type: 'application/pdf' })],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'workspace.upload.suggestMore' }));

    await waitFor(() => {
      expect(getSuggestedResources).toHaveBeenCalled();
      expect(screen.getByText('Community PDF Source')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Community PDF Source'));
    fireEvent.click(screen.getByRole('button', { name: 'workspace.upload.uploadAllSources' }));

    await waitFor(() => {
      expect(onUploadFiles).toHaveBeenCalledTimes(1);
      expect(importSuggestedResources).toHaveBeenCalledWith({
        workspaceId: 42,
        suggestionIds: [11],
      });
    });

    expect(onSuggestedImported).toHaveBeenCalled();
  });
});
