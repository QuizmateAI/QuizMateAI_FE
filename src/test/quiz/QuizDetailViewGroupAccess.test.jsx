import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuizDetailView from '@/Pages/Users/Individual/Workspace/Components/QuizDetailView';
import {
  getAnswersByQuestion,
  getQuestionsBySection,
  getQuizFull,
  getQuizHistory,
  getSectionsByQuiz,
  toggleStarQuestion,
} from '@/api/QuizAPI';
import { getThreadCounts, getThreadMessages } from '@/api/GroupDiscussionAPI';

const mockNavigate = vi.fn();

vi.mock('@/api/QuizAPI', () => ({
  getSectionsByQuiz: vi.fn(),
  getQuestionsBySection: vi.fn(),
  getAnswersByQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  toggleStarQuestion: vi.fn(),
  QUESTION_TYPE_ID_MAP: {},
  getQuizFull: vi.fn(),
  getQuizHistory: vi.fn(),
  getGroupQuizHistory: vi.fn(),
  publishGroupQuiz: vi.fn(),
  setGroupQuizAudience: vi.fn(),
}));

vi.mock('@/api/GroupDiscussionAPI', () => ({
  getThreadCounts: vi.fn(),
  getThreadMessages: vi.fn(),
  postMessage: vi.fn(),
  deleteMessage: vi.fn(),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

vi.mock('@/context/UserProfileContext', () => ({
  useUserProfile: () => ({
    profile: {
      userId: 99,
      fullName: 'Nguyễn Văn A',
      avatarUrl: '',
    },
  }),
}));

vi.mock('@/Utils/quizAttemptTracker', () => ({
  hasQuizCompleted: () => false,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback ?? key,
    i18n: { language: 'vi' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/group-workspaces/2',
      search: '?section=quiz',
    }),
  };
});

function renderQuizDetailView(props) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <QuizDetailView {...props} />
    </QueryClientProvider>,
  );
}

describe('QuizDetailView group access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    getSectionsByQuiz.mockResolvedValue({
      data: [{ sectionId: 1101, content: 'Phần 1' }],
    });
    getQuestionsBySection.mockResolvedValue({
      data: [
        {
          questionId: 7701,
          content: 'Số nào bé nhất trong các số sau?',
          questionTypeId: 1,
          difficulty: 'EASY',
          explanation: '34 là số bé nhất.',
        },
      ],
    });
    getAnswersByQuestion.mockResolvedValue({
      data: [
        { answerId: 1, content: '43', isCorrect: false },
        { answerId: 2, content: '34', isCorrect: true },
      ],
    });
    getQuizFull.mockResolvedValue({ data: null });
    toggleStarQuestion.mockResolvedValue({ data: {} });
    getThreadCounts.mockResolvedValue({ questions: {} });
    getThreadMessages.mockResolvedValue({ messages: [] });
    getQuizHistory.mockResolvedValue({ data: [] });
  });

  it('hides the questions tab for group members who have not completed the quiz', async () => {
    renderQuizDetailView({
      isDarkMode: false,
      quiz: {
        quizId: 222,
        title: 'Group quiz',
        status: 'ACTIVE',
      },
      onBack: vi.fn(),
      hideEditButton: true,
      contextType: 'GROUP',
      contextId: 2,
      isGroupLeader: false,
    });

    await waitFor(() => {
      expect(getQuizHistory).toHaveBeenCalledWith(222);
    });

    expect(screen.queryByRole('button', { name: /^Câu hỏi$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Lịch sử làm bài$/i })).toBeInTheDocument();
  });

  it('unlocks the question tab and shows the chat composer when server history confirms completion', async () => {
    getQuizHistory.mockResolvedValue({
      data: [
        {
          attemptId: 11,
          status: 'COMPLETED',
          startedAt: '2026-04-12T12:58:00Z',
          score: 10,
        },
      ],
    });

    renderQuizDetailView({
      isDarkMode: false,
      quiz: {
        quizId: 333,
        title: 'Completed group quiz',
        status: 'ACTIVE',
      },
      onBack: vi.fn(),
      hideEditButton: true,
      contextType: 'GROUP',
      contextId: 2,
      isGroupLeader: false,
    });

    const questionTab = await screen.findByRole('button', { name: /^Câu hỏi$/i });
    fireEvent.click(questionTab);

    await screen.findByText('Số nào bé nhất trong các số sau?');

    fireEvent.click(screen.getByRole('button', { name: /Chat câu hỏi/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Bình luận dưới tên/i)).toBeInTheDocument();
    });
  });

  it('keeps challenge fair-play leaders on overview only', async () => {
    renderQuizDetailView({
      isDarkMode: false,
      quiz: {
        quizId: 444,
        title: 'Challenge fair play quiz',
        status: 'ACTIVE',
        challengeFairPlayRestrictsViewer: true,
      },
      onBack: vi.fn(),
      hideEditButton: true,
      contextType: 'GROUP',
      contextId: 2,
      isGroupLeader: true,
      challengeSnapshotReviewMode: true,
    });

    await waitFor(() => {
      expect(getSectionsByQuiz).toHaveBeenCalledWith(444);
    });

    expect(screen.queryByRole('button', { name: /^Câu hỏi$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Lịch sử làm bài$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Discussion$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Distribution$/i })).not.toBeInTheDocument();
  });
});
