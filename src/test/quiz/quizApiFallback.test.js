import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/api/api';
import { getQuizFullForAttempt } from '@/api/QuizAPI';

vi.mock('@/api/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('Quiz API fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to quiz + sections + questions + answers when /full returns 409', async () => {
    api.get
      .mockRejectedValueOnce({ statusCode: 409, message: 'Conflict' })
      .mockResolvedValueOnce({
        data: {
          quizId: 66,
          title: 'Math final',
          status: 'ACTIVE',
        },
      })
      .mockResolvedValueOnce({
        data: [
          { sectionId: 10, content: 'Section 1' },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { questionId: 100, content: 'Question 1', questionTypeId: 1, difficulty: 'EASY' },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { answerId: 1000, content: 'A', isCorrect: true },
          { answerId: 1001, content: 'B', isCorrect: false },
        ],
      });

    const response = await getQuizFullForAttempt(66);

    expect(api.get).toHaveBeenNthCalledWith(1, '/quiz/66/full');
    expect(api.get).toHaveBeenNthCalledWith(2, '/quiz/66');
    expect(api.get).toHaveBeenNthCalledWith(3, '/quiz-sections/byQuiz/66');
    expect(api.get).toHaveBeenNthCalledWith(4, '/questions/bySection/10');
    expect(api.get).toHaveBeenNthCalledWith(5, '/answers/byQuestion/100');
    expect(response.data.quizId).toBe(66);
    expect(response.data.sections).toHaveLength(1);
    expect(response.data.sections[0].questions).toHaveLength(1);
    expect(response.data.sections[0].questions[0].answers).toHaveLength(2);
  });

  it('keeps loading the quiz when one answer request fails during fallback', async () => {
    api.get
      .mockRejectedValueOnce({ statusCode: 409, message: 'Conflict' })
      .mockResolvedValueOnce({
        data: {
          quizId: 66,
          title: 'Math final',
          status: 'ACTIVE',
        },
      })
      .mockResolvedValueOnce({
        data: [
          { sectionId: 10, content: 'Section 1' },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { questionId: 100, content: 'Question 1', questionTypeId: 1, difficulty: 'EASY' },
          { questionId: 101, content: 'Question 2', questionTypeId: 3, difficulty: 'MEDIUM' },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { answerId: 1000, content: 'A', isCorrect: true },
        ],
      })
      .mockRejectedValueOnce({ statusCode: 409, message: 'Question answers conflict' });

    const response = await getQuizFullForAttempt(66);

    expect(response.data.sections[0].questions).toHaveLength(2);
    expect(response.data.sections[0].questions[0].answers).toHaveLength(1);
    expect(response.data.sections[0].questions[1].answers).toEqual([]);
  });
});
