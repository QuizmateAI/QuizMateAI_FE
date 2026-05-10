export const MIN_QUIZ_ATTEMPTS_FOR_INSIGHT = 2;

export const DIFFICULTY_KEYS = ["EASY", "MEDIUM", "HARD", "CUSTOM", "UNSPECIFIED"];

// Canonical Bloom's revised taxonomy, low → high cognitive level.
export const BLOOM_ORDER = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"];

export const BLOOM_COLORS = {
  REMEMBER: { main: "#6366f1" },
  UNDERSTAND: { main: "#06b6d4" },
  APPLY: { main: "#22c55e" },
  ANALYZE: { main: "#f59e0b" },
  EVALUATE: { main: "#ef4444" },
  CREATE: { main: "#a855f7" },
};

export function pct(value, total) {
  if (!total || total <= 0) return 0;
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  const ratio = (safe / total) * 100;
  return Math.max(0, Math.min(100, Math.round(ratio)));
}

export function fmtAccuracy(accuracy) {
  const numeric = Number(accuracy);
  if (accuracy == null || !Number.isFinite(numeric)) return "0%";
  const clamped = Math.max(0, Math.min(1, numeric));
  return `${Math.round(clamped * 100)}%`;
}

export function fmtNumber(value) {
  return Number(value ?? 0).toLocaleString();
}

export function fmtScore(value) {
  if (value == null || Number.isNaN(Number(value))) return "0";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

export function fmtSeconds(value, t) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return t("workspace.questionStats.noDuration");
  }

  const totalSeconds = Math.max(1, Math.round(numeric));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function fmtDateTime(value, locale = "vi-VN") {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getRenderableBloomBuckets(buckets = []) {
  const available = (buckets || []).filter(
    (bucket) => String(bucket?.label || "").toUpperCase() !== "UNSPECIFIED",
  );
  const bucketMap = Object.fromEntries(
    available.map((bucket) => [String(bucket?.label || "").toUpperCase(), bucket]),
  );
  const ordered = BLOOM_ORDER.map((key) => bucketMap[key]).filter(Boolean);
  // Forward-compat: keep any bucket the backend returned but BLOOM_ORDER doesn't yet know about.
  const seen = new Set(ordered.map((bucket) => String(bucket?.label || "").toUpperCase()));
  available.forEach((bucket) => {
    const key = String(bucket?.label || "").toUpperCase();
    if (!seen.has(key)) {
      ordered.push(bucket);
      seen.add(key);
    }
  });
  return ordered;
}

export function getQuestionBucketAttemptCount(bucket) {
  return Number(bucket?.attemptedQuestionsInMode ?? bucket?.gradedQuestionsInMode ?? 0);
}

export function getQuestionBucketAccuracy(bucket) {
  return Number(bucket?.accuracyInMode ?? 0);
}

export function pickQuestionInsightBucket(buckets = [], type = "best") {
  const candidates = (buckets || []).filter(
    (bucket) => getQuestionBucketAttemptCount(bucket) > 0,
  );
  if (candidates.length === 0) return null;
  // Need ≥2 buckets to differentiate strongest vs weakest; otherwise insight is meaningless.
  if (type === "worst" && candidates.length < 2) return null;

  const sorted = [...candidates].sort((left, right) => {
    const accuracyDiff = getQuestionBucketAccuracy(right) - getQuestionBucketAccuracy(left);
    if (Math.abs(accuracyDiff) > 0.0001) return accuracyDiff;
    return getQuestionBucketAttemptCount(right) - getQuestionBucketAttemptCount(left);
  });

  return type === "worst" ? sorted[sorted.length - 1] : sorted[0];
}

export function pickQuizInsightItem(items = [], type = "best") {
  // Require minimum attempts so a single lucky/unlucky run doesn't dominate the insight.
  const candidates = (items || []).filter(
    (item) => Number(item?.totalAttempts || 0) >= MIN_QUIZ_ATTEMPTS_FOR_INSIGHT,
  );
  if (candidates.length === 0) return null;
  if (type === "worst" && candidates.length < 2) return null;

  const sorted = [...candidates].sort((left, right) => {
    const accuracyDiff = Number(right?.averageAccuracy ?? 0) - Number(left?.averageAccuracy ?? 0);
    if (Math.abs(accuracyDiff) > 0.0001) return accuracyDiff;
    const scoreDiff = Number(right?.averageScore ?? 0) - Number(left?.averageScore ?? 0);
    if (Math.abs(scoreDiff) > 0.0001) return scoreDiff;
    return Number(right?.totalAttempts ?? 0) - Number(left?.totalAttempts ?? 0);
  });

  return type === "worst" ? sorted[sorted.length - 1] : sorted[0];
}

export function hasQuestionStatsData(stats) {
  if (!stats) return false;

  const current = stats.currentQuestionStats;
  const lifetime = stats.lifetimeQuestionAttemptStats;

  const attemptedQuestions = Number(current?.attemptedQuestionsInMode || 0);
  const gradedQuestions = Number(current?.gradedQuestionsInMode || 0);
  const totalQuestionAttempts = Number(
    lifetime?.totalQuestionAttempts ?? lifetime?.totalAttempts ?? 0,
  );

  return attemptedQuestions > 0 || gradedQuestions > 0 || totalQuestionAttempts > 0;
}

export function hasQuizStatsData(stats) {
  if (!stats) return false;

  const current = stats.currentQuizStats;
  const lifetime = stats.lifetimeQuizAttemptStats;

  const attemptedQuizzes = Number(current?.attemptedQuizzesInMode || 0);
  const totalQuizAttempts = Number(lifetime?.totalQuizAttempts || 0);

  return attemptedQuizzes > 0 || totalQuizAttempts > 0;
}
