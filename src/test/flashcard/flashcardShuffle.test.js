import { describe, expect, it } from 'vitest';
import {
  buildQuizChoiceForItem,
  pickDistractorBacks,
  shuffleArray,
} from '@/pages/Users/Individual/Workspace/Components/flashcard-modes/flashcardShuffle';

const SAMPLE_ITEMS = [
  { flashcardItemId: 1, frontContent: 'A', backContent: 'a-back' },
  { flashcardItemId: 2, frontContent: 'B', backContent: 'b-back' },
  { flashcardItemId: 3, frontContent: 'C', backContent: 'c-back' },
  { flashcardItemId: 4, frontContent: 'D', backContent: 'd-back' },
];

// Deterministic RNG cho test
function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

describe('shuffleArray', () => {
  it('giữ nguyên các phần tử (chỉ đổi thứ tự)', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(original, seededRandom(42));
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('không mutate input', () => {
    const original = [1, 2, 3];
    const copy = original.slice();
    shuffleArray(original, seededRandom(1));
    expect(original).toEqual(copy);
  });

  it('trả mảng rỗng cho input không hợp lệ', () => {
    expect(shuffleArray(null)).toEqual([]);
    expect(shuffleArray(undefined)).toEqual([]);
  });
});

describe('pickDistractorBacks', () => {
  it('không bao gồm back của correctItem', () => {
    const correct = SAMPLE_ITEMS[0];
    const distractors = pickDistractorBacks(SAMPLE_ITEMS, correct, 3, seededRandom(7));
    expect(distractors).not.toContain('a-back');
    expect(distractors).toHaveLength(3);
  });

  it('clamp count theo số distractor khả dụng', () => {
    const correct = SAMPLE_ITEMS[0];
    const distractors = pickDistractorBacks(SAMPLE_ITEMS, correct, 10, seededRandom(7));
    expect(distractors).toHaveLength(3); // chỉ còn 3 item khác
  });

  it('loại trùng nội dung back giống correct', () => {
    const items = [
      { flashcardItemId: 1, backContent: 'same' },
      { flashcardItemId: 2, backContent: 'same' },
      { flashcardItemId: 3, backContent: 'other' },
    ];
    const correct = items[0];
    const distractors = pickDistractorBacks(items, correct, 5, seededRandom(7));
    expect(distractors).toEqual(['other']);
  });
});

describe('buildQuizChoiceForItem', () => {
  it('luôn chứa đúng 1 đáp án đúng + đúng vị trí correctIndex', () => {
    const item = SAMPLE_ITEMS[1];
    const choice = buildQuizChoiceForItem(item, SAMPLE_ITEMS, {
      distractorCount: 3,
      randomFn: seededRandom(123),
    });

    expect(choice.options).toHaveLength(4);
    expect(choice.options[choice.correctIndex]).toBe('b-back');
    expect(choice.question).toBe('B');
  });

  it('đáp án đúng thuộc options', () => {
    const item = SAMPLE_ITEMS[2];
    const choice = buildQuizChoiceForItem(item, SAMPLE_ITEMS, {
      distractorCount: 2,
      randomFn: seededRandom(999),
    });
    expect(choice.options).toContain('c-back');
    expect(choice.correctIndex).toBeGreaterThanOrEqual(0);
  });

  it('hoạt động với pool ít distractor hơn yêu cầu', () => {
    const items = [
      { flashcardItemId: 1, frontContent: 'X', backContent: 'x' },
      { flashcardItemId: 2, frontContent: 'Y', backContent: 'y' },
    ];
    const choice = buildQuizChoiceForItem(items[0], items, {
      distractorCount: 3,
      randomFn: seededRandom(1),
    });
    expect(choice.options).toHaveLength(2);
    expect(choice.options).toContain('x');
  });
});
