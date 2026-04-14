import { QUESTION_TYPE_ID_MAP } from '@/api/QuizAPI';

const QUESTION_TYPE_TO_CARD = {
  multipleChoice: 'SINGLE_CHOICE',
  multipleSelect: 'MULTIPLE_CHOICE',
  shortAnswer: 'SHORT_ANSWER',
  trueFalse: 'TRUE_FALSE',
  fillBlank: 'FILL_IN_BLANK',
  matching: 'MATCHING',
};

export function getCardQuestionType(questionTypeId) {
  const frontendType = QUESTION_TYPE_ID_MAP[questionTypeId] || 'multipleChoice';
  return QUESTION_TYPE_TO_CARD[frontendType] || 'SINGLE_CHOICE';
}

function trimToNull(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

export function getSectionChildren(section) {
  if (Array.isArray(section?.children)) {
    return section.children;
  }
  if (Array.isArray(section?.subSections)) {
    return section.subSections;
  }
  return [];
}

export function getSectionTitle(section, fallbackTitle = '') {
  return trimToNull(section?.title)
    || trimToNull(section?.content)
    || trimToNull(section?.name)
    || fallbackTitle;
}

export function getSectionKey(section, fallbackKey = '') {
  const sectionId = Number(section?.sectionId);
  if (Number.isInteger(sectionId) && sectionId > 0) {
    return String(sectionId);
  }
  return String(fallbackKey || getSectionTitle(section, 'section'));
}

export function countSectionQuestions(section) {
  const directQuestions = Array.isArray(section?.questions) ? section.questions.length : 0;
  return directQuestions + getSectionChildren(section).reduce(
    (total, childSection) => total + countSectionQuestions(childSection),
    0,
  );
}

export function collectAllSectionKeys(sections = [], parentPath = 'section') {
  return (Array.isArray(sections) ? sections : []).reduce((keys, section, index) => {
    const pathLabel = `${parentPath}-${index + 1}`;
    const sectionKey = getSectionKey(section, pathLabel);
    keys.push(sectionKey);
    keys.push(...collectAllSectionKeys(getSectionChildren(section), pathLabel));
    return keys;
  }, []);
}

export function buildQuestionSectionPathMap(sections = [], parentKeys = [], parentPath = 'section') {
  const sectionMap = new Map();

  const visitSection = (section, index, pathPrefix, ancestorKeys) => {
    const pathLabel = `${pathPrefix}-${index + 1}`;
    const sectionKey = getSectionKey(section, pathLabel);
    const nextAncestorKeys = [...ancestorKeys, sectionKey];

    for (const question of section?.questions || []) {
      const questionId = Number(question?.id ?? question?.questionId);
      if (Number.isInteger(questionId) && questionId > 0) {
        sectionMap.set(questionId, nextAncestorKeys);
      }
    }

    getSectionChildren(section).forEach((childSection, childIndex) => {
      visitSection(childSection, childIndex, pathLabel, nextAncestorKeys);
    });
  };

  (Array.isArray(sections) ? sections : []).forEach((section, index) => {
    visitSection(section, index, parentPath, parentKeys);
  });

  return sectionMap;
}

export function normalizeMatchingPairs(pairs = []) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return [];
  }

  const pairsByLeftKey = new Map();
  pairs.forEach((pair) => {
    const leftKey = trimToNull(pair?.leftKey);
    const rightKey = trimToNull(pair?.rightKey);
    if (!leftKey || !rightKey) {
      return;
    }
    pairsByLeftKey.set(leftKey, rightKey);
  });

  return Array.from(pairsByLeftKey.entries())
    .sort((leftEntry, rightEntry) => leftEntry[0].localeCompare(rightEntry[0]))
    .map(([leftKey, rightKey]) => ({ leftKey, rightKey }));
}

function extractMatchingPairs(answer) {
  return normalizeMatchingPairs(answer?.matchingPairs);
}

