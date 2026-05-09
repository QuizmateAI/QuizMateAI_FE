import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import CreateQuizFormGroup from './CreateQuizForm';

/** Inline AI editor cho challenge — render trực tiếp trong tab Thử thách (như ChallengeManualMatchEditor),
 * không navigate sang Bài kiểm tra. */
export default function ChallengeAIMatchEditor({
  workspaceId,
  quizId,
  detail,
  isDarkMode,
  onBack,
  onChallengeInlineQuizCreated,
  planEntitlements,
  quizTitleMaxLength,
  currentPlanSummaryOverride,
}) {
  const seedTitle = detail?.snapshotQuizTitle || detail?.title || '';

  const handleSubmit = useCallback(async (payload) => {
    try {
      await onChallengeInlineQuizCreated?.(payload);
    } finally {
      onBack?.();
    }
  }, [onChallengeInlineQuizCreated, onBack]);

  return (
    <section
      data-testid="challenge-ai-match-editor"
      className={cn(
        'flex h-[calc(100vh-132px)] min-h-[680px] flex-col overflow-hidden rounded-2xl border',
        isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-gray-200 bg-white text-slate-900',
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <CreateQuizFormGroup
          isDarkMode={isDarkMode}
          contextId={workspaceId}
          selectedSourceIds={[]}
          existingQuizId={quizId}
          seedQuizTitle={seedTitle}
          initialMode="ai"
          showInlineRecommendations={false}
          planEntitlements={planEntitlements}
          quizTitleMaxLength={quizTitleMaxLength}
          planUpgradeScope="GROUP"
          currentPlanSummaryOverride={currentPlanSummaryOverride}
          planUpgradeWorkspaceId={workspaceId}
          onCreateQuiz={handleSubmit}
          onBack={onBack}
        />
      </div>
    </section>
  );
}
