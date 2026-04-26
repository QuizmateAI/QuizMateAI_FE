import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, BarChart3, Brain, Trophy, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getMockTestCohortStats } from '@/api/QuizAPI';

const BLOOM_LABEL_KEY_BY_NORMALIZED = {
  REMEMBER: 'bloomRemember',
  UNDERSTAND: 'bloomUnderstand',
  APPLY: 'bloomApply',
  ANALYZE: 'bloomAnalyze',
  EVALUATE: 'bloomEvaluate',
};

const BLOOM_LABEL_KEY_BY_ID = {
  1: 'bloomRemember',
  2: 'bloomUnderstand',
  3: 'bloomApply',
  4: 'bloomAnalyze',
  5: 'bloomEvaluate',
};

function normalizeNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeBloomLabelKey(entry) {
  const bloomId = Number(entry?.bloomId);
  if (Number.isInteger(bloomId) && BLOOM_LABEL_KEY_BY_ID[bloomId]) {
    return BLOOM_LABEL_KEY_BY_ID[bloomId];
  }

  const raw = String(entry?.bloomName || entry?.label || entry?.key || '').trim().toUpperCase();
  return BLOOM_LABEL_KEY_BY_NORMALIZED[raw] || null;
}

function normalizeSectionStatEntries(sectionStats) {
  if (!Array.isArray(sectionStats)) return [];
  return sectionStats
    .map((entry, index) => ({
      key: entry.sectionId ?? `${entry.sectionName || 'section'}-${index}`,
      name: entry.sectionName || entry.name || '',
      total: normalizeNumber(entry.totalQuestion ?? entry.total),
      correct: normalizeNumber(entry.correctQuestion ?? entry.correct),
      pending: normalizeNumber(entry.pendingQuestion ?? entry.pending),
      failed: normalizeNumber(entry.failedQuestion ?? entry.failed),
      accuracy: normalizeNumber(entry.accuracyPercent ?? entry.accuracy),
      orderIndex: normalizeNumber(entry.orderIndex, index),
    }))
    .filter((entry) => entry.total > 0);
}

function normalizeBloomStatEntries(bloomStats) {
  if (!Array.isArray(bloomStats)) return [];
  return bloomStats
    .map((entry, index) => ({
      key: entry.bloomId ?? `${entry.bloomName || 'bloom'}-${index}`,
      label: entry.bloomName || entry.label || '',
      labelKey: normalizeBloomLabelKey(entry),
      total: normalizeNumber(entry.totalQuestion ?? entry.total),
      correct: normalizeNumber(entry.correctQuestion ?? entry.correct),
      pending: normalizeNumber(entry.pendingQuestion ?? entry.pending),
      failed: normalizeNumber(entry.failedQuestion ?? entry.failed),
      accuracy: normalizeNumber(entry.accuracyPercent ?? entry.accuracy),
    }))
    .filter((entry) => entry.total > 0);
}