export function getCorrectMatchingPairs(question) {
  const explicitPairs = normalizeMatchingPairs(question?.correctMatchingPairs);
  if (explicitPairs.length > 0) {
    return explicitPairs;
  }

  const answers = Array.isArray(question?.answers) ? question.answers : [];
  const correctAnswers = answers.filter((answer) => answer?.isCorrect);
  const sourceAnswers = correctAnswers.length > 0 ? correctAnswers : answers;

  return normalizeMatchingPairs(
    sourceAnswers.flatMap((answer) => extractMatchingPairs(answer)),
  );
}

function buildMatchingRightOptions(correctMatchingPairs = []) {
  const seen = new Set();
  return correctMatchingPairs
    .map((pair) => trimToNull(pair?.rightKey))
    .filter((rightKey) => {
      if (!rightKey || seen.has(rightKey)) {
        return false;
      }
      seen.add(rightKey);
      return true;
    });
}

function isMatchingAnswerValue(answerValue) {
  return Boolean(answerValue) && typeof answerValue === 'object' && !Array.isArray(answerValue);
}

function extractMatchingAnswerValue(answerValue) {
  return isMatchingAnswerValue(answerValue)
    ? normalizeMatchingPairs(answerValue.matchingPairs)
    : [];
}

function shouldIncludeMatchingPairs(answerValue, questionType = null) {
  return questionType === 'MATCHING'
    || (isMatchingAnswerValue(answerValue) && Array.isArray(answerValue.matchingPairs));
}

function buildAttemptAnswerPayload(questionId, answerValue, questionType = null) {
  const selectedAnswerIds = Array.isArray(answerValue)
    ? answerValue.filter(answerId => answerId != null)
    : Array.isArray(answerValue?.selectedAnswerIds)
      ? answerValue.selectedAnswerIds.filter(answerId => answerId != null)
      : [];

  const normalizedTextAnswer = typeof answerValue === 'string'
    ? answerValue.trim()
    : typeof answerValue?.textAnswer === 'string'
      ? answerValue.textAnswer.trim()
      : '';

  const includeMatchingPairs = shouldIncludeMatchingPairs(answerValue, questionType);
  const matchingPairs = includeMatchingPairs
    ? extractMatchingAnswerValue(answerValue)
    : undefined;

  return {
    questionId,
    selectedAnswerIds,
    textAnswer: normalizedTextAnswer || null,
    ...(includeMatchingPairs ? { matchingPairs } : {}),
  };
}

/**
 * Transform API full-quiz response → normalized format for QuestionCard.
 * Flattens all questions from all sections into a single ordered list.
 */
