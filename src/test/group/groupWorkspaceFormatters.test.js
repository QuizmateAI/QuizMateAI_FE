import { describe, it, expect } from 'vitest';
import {
  formatLearningScore,
  formatLearningPassRate,
} from '@/pages/Users/Group/utils/groupWorkspaceFormatters';

describe('groupWorkspaceFormatters', () => {
  describe('formatLearningScore', () => {
    it('rounds to one decimal place', () => {
      expect(formatLearningScore(8.75)).toBe(8.8);
      expect(formatLearningScore(7.04)).toBe(7);
    });

    it('returns em-dash for null / undefined / NaN', () => {
      expect(formatLearningScore(null)).toBe('—');
      expect(formatLearningScore(undefined)).toBe('—');
      expect(formatLearningScore(NaN)).toBe('—');
    });
  });

  describe('formatLearningPassRate', () => {
    it('returns em-dash when no attempts', () => {
      expect(formatLearningPassRate({ totalQuizAttempts: 0, totalQuizPassed: 0 })).toBe('—');
      expect(formatLearningPassRate(null)).toBe('—');
    });

    it('computes percentage with one decimal', () => {
      expect(formatLearningPassRate({ totalQuizAttempts: 10, totalQuizPassed: 7 })).toBe('70%');
      expect(formatLearningPassRate({ totalQuizAttempts: 3, totalQuizPassed: 1 })).toBe('33.3%');
    });
  });
});
