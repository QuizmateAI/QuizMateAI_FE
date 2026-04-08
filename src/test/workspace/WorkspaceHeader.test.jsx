import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceHeader from '@/Pages/Users/Individual/Workspace/Components/WorkspaceHeader';
import { getMyWallet } from '@/api/ManagementSystemAPI';

const hoisted = vi.hoisted(() => {
  const mockNavigate = vi.fn();
  return { mockNavigate };
});

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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => hoisted.mockNavigate,
    useLocation: () => ({ pathname: '/workspaces/42', search: '' }),
  };
});

vi.mock('@/api/ManagementSystemAPI', () => ({
  getMyWallet: vi.fn(),
}));

vi.mock('@/Components/features/Users/UserProfilePopover', () => ({
  default: () => <div data-testid="user-profile-popover" />,
}));

vi.mock('@/Components/features/WebSocketStatus', () => ({
  default: () => <div data-testid="ws-status" />,
}));

vi.mock('@/Components/ui/CreditIconImage', () => ({
  default: ({ alt, className }) => <img alt={alt} className={className} />, 
}));

describe('WorkspaceHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMyWallet.mockResolvedValue({
      data: {
        totalAvailableCredits: 1520,
      },
    });
  });

  it('submits workspace title and description edits through onEditWorkspace', async () => {
    const onEditWorkspace = vi.fn().mockResolvedValue(undefined);

    render(
      <WorkspaceHeader
        workspaceId={42}
        isDarkMode={false}
        workspaceTitle="Workspace A"
        workspaceName="Workspace A"
        workspaceDescription="Initial description"
        onEditWorkspace={onEditWorkspace}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'workspace.header.editWorkspace' }));

    fireEvent.change(screen.getByPlaceholderText('home.workspace.titlePlaceholder'), {
      target: { value: 'Workspace B' },
    });
    fireEvent.change(screen.getByPlaceholderText('home.workspace.descriptionPlaceholder'), {
      target: { value: 'Updated description' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'home.workspace.save' }));

    await waitFor(() => {
      expect(onEditWorkspace).toHaveBeenCalledWith({
        name: 'Workspace B',
        description: 'Updated description',
      });
    });
  });

  it('falls back to empty wallet summary when wallet API fails', async () => {
    getMyWallet.mockRejectedValueOnce(new Error('wallet unavailable'));

    render(
      <WorkspaceHeader
        workspaceId={42}
        isDarkMode={false}
        workspaceTitle="Workspace A"
        workspaceName="Workspace A"
        workspaceDescription="Initial description"
        onEditWorkspace={vi.fn()}
      />,
    );

    const walletButton = await screen.findByRole('button', { name: 'common.wallet' });

    await waitFor(() => {
      expect(getMyWallet).toHaveBeenCalled();
    });

    expect(within(walletButton).getByText('0')).toBeInTheDocument();
  });
});