export function normalizeQuizData(apiQuiz) {
  if (!apiQuiz) return null;

  const rawTimerMode = apiQuiz.timerMode;
  const isTotalTimerMode = rawTimerMode === true
    || rawTimerMode === 'true'
    || rawTimerMode === 1
    || rawTimerMode === '1'
    || rawTimerMode === 'TOTAL';
  const rawDuration = Number(apiQuiz.duration) || 0;
  // Legacy FE bug sent minutes as seconds into durationInMinute, and BE converted again.
  // Example: 15 -> FE sends 900 -> BE stores 54000 seconds.
  const normalizedDurationInSeconds = isTotalTimerMode && rawDuration >= 36000
    ? Math.floor(rawDuration / 60)
    : rawDuration;
  const totalTimeInSeconds = isTotalTimerMode
    ? normalizedDurationInSeconds
    : rawDuration * 60;
  const questions = [];
  const sections = apiQuiz.sections || [];

  function normalizeQuestion(q) {
    const nextQuestionNumber = questions.length + 1;
    const normalizedAnswers = (q.answers || []).map(a => ({
      id: a.answerId,
      content: a.content,
      isCorrect: a.isCorrect,
      matchingPairs: normalizeMatchingPairs(a.matchingPairs),
    }));
    const correctMatchingPairs = getCorrectMatchingPairs({ answers: normalizedAnswers });
    const cardType = correctMatchingPairs.length > 0 ? 'MATCHING' : getCardQuestionType(q.questionTypeId);
    const normalizedTimeLimit = isTotalTimerMode
      ? 0
      : Math.max(1, Number(q.duration) || 0);

    const normalizedQuestion = {
      id: q.questionId,
      content: q.content,
      type: cardType,
      difficulty: q.difficulty || 'MEDIUM',
      score: q.score || 0,
      explanation: q.explanation || '',
      timeLimit: normalizedTimeLimit,
      answers: normalizedAnswers,
      correctMatchingPairs,
      matchingRightOptions: buildMatchingRightOptions(correctMatchingPairs),
      number: nextQuestionNumber,
    };

    questions.push(normalizedQuestion);
    return normalizedQuestion;
  }

  function normalizeSectionNode(section) {
    if (!section) return null;

    const normalizedQuestions = (section.questions || []).map(normalizeQuestion);
    const normalizedChildren = getSectionChildren(section)
      .map(normalizeSectionNode)
      .filter(Boolean);

    return {
      sectionId: section.sectionId ?? null,
      parentSectionId: section.parentSectionId ?? null,
      sectionType: section.sectionType ?? null,
      title: getSectionTitle(section),
      content: section.content ?? '',
      questions: normalizedQuestions,
      children: normalizedChildren,
    };
  }

  let sectionGroups = sections
    .map(normalizeSectionNode)
    .filter(Boolean);

  if (
    sectionGroups.length === 1
    && String(sectionGroups[0]?.sectionType || '').toUpperCase() === 'ROOT'
    && sectionGroups[0].questions.length === 0
    && sectionGroups[0].children.length > 0
  ) {
    sectionGroups = sectionGroups[0].children;
  }

  if (sectionGroups.length === 0) {
    // Fallback an toàn cho payload cũ thiếu section tree.
    for (const section of sections) {
      if (!section) continue;
      for (const q of section.questions || []) {
        normalizeQuestion(q);
      }
    }
  }

  if (questions.length === 0) {
    // Đệ quy collect questions từ tree section khi payload không có câu hỏi ở root level.
    function collectQuestionsFrom(section) {
      if (!section) return;
      for (const q of section.questions || []) {
        normalizeQuestion(q);
      }
      const children = getSectionChildren(section);
      for (const child of children) {
        collectQuestionsFrom(child);
      }
    }

    for (const section of sections) {
      collectQuestionsFrom(section);
    }
  }

  questions.forEach((question, index) => {
    if (!Number.isFinite(question.number)) {
      question.number = index + 1;
    }
  });

  return {
    quizId: apiQuiz.quizId,
    workspaceId: apiQuiz.workspaceId || apiQuiz.workSpaceId || apiQuiz.workspace?.workspaceId || null,
    title: apiQuiz.title,
    description: '',
    quizIntent: apiQuiz.quizIntent || null,
    timerMode: isTotalTimerMode ? 'TOTAL' : 'PER_QUESTION',
    totalTime: totalTimeInSeconds,
    maxAttempt: apiQuiz.maxAttempt,
    passScore: apiQuiz.passScore,
    maxScore: apiQuiz.maxScore,
    status: apiQuiz.status,
    questions,
    sectionGroups,
  };
}

export function mapSavedAnswersToState(savedAnswers = []) {
  return savedAnswers.reduce((result, savedAnswer) => {
    const matchingPairs = normalizeMatchingPairs(savedAnswer?.matchingPairs);
    const selectedAnswerIds = Array.isArray(savedAnswer?.selectedAnswerIds)
      ? savedAnswer.selectedAnswerIds.filter(answerId => answerId != null)
      : [];
    const textAnswer = typeof savedAnswer?.textAnswer === 'string'
      ? savedAnswer.textAnswer
      : '';

    if (matchingPairs.length > 0) {
      result[savedAnswer.questionId] = { matchingPairs };
    } else if (selectedAnswerIds.length > 0) {
      result[savedAnswer.questionId] = selectedAnswerIds;
    } else if (textAnswer.trim()) {
      result[savedAnswer.questionId] = textAnswer;
    }

    return result;
  }, {});
}

