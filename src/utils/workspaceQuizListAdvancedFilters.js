import { getDurationInMinutes } from "@/lib/quizDurationDisplay";

export const WORKSPACE_QUIZ_ADV_FILTER_ATTEMPT = {
  ANY: "ANY",
  ATTEMPTED: "ATTEMPTED",
  NOT_ATTEMPTED: "NOT_ATTEMPTED",
};

export const WORKSPACE_QUIZ_ADV_FILTER_TIMER = {
  ANY: "ANY",
  TOTAL: "TOTAL",
  PER_QUESTION: "PER_QUESTION",
};

export const WORKSPACE_QUIZ_ADV_BLOOM_SKILLS = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE"];

export function createDefaultWorkspaceQuizAdvFilters() {
  return {
    questionMin: "",
    questionMax: "",
    attempt: WORKSPACE_QUIZ_ADV_FILTER_ATTEMPT.ANY,
    difficulty: "ANY",
    bloomSkill: "ANY",
    durationMinMinutes: "",
    durationMaxMinutes: "",
    timerMode: WORKSPACE_QUIZ_ADV_FILTER_TIMER.ANY,
  };
}

export function normalizeWorkspaceQuizAdvFilters(filters) {
  const defaults = createDefaultWorkspaceQuizAdvFilters();
  if (!filters || typeof filters !== "object") return { ...defaults };
  const raw = /** @type {Record<string, unknown>} */ (filters);
  const { intentPurpose: _legacyIntent, ...rest } = raw;
  const next = { ...defaults, ...rest };
  if (next.attempt === "PASSED" || next.attempt === "FAILED") {
    next.attempt = WORKSPACE_QUIZ_ADV_FILTER_ATTEMPT.ANY;
  }
  return next;
}

function parseBoundedNonNegInt(raw, bounds = {}) {
  const min = Number.isFinite(bounds.min) ? bounds.min : 0;
  const max = Number.isFinite(bounds.max) ? bounds.max : 1_000_000;
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isInteger(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function resolveBloomOnQuiz(quiz) {
  const direct = quiz?.primaryBloomSkill
    ?? quiz?.bloomSkill
    ?? quiz?.averageBloomSkill
    ?? quiz?.dominantBloomSkill;
  if (direct) return String(direct).trim().toUpperCase();
  const id = Number(quiz?.bloomId ?? quiz?.dominantBloomId);
  const MAP = {
    1: "REMEMBER",
    2: "UNDERSTAND",
    3: "APPLY",
    4: "ANALYZE",
    5: "EVALUATE",
  };
  if (MAP[id]) return MAP[id];
  return "";
}

export function countActiveWorkspaceQuizAdvFilters(filters) {
  const d = createDefaultWorkspaceQuizAdvFilters();
  if (!filters) return 0;
  const f = normalizeWorkspaceQuizAdvFilters(filters);
  let n = 0;
  if (String(f.questionMin ?? "").trim() !== "") n += 1;
  if (String(f.questionMax ?? "").trim() !== "") n += 1;
  if (f.attempt !== d.attempt) n += 1;
  if (f.difficulty !== d.difficulty) n += 1;
  if (f.bloomSkill !== d.bloomSkill) n += 1;
  if (String(f.durationMinMinutes ?? "").trim() !== "") n += 1;
  if (String(f.durationMaxMinutes ?? "").trim() !== "") n += 1;
  if (f.timerMode !== d.timerMode) n += 1;
  return n;
}

export function quizPassesWorkspaceQuizAdvFilters(quiz, filters) {
  const f = normalizeWorkspaceQuizAdvFilters(filters);

  const qc = Number(quiz?.questionCount ?? quiz?.totalQuestion ?? quiz?.totalQuestions ?? 0) || 0;
  const qMin = parseBoundedNonNegInt(f.questionMin, { min: 0, max: 50_000 });
  const qMax = parseBoundedNonNegInt(f.questionMax, { min: 0, max: 50_000 });
  if (qMin != null && qc < qMin) return false;
  if (qMax != null && qc > qMax) return false;

  const myAttempted = quiz?.myAttempted === true;
  switch (f.attempt) {
    case WORKSPACE_QUIZ_ADV_FILTER_ATTEMPT.ATTEMPTED:
      if (!myAttempted) return false;
      break;
    case WORKSPACE_QUIZ_ADV_FILTER_ATTEMPT.NOT_ATTEMPTED:
      if (myAttempted) return false;
      break;
    default:
      break;
  }

  if (f.difficulty !== "ANY") {
    const dKey = String(quiz?.overallDifficulty || "").trim().toUpperCase();
    if (dKey !== String(f.difficulty).trim().toUpperCase()) return false;
  }

  if (f.bloomSkill !== "ANY") {
    const bloom = resolveBloomOnQuiz(quiz);
    const want = String(f.bloomSkill).trim().toUpperCase();
    if (!bloom || bloom !== want) return false;
  }

  const dur = getDurationInMinutes(quiz);
  const dm = parseBoundedNonNegInt(f.durationMinMinutes, { min: 0, max: 24 * 60 });
  const dMax = parseBoundedNonNegInt(f.durationMaxMinutes, { min: 0, max: 24 * 60 });
  if (dm != null && (dur <= 0 || dur < dm)) return false;
  if (dMax != null && (dur <= 0 || dur > dMax)) return false;

  if (f.timerMode === WORKSPACE_QUIZ_ADV_FILTER_TIMER.TOTAL) {
    if (quiz?.timerMode !== true) return false;
  }
  if (f.timerMode === WORKSPACE_QUIZ_ADV_FILTER_TIMER.PER_QUESTION) {
    if (quiz?.timerMode !== false) return false;
  }

  return true;
}
