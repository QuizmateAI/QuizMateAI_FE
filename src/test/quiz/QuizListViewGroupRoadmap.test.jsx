import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuizListView from '@/Pages/Users/Individual/Workspace/Components/QuizListView';
import { getQuizzesByScope } from '@/api/QuizAPI';
import { getGroupMembers } from '@/api/GroupAPI';

vi.mock('@/api/QuizAPI', () => ({
  getQuizzesByScope: vi.fn(),
  deleteQuiz: vi.fn(),
  getQuizById: vi.fn(),
  setGroupQuizAudience: vi.fn(),
}));

vi.mock('@/api/GroupAPI', () => ({
  getGroupMembers: vi.fn(),
}));

vi.mock('@/api/FeedbackAPI', () => ({
  getFeedbackTargetStatuses: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({
      pathname: '/group-workspaces/42',
      search: '?section=quiz',
    }),
    useNavigate: () => vi.fn(),
  };
});

describe('QuizListView group roadmap coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGroupMembers.mockResolvedValue({
      data: {
        content: [],
      },
    });
    getQuizzesByScope.mockResolvedValue({
      data: [
        {
          quizId: 999,
          title: 'Roadmap-linked group quiz',
          status: 'DRAFT',
          quizIntent: 'PRE_LEARNING',
          roadmapId: 77,
          createdAt: '2026-03-25T10:00:00',
          overallDifficulty: 'MEDIUM',
          timerMode: true,
          communityShared: false,
          myAttempted: false,
          myPassed: false,
        },
      ],
    });
  });

  it('shows roadmap-linked quizzes in the group tab and keeps the card metadata stable', async () => {
    render(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={vi.fn()}
        contextType="GROUP"
        contextId={42}
        groupRole="LEADER"
        groupCurrentUserId={7}
      />,
    );

    const title = await screen.findByText('Roadmap-linked group quiz');
    expect(title).toBeInTheDocument();
    expect(getQuizzesByScope).toHaveBeenCalledWith('GROUP', 42);
    expect(screen.getByText('DRAFT')).toBeInTheDocument();

    const titleHeading = title.closest('h3');
    expect(titleHeading?.className).toContain('line-clamp-2');
    expect(titleHeading?.className).toContain('min-h-[3.5rem]');

    const createdAt = screen.getByText('25/03/2026 10:00');
    expect(createdAt.closest('span')?.className).toContain('whitespace-nowrap');
  });
});