export function getFirstIncompleteQuestionIndex(questions = [], savedAnswers = []) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 0;
  }

  const answeredQuestionIds = new Set(
    (savedAnswers || [])
      .filter((savedAnswer) => hasAnswerValue({
        selectedAnswerIds: savedAnswer?.selectedAnswerIds,
        textAnswer: savedAnswer?.textAnswer,
        matchingPairs: savedAnswer?.matchingPairs,
      }))
      .map((savedAnswer) => Number(savedAnswer?.questionId))
      .filter((questionId) => Number.isFinite(questionId)),
  );

  const firstIncompleteIndex = questions.findIndex((question) => !answeredQuestionIds.has(Number(question?.id)));
  return firstIncompleteIndex === -1 ? Math.max(questions.length - 1, 0) : firstIncompleteIndex;
}

export function hasAnswerValue(answerValue) {
  if (Array.isArray(answerValue)) {
    return answerValue.length > 0;
  }

  if (typeof answerValue === 'string') {
    return answerValue.trim().length > 0;
  }

  if (answerValue && typeof answerValue === 'object') {
    return hasAnswerValue(answerValue.selectedAnswerIds)
      || hasAnswerValue(answerValue.textAnswer)
      || hasAnswerValue(answerValue.matchingPairs);
  }

  return false;
}

export function getCorrectTextAnswer(question) {
  return question?.answers?.find(answer => answer.isCorrect)?.content || '';
}

export function getCorrectTextAnswers(question) {
  const answers = Array.isArray(question?.answers) ? question.answers : [];
  const correctAnswers = answers
    .filter(answer => answer?.isCorrect)
    .map(answer => (typeof answer?.content === 'string' ? answer.content.trim() : ''))
    .filter(Boolean);

  if (correctAnswers.length > 0) {
    return correctAnswers;
  }

  return answers
    .map(answer => (typeof answer?.content === 'string' ? answer.content.trim() : ''))
    .filter(Boolean);
}

export function getAttemptRemainingSeconds(timeoutAt, fallbackSeconds = 0) {
  if (!timeoutAt) {
    return Math.max(0, fallbackSeconds);
  }

  const timeoutTime = new Date(timeoutAt).getTime();
  if (Number.isNaN(timeoutTime)) {
    return Math.max(0, fallbackSeconds);
  }

  return Math.max(0, Math.ceil((timeoutTime - Date.now()) / 1000));
}

/**
 * Transform local answers map { questionId: [answerId, ...] }
 * → API request format for saveAnswer endpoint
 */
export function buildSavePayload(answers) {
  return Object.entries(answers)
    .reduce((payload, [questionId, answerValue]) => {
      const normalizedQuestionId = Number(questionId);
      if (!Number.isFinite(normalizedQuestionId)) {
        return payload;
      }

      // Keep empty answers in the payload so the backend can clear previously saved data.
      payload.push(buildAttemptAnswerPayload(normalizedQuestionId, answerValue));

      return payload;
    }, []);
}

/**
 * Build submit payload that includes all quiz questions.
 * Unanswered questions are still sent with empty selectedAnswerIds and null textAnswer.
 */
export function buildSubmitPayload(questions = [], answers = {}) {
  return (questions || []).map((question) => {
    const questionId = Number(question?.id);
    const answerValue = answers?.[question?.id];
    return buildAttemptAnswerPayload(questionId, answerValue, question?.type);
  }).filter(item => Number.isFinite(item.questionId));
}

export function buildSingleQuestionPayload(questionOrId, answerValue) {
  const normalizedQuestionId = Number(
    typeof questionOrId === 'object' && questionOrId !== null
      ? questionOrId.id
      : questionOrId,
  );
  if (!Number.isFinite(normalizedQuestionId)) {
    return null;
  }

  const questionType = typeof questionOrId === 'object' && questionOrId !== null
    ? questionOrId.type
    : null;

  return buildAttemptAnswerPayload(normalizedQuestionId, answerValue, questionType);
}
