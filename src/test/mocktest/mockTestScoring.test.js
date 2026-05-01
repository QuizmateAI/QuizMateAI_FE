import { describe, expect, it } from 'vitest';
import {
  buildMockTestCustomScoring,
  countLeafQuestions,
  normalizeMockTestScoring,
  scorePerQuestion,
} from '@/pages/Users/MockTest/utils/mockTestScoring';

describe('mock test scoring', () => {
  const sections = [
    {
      title: 'Part 1',
      structure: [
        { quantity: 6, questionType: 'SINGLE_CHOICE' },
        { quantity: 4, questionType: 'TRUE_FALSE' },
      ],
    },
    {
      title: 'Part 2',
      subConfigs: [
        {
          title: 'Case analysis',
          structure: [
            { quantity: 5, questionType: 'MULTIPLE_CHOICE' },
          ],
        },
      ],
    },
  ];

  it('counts nested leaf questions and derives per-question score from total points', () => {
    expect(countLeafQuestions(sections)).toBe(15);
    expect(scorePerQuestion({ totalPoints: 45 }, sections)).toBe(3);
  });

  it('clamps passing score to total points', () => {
    expect(normalizeMockTestScoring({ totalPoints: 10, passingScore: 12 })).toMatchObject({
      totalPoints: 10,
      passingScore: 10,
    });
  });

  it('keeps custom scoring payload explicit for mock test generation', () => {
    expect(buildMockTestCustomScoring({ totalPoints: 100, passingScore: 50, mode: 'RAW' })).toEqual({
      totalPoints: 100,
      passingScore: 50,
      mode: 'RAW',
      perQuestionPoints: 'uniform',
    });
  });
});
