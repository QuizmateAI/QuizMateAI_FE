import { describe, expect, it } from 'vitest';
import { buildMemberIntelligence } from '@/pages/Users/Group/group-leader/memberStatsInsights';

describe('memberStatsInsights', () => {
  it('flags a member with no attempts as new and recommends a baseline assignment', () => {
    const result = buildMemberIntelligence({
      totalQuizAttempts: 0,
      totalQuizPassed: 0,
      averageScore: null,
    });

    expect(result.healthTone).toBe('new');
    expect(result.cadenceCode).toBe('not_started');
    expect(result.recommendationCodes).toContain('assign_baseline');
  });

  it('marks declining low-performance members as risk and asks for follow-up', () => {
    const result = buildMemberIntelligence(
      {
        totalQuizAttempts: 6,
        totalQuizPassed: 2,
        averageScore: 4.2,
        totalMinutesSpent: 48,
        avgTimePerQuiz: 3,
        weakTopics: ['Hình học', 'Xác suất'],
      },
      {
        weakAreas: ['Hình học'],
      },
      {
        points: [
          { snapshotDate: '2026-04-10T08:00:00Z', averageScore: 6.6, totalQuizAttempts: 2, totalQuizPassed: 2 },
          { snapshotDate: '2026-04-12T08:00:00Z', averageScore: 5.4, totalQuizAttempts: 4, totalQuizPassed: 2 },
          { snapshotDate: '2026-04-14T08:00:00Z', averageScore: 4.2, totalQuizAttempts: 6, totalQuizPassed: 2 },
        ],
      },
    );

    expect(result.healthTone).toBe('risk');
    expect(result.reasonCodes).toContain('declining_trend');
    expect(result.reasonCodes).toContain('weak_topics');
    expect(result.recommendationCodes).toContain('schedule_followup');
    expect(result.recommendationCodes).toContain('focus_weak_topics');
  });

  it('recognizes improving members and suggests harder work', () => {
    const result = buildMemberIntelligence(
      {
        totalQuizAttempts: 8,
        totalQuizPassed: 7,
        averageScore: 8.7,
        totalMinutesSpent: 220,
        avgTimePerQuiz: 11,
      },
      null,
      {
        points: [
          { snapshotDate: '2026-04-10T08:00:00Z', averageScore: 7.1, totalQuizAttempts: 4, totalQuizPassed: 3 },
          { snapshotDate: '2026-04-12T08:00:00Z', averageScore: 7.9, totalQuizAttempts: 6, totalQuizPassed: 5 },
          { snapshotDate: '2026-04-14T08:00:00Z', averageScore: 8.7, totalQuizAttempts: 8, totalQuizPassed: 7 },
        ],
      },
    );

    expect(result.healthTone).toBe('strong');
    expect(result.reasonCodes).toContain('improving');
    expect(result.recommendationCodes).toContain('unlock_harder_quiz');
  });
});
