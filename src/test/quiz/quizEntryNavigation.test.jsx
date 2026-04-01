import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuizListView from '@/Pages/Users/Individual/Workspace/Components/QuizListView';
import QuizDetailView from '@/Pages/Users/Individual/Workspace/Components/QuizDetailView';
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
const examButtonName = /^(Exam|Thi|Kiểm tra)$/i;
const practiceButtonName = /^(Practice|Luyện tập)$/i;
const deleteButtonName = /^(Delete|Xóa)$/i;

vi.mock('@/api/QuizAPI', () => ({
  getQuizzesByScope: vi.fn(),
  deleteQuiz: vi.fn(),
  getSectionsByQuiz: vi.fn(),
  getQuestionsBySection: vi.fn(),
  getAnswersByQuestion: vi.fn(),
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

vi.mock('@/Utils/quizAttemptTracker', () => ({
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
      pathname: '/workspace/42',
      search: '?phaseId=7',
    }),
  };
});

describe('Quiz entry navigation', () => {
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
          myAttempted: false,
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

  it('opens the exam popup from the workspace quiz list before navigating into the exam', async () => {
    render(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={vi.fn()}
        contextId={42}
      />
    );

    expect(await screen.findByText('Algebra challenge')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: examButtonName }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/quiz/exam/123',
      expect.objectContaining({
        state: expect.objectContaining({
          returnToQuizPath: '/workspace/42?phaseId=7',
          autoStart: true,
        }),
      })
    );
  });

  it('falls back to legacy id when opening exam from the workspace quiz list', async () => {
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
      />
    );

    expect(await screen.findByText('Legacy algebra challenge')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: examButtonName }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/quiz/exam/321',
      expect.objectContaining({
        state: expect.objectContaining({
          returnToQuizPath: '/workspace/42?phaseId=7',
          autoStart: true,
        }),
      })
    );
  });

  it('navigates straight into practice mode from the workspace quiz list with auto start enabled', async () => {
    render(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={vi.fn()}
        contextId={42}
      />
    );

    expect(await screen.findByText('Algebra challenge')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: practiceButtonName }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/quiz/practice/123',
      expect.objectContaining({
        state: expect.objectContaining({
          returnToQuizPath: '/workspace/42?phaseId=7',
          autoStart: true,
        }),
      })
    );
  });

  it('uses the legacy roadmap card UI when legacyRoadmapUI is enabled', async () => {
    getQuizzesByScope.mockResolvedValueOnce({
      data: [
        {
          quizId: 777,
          title: 'Roadmap legacy quiz',
          status: 'ACTIVE',
          quizIntent: 'POST_LEARNING',
          createdAt: '2026-03-25T10:00:00',
          updatedAt: '2026-03-26T10:00:00',
          overallDifficulty: 'MEDIUM',
          timerMode: true,
          communityShared: false,
          myAttempted: false,
          myPassed: false,
          createVia: 'AI',
          questionCount: 10,
          maxAttempt: 2,
          passScore: 7,
          maxScore: 10,
        },
      ],
    });

    render(
      <QuizListView
        isDarkMode={false}
        onCreateQuiz={vi.fn()}
        onViewQuiz={vi.fn()}
        contextType="PHASE"
        contextId={7}
        embedded
        hideCreateButton
        legacyRoadmapUI
      />
    );

    expect(await screen.findByText('Roadmap legacy quiz')).toBeInTheDocument();
    expect(screen.queryByText('QUIZMATE AI')).not.toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByText('Quiz overview')).not.toBeInTheDocument();
    expect(screen.getByText('Câu hỏi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: examButtonName })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: deleteButtonName })).not.toBeInTheDocument();
  });

  it('opens the exam popup from the quiz detail view before navigating into the exam', async () => {
    render(
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
      '/quiz/exam/456',
      expect.objectContaining({
        state: expect.objectContaining({
          returnToQuizPath: '/workspace/42?phaseId=7',
          autoStart: true,
        }),
      })
    );
  });

  it('navigates straight into practice mode from the quiz detail view with auto start enabled', async () => {
    render(
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

    fireEvent.click(screen.getByRole('button', { name: 'Practice mode' }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/quiz/practice/456',
      expect.objectContaining({
        state: expect.objectContaining({
          returnToQuizPath: '/workspace/42?phaseId=7',
          autoStart: true,
        }),
      })
    );
  });

  it('still shows questions in quiz detail even when one answer request fails', async () => {
    getSectionsByQuiz.mockResolvedValueOnce({
      data: [{ sectionId: 11 }],
    });
    getQuestionsBySection.mockResolvedValueOnce({
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
    getAnswersByQuestion.mockRejectedValueOnce({
      statusCode: 409,
      message: 'Matching answer content phai la JSON hop le',
    });

    render(
      <QuizDetailView
        isDarkMode={false}
        quiz={{
          quizId: 456,
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
