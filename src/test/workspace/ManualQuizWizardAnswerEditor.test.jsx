import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnswerEditor, parseMatchingPairs, serializeMatchingPairs } from '@/pages/Users/Individual/Workspace/Components/ManualQuizWizard/AnswerEditor';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOptions) => {
      if (typeof fallbackOrOptions === 'string') return fallbackOrOptions;
      if (fallbackOrOptions && typeof fallbackOrOptions === 'object') {
        return fallbackOrOptions.defaultValue || key;
      }
      return key;
    },
    i18n: { language: 'vi' },
  }),
}));

describe('ManualQuizWizard AnswerEditor matching pairs', () => {
  it('preserves empty matching rows when parsing', () => {
    const parsed = parseMatchingPairs([
      { leftKey: '', rightKey: '' },
      { leftKey: '', rightKey: '' },
    ]);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ leftKey: '', rightKey: '' });
    expect(parsed[1]).toEqual({ leftKey: '', rightKey: '' });
  });

  it('preserves whitespace in matching values while editing', () => {
    const parsed = parseMatchingPairs([
      { leftKey: 'New York ', rightKey: ' Hoa Ky' },
    ]);

    expect(parsed).toEqual([
      { leftKey: 'New York ', rightKey: ' Hoa Ky' },
    ]);
  });

  it('adds a new empty pair when clicking add pair', () => {
    const onChange = vi.fn();
    const initialPairs = [
      { leftKey: '', rightKey: '' },
      { leftKey: '', rightKey: '' },
    ];

    render(
      <AnswerEditor
        questionType="matching"
        answers={[
          {
            matchingPairs: initialPairs,
            content: serializeMatchingPairs(initialPairs),
            isCorrect: true,
          },
        ]}
        onChange={onChange}
        isDarkMode={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Thêm cặp|Add pair/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const nextAnswers = onChange.mock.calls[0][0];
    expect(Array.isArray(nextAnswers)).toBe(true);
    expect(nextAnswers[0].matchingPairs).toHaveLength(3);
  });
});
