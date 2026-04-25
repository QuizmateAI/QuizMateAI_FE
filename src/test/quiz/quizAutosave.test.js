import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildSavePayload } from '@/pages/Users/Quiz/utils/quizTransform';
import { useQuizAutoSave } from '@/pages/Users/Quiz/hooks/useQuizAutoSave';
import { saveAttemptAnswers } from '@/api/QuizAPI';

vi.mock('@/api/QuizAPI', () => ({
  saveAttemptAnswers: vi.fn(),
}));

describe('quiz autosave stability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps cleared answers in save payload so backend can delete old answers', () => {
    expect(buildSavePayload({
      1: [],
      2: '',
      3: [31, 32],
      4: '  final answer  ',
      5: { matchingPairs: [{ leftKey: 'A', rightKey: '1' }, { leftKey: 'B', rightKey: '2' }] },
    })).toEqual([
      { questionId: 1, selectedAnswerIds: [], textAnswer: null },
      { questionId: 2, selectedAnswerIds: [], textAnswer: null },
      { questionId: 3, selectedAnswerIds: [31, 32], textAnswer: null },
      { questionId: 4, selectedAnswerIds: [], textAnswer: 'final answer' },
      {
        questionId: 5,
        selectedAnswerIds: [],
        textAnswer: null,
        matchingPairs: [
          { leftKey: 'A', rightKey: '1' },
          { leftKey: 'B', rightKey: '2' },
        ],
      },
    ]);
  });

  it('queues the latest autosave while a previous request is still in flight', async () => {
    const deferredResolvers = [];
    saveAttemptAnswers.mockImplementation(() => new Promise((resolve) => {
      deferredResolvers.push(resolve);
    }));

    const { result, rerender } = renderHook(
      ({ attemptId, answers }) => useQuizAutoSave(attemptId, answers, { enabled: false }),
      {
        initialProps: {
          attemptId: 99,
          answers: { 1: [11] },
        },
      },
    );

    let savePromise;
    await act(async () => {
      savePromise = result.current.saveManually({ silent: true });
    });

    expect(saveAttemptAnswers).toHaveBeenCalledTimes(1);
    expect(saveAttemptAnswers).toHaveBeenNthCalledWith(1, 99, [
      { questionId: 1, selectedAnswerIds: [11], textAnswer: null },
    ]);

    rerender({
      attemptId: 99,
      answers: { 1: [11, 12] },
    });

    let queuedPromise;
    await act(async () => {
      queuedPromise = result.current.saveManually({ silent: true });
    });

    expect(saveAttemptAnswers).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferredResolvers.shift()?.();
    });

    await waitFor(() => {
      expect(saveAttemptAnswers).toHaveBeenCalledTimes(2);
    });

    expect(saveAttemptAnswers).toHaveBeenNthCalledWith(2, 99, [
      { questionId: 1, selectedAnswerIds: [11, 12], textAnswer: null },
    ]);

    await act(async () => {
      deferredResolvers.shift()?.();
      await Promise.all([savePromise, queuedPromise]);
    });
  });
});
