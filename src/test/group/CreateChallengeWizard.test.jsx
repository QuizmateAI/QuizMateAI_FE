import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateChallengeWizard from '@/Pages/Users/Group/Components/CreateChallengeWizard';
import { getQuizzesByScope } from '@/api/QuizAPI';
import { getGroupMembers } from '@/api/GroupAPI';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => (typeof fallbackOrOptions === 'string' ? fallbackOrOptions : key),
    i18n: { language: 'vi' },
  }),
}));

vi.mock('@/api/QuizAPI', () => ({
  getQuizzesByScope: vi.fn(),
}));

vi.mock('@/api/GroupAPI', () => ({
  getGroupMembers: vi.fn(),
}));

vi.mock('@/api/ChallengeAPI', () => ({
  createChallenge: vi.fn(),
}));

vi.mock('@/Components/users/UserDisplayName', () => ({
  default: ({ user, fallback }) => <span>{user?.fullName || user?.username || fallback}</span>,
}));

vi.mock('@/Pages/Users/Group/Components/ChallengeScheduleFields', () => ({
  default: () => <div>Schedule fields</div>,
}));

function renderWizard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CreateChallengeWizard
        workspaceId={55}
        isDarkMode={false}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        currentUserId={101}
      />
    </QueryClientProvider>,
  );
}

describe('CreateChallengeWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getQuizzesByScope.mockResolvedValue({ data: [] });
    getGroupMembers.mockResolvedValue({ data: { content: [] } });
  });

  it('temporarily hides the solo bracket mode from the mode step', () => {
    renderWizard();

    expect(screen.getByRole('button', { name: /Đua cá nhân/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đấu đội/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Đấu cúp 1v1/i })).not.toBeInTheDocument();
  });
});
