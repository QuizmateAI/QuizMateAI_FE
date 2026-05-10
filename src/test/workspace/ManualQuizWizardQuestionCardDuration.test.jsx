import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QuestionCard from '@/pages/Users/Individual/Workspace/Components/ManualQuizWizard/QuestionCard';

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

const baseQuestion = {
  id: 'q-1',
  questionType: 'multipleChoice',
  content: 'sample',
  duration: 60,
  timeLocked: false,
  explanation: '',
  answers: [
    { content: 'a', isCorrect: true },
    { content: 'b', isCorrect: false },
  ],
};

describe('QuestionCard duration input', () => {
  it('lets user type a multi-digit value without the parent clamping each keystroke', () => {
    const onDurationChange = vi.fn();
    render(
      <QuestionCard
        question={baseQuestion}
        index={1}
        onChange={() => {}}
        onDelete={() => {}}
        canDelete
        timerMode={false}
        onToggleLock={() => {}}
        onDurationChange={onDurationChange}
      />,
    );

    const input = screen.getByLabelText('Giây');
    expect(input).toHaveValue(60);

    // Simulate clearing and typing "10" character by character.
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.change(input, { target: { value: '10' } });

    // No commit should have happened yet.
    expect(onDurationChange).not.toHaveBeenCalled();
    expect(input).toHaveValue(10);

    // Blur commits the value as-typed.
    fireEvent.blur(input);
    expect(onDurationChange).toHaveBeenCalledWith('q-1', '10');
  });

  it('commits on Enter key', () => {
    const onDurationChange = vi.fn();
    render(
      <QuestionCard
        question={baseQuestion}
        index={1}
        onChange={() => {}}
        onDelete={() => {}}
        canDelete
        timerMode={false}
        onToggleLock={() => {}}
        onDurationChange={onDurationChange}
      />,
    );

    const input = screen.getByLabelText('Giây');
    fireEvent.change(input, { target: { value: '90' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onDurationChange).toHaveBeenCalledWith('q-1', '90');
  });

  it('skips parent call when blurred without changes', () => {
    const onDurationChange = vi.fn();
    render(
      <QuestionCard
        question={baseQuestion}
        index={1}
        onChange={() => {}}
        onDelete={() => {}}
        canDelete
        timerMode={false}
        onToggleLock={() => {}}
        onDurationChange={onDurationChange}
      />,
    );

    const input = screen.getByLabelText('Giây');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(onDurationChange).not.toHaveBeenCalled();
  });

  it('reverts empty value on blur to current question.duration', () => {
    const onDurationChange = vi.fn();
    render(
      <QuestionCard
        question={baseQuestion}
        index={1}
        onChange={() => {}}
        onDelete={() => {}}
        canDelete
        timerMode={false}
        onToggleLock={() => {}}
        onDurationChange={onDurationChange}
      />,
    );

    const input = screen.getByLabelText('Giây');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onDurationChange).not.toHaveBeenCalled();
    expect(input).toHaveValue(60);
  });
});
