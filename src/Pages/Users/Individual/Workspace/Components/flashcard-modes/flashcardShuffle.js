// Helpers for shuffle/quiz mode logic. Pure functions — no React, no API.
//
// Determinism for tests: when a `randomFn` is supplied (returning [0,1)) we drive
// Fisher–Yates with it; otherwise we fall back to Math.random.

export function shuffleArray(items, randomFn = Math.random) {
  const list = Array.isArray(items) ? items.slice() : [];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomFn() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Lấy `count` distractor backContent ngẫu nhiên (loại trừ correctItem).
export function pickDistractorBacks(items, correctItem, count, randomFn = Math.random) {
  const pool = (Array.isArray(items) ? items : [])
    .filter((item) => item && item.flashcardItemId !== correctItem?.flashcardItemId)
    .map((item) => String(item?.backContent || '').trim())
    .filter(Boolean);

  // Loại bỏ trùng nội dung với correct back
  const correctBack = String(correctItem?.backContent || '').trim();
  const uniquePool = Array.from(new Set(pool)).filter((value) => value !== correctBack);

  return shuffleArray(uniquePool, randomFn).slice(0, Math.max(0, count));
}

// Tạo 1 câu trắc nghiệm cho 1 flashcard item: 1 đáp án đúng + tối đa 3 distractor.
// Trả về { question, options, correctIndex }.
export function buildQuizChoiceForItem(item, allItems, options = {}) {
  const { distractorCount = 3, randomFn = Math.random } = options;
  const correctBack = String(item?.backContent || '').trim();
  const distractors = pickDistractorBacks(allItems, item, distractorCount, randomFn);
  const allOptions = shuffleArray([correctBack, ...distractors], randomFn);
  const correctIndex = allOptions.findIndex((option) => option === correctBack);

  return {
    question: String(item?.frontContent || '').trim(),
    options: allOptions,
    correctIndex,
  };
}
