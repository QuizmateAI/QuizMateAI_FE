// Chuyển danh sách câu hỏi review (đã normalize ở QuizResultPage) thành danh sách
// flashcard items {frontContent, backContent}.
//
// - frontContent: nội dung câu hỏi (dạng plain text). Giữ nguyên bản gốc khi đã là string;
//   nếu content là object (markdown + media), trả về phần text duy nhất.
// - backContent: đáp án đúng + (tuỳ) phần giải thích.
//
// Helper là pure: không gọi API, không mutate input. Mọi câu không xác định được nội dung
// front hoặc back đều được skip để tránh tạo ra flashcard rỗng.

import { getContentDisplayText } from '@/lib/questionContentMedia';

const FALLBACK_TYPES = new Set(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']);

function joinNonEmpty(parts, separator = '\n') {
  return parts.map((part) => String(part || '').trim()).filter(Boolean).join(separator);
}

function resolveQuestionFrontText(question) {
  const rawContent = question?.content;
  // getContentDisplayText strips markdown image syntax + media-only lines.
  // Chỉ áp dụng cho string; object thì coerce qua String() để fallback.
  const source = typeof rawContent === 'string' ? rawContent : String(rawContent || '');
  return String(getContentDisplayText(source) || '').trim();
}

function resolveChoiceCorrectAnswers(question) {
  const answers = Array.isArray(question?.answers) ? question.answers : [];
  return answers
    .filter((answer) => answer?.isCorrect)
    .map((answer) => {
      const text = typeof answer?.content === 'string'
        ? answer.content
        : getContentDisplayText(answer?.content || '');
      return String(text || '').trim();
    })
    .filter(Boolean);
}

function resolveTextCorrectAnswers(question) {
  const answers = Array.isArray(question?.answers) ? question.answers : [];
  // Đôi khi BE đánh dấu isCorrect=true cho text, đôi khi không (mọi entry là acceptable answer)
  const hasFlagged = answers.some((answer) => answer?.isCorrect === true);
  const filtered = hasFlagged
    ? answers.filter((answer) => answer?.isCorrect)
    : answers;
  return filtered
    .map((answer) => String(answer?.content || '').trim())
    .filter(Boolean);
}

function resolveMatchingPairsForBack(question) {
  const pairs = Array.isArray(question?.correctMatchingPairs) ? question.correctMatchingPairs : [];
  return pairs
    .map((pair) => {
      const left = String(pair?.leftKey || '').trim();
      const right = String(pair?.rightKey || '').trim();
      if (!left || !right) return '';
      return `${left} → ${right}`;
    })
    .filter(Boolean);
}

function resolveBackText(question) {
  const type = String(question?.type || '').toUpperCase();

  if (type === 'MATCHING') {
    return joinNonEmpty(resolveMatchingPairsForBack(question));
  }

  if (type === 'SHORT_ANSWER' || type === 'FILL_IN_BLANK') {
    const acceptable = resolveTextCorrectAnswers(question);
    return acceptable.join(' / ');
  }

  if (FALLBACK_TYPES.has(type) || type === '') {
    return joinNonEmpty(resolveChoiceCorrectAnswers(question));
  }

  // Loại không nhận diện được → thử trích đáp án đúng dạng choice trước, fallback text
  const choiceCorrect = resolveChoiceCorrectAnswers(question);
  if (choiceCorrect.length > 0) return joinNonEmpty(choiceCorrect);
  return resolveTextCorrectAnswers(question).join(' / ');
}

function resolveExplanation(question) {
  const explanation = typeof question?.explanation === 'string' ? question.explanation.trim() : '';
  return explanation;
}

/**
 * Build flashcard items từ reviewQuestions của attempt.
 *
 * @param {Array<object>} reviewQuestions - Mảng đã normalize ở QuizResultPage.
 * @param {object} [options]
 * @param {boolean} [options.includeExplanation=true] - Có gắn phần giải thích vào back không.
 * @returns {{ items: Array<{frontContent: string, backContent: string}>, skippedCount: number }}
 */
export function buildFlashcardItemsFromAttempt(reviewQuestions, options = {}) {
  const { includeExplanation = true } = options;
  const list = Array.isArray(reviewQuestions) ? reviewQuestions : [];

  let skippedCount = 0;
  const items = [];

  list.forEach((question) => {
    const front = resolveQuestionFrontText(question);
    const backCore = resolveBackText(question);
    const explanation = includeExplanation ? resolveExplanation(question) : '';

    const back = joinNonEmpty([backCore, explanation], '\n\n');

    if (!front || !back) {
      skippedCount += 1;
      return;
    }

    items.push({ frontContent: front, backContent: back });
  });

  return { items, skippedCount };
}
