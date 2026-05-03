import { describe, expect, it } from 'vitest';
import {
  extractGroupCreatedQuizPayload,
  isRealtimeProcessingQuizPayload,
} from '@/pages/Users/Group/utils/groupQuizPayload';

describe('groupQuizPayload', () => {
  describe('extractGroupCreatedQuizPayload', () => {
    it('reads quizId at top level', () => {
      const result = extractGroupCreatedQuizPayload({ quizId: 5, title: 'Quiz A' });
      expect(result?.quizId).toBe(5);
      expect(result?.title).toBe('Quiz A');
    });

    it('unwraps single-level ApiResponse { data: { quizId } }', () => {
      const result = extractGroupCreatedQuizPayload({ data: { id: 7 } });
      expect(result?.quizId).toBe(7);
      expect(result?.title).toBe('');
    });

    it('unwraps nested wrapper up to depth 4', () => {
      const result = extractGroupCreatedQuizPayload({
        data: { data: { data: { quizId: 9, title: 'Deep' } } },
      });
      expect(result?.quizId).toBe(9);
      expect(result?.title).toBe('Deep');
    });

    it('returns null when no positive quizId present', () => {
      expect(extractGroupCreatedQuizPayload({ data: { id: 0 } })).toBeNull();
      expect(extractGroupCreatedQuizPayload(null)).toBeNull();
      expect(extractGroupCreatedQuizPayload('not-an-object')).toBeNull();
    });
  });

  describe('isRealtimeProcessingQuizPayload', () => {
    it('returns true for in-flight statuses', () => {
      expect(isRealtimeProcessingQuizPayload({ status: 'PROCESSING' })).toBe(true);
      expect(isRealtimeProcessingQuizPayload({ status: 'PENDING' })).toBe(true);
      expect(isRealtimeProcessingQuizPayload({ status: 'QUEUED' })).toBe(true);
    });

    it('returns true when websocketTaskId present', () => {
      expect(isRealtimeProcessingQuizPayload({ websocketTaskId: 't-1' })).toBe(true);
      expect(isRealtimeProcessingQuizPayload({ taskId: 't-2' })).toBe(true);
    });

    it('returns true when percent is in (0, 100)', () => {
      expect(isRealtimeProcessingQuizPayload({ percent: 42 })).toBe(true);
      expect(isRealtimeProcessingQuizPayload({ progressPercent: 1 })).toBe(true);
    });

    it('returns false for terminal/empty payloads', () => {
      expect(isRealtimeProcessingQuizPayload({ status: 'ACTIVE', percent: 100 })).toBe(false);
      expect(isRealtimeProcessingQuizPayload({})).toBe(false);
      expect(isRealtimeProcessingQuizPayload(null)).toBe(false);
    });

    it('detects processing inside nested data wrapper', () => {
      expect(isRealtimeProcessingQuizPayload({ data: { status: 'PROCESSING' } })).toBe(true);
    });
  });
});
