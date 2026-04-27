import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuizResultPage from '@/Pages/Users/Quiz/QuizResultPage';

const mockNavigate = vi.fn();
const mockShowError = vi.fn();
const mockShowSuccess = vi.fn();
const mockGetAttemptResult = vi.fn();
const mockGetQuizFullForAttempt = vi.fn();
const mockGetAttemptAssessment = vi.fn();
let latestUseWebSocketOptions = null;

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
  submitRoadmapPhaseRemedialDecision: vi.fn(),
}));

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: (options = {}) => {
    latestUseWebSocketOptions = options;
    return {
      isConnected: false,
    };
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ attemptId: '62' }),
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/quizzes/results/62',
      search: '',
      state: {
        quizId: 66,
        attemptMode: 'exam',
        returnToQuizPath: '/workspaces/12/quizzes/66',
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

vi.mock('@/pages/Users/Quiz/components/QuizHeader', () => ({
  default: ({ title }) => <div data-testid="quiz-header">{title}</div>,
}));

vi.mock('@/pages/Users/Quiz/components/QuestionCard', () => ({
  default: ({ question }) => (
    <div data-testid="question-card">
      {question?.content}|{question?.gradingStatus || 'NONE'}|{String(question?.isCorrect)}
    </div>
  ),
}));

function buildAttemptResult(overrides = {}) {
  const baseQuestions = [
    {
      questionId: 1,
      selectedAnswerIds: [11],
      correct: true,
      questionScore: 1,
    },
  ];

  return Object.assign({
    quizId: 66,
    score: 8,
    maxScore: 10,
    totalQuestion: 10,
    correctQuestion: 8,
    answeredQuestion: 10,
    startedAt: '2026-03-30T06:00:00.000Z',
    completedAt: '2026-03-30T06:08:00.000Z',
    questions: baseQuestions,
  }, overrides, {
    questions: overrides.questions || baseQuestions,
  });
}

function buildQuizDetail(overrides = {}) {
  const baseQuestion = {
    questionId: 1,
    content: 'Cau 1',
    questionTypeId: 1,
    difficulty: 'EASY',
    answers: [
      { answerId: 11, content: 'Dap an A', isCorrect: true },
    ],
  };

  return Object.assign({
    quizId: 66,
    workspaceId: 12,
    title: 'Bai kiem tra 60 cau',
    duration: 900,
    timerMode: true,
    sections: [
      {
        sectionId: 1,
        questions: overrides.questions || [baseQuestion],
      },
    ],
  }, overrides);
}

describe('QuizResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    latestUseWebSocketOptions = null;
    mockGetAttemptAssessment.mockRejectedValue(new Error('assessment unavailable'));
  });

  afterEach(() => {
    vi.useRealTimers();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('keeps retrying bootstrap result loading until the backend result becomes available', async () => {
    vi.useFakeTimers();
    const pendingError = { statusCode: 400, message: 'Lượt làm quiz chưa hoàn thành' };
    mockGetAttemptResult
      .mockRejectedValueOnce(pendingError)
      .mockRejectedValueOnce(pendingError)
      .mockRejectedValueOnce(pendingError)
      .mockRejectedValueOnce(pendingError)
      .mockResolvedValue({ data: buildAttemptResult() });
    mockGetQuizFullForAttempt.mockResolvedValue({ data: buildQuizDetail() });

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

  it('hides next quiz recommendations when the assessment is ready', async () => {
    mockGetAttemptResult.mockResolvedValue({ data: buildAttemptResult() });
    mockGetQuizFullForAttempt.mockResolvedValue({ data: buildQuizDetail() });
    mockGetAttemptAssessment.mockResolvedValue({
      data: {
        status: 'READY',
        assessmentId: 901,
        recommendationStatus: 'PENDING',
        summary: 'Bạn đang làm tốt phần task response nhưng còn lặp lỗi cohesion.',
        strengths: ['Task response'],
        weaknesses: ['Cohesion'],
        recurringMistakes: [{ topic: 'Cohesion', detail: 'Các đoạn chuyển ý chưa đều.' }],
        nextActionType: 'REVIEW_WEAK_TOPIC',
        targetDifficulty: 'MEDIUM',
        profileReadiness: {
          completedQuizCount: 2,
          targetQuizCount: 3,
          remainingQuizCount: 1,
          summary: 'Đã có 2/3 quiz. Làm thêm 1 bài nữa để profile ổn định hơn.',
        },
        nextQuizPlan: {
          displayTitle: 'Quiz review Cohesion',
          goal: 'Ôn lại các dạng lỗi chuyển ý và sắp xếp luận điểm.',
          displayReason: 'Hệ thống ưu tiên review vì bạn còn lặp lỗi ở cùng một chủ đề.',
        },
        learnerExplanation: {
          whyThisQuiz: 'Hệ thống ưu tiên review vì bạn còn lặp lỗi ở cùng một chủ đề.',
          whatToStudyNext: 'Ôn lại các mẫu chuyển ý và cách nhóm luận điểm.',
          reviewOrLevelUp: 'Nên review trước rồi mới tăng độ khó.',
          roadmapOrMock: 'Tạm quay lại roadmap sau khi xử lý xong review queue.',
        },
        roadmapGuidance: {
          recommendedSpeedMode: 'SLOW',
          recommendedAdaptationMode: 'FLEXIBLE',
          nextRoadmapAction: 'Review lại phase hiện tại',
          summary: 'Nên giảm nhịp roadmap một chút để ưu tiên review chủ đề yếu.',
        },
        shortTermGoals: [
          {
            title: 'Củng cố Cohesion',
            detail: 'Hoàn thành 1 quiz review ngắn trước buổi học tiếp theo.',
          },
        ],
        reviewQueue: [
          {
            topic: 'Cohesion',
            priority: 'HIGH',
            dueAt: '2026-04-01T09:00:00',
            reason: 'Ôn lại sớm để giảm lỗi lặp lại.',
          },
        ],
        communityQuizSuggestions: [
          {
            quizId: 77,
            title: 'Community quiz cohesion basics',
            overallDifficulty: 'EASY',
          },
        ],
      },
    });

    render(<QuizResultPage />);

    expect(await screen.findByText('Bạn đang làm tốt phần task response nhưng còn lặp lỗi cohesion.')).toBeInTheDocument();
    expect(screen.queryByText('Đề xuất tiếp theo')).not.toBeInTheDocument();
    expect(screen.queryByText('Next suggestion')).not.toBeInTheDocument();
    expect(screen.queryByText('Quiz review Cohesion')).not.toBeInTheDocument();
    expect(screen.queryByText('Ôn lại các dạng lỗi chuyển ý và sắp xếp luận điểm.')).not.toBeInTheDocument();
    expect(screen.queryByText('Community quiz cohesion basics')).not.toBeInTheDocument();
    expect(screen.queryByText('Tóm tắt đề xuất')).not.toBeInTheDocument();
    expect(screen.queryByText('Đã có 2/3 quiz. Làm thêm 1 bài nữa để profile ổn định hơn.')).not.toBeInTheDocument();
    expect(screen.queryByText('Ôn lại chủ đề yếu')).not.toBeInTheDocument();
    expect(screen.queryByText('Review lại phase hiện tại')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tạo quiz dựa trên đánh giá ai/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generate quiz from ai assessment/i })).not.toBeInTheDocument();
  });

  it('hides the AI assessment section when no assessment is available yet', async () => {
    mockGetAttemptResult.mockResolvedValue({ data: buildAttemptResult() });
    mockGetQuizFullForAttempt.mockResolvedValue({ data: buildQuizDetail() });

    render(<QuizResultPage />);

    expect(await screen.findByTestId('quiz-header')).toHaveTextContent('Bai kiem tra 60 cau');
    await waitFor(() => expect(mockGetAttemptAssessment).toHaveBeenCalledWith('62'));
    await waitFor(() => {
      expect(screen.queryByText('AI insights')).not.toBeInTheDocument();
      expect(screen.queryByText('AI Assessment')).not.toBeInTheDocument();
    });
  });

  it('shows the actual score in the summary card', async () => {
    mockGetAttemptResult.mockResolvedValue({
      data: buildAttemptResult({
        score: 8,
        maxScore: 20,
      }),
    });
    mockGetQuizFullForAttempt.mockResolvedValue({ data: buildQuizDetail() });

    render(<QuizResultPage />);

    expect(await screen.findByText('Score')).toBeInTheDocument();
    expect(screen.getByText('8/20')).toBeInTheDocument();
  });

  it('updates the grading UI from websocket events even if result refresh fails', async () => {
    mockGetAttemptResult
      .mockResolvedValueOnce({
        data: buildAttemptResult({
          score: 0,
          correctQuestion: 0,
          pendingGradingQuestionCount: 1,
          questions: [
            {
              questionId: 1,
              textAnswer: '72 27 70 77',
              correct: null,
              gradingStatus: 'PENDING',
              questionScore: 1,
            },
          ],
        }),
      })
      .mockRejectedValue({
        statusCode: 400,
        message: 'Lượt làm quiz chưa hoàn thành',
      });
    mockGetQuizFullForAttempt.mockResolvedValue({
      data: buildQuizDetail({
        questions: [
          {
            questionId: 1,
            content: 'Cau 1',
            questionTypeId: 3,
            difficulty: 'HARD',
            explanation: 'Sap xep tang dan',
            answers: [
              { answerId: 11, content: '27, 70, 72, 77', isCorrect: true },
            ],
          },
        ],
      }),
    });

    render(<QuizResultPage />);

    expect(await screen.findByRole('heading', { name: 'Review Answers' })).toBeInTheDocument();
    expect(screen.getByText('Click a number to jump straight to that question.')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Cau 1|PENDING|null')).toBeInTheDocument();

    await act(async () => {
      latestUseWebSocketOptions?.onQuizAttemptGrading?.({
        attemptId: 62,
        updatedQuestionId: 1,
        updatedQuestionGradingStatus: 'COMPLETED',
        updatedQuestionCorrect: true,
        updatedQuestionGradingReason: 'Dung roi',
        pendingGradingQuestionCount: 0,
        failedGradingQuestionCount: 0,
        score: 1,
        status: 'COMPLETED',
        allGradingFinished: true,
      });
      await Promise.resolve();
    });

    expect(screen.getByText('Cau 1|COMPLETED|true')).toBeInTheDocument();
  });
});
