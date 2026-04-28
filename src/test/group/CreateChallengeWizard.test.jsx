import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateChallengeWizard from '@/pages/Users/Group/Components/CreateChallengeWizard';
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

vi.mock('@/components/features/users/UserDisplayName', () => ({
  default: ({ user, fallback }) => <span>{user?.fullName || user?.username || fallback}</span>,
}));

vi.mock('@/pages/Users/Group/Components/ChallengeScheduleFields', () => ({
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

    expect(screen.getByRole('button', { name: /Free-for-all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Team battle/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /1v1 bracket/i })).not.toBeInTheDocument();
  });

  it('offers existing, manual, and AI challenge content paths', () => {
    renderWizard();

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));

    expect(screen.getByRole('button', { name: /Existing content/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Manual challenge/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI challenge/i })).toBeInTheDocument();
    expect(screen.getByText(/manual editor/i)).toBeInTheDocument();
    expect(screen.getByText(/QuizMate AI/i)).toBeInTheDocument();
  });
});
