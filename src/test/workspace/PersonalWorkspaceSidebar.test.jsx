import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PersonalWorkspaceSidebar from '@/pages/Users/Individual/Workspace/Components/PersonalWorkspaceSidebar';
import { getMyWallet } from '@/api/ManagementSystemAPI';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeBaseProps(overrides = {}) {
  return {
    isDarkMode: false,
    workspaceTitle: 'Workspace test',
    activeView: 'sources',
    onNavigate: vi.fn(),
    onOpenProfile: vi.fn(),
    onToggleLanguage: vi.fn(),
    onToggleDarkMode: vi.fn(),
    onEditWorkspace: vi.fn(),
    disabledMap: {},
    badgeMap: {},
    mobileOpen: false,
    onCloseMobile: vi.fn(),
    isMobile: false,
    ...overrides,
  };
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: {
      language: 'vi',
    },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/workspaces/1' }),
  };
});

vi.mock('@/api/ManagementSystemAPI', () => ({
  getMyWallet: vi.fn(),
}));

describe('PersonalWorkspaceSidebar wallet badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMyWallet.mockResolvedValue({ data: { totalAvailableCredits: 0 } });
  });

  it('clears loading when the initial wallet request is superseded by a silent refresh', async () => {
    const firstRequest = deferred();
    const secondRequest = deferred();

    getMyWallet
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise);

    const baseProps = makeBaseProps();

    const { rerender } = render(
      <PersonalWorkspaceSidebar
        {...baseProps}
        walletRefreshToken={0}
      />,
    );

    expect(screen.getByText('-')).toBeInTheDocument();

    rerender(
      <PersonalWorkspaceSidebar
        {...baseProps}
        walletRefreshToken={1}
      />,
    );

    await act(async () => {
      secondRequest.resolve({ data: { totalAvailableCredits: 42 } });
      await secondRequest.promise;
    });

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('shows only the three primary navigation items on mobile', async () => {
    render(
      <PersonalWorkspaceSidebar
        {...makeBaseProps({ isMobile: true, mobileOpen: true })}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    expect(screen.getByText('sources')).toBeInTheDocument();
    expect(screen.getByText('roadmap')).toBeInTheDocument();
    expect(screen.getByText('quiz')).toBeInTheDocument();
    expect(screen.queryByText('flashcard')).not.toBeInTheDocument();
    expect(screen.queryByText('mockTest')).not.toBeInTheDocument();
    expect(screen.queryByText('questionStats')).not.toBeInTheDocument();
  });
});
