import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuizListView from '@/pages/Users/Individual/Workspace/Components/QuizListView';
import { getQuizzesByScope } from '@/api/QuizAPI';

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
    t: (key, fallback, options) => {
      if (key === 'quizListView.pagination.showing') {
        return `Showing ${options?.from}-${options?.to} of ${options?.total}`;
      }
      return fallback ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({
      pathname: '/workspaces/42',
      search: '',
    }),
    useNavigate: () => vi.fn(),
  };
});

function setViewportWidth(width) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

function buildQuiz(index) {
  return {
    quizId: index,
    title: `Quiz ${index}`,
    status: 'ACTIVE',
    quizIntent: 'PRACTICE',
    createdAt: `2026-03-${String(index).padStart(2, '0')}T10:00:00`,
    overallDifficulty: 'MEDIUM',
    timerMode: true,
    communityShared: false,
    myAttempted: false,
    myPassed: false,
  };
}

describe('QuizListView pagination sizing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setViewportWidth(1024);
  });

  it('keeps the seventh quiz on the first page for xl layouts', async () => {
    setViewportWidth(1440);
    getQuizzesByScope.mockResolvedValue({
      data: Array.from({ length: 7 }, (_, index) => buildQuiz(index + 1)),
    });

    render(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={vi.fn()}
        contextId={42}
      />,
    );

    expect(await screen.findByText('Quiz 7')).toBeInTheDocument();
    expect(screen.queryByText('Page 1/2')).not.toBeInTheDocument();
    expect(screen.queryByText('Showing 1-6 of 7')).not.toBeInTheDocument();
  });

  it('still paginates seven quizzes on smaller layouts', async () => {
    getQuizzesByScope.mockResolvedValue({
      data: Array.from({ length: 7 }, (_, index) => buildQuiz(index + 1)),
    });

    render(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={vi.fn()}
        contextId={42}
      />,
    );

    expect(await screen.findByText('Quiz 1')).toBeInTheDocument();
    expect(screen.queryByText('Quiz 7')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1/2')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-6 of 7')).toBeInTheDocument();
  });

  it('hides metadata on processing quiz cards and only keeps progress visible', async () => {
    getQuizzesByScope.mockResolvedValue({
      data: [
        {
          quizId: 55,
          title: 'Processing quiz',
          status: 'PROCESSING',
          percent: 55,
          questionCount: 10,
          overallDifficulty: 'EASY',
          duration: 15,
          timerMode: false,
          communityShared: false,
          createdAt: '2026-04-22T17:27:00',
          myAttempted: false,
          myPassed: false,
        },
      ],
    });

    render(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={vi.fn()}
        contextId={42}
      />,
    );

    expect(await screen.findByText('Processing quiz')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
    expect(screen.queryByText('Generating quiz')).not.toBeInTheDocument();
    expect(screen.queryByText('Questions')).not.toBeInTheDocument();
    expect(screen.queryByText('15 min')).not.toBeInTheDocument();
    expect(screen.queryByText('Private')).not.toBeInTheDocument();
    expect(screen.queryByText('22/04/2026 17:27')).not.toBeInTheDocument();
  });
});
