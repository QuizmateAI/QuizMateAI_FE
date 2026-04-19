import { parseMatchingPairs } from "./AnswerEditor";

const BACKEND_TYPE_TO_FE = {
  SINGLE_CHOICE: "multipleChoice",
  MULTIPLE_CHOICE: "multipleSelect",
  MULTIPLE_SELECT: "multipleSelect",
  TRUE_FALSE: "trueFalse",
  SHORT_ANSWER: "shortAnswer",
  FILL_IN_BLANK: "fillBlank",
  MATCHING: "matching",
  IMAGED_BASED: "imageBased",
};

function resolveFeType(questionTypeId, questionTypes) {
  const qt = (questionTypes || []).find(
    (t) => Number(t.questionTypeId ?? t.id) === Number(questionTypeId),
  );
  if (!qt) return "multipleChoice";
  const backendName = String((qt.questionType ?? qt.name) || "").toUpperCase();
  return BACKEND_TYPE_TO_FE[backendName] || "multipleChoice";
}

function mapBeAnswers(beAnswers, feType, keepIds) {
  if (feType === "matching") {
    const raw = beAnswers[0]?.matchingPairs || beAnswers[0]?.content || "";
    return [{
      ...(keepIds ? { _answerId: beAnswers[0]?.answerId || null } : {}),
      matchingPairs: parseMatchingPairs(raw),
      content: typeof raw === "string" ? raw : "",
      isCorrect: true,
    }];
  }
  return (beAnswers || []).map((a) => ({
    ...(keepIds ? { _answerId: a.answerId || null } : {}),
    content: a.content || "",
    isCorrect: Boolean(a.isCorrect),
  }));
}

function mapBeQuestion(q, sectionId, questionTypes, idx, keepIds) {
  const feType = resolveFeType(q.questionTypeId, questionTypes);
  const prefix = keepIds ? "q-edit" : "q-clone";
  return {
    id: `${prefix}-${q.questionId}-${idx}`,
    ...(keepIds ? { _questionId: q.questionId, _sectionId: sectionId } : { _questionId: null, _sectionId: null }),
    _replacedQuestionId: null,
    questionTypeId: q.questionTypeId,
    questionType: feType,
    content: q.content || "",
    duration: q.duration ?? 60,
    timeLocked: false,
    explanation: q.explanation || "",
    answers: mapBeAnswers(q.answers || [], feType, keepIds),
  };
}

/**
 * Maps full quiz BE response → wizard state, keeping IDs for update-bulk.
 * Returns { config, questions, sectionId }.
 */
export function mapQuizToWizardState(quizFull, questionTypes) {
  const durationSeconds = Number(quizFull?.duration) || 0;
  const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

  const sections = quizFull?.sections || [];
  const rootSection = sections[0] || {};
  const beQuestions = rootSection.questions || [];
  const sectionId = rootSection.sectionId || null;

  const questions = beQuestions.map((q, i) =>
    mapBeQuestion(q, sectionId, questionTypes, i, true),
  );

  const config = {
    title: quizFull?.title || "",
    description: quizFull?.description || "",
    questionCount: questions.length || 1,
    timerMode: quizFull?.timerMode ?? true,
    duration: durationMinutes,
    overallDifficulty: null,
    quizIntent: quizFull?.quizIntent || "REVIEW",
  };

  return { config, questions, sectionId };
}

/**
 * Same as mapQuizToWizardState but strips all IDs — for "Tạo quiz tương tự".
 */
export function mapQuizToNewWizardState(quizFull, questionTypes) {
  const { config, questions } = mapQuizToWizardState(quizFull, questionTypes);

  const strippedQuestions = questions.map((q, i) => ({
    ...q,
    id: `q-clone-${Date.now()}-${i}`,
    _questionId: null,
    _sectionId: null,
    answers: (q.answers || []).map((a) => ({ ...a, _answerId: null })),
  }));

  return { config, questions: strippedQuestions, sectionId: null };
}
