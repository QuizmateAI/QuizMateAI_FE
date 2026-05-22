import { QUESTION_TYPE_ID_MAP } from '@/api/QuizAPI';
import { buildFlashcardItemsFromAttempt } from '@/pages/Users/Quiz/utils/buildFlashcardItemsFromAttempt';

function questionTypeIdToAttemptType(questionTypeId) {
  const name = QUESTION_TYPE_ID_MAP[Number(questionTypeId)];
  switch (name) {
    case 'multipleChoice':
      return 'SINGLE_CHOICE';
    case 'multipleSelect':
      return 'MULTIPLE_CHOICE';
    case 'shortAnswer':
      return 'SHORT_ANSWER';
    case 'trueFalse':
      return 'TRUE_FALSE';
    case 'fillBlank':
      return 'FILL_IN_BLANK';
    case 'matching':
      return 'MATCHING';
    default:
      return '';
  }
}

function normalizeMatchingPairs(answers = []) {
  const correctAns = (answers || []).find((answer) => answer?.isCorrect);
  if (!correctAns?.content) return [];
  let pairs = [];
  try {
    pairs = JSON.parse(correctAns.content);
  } catch {
    return [];
  }
  if (!Array.isArray(pairs)) return [];
  return pairs
    .map((pair) => ({
      leftKey: String(pair?.leftKey ?? '').trim(),
      rightKey: String(pair?.rightKey ?? '').trim(),
    }))
    .filter((pair) => pair.leftKey && pair.rightKey);
}

export function buildFlashcardItemsFromQuizDetail(sections = [], questionsMap = {}, answersMap = {}) {
  const reviewQuestions = [];

  (sections || []).forEach((section) => {
    const sid = section?.sectionId;
    if (sid == null) return;
    const qs = questionsMap[sid] || [];
    qs.forEach((question) => {
      const answers = answersMap[question?.questionId] || [];
      const type = questionTypeIdToAttemptType(question?.questionTypeId);
      const base = {
        type,
        content: question?.content,
        explanation: question?.explanation,
        answers: (answers || []).map((answer) => ({
          content: answer?.content,
          isCorrect: answer?.isCorrect,
        })),
      };
      if (type === 'MATCHING') {
        base.correctMatchingPairs = normalizeMatchingPairs(answers);
      }
      reviewQuestions.push(base);
    });
  });

  return buildFlashcardItemsFromAttempt(reviewQuestions);
}
