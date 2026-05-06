import { describe, expect, it } from 'vitest';
import { buildFlashcardItemsFromAttempt } from '@/pages/Users/Quiz/utils/buildFlashcardItemsFromAttempt';

describe('buildFlashcardItemsFromAttempt', () => {
  it('chuyển single-choice question thành flashcard item với đáp án đúng + giải thích', () => {
    const reviewQuestions = [
      {
        id: 1,
        type: 'SINGLE_CHOICE',
        content: 'Thủ đô của Việt Nam là gì?',
        answers: [
          { id: 1, content: 'Hà Nội', isCorrect: true },
          { id: 2, content: 'TP.HCM', isCorrect: false },
        ],
        explanation: 'Hà Nội là thủ đô từ năm 1010.',
      },
    ];

    const { items, skippedCount } = buildFlashcardItemsFromAttempt(reviewQuestions);

    expect(skippedCount).toBe(0);
    expect(items).toHaveLength(1);
    expect(items[0].frontContent).toBe('Thủ đô của Việt Nam là gì?');
    expect(items[0].backContent).toContain('Hà Nội');
    expect(items[0].backContent).toContain('Hà Nội là thủ đô từ năm 1010.');
  });

  it('multiple-choice gộp các đáp án đúng bằng newline', () => {
    const { items } = buildFlashcardItemsFromAttempt([
      {
        id: 2,
        type: 'MULTIPLE_CHOICE',
        content: 'Chọn các ngôn ngữ lập trình',
        answers: [
          { id: 1, content: 'Java', isCorrect: true },
          { id: 2, content: 'HTML', isCorrect: false },
          { id: 3, content: 'Python', isCorrect: true },
        ],
      },
    ]);

    expect(items[0].backContent).toContain('Java');
    expect(items[0].backContent).toContain('Python');
    expect(items[0].backContent).not.toContain('HTML');
  });

  it('SHORT_ANSWER nối các đáp án chấp nhận được bằng " / "', () => {
    const { items } = buildFlashcardItemsFromAttempt([
      {
        id: 3,
        type: 'SHORT_ANSWER',
        content: 'Hằng số PI ≈ ?',
        answers: [
          { content: '3.14' },
          { content: '3,14' },
        ],
      },
    ]);

    expect(items[0].backContent).toBe('3.14 / 3,14');
  });

  it('MATCHING xuất ra danh sách "left → right"', () => {
    const { items } = buildFlashcardItemsFromAttempt([
      {
        id: 4,
        type: 'MATCHING',
        content: 'Ghép cặp thủ đô',
        correctMatchingPairs: [
          { leftKey: 'Việt Nam', rightKey: 'Hà Nội' },
          { leftKey: 'Pháp', rightKey: 'Paris' },
        ],
      },
    ]);

    expect(items[0].backContent).toContain('Việt Nam → Hà Nội');
    expect(items[0].backContent).toContain('Pháp → Paris');
  });

  it('skip câu thiếu front hoặc thiếu đáp án đúng', () => {
    const { items, skippedCount } = buildFlashcardItemsFromAttempt([
      { id: 5, type: 'SINGLE_CHOICE', content: '', answers: [{ content: 'A', isCorrect: true }] },
      { id: 6, type: 'SINGLE_CHOICE', content: 'Câu hỏi không có đáp án đúng', answers: [{ content: 'A', isCorrect: false }] },
    ]);

    expect(items).toHaveLength(0);
    expect(skippedCount).toBe(2);
  });

  it('không gắn explanation khi includeExplanation=false', () => {
    const { items } = buildFlashcardItemsFromAttempt(
      [
        {
          id: 7,
          type: 'SINGLE_CHOICE',
          content: 'Câu hỏi',
          answers: [{ content: 'A', isCorrect: true }],
          explanation: 'Giải thích nhiều dòng',
        },
      ],
      { includeExplanation: false },
    );

    expect(items[0].backContent).toBe('A');
    expect(items[0].backContent).not.toContain('Giải thích');
  });

  it('strip markdown image khỏi front content', () => {
    const { items } = buildFlashcardItemsFromAttempt([
      {
        id: 8,
        type: 'SINGLE_CHOICE',
        content: '![diagram](https://example.com/x.png)\nCâu hỏi có hình',
        answers: [{ content: 'Đáp án', isCorrect: true }],
      },
    ]);

    expect(items[0].frontContent).toBe('Câu hỏi có hình');
  });

  it('trả mảng rỗng khi input không hợp lệ', () => {
    expect(buildFlashcardItemsFromAttempt(null).items).toEqual([]);
    expect(buildFlashcardItemsFromAttempt(undefined).items).toEqual([]);
    expect(buildFlashcardItemsFromAttempt('not-array').items).toEqual([]);
  });
});
