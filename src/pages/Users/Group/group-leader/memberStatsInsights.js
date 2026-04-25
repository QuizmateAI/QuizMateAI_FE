const isBlank = (value) => value === undefined || value === null || value === '';

const uniqueStrings = (values = []) => {
  const seen = new Set();
  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const toStringList = (value) => {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(value);
};

const pickFirst = (...values) => {
  for (const value of values) {
    if (!isBlank(value)) return value;
  }
  return null;
};

const pickNumber = (...values) => {
  for (const value of values) {
    if (isBlank(value)) continue;
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return null;
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function resolveWorkspaceMemberId(member = {}) {
  const id = Number(
    member?.workspaceMemberId
    ?? member?.groupMemberId
    ?? member?.memberId
    ?? member?.id
    ?? 0,
  );
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function resolveUserId(member = {}) {
  const id = Number(
    member?.userId
    ?? member?.memberUserId
    ?? member?.user?.id
    ?? member?.user?.userId
    ?? 0,
  );
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function normalizeRateValue(value) {
  const numeric = pickNumber(value);
  if (numeric == null) return null;
  if (numeric < 0) return null;
  if (numeric > 1) return numeric / 100;
  return numeric;
}

export function normalizeScoreRatio(value) {
  const numeric = pickNumber(value);
  if (numeric == null) return null;
  if (numeric <= 1) return Math.max(0, Math.min(1, numeric));
  if (numeric <= 10) return Math.max(0, Math.min(1, numeric / 10));
  return Math.max(0, Math.min(1, numeric / 100));
}

export function normalizeLearningSnapshotRow(base = {}, detail = null) {
  const source = detail && typeof detail === 'object'
    ? { ...base, ...detail }
    : { ...base };

  const attempts = pickNumber(
    source.totalQuizAttempts,
    source.quizAttemptCount,
    source.totalAttempts,
    source.attemptCount,
    source.attempts,
  ) ?? 0;

  const passed = pickNumber(
    source.totalQuizPassed,
    source.quizCompletedCount,
    source.quizPassedCount,
    source.passedCount,
    source.completedCount,
    source.totalCompleted,
  ) ?? 0;

  const totalMinutesSpent = pickNumber(
    source.totalMinutesSpent,
    source.minutesSpent,
    source.totalStudyMinutes,
    source.studyMinutes,
  ) ?? 0;

  const averageScore = pickNumber(
    source.averageScore,
    source.avgScore,
    source.averageQuizScore,
    source.scoreAverage,
    source.meanScore,
  );

  const avgTimePerQuiz = pickNumber(
    source.avgTimePerQuiz,
    source.averageTimePerQuiz,
    source.meanQuizDuration,
  ) ?? (attempts > 0 && totalMinutesSpent > 0 ? totalMinutesSpent / attempts : null);

  return {
    ...source,
    workspaceMemberId: resolveWorkspaceMemberId(source),
    userId: resolveUserId(source),
    totalQuizAttempts: attempts,
    totalQuizPassed: passed,
    averageScore,
    highestScore: pickNumber(source.highestScore, source.maxScore),
    lowestScore: pickNumber(source.lowestScore, source.minScore),
    totalMinutesSpent,
    avgTimePerQuiz,
    flashcardsReviewed: pickNumber(source.flashcardsReviewed, source.reviewedFlashcards) ?? 0,
    flashcardMasteryRate: normalizeRateValue(source.flashcardMasteryRate),
    passRate: normalizeRateValue(
      pickFirst(
        source.passRate,
        source.quizPassRate,
        source.passedRate,
        source.pass_percentage,
      ),
    ),
    accuracy: normalizeRateValue(
      pickFirst(
        source.accuracy,
        source.averageAccuracy,
        source.accuracyRate,
      ),
    ),
    weakTopics: toStringList(source.weakTopics),
    strongTopics: toStringList(source.strongTopics),
    weakAreas: toStringList(source.weakAreas),
    strongAreas: toStringList(source.strongAreas),
    aiClassification: pickFirst(
      source.aiClassification,
      source.aiClass,
      source.classification,
    ),
    aiSummary: pickFirst(source.aiSummary, source.summary),
    snapshotDate: pickFirst(
      source.snapshotDate,
      source.generatedAt,
      source.createdAt,
      source.snapshotCreatedAt,
    ),
    joinedAt: pickFirst(source.joinedAt, source.memberJoinedAt),
    latestActivityAt: pickFirst(source.latestActivityAt, source.lastActiveAt, source.lastActivityAt),
  };
}

const passRateFromSnapshot = (snapshot) => {
  const explicit = normalizeRateValue(pickFirst(snapshot?.passRate, snapshot?.accuracy));
  if (explicit != null) return explicit;
  const attempts = Number(snapshot?.totalQuizAttempts ?? 0);
  const passed = Number(snapshot?.totalQuizPassed ?? 0);
  return attempts > 0 ? Math.max(0, Math.min(1, passed / attempts)) : null;
};

const mergeFocus = (memberSnapshot, detailSnapshot, memberKey, detailKey) => uniqueStrings([
  ...toStringList(memberSnapshot?.[memberKey]),
  ...toStringList(detailSnapshot?.[detailKey]),
]);

export function buildTrendMeta(trendSource) {
  const rawPoints = Array.isArray(trendSource?.points)
    ? trendSource.points
    : Array.isArray(trendSource)
      ? trendSource
      : [];

  const points = rawPoints
    .map((point) => normalizeLearningSnapshotRow(point))
    .sort((left, right) => {
      const leftDate = toDate(left?.snapshotDate)?.getTime() ?? 0;
      const rightDate = toDate(right?.snapshotDate)?.getTime() ?? 0;
      return leftDate - rightDate;
    });

  const scoreSeries = points
    .map((point) => normalizeScoreRatio(point?.averageScore))
    .filter((value) => value != null);

  const passSeries = points
    .map((point) => passRateFromSnapshot(point))
    .filter((value) => value != null);

  const firstScore = scoreSeries.length > 0 ? scoreSeries[0] : null;
  const lastScore = scoreSeries.length > 0 ? scoreSeries[scoreSeries.length - 1] : null;
  const firstPassRate = passSeries.length > 0 ? passSeries[0] : null;
  const lastPassRate = passSeries.length > 0 ? passSeries[passSeries.length - 1] : null;

  const scoreDelta = firstScore != null && lastScore != null ? lastScore - firstScore : null;
  const passRateDelta = firstPassRate != null && lastPassRate != null ? lastPassRate - firstPassRate : null;
  const activeDays = points.filter((point) => (
    Number(point?.totalQuizAttempts ?? 0) > 0
    || Number(point?.totalMinutesSpent ?? 0) > 0
  )).length;

  let direction = 'unknown';
  if (scoreDelta != null) {
    if (scoreDelta >= 0.05) direction = 'up';
    else if (scoreDelta <= -0.05) direction = 'down';
    else direction = 'flat';
  }

  return {
    points,
    activeDays,
    scoreDelta,
    passRateDelta,
    direction,
  };
}

export function buildMemberIntelligence(member = {}, detail = null, trendSource = null) {
  const snapshot = normalizeLearningSnapshotRow(member, detail);
  const trend = buildTrendMeta(trendSource);
  const weakFocus = mergeFocus(snapshot, detail, 'weakTopics', 'weakAreas');
  const strongFocus = mergeFocus(snapshot, detail, 'strongTopics', 'strongAreas');
  const attempts = Number(snapshot?.totalQuizAttempts ?? 0);
  const totalMinutesSpent = Number(snapshot?.totalMinutesSpent ?? 0);
  const scoreRatio = normalizeScoreRatio(snapshot?.averageScore);
  const passRate = passRateFromSnapshot(snapshot);
  const avgTimePerQuiz = pickNumber(snapshot?.avgTimePerQuiz) ?? (attempts > 0 && totalMinutesSpent > 0
    ? totalMinutesSpent / attempts
    : null);

  const activityRatio = attempts > 0
    ? Math.min(1, ((Math.min(1, attempts / 6) * 0.45) + (Math.min(1, (trend.activeDays || 0) / 4) * 0.55)))
    : 0;
  const baseHealth = ((scoreRatio ?? 0.35) * 45) + ((passRate ?? 0.35) * 35) + (activityRatio * 20);
  const trendBoost = trend.direction === 'up' ? 8 : trend.direction === 'down' ? -10 : 0;

  let healthScore = Math.round(Math.max(8, Math.min(96, baseHealth + trendBoost)));
  let healthTone = 'stable';
  if (attempts <= 0) {
    healthTone = 'new';
    healthScore = 18;
  } else if (healthScore >= 80) {
    healthTone = 'strong';
  } else if (healthScore >= 60) {
    healthTone = 'stable';
  } else if (healthScore >= 40) {
    healthTone = 'watch';
  } else {
    healthTone = 'risk';
  }

  let cadenceCode = 'balanced';
  if (attempts <= 0) cadenceCode = 'not_started';
  else if (avgTimePerQuiz != null && avgTimePerQuiz < 4 && (passRate ?? 1) < 0.65) cadenceCode = 'rushed';
  else if ((trend.activeDays || 0) >= 4) cadenceCode = 'consistent';
  else if ((trend.activeDays || 0) <= 1 && attempts > 1) cadenceCode = 'sporadic';
  else if (totalMinutesSpent >= 180) cadenceCode = 'deep';

  const reasonCodes = [];
  if (attempts <= 0) reasonCodes.push('no_attempts');
  if (scoreRatio != null && scoreRatio < 0.55) reasonCodes.push('low_score');
  if (passRate != null && passRate < 0.55) reasonCodes.push('low_pass_rate');
  if (trend.direction === 'down') reasonCodes.push('declining_trend');
  if (weakFocus.length > 0) reasonCodes.push('weak_topics');
  if (avgTimePerQuiz != null && avgTimePerQuiz < 4 && (scoreRatio ?? 1) < 0.65) reasonCodes.push('rushed_attempts');
  if (attempts > 0 && totalMinutesSpent > 0 && totalMinutesSpent < 60) reasonCodes.push('low_study_time');
  if ((trend.activeDays || 0) <= 1 && attempts > 1) reasonCodes.push('sporadic');
  if (reasonCodes.length === 0 && trend.direction === 'up') reasonCodes.push('improving');
  if (reasonCodes.length === 0) reasonCodes.push('steady_progress');

  const recommendationCodes = [];
  if (attempts <= 0) {
    recommendationCodes.push('assign_baseline', 'refresh_snapshot');
  } else {
    if (healthTone === 'risk' || trend.direction === 'down') recommendationCodes.push('schedule_followup');
    if (weakFocus.length > 0) recommendationCodes.push('focus_weak_topics');
    if (scoreRatio != null && scoreRatio < 0.55) recommendationCodes.push('practice_foundation');
    if (passRate != null && passRate < 0.55) recommendationCodes.push('practice_foundation');
    if (avgTimePerQuiz != null && avgTimePerQuiz < 4 && (scoreRatio ?? 1) < 0.65) recommendationCodes.push('slow_down_review');
    if (totalMinutesSpent < 60 || cadenceCode === 'sporadic') recommendationCodes.push('increase_study_time');
    if (trend.direction === 'up' && ['stable', 'strong'].includes(healthTone)) recommendationCodes.push('unlock_harder_quiz');
    if (recommendationCodes.length === 0) recommendationCodes.push('keep_momentum');
  }

  return {
    attempts,
    totalMinutesSpent,
    avgTimePerQuiz,
    scoreRatio,
    passRate,
    activityRatio,
    baseHealth: Math.round(baseHealth * 100) / 100,
    trendBoost,
    weakFocus,
    strongFocus,
    trend,
    cadenceCode,
    healthTone,
    healthScore,
    reasonCodes: uniqueStrings(reasonCodes),
    recommendationCodes: uniqueStrings(recommendationCodes).slice(0, 3),
  };
}
