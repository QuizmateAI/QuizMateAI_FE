import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

const mockNavigate = vi.fn();

vi.mock('@/api/QuizAPI', () => ({
  getSectionsByQuiz: vi.fn(),
  getQuestionsBySection: vi.fn(),
  getAnswersByQuestion: vi.fn(),
  toggleStarQuestion: vi.fn(),
  QUESTION_TYPE_ID_MAP: {},
  getQuizFull: vi.fn(),
  getQuizHistory: vi.fn(),
  getGroupQuizHistory: vi.fn(),
  publishGroupQuiz: vi.fn(),
  setGroupQuizAudience: vi.fn(),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
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
      pathname: '/workspaces/42',
      search: '',
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
    </QueryClientProvider>
  );
}

describe('QuizDetailView workspace detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSectionsByQuiz.mockResolvedValue({
      data: [{ sectionId: 1101, content: 'Phần 1' }],
    });
    getQuestionsBySection.mockResolvedValue({
      data: [
        {
          questionId: 7701,
          content: 'Workspace detail goes straight to questions',
          questionTypeId: 1,
          difficulty: 'MEDIUM',
          explanation: '',
        },
      ],
    });
    getAnswersByQuestion.mockResolvedValue({ data: [] });
    getQuizHistory.mockResolvedValue({ data: [] });
    getQuizFull.mockResolvedValue({ data: null });
    toggleStarQuestion.mockResolvedValue({ data: {} });
  });

  it('shows overview first and keeps tabs visible for non-group quiz detail', async () => {
    renderQuizDetailView({
      isDarkMode: false,
      quiz: {
        quizId: 98765,
        title: 'Workspace quiz',
        status: 'ACTIVE',
      },
      onBack: vi.fn(),
      hideEditButton: true,
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Tổng quan$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Câu hỏi$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Lịch sử làm bài$/i })).toBeInTheDocument();
    });

    expect(screen.queryByText('Workspace detail goes straight to questions')).not.toBeInTheDocument();
  });
});
