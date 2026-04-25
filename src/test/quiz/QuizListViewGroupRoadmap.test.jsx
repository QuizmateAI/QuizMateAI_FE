import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuizListView from '@/pages/Users/Group/Components/QuizListView';
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

  it('hides roadmap-linked quizzes from the group quiz tab', async () => {
    render(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={vi.fn()}
        contextId={42}
        groupRole="LEADER"
        groupCurrentUserId={7}
      />,
    );

    await waitFor(() => {
      expect(getQuizzesByScope).toHaveBeenCalledWith('GROUP', 42);
    });
    expect(screen.queryByText('Roadmap-linked group quiz')).not.toBeInTheDocument();
    expect(screen.getByText('No quiz yet')).toBeInTheDocument();
  });

  it('keeps roadmap-linked quizzes visible inside roadmap phase panels', async () => {
    render(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={vi.fn()}
        contextType="PHASE"
        contextId={77}
      />,
    );

    const title = await screen.findByText('Roadmap-linked group quiz');
    expect(title).toBeInTheDocument();
    expect(getQuizzesByScope).toHaveBeenCalledWith('PHASE', 77);
  });

  it('hides privately assigned quizzes of other members from a regular member on the all tab', async () => {
    getQuizzesByScope.mockResolvedValueOnce({
      data: [
        {
          quizId: 101,
          title: 'Whole group quiz',
          status: 'ACTIVE',
          createdAt: '2026-03-25T10:00:00',
          groupAudienceMode: 'ALL_MEMBERS',
        },
        {
          quizId: 102,
          title: 'My assigned quiz',
          status: 'ACTIVE',
          createdAt: '2026-03-25T10:01:00',
          groupAudienceMode: 'SELECTED_MEMBERS',
          assignedUserIds: [7, 9],
        },
        {
          quizId: 103,
          title: 'Other member assigned quiz',
          status: 'ACTIVE',
          createdAt: '2026-03-25T10:02:00',
          groupAudienceMode: 'SELECTED_MEMBERS',
          assignedUserIds: [9],
        },
      ],
    });

    render(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={vi.fn()}
        contextId={42}
        groupRole="MEMBER"
        groupCurrentUserId={7}
      />,
    );

    expect(await screen.findByText('Whole group quiz')).toBeInTheDocument();
    expect(screen.getByText('My assigned quiz')).toBeInTheDocument();
    expect(screen.queryByText('Other member assigned quiz')).not.toBeInTheDocument();
    expect(getGroupMembers).not.toHaveBeenCalled();
  });

  it('does not show the assignee picker to a regular member', async () => {
    getQuizzesByScope.mockResolvedValueOnce({
      data: [
        {
          quizId: 201,
          title: 'My assigned quiz',
          status: 'ACTIVE',
          createdAt: '2026-03-25T10:01:00',
          groupAudienceMode: 'SELECTED_MEMBERS',
          assignedUserIds: [7, 9],
        },
      ],
    });

    render(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={vi.fn()}
        contextId={42}
        groupRole="MEMBER"
        groupCurrentUserId={7}
      />,
    );

    await screen.findByText('My assigned quiz');
    fireEvent.click(screen.getByRole('button', { name: 'Assigned' }));

    expect(screen.getByText('My assigned quiz')).toBeInTheDocument();
    expect(screen.queryByText('All assigned quizzes')).not.toBeInTheDocument();
    expect(getGroupMembers).not.toHaveBeenCalled();
  });
});
