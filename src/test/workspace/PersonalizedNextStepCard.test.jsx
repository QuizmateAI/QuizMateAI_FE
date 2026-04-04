import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PersonalizedNextStepCard from '@/Pages/Users/Individual/Workspace/Components/PersonalizedNextStepCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key, fallback, values) => {
      if (!fallback) return _key;
      if (values && typeof fallback === 'string') {
        return fallback.replace(/\{\{(\w+)\}\}/g, (_, token) => values[token] ?? '');
      }
      return fallback;
    },
    i18n: { language: 'vi' },
  }),
}));

describe('PersonalizedNextStepCard', () => {
  it('renders daily tasks, review queue, why this quiz, and triggers CTA', () => {
    const handleTaskAction = vi.fn();
    const personalization = {
      dailyPlan: {
        summary: 'Hôm nay ưu tiên ôn lại Cohesion, sau đó làm quiz tiếp theo.',
        tasks: [
          {
            taskId: 'review-queue:cohesion',
            type: 'REVIEW_QUEUE',
            title: 'Ôn lại Cohesion',
            reason: 'Chủ đề này đã đến hạn ôn lại và vẫn cần được củng cố.',
            effortMinutes: 12,
            ctaLabel: 'Tạo quiz review',
            targetView: 'createQuiz',
            preset: {
              quizIntent: 'REVIEW',
              focusTopics: ['Cohesion'],
              targetDifficulty: 'MEDIUM',
              questionCount: 8,
              reviewTopic: 'Cohesion',
            },
          },
          {
            taskId: 'take-quiz',
            type: 'TAKE_QUIZ',
            title: 'Quiz tiếp theo',
            reason: 'Ưu tiên Cohesion vì đây vẫn là chủ đề yếu cần được củng cố.',
            effortMinutes: 18,
            ctaLabel: 'Tạo quiz tiếp theo',
            targetView: 'createQuiz',
          },
        ],
      },
      reviewQueue: [
        {
          topic: 'Cohesion',
          stage: 1,
          dueAt: '2099-04-02T09:00:00',
          reason: 'Ôn lại sớm để giảm lỗi lặp lại.',
        },
      ],
      learnerExplanation: {
        whyThisQuiz: 'Ưu tiên Cohesion vì bạn vẫn lặp lỗi ở phần chuyển ý.',
      },
    };

    render(
      <PersonalizedNextStepCard
        isDarkMode={false}
        personalization={personalization}
        onTaskAction={handleTaskAction}
      />,
    );

    expect(screen.getByText('Hôm nay nên làm gì tiếp theo?')).toBeInTheDocument();
    expect(screen.getByText('Ôn lại Cohesion')).toBeInTheDocument();
    expect(screen.getByText('Review queue')).toBeInTheDocument();
    expect(screen.getByText('Why this quiz?')).toBeInTheDocument();
    expect(screen.getAllByText('Ưu tiên Cohesion vì đây vẫn là chủ đề yếu cần được củng cố.').length).toBeGreaterThan(0);
    expect(screen.getByText('S1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Tạo quiz review/i }));

    expect(handleTaskAction).toHaveBeenCalledWith(personalization.dailyPlan.tasks[0]);
  });
});
