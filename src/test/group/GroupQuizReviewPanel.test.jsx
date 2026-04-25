import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupQuizReviewPanel from '@/pages/Users/Group/Components/GroupQuizReviewPanel';
import { deleteQuestion } from '@/api/QuizAPI';
import { getMyQuizReviewContributor, setQuizReviewCompleteOk } from '@/api/ChallengeAPI';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback ?? key,
  }),
}));

vi.mock('@/api/QuizAPI', () => ({
  QUESTION_TYPE_ID_MAP: {
    1: 'multipleChoice',
  },
  deleteQuestion: vi.fn(),
}));

vi.mock('@/api/ChallengeAPI', () => ({
  getMyQuizReviewContributor: vi.fn(),
  setQuizReviewCompleteOk: vi.fn(),
}));

describe('GroupQuizReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMyQuizReviewContributor.mockResolvedValue({ data: {} });
    setQuizReviewCompleteOk.mockResolvedValue({ data: {} });
    deleteQuestion.mockResolvedValue({ data: {} });
  });

  it('allows a reviewer to delete a question directly from the check tab', async () => {
    const onQuestionDeleted = vi.fn().mockResolvedValue(undefined);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <GroupQuizReviewPanel
          isDarkMode={false}
          sections={[{ sectionId: 10, content: 'Section A' }]}
          questionsMap={{
            10: [
              {
                questionId: 501,
                questionTypeId: 1,
                content: 'Câu hỏi cần xóa',
                difficulty: 'EASY',
              },
            ],
          }}
          answersMap={{
            501: [
              { answerId: 1, content: 'A', isCorrect: false },
              { answerId: 2, content: 'B', isCorrect: true },
            ],
          }}
          loading={false}
          quizId={900}
          workspaceId={55}
          isReviewer
          onQuestionDeleted={onQuestionDeleted}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xóa câu hỏi' }));
    const deleteButtons = await screen.findAllByRole('button', { name: 'Xóa câu hỏi' });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(deleteQuestion).toHaveBeenCalledWith(501);
    });
    expect(onQuestionDeleted).toHaveBeenCalled();
  });
});
