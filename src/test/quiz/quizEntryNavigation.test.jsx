import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuizListView from '@/pages/Users/Individual/Workspace/Components/QuizListView';
import QuizDetailView from '@/pages/Users/Individual/Workspace/Components/QuizDetailView';
import {
  getAnswersByQuestion,
  getQuestionsBySection,
  getQuizFull,
  getQuizHistory,
  getQuizzesByScope,
  getSectionsByQuiz,
  toggleStarQuestion,
  updateQuiz,
} from '@/api/QuizAPI';

const mockNavigate = vi.fn();
const mockShowError = vi.fn();
const mockShowSuccess = vi.fn();
const cardButtonName = /Algebra challenge/i;

vi.mock('@/api/QuizAPI', () => ({
  getQuizzesByScope: vi.fn(),
  deleteQuiz: vi.fn(),
  getSectionsByQuiz: vi.fn(),
  getQuestionsBySection: vi.fn(),
  getAnswersByQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  toggleStarQuestion: vi.fn(),
  QUESTION_TYPE_ID_MAP: {},
  updateQuiz: vi.fn(),
  getQuizFull: vi.fn(),
  getQuizHistory: vi.fn(),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showError: mockShowError,
    showSuccess: mockShowSuccess,
  }),
}));

vi.mock('@/utils/quizAttemptTracker', () => ({
  hasQuizCompleted: () => false,
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
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/workspaces/42',
      search: '?phaseId=7',
    }),
  };
});

describe('Quiz entry navigation', () => {
  const renderWithQueryClient = (ui) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getQuizzesByScope.mockResolvedValue({
      data: [
        {
          quizId: 123,
          title: 'Algebra challenge',
          status: 'ACTIVE',
          quizIntent: 'PRACTICE',
          createdAt: '2026-03-25T10:00:00',
          overallDifficulty: 'MEDIUM',
          timerMode: true,
          communityShared: false,
          myAttempted: true,
          myPassed: false,
        },
      ],
    });
    getSectionsByQuiz.mockResolvedValue({ data: [] });
    getQuestionsBySection.mockResolvedValue({ data: [] });
    getAnswersByQuestion.mockResolvedValue({ data: [] });
    getQuizHistory.mockResolvedValue({ data: [] });
    getQuizFull.mockResolvedValue({ data: null });
    toggleStarQuestion.mockResolvedValue({ data: {} });
    updateQuiz.mockResolvedValue({ data: { status: 'ACTIVE' } });
  });

  it('opens quiz detail from the workspace quiz list through onViewQuiz callback', async () => {
    const onViewQuiz = vi.fn();

    renderWithQueryClient(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={onViewQuiz}
        contextId={42}
      />
    );

    expect(await screen.findByText('Algebra challenge')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: cardButtonName }));

    expect(onViewQuiz).toHaveBeenCalledTimes(1);
    expect(onViewQuiz).toHaveBeenCalledWith(
      expect.objectContaining({
        quizId: 123,
        title: 'Algebra challenge',
      })
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('passes legacy id quiz payload when opening from the workspace quiz list', async () => {
    const onViewQuiz = vi.fn();

    getQuizzesByScope.mockResolvedValueOnce({
      data: [
        {
          id: 321,
          title: 'Legacy algebra challenge',
          status: 'ACTIVE',
          quizIntent: 'PRACTICE',
          createdAt: '2026-03-25T10:00:00',
          overallDifficulty: 'MEDIUM',
          timerMode: true,
          communityShared: false,
          myAttempted: true,
          myPassed: false,
        },
      ],
    });

    renderWithQueryClient(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={onViewQuiz}
        contextId={42}
      />
    );

    expect(await screen.findByText('Legacy algebra challenge')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Legacy algebra challenge/i }));

    expect(onViewQuiz).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 321,
        title: 'Legacy algebra challenge',
      })
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not render direct exam/practice launch buttons on list cards', async () => {
    renderWithQueryClient(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={vi.fn()}
        contextId={42}
      />
    );

    expect(await screen.findByText('Algebra challenge')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /^(Practice|Luyện tập|Practice mode)$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Exam|Thi|Kiểm tra|Exam mode)$/i })).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens the exam popup from the quiz detail view before navigating into the exam', async () => {
    renderWithQueryClient(
      <QuizDetailView
        isDarkMode={false}
        quiz={{
          quizId: 456,
          title: 'Geometry mock',
          status: 'ACTIVE',
        }}
        onBack={vi.fn()}
        hideEditButton
      />
    );

    await waitFor(() => {
      expect(getSectionsByQuiz).toHaveBeenCalledWith(456);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Exam mode' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/quizzes/exams/456',
      expect.objectContaining({
        state: expect.objectContaining({
          returnToQuizPath: '/workspaces/42?phaseId=7',
          autoStart: true,
        }),
      })
    );
  });

  it('navigates straight into practice mode from the quiz detail view with auto start enabled', async () => {
    getQuizHistory.mockResolvedValueOnce({
      data: [{ attemptId: 98, isPracticeMode: false, completedAt: '2026-03-25T09:00:00' }],
    });

    renderWithQueryClient(
      <QuizDetailView
        isDarkMode={false}
        quiz={{
          quizId: 456,
          title: 'Geometry mock',
          status: 'ACTIVE',
        }}
        onBack={vi.fn()}
        hideEditButton
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Practice' }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/quizzes/practice/456',
      expect.objectContaining({
        state: expect.objectContaining({
          returnToQuizPath: '/workspaces/42?phaseId=7',
          autoStart: true,
        }),
      })
    );
  });

  it('still shows questions in quiz detail even when one answer request fails', async () => {
    getSectionsByQuiz.mockResolvedValue({
      data: [{ sectionId: 11 }],
    });
    getQuestionsBySection.mockResolvedValue({
      data: [
        {
          questionId: 99,
          content: 'Question survives broken answers',
          questionTypeId: 1,
          difficulty: 'MEDIUM',
          explanation: '',
        },
      ],
    });
    getAnswersByQuestion.mockRejectedValue({
      statusCode: 409,
      message: 'Matching answer content phai la JSON hop le',
    });

    renderWithQueryClient(
      <QuizDetailView
        isDarkMode={false}
        quiz={{
          quizId: 999,
          title: 'Geometry mock',
          status: 'DRAFT',
        }}
        onBack={vi.fn()}
        hideEditButton
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Câu hỏi' }));

    await waitFor(() => {
      expect(screen.getByText('Question survives broken answers')).toBeInTheDocument();
    });
  });
});
