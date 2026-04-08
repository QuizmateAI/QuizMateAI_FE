import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExamQuizPage from '@/Pages/Users/Quiz/ExamQuizPage';

const mockNavigate = vi.fn();
const mockShowError = vi.fn();
const mockUseQuery = vi.fn();
const mockStartQuizAttempt = vi.fn();
const mockSubmitAttempt = vi.fn();
let mockLocationState = {};

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args) => mockUseQuery(...args),
}));

vi.mock('@/api/QuizAPI', () => ({
  getQuizFullForAttempt: vi.fn(),
  startQuizAttempt: (...args) => mockStartQuizAttempt(...args),
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
      pathname: '/quizzes/exams/45',
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

vi.mock('@/Pages/Users/Quiz/components/QuizHeader', () => ({
  default: ({ title }) => <div data-testid="quiz-header">{title}</div>,
}));

vi.mock('@/Pages/Users/Quiz/components/QuestionCard', () => ({
  default: ({ questionNumber }) => <div data-testid={`question-card-${questionNumber}`}>Question {questionNumber}</div>,
}));

vi.mock('@/Pages/Users/Quiz/components/QuestionNavPanel', () => ({
  default: ({ onRequestSubmit, t }) => (
    <div data-testid="question-nav-panel">
      <button type="button" onClick={onRequestSubmit}>
        {t?.('workspace.quiz.examActions.submitButton', 'Submit Exam') ?? 'Submit Exam'}
      </button>
    </div>
  ),
}));

vi.mock('@/Pages/Users/Quiz/components/ExamPerQuestion', () => ({
  default: () => <div data-testid="exam-per-question" />,
}));

vi.mock('@/Pages/Users/Quiz/hooks/useQuizAutoSave', () => ({
  useQuizAutoSave: () => ({
    saveManually: vi.fn().mockResolvedValue({ ok: true }),
    syncSnapshot: vi.fn(),
  }),
}));

vi.mock('@/Utils/quizAttemptTracker', () => ({
  markQuizAttempted: vi.fn(),
  markQuizCompleted: vi.fn(),
}));

describe('ExamQuizPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationState = {};
    mockStartQuizAttempt.mockReset();
    mockSubmitAttempt.mockReset();
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
    });
  });

  it('renders the loading state without crashing before quiz data initializes', () => {
    const { container } = render(<ExamQuizPage />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens the start dialog immediately when quiz data is ready', () => {
    mockUseQuery.mockReturnValue({
      data: {
        id: 45,
        title: 'Algebra mock',
        timerMode: 'TOTAL',
        totalTime: 900,
        questions: [{ id: 1, type: 'SINGLE_CHOICE' }],
      },
      isLoading: false,
    });

    render(<ExamQuizPage />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Exam' })).toBeInTheDocument();
  });

  it('skips the route-level popup and auto starts the exam when requested by navigation state', async () => {
    mockLocationState = { autoStart: true };
    mockUseQuery.mockReturnValue({
      data: {
        id: 45,
        title: 'Algebra mock',
        timerMode: 'TOTAL',
        totalTime: 900,
        questions: [{ id: 1, type: 'SINGLE_CHOICE' }],
      },
      isLoading: false,
    });
    mockStartQuizAttempt.mockReturnValue(new Promise(() => {}));

    render(<ExamQuizPage />);

    await waitFor(() => {
      expect(mockStartQuizAttempt).toHaveBeenCalledWith('45', { isPracticeMode: false });
    });
    expect(screen.getByText('Starting exam...')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('blocks browser back during an active exam without pushing duplicate history entries', async () => {
    const startedAt = new Date(Date.now() - 5_000).toISOString();
    const timeoutAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    mockLocationState = { autoStart: true, returnToQuizPath: '/workspaces/42' };
    mockUseQuery.mockReturnValue({
      data: {
        id: 45,
        title: 'Algebra mock',
        timerMode: 'TOTAL',
        totalTime: 900,
        questions: [{ id: 1, type: 'SINGLE_CHOICE' }],
      },
      isLoading: false,
    });
    mockStartQuizAttempt.mockResolvedValue({
      data: {
        attemptId: 77,
        startedAt,
        timeoutAt,
        savedAnswers: [],
      },
    });

    const forwardSpy = vi.spyOn(window.history, 'forward').mockImplementation(() => {});
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    render(<ExamQuizPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit Exam' })).toBeInTheDocument();
    });
    expect(pushStateSpy).not.toHaveBeenCalled();

    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      expect(forwardSpy).toHaveBeenCalled();
    });
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith('Đang trong bài thi, không thể quay lại hoặc chuyển trang.');

    forwardSpy.mockRestore();
    pushStateSpy.mockRestore();
  });

  it('asks for confirmation before submitting an active exam', async () => {
    const startedAt = new Date(Date.now() - 5_000).toISOString();
    const timeoutAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    mockLocationState = { autoStart: true, returnToQuizPath: '/workspaces/42' };
    mockUseQuery.mockReturnValue({
      data: {
        id: 45,
        title: 'Algebra mock',
        timerMode: 'TOTAL',
        totalTime: 900,
        questions: [{ id: 1, type: 'SINGLE_CHOICE' }],
      },
      isLoading: false,
    });
    mockStartQuizAttempt.mockResolvedValue({
      data: {
        attemptId: 77,
        startedAt,
        timeoutAt,
        savedAnswers: [],
      },
    });
    mockSubmitAttempt.mockResolvedValue({});

    render(<ExamQuizPage />);

    const submitButton = await screen.findByRole('button', { name: 'Submit Exam' });
    fireEvent.click(submitButton);

    expect(screen.getByText('You still have 1 unanswered question')).toBeInTheDocument();
    expect(mockSubmitAttempt).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Submit Exam' }).at(-1));

    await waitFor(() => {
      expect(mockSubmitAttempt).toHaveBeenCalledWith(77, [
        {
          questionId: 1,
          selectedAnswerIds: [],
          textAnswer: null,
        },
      ]);
    });
  });
});
