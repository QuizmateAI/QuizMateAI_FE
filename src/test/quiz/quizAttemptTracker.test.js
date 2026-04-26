import { beforeEach, describe, expect, it } from 'vitest';
import {
  hasQuizAttempted,
  hasQuizCompleted,
  markQuizAttempted,
  markQuizCompleted,
} from '@/utils/quizAttemptTracker';

describe('quizAttemptTracker', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores attempted and completed quiz ids for the active user scope', () => {
    window.localStorage.setItem('user', JSON.stringify({ email: 'learner@example.com' }));

    expect(hasQuizAttempted(12)).toBe(false);
    expect(hasQuizCompleted(12)).toBe(false);

    markQuizAttempted(12);
    markQuizCompleted(12);

    expect(hasQuizAttempted(12)).toBe(true);
    expect(hasQuizCompleted(12)).toBe(true);
  });

  it('isolates quiz tracking data between user identities', () => {
    window.localStorage.setItem('user', JSON.stringify({ email: 'first@example.com' }));
    markQuizAttempted(21);

    window.localStorage.setItem('user', JSON.stringify({ email: 'second@example.com' }));

    expect(hasQuizAttempted(21)).toBe(false);

    markQuizAttempted(21);
    expect(hasQuizAttempted(21)).toBe(true);

    window.localStorage.setItem('user', JSON.stringify({ email: 'first@example.com' }));
    expect(hasQuizAttempted(21)).toBe(true);
  });
});
