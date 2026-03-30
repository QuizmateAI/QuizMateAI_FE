import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuizResultPage from '@/Pages/Users/Quiz/QuizResultPage';

const mockNavigate = vi.fn();
const mockShowError = vi.fn();
const mockShowSuccess = vi.fn();
const mockGetAttemptResult = vi.fn();
const mockGetQuizFullForAttempt = vi.fn();
const mockGetAttemptAssessment = vi.fn();

vi.mock('@/api/QuizAPI', () => ({
  getAttemptResult: (...args) => mockGetAttemptResult(...args),
  getQuizFullForAttempt: (...args) => mockGetQuizFullForAttempt(...args),
  getAttemptAssessment: (...args) => mockGetAttemptAssessment(...args),
  generateQuizFromWorkspaceAssessment: vi.fn(),
  QUESTION_TYPE_ID_MAP: {
    1: 'multipleChoice',
    2: 'multipleSelect',
    3: 'shortAnswer',
    4: 'trueFalse',
    5: 'fillBlank',
  },
}));

vi.mock('@/api/AIAPI', () => ({
  generateRoadmapPhaseContent: vi.fn(),
}));

vi.mock('@/api/RoadmapPhaseAPI', () => ({
  getCurrentRoadmapPhaseProgress: vi.fn(),
  submitRoadmapPhaseSkipDecision: vi.fn(),
}));

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: false,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ attemptId: '62' }),
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/quiz/result/62',
      search: '',
      state: {
        quizId: 66,
        attemptMode: 'exam',
        returnToQuizPath: '/workspace/12/quiz/66',
      },
    }),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback ?? key,
    i18n: { language: 'vi' },
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showError: mockShowError,
    showSuccess: mockShowSuccess,
  }),
}));

vi.mock('@/Pages/Users/Quiz/components/QuizHeader', () => ({
  default: ({ title }) => <div data-testid="quiz-header">{title}</div>,
}));

vi.mock('@/Pages/Users/Quiz/components/QuestionCard', () => ({
  default: ({ question }) => <div data-testid="question-card">{question?.content}</div>,
}));

describe('QuizResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetAttemptAssessment.mockRejectedValue(new Error('assessment unavailable'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps retrying bootstrap result loading until the backend result becomes available', async () => {
    const pendingError = { statusCode: 400, message: 'Lượt làm quiz chưa hoàn thành' };
    mockGetAttemptResult
      .mockRejectedValueOnce(pendingError)
      .mockRejectedValueOnce(pendingError)
      .mockRejectedValueOnce(pendingError)
      .mockRejectedValueOnce(pendingError)
      .mockResolvedValue({
        data: {
          quizId: 66,
          score: 1,
          maxScore: 1,
          totalQuestion: 1,
          correctQuestion: 1,
          answeredQuestion: 1,
          startedAt: '2026-03-30T06:00:00.000Z',
          completedAt: '2026-03-30T06:01:00.000Z',
          questions: [
            {
              questionId: 1,
              selectedAnswerIds: [11],
              correct: true,
              questionScore: 1,
            },
          ],
        },
      });
    mockGetQuizFullForAttempt.mockResolvedValue({
      data: {
        quizId: 66,
        title: 'Bai kiem tra 60 cau',
        duration: 900,
        timerMode: true,
        sections: [
          {
            sectionId: 1,
            questions: [
              {
                questionId: 1,
                content: 'Cau 1',
                questionTypeId: 1,
                difficulty: 'EASY',
                answers: [
                  { answerId: 11, content: 'Dap an A', isCorrect: true },
                ],
              },
            ],
          },
        ],
      },
    });

    render(<QuizResultPage />);

    for (let index = 0; index < 4; index += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
    }

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('quiz-header')).toHaveTextContent('Bai kiem tra 60 cau');
    expect(mockGetAttemptResult.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(mockGetQuizFullForAttempt).toHaveBeenCalledWith(66);
    expect(screen.queryByText('Không tìm thấy kết quả')).not.toBeInTheDocument();
  }, 10000);
});
