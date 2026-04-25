import { BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';

function GroupMemberStatsFormulaDialog({
  eyebrowClass,
  formulaDialogOpen,
  healthLabel,
  healthToneClass,
  isDarkMode,
  mutedClass,
  selectedIntelligence,
  selectedSnapshot,
  setFormulaDialogOpen,
  tt,
}) {
  if (!formulaDialogOpen) return null;

  return (
    <Dialog open={formulaDialogOpen} onOpenChange={setFormulaDialogOpen}>
        <DialogContent className={cn('max-w-6xl max-h-[85vh] overflow-y-auto', isDarkMode ? 'bg-[#0a1419] text-white border-white/10' : 'bg-white text-slate-900')}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <BookOpen className={cn('h-5 w-5', isDarkMode ? 'text-cyan-300' : 'text-cyan-600')} />
              {tt('groupWorkspace.memberStats.formulaDialog.title', 'Điểm theo dõi — Cách tính', 'Tracking Score — How it works')}
            </DialogTitle>
            <DialogDescription className={mutedClass}>
              {tt('groupWorkspace.memberStats.formulaDialog.subtitle', 'Hệ thống tự động tính điểm dựa trên kết quả quiz, tỉ lệ pass, mức độ hoạt động và xu hướng tiến bộ của thành viên.', 'The system automatically calculates a score based on quiz results, pass rate, activity level, and the member\'s progress trend.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Main formula */}
            <div className={cn('rounded-xl border p-4', isDarkMode ? 'border-cyan-400/20 bg-cyan-400/5' : 'border-cyan-200 bg-cyan-50/60')}>
              <p className={cn('text-[11px] font-semibold uppercase tracking-[0.16em] mb-2', isDarkMode ? 'text-cyan-300' : 'text-cyan-700')}>
                {tt('groupWorkspace.memberStats.formulaDialog.mainFormula', 'Công thức chính', 'Main formula')}
              </p>
              <p className={cn('font-mono text-sm font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                {'healthScore = clamp(baseHealth + trendBoost, 8, 96)'}
              </p>
              <p className={cn('mt-2 font-mono text-xs', mutedClass)}>
                {'baseHealth = scoreRatio × 45 + passRate × 35 + activityRatio × 20'}
              </p>
            </div>

            {/* All 6 calculation steps — unified table */}
            <div>
              <p className={cn('text-[11px] font-semibold uppercase tracking-[0.16em] mb-3', eyebrowClass)}>
                {tt('groupWorkspace.memberStats.formulaDialog.components', 'Chi tiết từng bước', 'Step-by-step details')}
              </p>
              <div className={cn('overflow-hidden rounded-xl border', isDarkMode ? 'border-white/10' : 'border-slate-200')}>
                <table className="w-full text-xs">
                  <thead className={isDarkMode ? 'bg-white/[0.04]' : 'bg-slate-50'}>
                    <tr className={isDarkMode ? 'border-b border-white/10' : 'border-b border-slate-200'}>
                      <th className="px-3 py-2.5 text-center font-semibold w-8">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{tt('groupWorkspace.memberStats.formulaDialog.thComponent', 'Thành phần', 'Component')}</th>
                      <th className="px-3 py-2.5 text-left font-semibold">{tt('groupWorkspace.memberStats.formulaDialog.thFormula', 'Công thức', 'Formula')}</th>
                      <th className="px-3 py-2.5 text-left font-semibold">{tt('groupWorkspace.memberStats.formulaDialog.thMeaning', 'Ý nghĩa', 'Meaning')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 1. scoreRatio */}
                    <tr className={isDarkMode ? 'border-b border-white/5' : 'border-b border-slate-100'}>
                      <td className={cn('px-3 py-3 text-center align-top', mutedClass)}>1</td>
                      <td className="px-3 py-3 align-top">
                        <span className={cn('font-mono font-bold', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>scoreRatio</span>
                        <p className={cn('mt-0.5 text-[10px]', mutedClass)}>{tt('groupWorkspace.memberStats.formulaDialog.weightLabel', 'Trọng số', 'Weight')} 45%</p>
                      </td>
                      <td className={cn('px-3 py-3 font-mono align-top', isDarkMode ? 'text-white' : 'text-slate-900')}>averageScore / 100</td>
                      <td className={cn('px-3 py-3 align-top', mutedClass)}>
                        {tt('groupWorkspace.memberStats.formulaDialog.scoreDesc', 'Điểm TB quiz, chuẩn hoá 0–1. VD: 78 → 0.78. Chiếm tỉ trọng cao nhất — phản ánh trực tiếp năng lực.', 'Avg quiz score, normalized 0–1. E.g.: 78 → 0.78. Highest weight — directly reflects ability.')}
                      </td>
                    </tr>
                    {/* 2. passRate */}
                    <tr className={isDarkMode ? 'border-b border-white/5' : 'border-b border-slate-100'}>
                      <td className={cn('px-3 py-3 text-center align-top', mutedClass)}>2</td>
                      <td className="px-3 py-3 align-top">
                        <span className={cn('font-mono font-bold', isDarkMode ? 'text-emerald-200' : 'text-emerald-700')}>passRate</span>
                        <p className={cn('mt-0.5 text-[10px]', mutedClass)}>{tt('groupWorkspace.memberStats.formulaDialog.weightLabel', 'Trọng số', 'Weight')} 35%</p>
                      </td>
                      <td className={cn('px-3 py-3 font-mono align-top', isDarkMode ? 'text-white' : 'text-slate-900')}>passed / attempts</td>
                      <td className={cn('px-3 py-3 align-top', mutedClass)}>
                        {tt('groupWorkspace.memberStats.formulaDialog.passDesc', 'Tỉ lệ pass quiz. VD: 6/8 → 0.75. Đo mức thành thạo — không chỉ làm mà còn đạt chuẩn.', 'Quiz pass ratio. E.g.: 6/8 → 0.75. Measures mastery — not just taking but passing.')}
                      </td>
                    </tr>
                    {/* 3. activityRatio */}
                    <tr className={isDarkMode ? 'border-b border-white/5' : 'border-b border-slate-100'}>
                      <td className={cn('px-3 py-3 text-center align-top', mutedClass)}>3</td>
                      <td className="px-3 py-3 align-top">
                        <span className={cn('font-mono font-bold', isDarkMode ? 'text-violet-200' : 'text-violet-700')}>activityRatio</span>
                        <p className={cn('mt-0.5 text-[10px]', mutedClass)}>{tt('groupWorkspace.memberStats.formulaDialog.weightLabel', 'Trọng số', 'Weight')} 20%</p>
                      </td>
                      <td className={cn('px-3 py-3 align-top', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        <p className="font-mono">{'min(1, A×0.45 + B×0.55)'}</p>
                        <p className={cn('mt-1 text-[10px]', mutedClass)}>A = min(1, attempts/6)</p>
                        <p className={cn('text-[10px]', mutedClass)}>B = min(1, activeDays/4)</p>
                      </td>
                      <td className={cn('px-3 py-3 align-top', mutedClass)}>
                        {tt('groupWorkspace.memberStats.formulaDialog.actDesc', 'Đo mức tham gia. Ngày hoạt động ưu tiên hơn (55% vs 45%). Ngưỡng: 6 quiz và 4 ngày = max.', 'Measures engagement. Active days weighted higher (55% vs 45%). Thresholds: 6 quizzes and 4 days = max.')}
                      </td>
                    </tr>
                    {/* 4. baseHealth */}
                    <tr className={isDarkMode ? 'border-b border-white/5' : 'border-b border-slate-100'}>
                      <td className={cn('px-3 py-3 text-center align-top', mutedClass)}>4</td>
                      <td className="px-3 py-3 align-top">
                        <span className={cn('font-mono font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>baseHealth</span>
                      </td>
                      <td className={cn('px-3 py-3 font-mono align-top', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        {'SR×45 + PR×35 + AR×20'}
                      </td>
                      <td className={cn('px-3 py-3 align-top', mutedClass)}>
                        {tt('groupWorkspace.memberStats.formulaDialog.baseDesc', 'Tổng điểm gốc từ 3 thành phần trên. Kết quả từ 0 đến 100.', 'Total base score from the 3 components above. Result ranges from 0 to 100.')}
                      </td>
                    </tr>
                    {/* 5. trendBoost */}
                    <tr className={isDarkMode ? 'border-b border-white/5' : 'border-b border-slate-100'}>
                      <td className={cn('px-3 py-3 text-center align-top', mutedClass)}>5</td>
                      <td className="px-3 py-3 align-top">
                        <span className={cn('font-mono font-bold', isDarkMode ? 'text-amber-200' : 'text-amber-700')}>trendBoost</span>
                      </td>
                      <td className={cn('px-3 py-3 align-top', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        <p className="font-mono">scoreDelta = last − first</p>
                        <div className={cn('mt-1.5 space-y-0.5 text-[10px]', mutedClass)}>
                          <p>≥ 0.05 → <span className={isDarkMode ? 'text-emerald-300' : 'text-emerald-600'}>+8</span></p>
                          <p>{'(-0.05, 0.05)'} → <span>±0</span></p>
                          <p>≤ -0.05 → <span className={isDarkMode ? 'text-rose-300' : 'text-rose-600'}>−10</span></p>
                        </div>
                      </td>
                      <td className={cn('px-3 py-3 align-top', mutedClass)}>
                        {tt('groupWorkspace.memberStats.formulaDialog.trendDesc', 'Điều chỉnh theo xu hướng. Phạt nặng hơn thưởng (−10 vs +8) để phát hiện sớm sa sút.', 'Adjusts by trend. Penalty heavier than bonus (−10 vs +8) to detect decline early.')}
                      </td>
                    </tr>
                    {/* 6. healthScore */}
                    <tr className={isDarkMode ? '' : ''}>
                      <td className={cn('px-3 py-3 text-center align-top', mutedClass)}>6</td>
                      <td className="px-3 py-3 align-top">
                        <span className={cn('font-mono font-bold', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>healthScore</span>
                      </td>
                      <td className={cn('px-3 py-3 font-mono align-top', isDarkMode ? 'text-white' : 'text-slate-900')}>
                        {'clamp(base + boost, 8, 96)'}
                      </td>
                      <td className={cn('px-3 py-3 align-top', mutedClass)}>
                        <p>{tt('groupWorkspace.memberStats.formulaDialog.finalDesc', 'Kết quả cuối cùng, giới hạn 8–96. Phân loại:', 'Final result, clamped 8–96. Classification:')}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {[
                            { label: '≥80 strong', c: isDarkMode ? 'text-emerald-300' : 'text-emerald-600' },
                            { label: '60–79 stable', c: isDarkMode ? 'text-cyan-300' : 'text-cyan-600' },
                            { label: '40–59 watch', c: isDarkMode ? 'text-amber-300' : 'text-amber-600' },
                            { label: '<40 risk', c: isDarkMode ? 'text-rose-300' : 'text-rose-600' },
                          ].map((t) => (
                            <span key={t.label} className={cn('font-mono text-[10px] font-bold', t.c)}>{t.label}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>


            {/* Current member calculation */}
            {selectedIntelligence.attempts > 0 ? (() => {
              const sr = selectedIntelligence.scoreRatio ?? 0;
              const pr = selectedIntelligence.passRate ?? 0;
              const ar = selectedIntelligence.activityRatio ?? 0;
              const tb = selectedIntelligence.trendBoost ?? 0;
              const bh = selectedIntelligence.baseHealth ?? 0;
              const sc = Math.round(sr * 45 * 10) / 10;
              const pc = Math.round(pr * 35 * 10) / 10;
              const ac = Math.round(ar * 20 * 10) / 10;
              const avgScore = selectedSnapshot.averageScore ?? 0;
              const passed = selectedSnapshot.totalQuizPassed ?? 0;
              const attempts = selectedSnapshot.totalQuizAttempts ?? 0;
              const aDays = selectedIntelligence.trend?.activeDays ?? 0;
              const sd = selectedIntelligence.trend?.scoreDelta;
              const dir = selectedIntelligence.trend?.direction ?? 'unknown';

              const attemptPart = Math.min(1, attempts / 6);
              const daysPart = Math.min(1, aDays / 4);

              const dirLabel = dir === 'up' ? '↑ UP' : dir === 'down' ? '↓ DOWN' : dir === 'flat' ? '→ FLAT' : '? UNKNOWN';

              const memberSteps = [
                {
                  label: 'scoreRatio',
                  calc: avgScore > 1
                    ? `${Math.round(avgScore)} / 100 = ${sr.toFixed(2)}`
                    : `${sr.toFixed(2)}`,
                },
                {
                  label: 'passRate',
                  calc: `${passed} / ${attempts} = ${pr.toFixed(2)}`,
                },
                {
                  label: 'activityRatio',
                  calc: `min(1, (min(1, ${attempts}/6)×0.45) + (min(1, ${aDays}/4)×0.55)) = min(1, ${(attemptPart * 0.45).toFixed(3)} + ${(daysPart * 0.55).toFixed(3)}) = ${ar.toFixed(4)}`,
                },
                {
                  label: 'baseHealth',
                  calc: `${sr.toFixed(2)}×45 + ${pr.toFixed(2)}×35 + ${ar.toFixed(2)}×20 = ${sc} + ${pc} + ${ac} = ${bh}`,
                },
                {
                  label: 'trendBoost',
                  calc: sd != null
                    ? `scoreDelta = ${sd.toFixed(3)} → ${dirLabel} → ${tb >= 0 ? `+${tb}` : String(tb)}`
                    : `không đủ data → ${tb >= 0 ? `+${tb}` : String(tb)}`,
                },
                {
                  label: 'healthScore',
                  calc: `clamp(round(${bh} + ${tb >= 0 ? tb : `(${tb})`}), 8, 96) = ${selectedIntelligence.healthScore}`,
                },
              ];

              return (
                <div className={cn('rounded-xl border p-4', isDarkMode ? 'border-cyan-400/20 bg-cyan-400/5' : 'border-cyan-200 bg-cyan-50/60')}>
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.16em] mb-2', isDarkMode ? 'text-cyan-300' : 'text-cyan-700')}>
                    {tt('groupWorkspace.memberStats.formulaDialog.currentMember', 'Áp dụng cho thành viên hiện tại', 'Applied to current member')}
                  </p>

                  {/* Input badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      { label: 'Quiz', value: String(attempts) },
                      { label: 'Pass', value: `${passed}/${attempts}` },
                      { label: tt('groupWorkspace.memberStats.formulaDialog.inputScore', 'Điểm TB', 'Avg'), value: `${Math.round(avgScore)}` },
                      { label: tt('groupWorkspace.memberStats.formulaDialog.inputDays', 'Ngày HĐ', 'Days'), value: String(aDays) },
                      { label: 'Trend', value: dirLabel },
                    ].map((inp) => (
                      <span key={inp.label} className={cn('inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium', isDarkMode ? 'bg-white/[0.06] text-slate-300' : 'bg-white/80 text-slate-600')}>
                        <span className={mutedClass}>{inp.label}</span>
                        <span className={cn('font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>{inp.value}</span>
                      </span>
                    ))}
                  </div>

                  {/* Step-by-step */}
                  <div className="space-y-1.5">
                    {memberSteps.map((step, i) => (
                      <div key={step.label} className="flex items-center gap-0">
                        <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold mr-2', isDarkMode ? 'bg-cyan-400/20 text-cyan-200' : 'bg-cyan-100 text-cyan-700')}>
                          {i + 1}
                        </span>
                        <span className={cn('w-[105px] shrink-0 text-left font-mono text-[11px] font-semibold', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>{step.label}</span>
                        <span className={cn('mx-1.5 font-mono text-[11px]', mutedClass)}>=</span>
                        <span className={cn('font-mono text-[11px]', isDarkMode ? 'text-slate-200' : 'text-slate-700')}>{step.calc}</span>
                      </div>
                    ))}
                  </div>

                  {/* Final result */}
                  <div className={cn('mt-3 flex items-center justify-between rounded-lg px-3 py-2', isDarkMode ? 'bg-white/[0.06]' : 'bg-white')}>
                    <span className={cn('font-mono text-xs font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      = ({sc} + {pc} + {ac}) {tb >= 0 ? '+' : '−'} {Math.abs(tb)} = <span className={cn('text-base font-black', isDarkMode ? 'text-cyan-200' : 'text-cyan-700')}>{selectedIntelligence.healthScore}</span>
                    </span>
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold', healthToneClass(selectedIntelligence.healthTone, isDarkMode))}>
                      {healthLabel(selectedIntelligence.healthTone)}
                    </span>
                  </div>
                </div>
              );
            })() : null}
          </div>
        </DialogContent>
    </Dialog>
  );
}

export default GroupMemberStatsFormulaDialog;
