import React, { useEffect, useMemo, useState } from 'react';
import { Users, BarChart3, Brain, Trophy, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { getMockTestCohortStats } from '@/api/QuizAPI';

const BLOOM_LABELS = {
  REMEMBER: 'Nhớ',
  UNDERSTAND: 'Hiểu',
  APPLY: 'Vận dụng',
  ANALYZE: 'Phân tích',
  EVALUATE: 'Đánh giá',
  CREATE: 'Sáng tạo',
};

function normalizeBloom(raw) {
  if (!raw && raw !== 0) return 'UNKNOWN';
  const key = String(raw).toUpperCase();
  if (BLOOM_LABELS[key]) return key;
  if (raw === 1 || raw === '1') return 'REMEMBER';
  if (raw === 2 || raw === '2') return 'UNDERSTAND';
  if (raw === 3 || raw === '3') return 'APPLY';
  if (raw === 4 || raw === '4') return 'ANALYZE';
  if (raw === 5 || raw === '5') return 'EVALUATE';
  if (raw === 6 || raw === '6') return 'CREATE';
  return 'UNKNOWN';
}

/**
 * Walk quiz sections tree → trả về Map<questionId, { sectionName, bloomKey }>.
 * quizDetails là normalized shape từ `normalizeQuizData`.
 * Fallback: nếu không có quizRaw → chỉ có bloom từ attemptQuestion.
 */
function buildQuestionMetaMap(quizRaw) {
  const map = new Map();
  if (!quizRaw || !Array.isArray(quizRaw.sections)) return map;

  function walkSection(section, inheritedName) {
    const sectionName = section.content || section.sectionContent || section.name || inheritedName || 'Section';
    (section.questions || []).forEach((q) => {
      if (q?.questionId == null) return;
      map.set(q.questionId, {
        sectionName,
        bloomKey: normalizeBloom(q.bloomId ?? q.bloom),
      });
    });
    (section.children || section.subSections || []).forEach((child) => walkSection(child, sectionName));
  }

  quizRaw.sections.forEach((section) => walkSection(section, null));
  return map;
}

function aggregateBySection(reviewQuestions, metaMap) {
  const byName = new Map();
  reviewQuestions.forEach((q) => {
    const meta = metaMap.get(q.id);
    const name = meta?.sectionName || 'Không rõ';
    const bucket = byName.get(name) || { name, total: 0, correct: 0, pending: 0 };
    bucket.total += 1;
    if (q.isCorrect === true) bucket.correct += 1;
    else if (q.isCorrect == null) bucket.pending += 1;
    byName.set(name, bucket);
  });
  return Array.from(byName.values()).map((b) => ({
    ...b,
    accuracy: b.total > 0 ? (b.correct * 100) / b.total : 0,
  }));
}

function aggregateByBloom(reviewQuestions, metaMap) {
  const byKey = new Map();
  reviewQuestions.forEach((q) => {
    const meta = metaMap.get(q.id);
    const key = meta?.bloomKey || 'UNKNOWN';
    const bucket = byKey.get(key) || { key, total: 0, correct: 0 };
    bucket.total += 1;
    if (q.isCorrect === true) bucket.correct += 1;
    byKey.set(key, bucket);
  });
  return Array.from(byKey.values()).map((b) => ({
    ...b,
    label: BLOOM_LABELS[b.key] || b.key,
    accuracy: b.total > 0 ? (b.correct * 100) / b.total : 0,
  }));
}

function SectionBreakdownPanel({ entries }) {
  if (!entries || entries.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-semibold">Phân tích theo phần</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-medium">{entry.name}</span>
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
              <p className="text-[10px] text-amber-600">{entry.pending} câu đang chờ chấm</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BloomBreakdownPanel({ entries }) {
  if (!entries || entries.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold">Phân tích theo kỹ năng Bloom</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{entry.label}</span>
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
}


function CohortPanel({ stats, reviewQuestions }) {
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
          <span className="text-sm font-semibold">So với cả lớp</span>
          <Badge className="ml-auto bg-indigo-100 text-indigo-800">{stats.totalAttempts} attempt</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[11px] text-muted-foreground">Điểm TB lớp</p>
            <p className="text-base font-bold">{stats.classAverageAccuracy?.toFixed(1) ?? '-'}%</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Của bạn</p>
            <p className="text-base font-bold text-indigo-600">
              {stats.callerAccuracy != null ? `${stats.callerAccuracy.toFixed(1)}%` : '-'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Xếp hạng</p>
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
              <span>Câu cả lớp sai nhiều</span>
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
                      Câu {pos ?? `#${item.questionId}`}
                    </span>
                    <span className="text-red-600">
                      {item.errorRatePercent?.toFixed(0)}% sai ({item.wrongCount}/{item.totalAttempted})
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
export function MockTestReviewExtensions({ result, quizRaw, reviewQuestions, quizId }) {
  const [cohortStats, setCohortStats] = useState(null);
  const [cohortError, setCohortError] = useState(null);

  const metaMap = useMemo(() => buildQuestionMetaMap(quizRaw), [quizRaw]);
  const sectionEntries = useMemo(
    () => aggregateBySection(reviewQuestions || [], metaMap),
    [reviewQuestions, metaMap],
  );
  const bloomEntries = useMemo(
    () => aggregateByBloom(reviewQuestions || [], metaMap),
    [reviewQuestions, metaMap],
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
          setCohortError(e?.message || 'Không tải được thống kê cohort');
        }
        setCohortStats(null);
      }
    })();
    return () => { cancelled = true; };
  }, [quizId]);

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
