import React, { useMemo } from 'react';
import { Trophy, Layers, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import {
  applyPassingPercentChange,
  applyPassingScoreChange,
  applySectionPointChange,
  applyTotalPointsChange,
  countLeafQuestions,
  deriveSectionScoring,
  normalizeMockTestScoring,
} from '../utils/mockTestScoring';

/**
 * Hierarchical scoring editor:
 *   - Total points + passing score (absolute & %)
 *   - Per-section breakdown: leaf-count, points, %, per-question points, optional section pass
 *   - Linked logic: change total → re-distribute section points; change section → recompute total.
 */
export function MockTestScoringEditor({
  sections,
  scoring,
  onChange,
  isDarkMode = false,
}) {
  const { t } = useTranslation();
  const totalQuestions = useMemo(() => countLeafQuestions(sections), [sections]);
  const normalized = useMemo(
    () => normalizeMockTestScoring(scoring, totalQuestions),
    [scoring, totalQuestions],
  );
  const sectionBreakdown = useMemo(
    () => deriveSectionScoring(sections, normalized),
    [sections, normalized],
  );
  const passPercent = normalized.passingPercent || 0;
  const overallPerQuestion = totalQuestions > 0
    ? Math.round((normalized.totalPoints / totalQuestions) * 100) / 100
    : 0;

  const updateTotalPoints = (value) => {
    const next = applyTotalPointsChange(normalized, sections, value);
    onChange?.(next);
  };

  const updatePassingScore = (value) => {
    const next = applyPassingScoreChange(normalized, value);
    onChange?.(next);
  };

  const updatePassingPercent = (value) => {
    const next = applyPassingPercentChange(normalized, value);
    onChange?.(next);
  };

  const updateSectionPoints = (sectionIndex, value) => {
    const next = applySectionPointChange(normalized, sections, sectionIndex, value);
    onChange?.(next);
  };

  return (
    <div className={`rounded-lg border p-3 ${isDarkMode ? 'border-slate-700 bg-slate-900/40' : 'border-blue-100 bg-blue-50/60'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className={isDarkMode ? 'h-4 w-4 text-blue-300' : 'h-4 w-4 text-blue-700'} />
          <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {t('mockTestForms.scoring.title', 'Hệ thống điểm')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}>
            <Hash className="mr-1 h-3 w-3" />
            {totalQuestions} {t('mockTestForms.common.questionsShort', 'câu')}
          </Badge>
          <Badge className={isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}>
            {overallPerQuestion} {t('mockTestForms.scoring.pointsEach', 'đ/câu TB')}
          </Badge>
          <Badge className={isDarkMode ? 'bg-emerald-950 text-emerald-200' : 'bg-emerald-100 text-emerald-800'}>
            {passPercent}% {t('mockTestForms.scoring.toPass', 'để đạt')}
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <Label className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {t('mockTestForms.scoring.totalPoints', 'Tổng điểm bài')}
          </Label>
          <Input
            type="number"
            min={1}
            step="0.5"
            value={normalized.totalPoints}
            onChange={(event) => updateTotalPoints(event.target.value)}
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {t('mockTestForms.scoring.passingScore', 'Điểm pass (tuyệt đối)')}
          </Label>
          <Input
            type="number"
            min={0}
            max={normalized.totalPoints}
            step="0.5"
            value={normalized.passingScore}
            onChange={(event) => updatePassingScore(event.target.value)}
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {t('mockTestForms.scoring.passingPercent', 'Điểm pass (%)')}
          </Label>
          <Input
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={passPercent}
            onChange={(event) => updatePassingPercent(event.target.value)}
            className="mt-1 h-9"
          />
        </div>
      </div>

      {sectionBreakdown.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <Layers className={isDarkMode ? 'h-3.5 w-3.5 text-blue-300' : 'h-3.5 w-3.5 text-blue-700'} />
            <p className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              {t('mockTestForms.scoring.sectionBreakdown', 'Điểm từng phần')}
            </p>
          </div>
          <div className={`overflow-hidden rounded-md border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <table className="w-full text-xs">
              <thead className={isDarkMode ? 'bg-slate-800/70 text-slate-300' : 'bg-slate-100 text-slate-600'}>
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    {t('mockTestForms.scoring.colSection', 'Phần thi')}
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    {t('mockTestForms.scoring.colLeaf', 'Số câu')}
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    {t('mockTestForms.scoring.colPoints', 'Điểm phần')}
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    {t('mockTestForms.scoring.colPercent', '% bài')}
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    {t('mockTestForms.scoring.colPerQuestion', 'Điểm/câu')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sectionBreakdown.map((entry) => (
                  <tr
                    key={entry.sectionIndex}
                    className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}
                  >
                    <td className={`px-3 py-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                      <span className="font-medium">{entry.name || `Section ${entry.sectionIndex + 1}`}</span>
                    </td>
                    <td className={`px-2 py-2 text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {entry.leafCount}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        value={entry.points}
                        onChange={(event) => updateSectionPoints(entry.sectionIndex, event.target.value)}
                        className="ml-auto h-7 w-20 text-right text-xs"
                      />
                    </td>
                    <td className={`px-2 py-2 text-right font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      {entry.percent}%
                    </td>
                    <td className={`px-2 py-2 text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {entry.perQuestionPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={`border-t-2 ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-300 bg-slate-50'}`}>
                  <td className={`px-3 py-2 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {t('mockTestForms.scoring.totalRow', 'Tổng')}
                  </td>
                  <td className={`px-2 py-2 text-right font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    {totalQuestions}
                  </td>
                  <td className={`px-2 py-2 text-right font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {normalized.totalPoints}
                  </td>
                  <td className={`px-2 py-2 text-right font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    100%
                  </td>
                  <td className={`px-2 py-2 text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    —
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className={`mt-2 text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {t(
              'mockTestForms.scoring.linkedHint',
              'Thay đổi điểm 1 phần sẽ tự cập nhật tổng điểm; thay đổi tổng sẽ phân bổ lại điểm các phần theo tỉ lệ.',
            )}
          </p>
        </div>
      )}
    </div>
  );
}
