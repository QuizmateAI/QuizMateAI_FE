import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SourcesPanel from '@/Pages/Users/Individual/Workspace/Components/SourcesPanel';
import { renameMaterial } from '@/api/MaterialAPI';

const toastSpy = {
  showSuccess: vi.fn(),
  showError: vi.fn(),
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

vi.mock('@/api/MaterialAPI', () => ({
  renameMaterial: vi.fn(),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => toastSpy,
}));

vi.mock('@/components/ui/HomeButton', () => ({
  default: () => <button type="button">Home</button>,
}));

vi.mock('@/Pages/Users/Individual/Workspace/Components/SourceDetailView', () => ({
  default: () => <div data-testid="source-detail-view">detail-preview</div>,
}));

describe('SourcesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects only eligible active sources when select-all is triggered', () => {
    const onSelectionChange = vi.fn();

    render(
      <SourcesPanel
        isDarkMode={false}
        sources={[
          { id: 1, name: 'active-one.pdf', type: 'application/pdf', status: 'ACTIVE' },
          { id: 2, name: 'warn-doc.pdf', type: 'application/pdf', status: 'WARN' },
          { id: 3, name: 'reject-doc.pdf', type: 'application/pdf', status: 'REJECT' },
          { id: 4, name: 'processing.pdf', type: 'application/pdf', status: 'PROCESSING' },
          { id: 5, name: 'active-two.docx', type: 'application/msword', status: 'ACTIVE' },
        ]}
        onAddSource={vi.fn()}
        onRemoveSource={vi.fn()}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'workspace.sources.selectAll' }));

    expect(onSelectionChange).toHaveBeenCalledWith([1, 5]);
  });

  it('opens the source preview dialog through the dedicated preview action', async () => {
    const onDetailViewChange = vi.fn();

    render(
      <SourcesPanel
        isDarkMode={false}
        sources={[
          { id: 9, name: 'Original Name.pdf', type: 'application/pdf', status: 'ACTIVE' },
        ]}
        onAddSource={vi.fn()}
        onRemoveSource={vi.fn()}
        onDetailViewChange={onDetailViewChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByTestId('source-detail-view')).toBeInTheDocument();
    expect(onDetailViewChange).toHaveBeenCalledWith(true);
  });

  it('renders processing sources with the amber processing badge', () => {
    render(
      <SourcesPanel
        isDarkMode={false}
        sources={[
          { id: 9, name: 'processing.pdf', type: 'application/pdf', status: 'PROCESSING' },
        ]}
        onAddSource={vi.fn()}
        onRemoveSource={vi.fn()}
      />,
    );

    const processingBadge = screen.getByText('PROCESSING');
    expect(processingBadge.className).toContain('amber');
  });

  it('renames a source and emits the normalized updated source payload', async () => {
    renameMaterial.mockResolvedValue({
      data: {
        materialId: 9,
        title: 'Renamed Material.pdf',
        status: 'ACTIVE',
      },
    });

    const onSourceUpdated = vi.fn();

    render(
      <SourcesPanel
        isDarkMode={false}
        sources={[
          { id: 9, name: 'Original Name.pdf', type: 'application/pdf', status: 'ACTIVE' },
        ]}
        onAddSource={vi.fn()}
        onRemoveSource={vi.fn()}
        onSourceUpdated={onSourceUpdated}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'workspace.sources.menuRename' }));

    const renameDialog = await screen.findByRole('dialog');
    fireEvent.change(within(renameDialog).getByRole('textbox'), {
      target: { value: 'Renamed Material' },
    });
    fireEvent.click(within(renameDialog).getByRole('button', { name: 'workspace.sources.saveBtn' }));

    await waitFor(() => {
      expect(renameMaterial).toHaveBeenCalledWith(9, 'Renamed Material.pdf');
    });

    expect(onSourceUpdated).toHaveBeenCalledWith(expect.objectContaining({
      id: 9,
      name: 'Renamed Material.pdf',
      status: 'ACTIVE',
    }));
    expect(toastSpy.showSuccess).toHaveBeenCalledWith('workspace.sources.renameSuccess');
  });

  it('bulk deletes the currently selected sources', async () => {
    const onRemoveMultiple = vi.fn().mockResolvedValue(undefined);
    const onSelectionChange = vi.fn();

    render(
      <SourcesPanel
        isDarkMode={false}
        sources={[
          { id: 1, name: 'active-one.pdf', type: 'application/pdf', status: 'ACTIVE' },
          { id: 5, name: 'active-two.docx', type: 'application/msword', status: 'ACTIVE' },
        ]}
        onAddSource={vi.fn()}
        onRemoveSource={vi.fn()}
        onRemoveMultiple={onRemoveMultiple}
        selectedIds={[1, 5]}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));

    await waitFor(() => {
      expect(onRemoveMultiple).toHaveBeenCalledWith([1, 5]);
    });
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });
});