function SectionBreakdownPanel({ entries }) {
  const { t } = useTranslation();
  if (!entries || entries.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-semibold">
            {t('mockTestForms.reviewExtensions.sectionTitle', 'Section analysis')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.key ?? entry.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-medium">
                {entry.name || t('mockTestForms.reviewExtensions.unknownSection', 'Unknown section')}
              </span>
              <span className="text-muted-foreground">
                {entry.correct}/{entry.total} ({entry.accuracy.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-purple-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, entry.accuracy)).toFixed(1)}%` }}
              />
            </div>
            {entry.pending > 0 && (
              <p className="text-[10px] text-amber-600">
                {t('mockTestForms.reviewExtensions.pendingQuestions', '{{count}} pending questions', { count: entry.pending })}
              </p>
            )}
            {entry.failed > 0 && (
              <p className="text-[10px] text-red-500">
                {t('mockTestForms.reviewExtensions.failedQuestions', '{{count}} questions failed grading', { count: entry.failed })}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BloomBreakdownPanel({ entries }) {
  const { t } = useTranslation();
  if (!entries || entries.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold">
            {t('mockTestForms.reviewExtensions.bloomTitle', 'Bloom skill analysis')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                {entry.labelKey
                  ? t(`mockTestForms.common.${entry.labelKey}`, entry.label || entry.labelKey)
                  : entry.label || t('mockTestForms.reviewExtensions.unknownBloom', 'Unknown Bloom level')}
              </span>
              <span className="text-muted-foreground">
                {entry.correct}/{entry.total} ({entry.accuracy.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, entry.accuracy)).toFixed(1)}%` }}
              />
            </div>
            {entry.pending > 0 && (
              <p className="text-[10px] text-amber-600">
                {t('mockTestForms.reviewExtensions.pendingQuestions', '{{count}} pending questions', { count: entry.pending })}
              </p>
            )}
            {entry.failed > 0 && (
              <p className="text-[10px] text-red-500">
                {t('mockTestForms.reviewExtensions.failedQuestions', '{{count}} questions failed grading', { count: entry.failed })}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}


function CohortPanel({ stats, reviewQuestions }) {
  const { t } = useTranslation();
  if (!stats) return null;
  const isGroup = stats.workspaceKind === 'GROUP' && (stats.totalAttempts || 0) > 0;
  if (!isGroup) return null;

  const topWrong = (stats.questionErrorRates || []).slice(0, 3);
  const questionPos = new Map((reviewQuestions || []).map((q, idx) => [q.id, idx + 1]));

  return (
    <Card className="border-indigo-200 bg-indigo-50/40 dark:border-indigo-900/40 dark:bg-indigo-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold">
            {t('mockTestForms.reviewExtensions.cohortTitle', 'Compared with the class')}
          </span>
          <Badge className="ml-auto bg-indigo-100 text-indigo-800">
            {t('mockTestForms.reviewExtensions.attemptCount', '{{count}} attempts', { count: stats.totalAttempts })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[11px] text-muted-foreground">
              {t('mockTestForms.reviewExtensions.classAverage', 'Class average')}
            </p>
            <p className="text-base font-bold">{stats.classAverageAccuracy?.toFixed(1) ?? '-'}%</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">
              {t('mockTestForms.reviewExtensions.yourScore', 'You')}
            </p>
            <p className="text-base font-bold text-indigo-600">
              {stats.callerAccuracy != null ? `${stats.callerAccuracy.toFixed(1)}%` : '-'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">
              {t('mockTestForms.reviewExtensions.rank', 'Rank')}
            </p>
            <p className="text-base font-bold">
              {stats.callerRank != null ? (
                <span className="flex items-center justify-center gap-1">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  {stats.callerRank}/{stats.totalAttempts}
                </span>
              ) : '-'}
            </p>
          </div>
        </div>

        {topWrong.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1 text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <span>{t('mockTestForms.reviewExtensions.topWrongTitle', 'Questions most missed by the class')}</span>
            </div>
            <div className="space-y-1">
              {topWrong.map((item) => {
                const pos = questionPos.get(item.questionId);
                return (
                  <div
                    key={item.questionId}
                    className="flex items-center justify-between rounded-md bg-white px-3 py-1.5 text-xs dark:bg-slate-900/40"
                  >
                    <span className="font-medium">
                      {t('mockTestForms.reviewExtensions.questionShort', 'Question')} {pos ?? `#${item.questionId}`}
                    </span>
                    <span className="text-red-600">
                      {t('mockTestForms.reviewExtensions.wrongSummary', '{{percent}}% wrong ({{wrong}}/{{total}})', {
                        percent: item.errorRatePercent?.toFixed(0),
                        wrong: item.wrongCount,
                        total: item.totalAttempted,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Extensions cho QuizResultPage khi quiz là MOCK_TEST.
 * Fetch cohort stats (nếu group), render 3-4 panel breakdown.
 *
 * Props:
 * - result: QuizAttemptResultResponse (đã fetch ở QuizResultPage)
 * - quizRaw: response từ getQuizFullForAttempt (sections tree chưa normalize)
 * - reviewQuestions: mảng review item đã build trong QuizResultPage
 * - quizId
 */
export function MockTestReviewExtensions({ result, reviewQuestions, quizId }) {
  const { t } = useTranslation();
  const [cohortStats, setCohortStats] = useState(null);
  const [cohortError, setCohortError] = useState(null);

  const sectionEntries = useMemo(
    () => normalizeSectionStatEntries(result?.sectionStats),
    [result?.sectionStats],
  );
  const bloomEntries = useMemo(
    () => normalizeBloomStatEntries(result?.bloomStats),
    [result?.bloomStats],
  );

  useEffect(() => {
    if (!quizId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await getMockTestCohortStats(quizId);
        if (cancelled) return;
        setCohortStats(res?.data || null);
        setCohortError(null);
      } catch (e) {
        if (cancelled) return;
        // 403 = user chưa có attempt hoặc không thuộc group. Không phải lỗi hiển thị.
        const code = Number(e?.statusCode);
        if (code !== 403 && code !== 409) {
          setCohortError(e?.message || t('mockTestForms.reviewExtensions.cohortLoadFailed', 'Could not load class statistics'));
        }
        setCohortStats(null);
      }
    })();
    return () => { cancelled = true; };
  }, [quizId, t]);

  if (!result || !reviewQuestions || reviewQuestions.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionBreakdownPanel entries={sectionEntries} />
        <BloomBreakdownPanel entries={bloomEntries} />
      </div>
      <CohortPanel stats={cohortStats} reviewQuestions={reviewQuestions} />
      {cohortError && (
        <p className="text-xs text-red-500">{cohortError}</p>
      )}
    </div>
  );
}
