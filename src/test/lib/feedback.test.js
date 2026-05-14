import { describe, it, expect } from 'vitest';
import {
  FEEDBACK_ANSWERS_MAX_COUNT,
  FEEDBACK_ANSWER_TEXT_MAX_LENGTH,
  FEEDBACK_COMMENT_MAX_LENGTH,
  FEEDBACK_SELECTED_OPTIONS_MAX_COUNT,
  FEEDBACK_SELECTED_OPTION_MAX_LENGTH,
  buildFeedbackSubmissionPayload,
} from '@/lib/feedback';

describe('buildFeedbackSubmissionPayload BE bounds', () => {
  it('truncates answerText to BE max (4000)', () => {
    const longText = 'a'.repeat(5000);
    const result = buildFeedbackSubmissionPayload(
      [{ questionId: 1, questionType: 'TEXT' }],
      { 1: longText },
    );
    expect(result.answers[0].answerText.length).toBe(FEEDBACK_ANSWER_TEXT_MAX_LENGTH);
  });

  it('truncates comment to BE max (2000) even when answerText longer', () => {
    const longText = 'a'.repeat(3000);
    const result = buildFeedbackSubmissionPayload(
      [{ questionId: 1, questionType: 'TEXT' }],
      { 1: longText },
    );
    expect(result.comment.length).toBe(FEEDBACK_COMMENT_MAX_LENGTH);
    expect(result.answers[0].answerText.length).toBe(3000); // answerText not capped to 2000
  });

  it('drops answers beyond 50', () => {
    const questions = Array.from({ length: 60 }, (_, i) => ({
      questionId: i + 1,
      questionType: 'TEXT',
    }));
    const answers = Object.fromEntries(
      Array.from({ length: 60 }, (_, i) => [i + 1, `answer-${i + 1}`]),
    );
    const result = buildFeedbackSubmissionPayload(questions, answers);
    expect(result.answers).toHaveLength(FEEDBACK_ANSWERS_MAX_COUNT);
    expect(result.answers[0].questionId).toBe(1);
    expect(result.answers[FEEDBACK_ANSWERS_MAX_COUNT - 1].questionId).toBe(FEEDBACK_ANSWERS_MAX_COUNT);
  });

  it('truncates selectedOptions array to 50 items', () => {
    const options = Array.from({ length: 60 }, (_, i) => `opt-${i}`);
    const result = buildFeedbackSubmissionPayload(
      [{ questionId: 1, questionType: 'MULTIPLE_CHOICE' }],
      { 1: options },
    );
    expect(result.answers[0].selectedOptions).toHaveLength(FEEDBACK_SELECTED_OPTIONS_MAX_COUNT);
  });

  it('truncates each selectedOption value to 256 chars', () => {
    const longOption = 'x'.repeat(300);
    const result = buildFeedbackSubmissionPayload(
      [{ questionId: 1, questionType: 'MULTIPLE_CHOICE' }],
      { 1: [longOption, 'short'] },
    );
    expect(result.answers[0].selectedOptions[0].length).toBe(FEEDBACK_SELECTED_OPTION_MAX_LENGTH);
    expect(result.answers[0].selectedOptions[1]).toBe('short');
  });

  it('truncates SINGLE_CHOICE selectedOption to 256 chars', () => {
    const longOption = 'y'.repeat(300);
    const result = buildFeedbackSubmissionPayload(
      [{ questionId: 1, questionType: 'SINGLE_CHOICE' }],
      { 1: longOption },
    );
    expect(result.answers[0].selectedOption.length).toBe(FEEDBACK_SELECTED_OPTION_MAX_LENGTH);
  });

  it('preserves STAR_RATING and YES_NO answers untouched', () => {
    const result = buildFeedbackSubmissionPayload(
      [
        { questionId: 1, questionType: 'STAR_RATING' },
        { questionId: 2, questionType: 'YES_NO' },
      ],
      { 1: 4, 2: true },
    );
    expect(result.overallRating).toBe(4);
    expect(result.satisfied).toBe(true);
    expect(result.answers[0].answerNumber).toBe(4);
    expect(result.answers[1].answerBoolean).toBe(true);
  });
});
