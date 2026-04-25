import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PracticeQuizPage from '@/pages/Users/Quiz/PracticeQuizPage';

const mockNavigate = vi.fn();
const mockShowError = vi.fn();
const mockUseQuery = vi.fn();
const mockStartQuizAttempt = vi.fn();
const mockSubmitPracticeQuestion = vi.fn();
const mockSubmitAttempt = vi.fn();
let mockLocationState = {};

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args) => mockUseQuery(...args),
}));

vi.mock('@/api/QuizAPI', () => ({
  getQuizFullForAttempt: vi.fn(),
  startQuizAttempt: (...args) => mockStartQuizAttempt(...args),
  submitPracticeQuestion: (...args) => mockSubmitPracticeQuestion(...args),
  submitAttempt: (...args) => mockSubmitAttempt(...args),
  updateQuiz: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ quizId: '45' }),
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/quizzes/practice/45',
      search: '',
      state: mockLocationState,
    }),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showError: mockShowError,
  }),
}));

vi.mock('@/pages/Users/Quiz/components/QuizHeader', () => ({
  default: ({ title }) => <div data-testid="quiz-header">{title}</div>,
}));

vi.mock('@/pages/Users/Quiz/components/QuestionCard', () => ({
  default: ({ question, questionNumber, reviewState, onSelectAnswer }) => (
    <div>
      <div data-testid="question-card">{`Question ${questionNumber}: ${question.content}`}</div>
      <div data-testid="question-review">{reviewState?.revealed ? 'reviewed' : 'editable'}</div>
      <button type="button" onClick={() => onSelectAnswer?.(question.answers?.[0]?.id)}>
        Select answer
      </button>
    </div>
  ),
}));

vi.mock('@/utils/quizAttemptTracker', () => ({
  markQuizAttempted: vi.fn(),
  markQuizCompleted: vi.fn(),
}));

describe('PracticeQuizPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationState = {};
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
    });
  });

  it('skips the route-level popup and auto starts practice when requested by navigation state', async () => {
    mockLocationState = { autoStart: true };
    mockUseQuery.mockReturnValue({
      data: {
        id: 45,
        title: 'Algebra practice',
        questions: [{ id: 1, content: 'Q1', type: 'SINGLE_CHOICE', answers: [{ id: 11, content: 'A', isCorrect: true }] }],
      },
      isLoading: false,
    });
    mockStartQuizAttempt.mockReturnValue(new Promise(() => {}));

    render(<PracticeQuizPage />);

    await waitFor(() => {
      expect(mockStartQuizAttempt).toHaveBeenCalledWith('45', { isPracticeMode: true });
    });
    expect(screen.getByText('Đang mở phòng luyện tập...')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resumes from the first unfinished question when saved answers already exist', async () => {
    mockLocationState = { autoStart: true };
    mockUseQuery.mockReturnValue({
      data: {
        id: 45,
        title: 'Algebra practice',
        questions: [
          {
            id: 1,
            content: 'Q1',
            type: 'SINGLE_CHOICE',
            explanation: 'Because 1',
            answers: [{ id: 11, content: 'A', isCorrect: true }],
          },
          {
            id: 2,
            content: 'Q2',
            type: 'SINGLE_CHOICE',
            explanation: 'Because 2',
            answers: [{ id: 21, content: 'B', isCorrect: true }],
          },
        ],
      },
      isLoading: false,
    });
    mockStartQuizAttempt.mockResolvedValue({
      data: {
        attemptId: 77,
        savedAnswers: [
          {
            questionId: 1,
            selectedAnswerIds: [11],
            textAnswer: null,
            isCorrect: true,
          },
        ],
      },
    });

    render(<PracticeQuizPage />);

    await waitFor(() => {
      expect(screen.getByTestId('question-card')).toHaveTextContent('Question 2: Q2');
    });
    expect(screen.getAllByText('2/2').length).toBeGreaterThan(0);
  });

  it('submits the current question for checking and unlocks next navigation', async () => {
    mockLocationState = { autoStart: true };
    mockUseQuery.mockReturnValue({
      data: {
        id: 45,
        title: 'Algebra practice',
        questions: [
          {
            id: 1,
            content: 'Q1',
            type: 'SINGLE_CHOICE',
            explanation: 'Because 1',
            answers: [{ id: 11, content: 'A', isCorrect: true }],
          },
          {
            id: 2,
            content: 'Q2',
            type: 'SINGLE_CHOICE',
            explanation: 'Because 2',
            answers: [{ id: 21, content: 'B', isCorrect: true }],
          },
        ],
      },
      isLoading: false,
    });
    mockStartQuizAttempt.mockResolvedValue({
      data: {
        attemptId: 77,
        savedAnswers: [],
      },
    });
    mockSubmitPracticeQuestion.mockResolvedValue({
      data: {
        isCorrect: true,
      },
    });

    render(<PracticeQuizPage />);

    await waitFor(() => {
      expect(screen.getByTestId('question-card')).toHaveTextContent('Question 1: Q1');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select answer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }));

    await waitFor(() => {
      expect(mockSubmitPracticeQuestion).toHaveBeenCalledWith(77, {
        questionId: 1,
        selectedAnswerIds: [11],
        textAnswer: null,
      });
    });

    expect(screen.getByTestId('question-review')).toHaveTextContent('reviewed');
    expect(screen.getByRole('button', { name: 'Câu tiếp theo' })).toBeInTheDocument();
  });
});
