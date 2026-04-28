import { cn } from '@/lib/utils';
import ManualQuizWizard from '@/pages/Users/Individual/Workspace/Components/ManualQuizWizard';

export default function ChallengeManualMatchEditor({
  workspaceId,
  quizId,
  isDarkMode,
  onBack,
  onSaved,
}) {
  return (
    <section
      data-testid="challenge-manual-match-editor"
      className={cn(
        'flex h-[calc(100vh-132px)] min-h-[680px] flex-col overflow-hidden rounded-2xl border',
        isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-gray-200 bg-white text-slate-900',
      )}
    >
      <div className="min-h-0 flex-1">
        <ManualQuizWizard
          workspaceId={workspaceId}
          contextType="GROUP"
          editingQuizId={quizId}
          onBack={onBack}
          onSaveQuiz={onSaved}
          isDarkMode={isDarkMode}
          surface="challenge"
        />
      </div>
    </section>
  );
}
