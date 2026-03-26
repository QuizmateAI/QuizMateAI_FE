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

    fireEvent.click(screen.getByRole('button', { name: 'Exam' }));

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
});
