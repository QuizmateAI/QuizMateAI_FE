import { Check, Swords, Trophy, Users } from 'lucide-react';
import { getDurationInMinutes } from '@/lib/quizDurationDisplay';

export function getQuizSummaryLine(q) {
  const questionCount = Number(q?.totalQuestion ?? q?.totalQuestions ?? q?.questionCount ?? 0) || 0;
  const durationMinutes = getDurationInMinutes(q) || Number(q?.totalTime ?? 0) || 0;
  return { questionCount, durationMinutes };
}

export function isQuizEligibleForChallengeSource(quiz) {
  const status = String(quiz?.status || '').toUpperCase();
  if (status && status !== 'ACTIVE') return false;
  const mode = String(quiz?.groupAudienceMode ?? '').toUpperCase();
  if (mode === 'SELECTED_MEMBERS') return false;
  const assignees = quiz?.assignedUserIds;
  if (Array.isArray(assignees) && assignees.length > 0) return false;
  return true;
}

export const STEPS = [
  { key: 'mode', labelKey: 'createChallengeWizard.steps.mode', labelFallback: 'Mode' },
  { key: 'quiz', labelKey: 'createChallengeWizard.steps.quiz', labelFallback: 'Select content' },
  { key: 'schedule', labelKey: 'createChallengeWizard.steps.schedule', labelFallback: 'Schedule' },
  { key: 'registration', labelKey: 'createChallengeWizard.steps.registration', labelFallback: 'Registration' },
  { key: 'review', labelKey: 'createChallengeWizard.steps.review', labelFallback: 'Review' },
];

export const MATCH_MODE_OPTIONS = [
  {
    key: 'FREE_FOR_ALL',
    labelKey: 'createChallengeWizard.mode.personalLabel',
    labelFallback: 'Free-for-all',
    descKey: 'createChallengeWizard.mode.personalDesc',
    descFallback: 'Everyone takes the same match and the leaderboard is ranked by score and time.',
    icon: Swords,
  },
  {
    key: 'TEAM_BATTLE',
    labelKey: 'createChallengeWizard.mode.teamLabel',
    labelFallback: 'Team battle',
    descKey: 'createChallengeWizard.mode.teamDesc',
    descFallback: 'Set team size or let the system auto-balance teams when the match starts.',
    icon: Users,
  },
  {
    key: 'SOLO_BRACKET',
    labelKey: 'createChallengeWizard.mode.soloLabel',
    labelFallback: '1v1 bracket',
    descKey: 'createChallengeWizard.mode.soloDesc',
    descFallback: 'Pick a 4/8/16/32 slot bracket and keep the participant count aligned with the bracket.',
    icon: Trophy,
  },
];

export const TEAM_COUNT = 2;
export const BRACKET_SIZE_OPTIONS = [4, 8, 16, 32];
const ENABLE_SOLO_BRACKET_MODE = false;
export const AVAILABLE_MATCH_MODE_OPTIONS = MATCH_MODE_OPTIONS.filter(
  (option) => ENABLE_SOLO_BRACKET_MODE || option.key !== 'SOLO_BRACKET',
);

export const CHALLENGE_SOURCE_MODES = {
  EXISTING_SNAPSHOT: 'EXISTING_SNAPSHOT',
  MANUAL_CHALLENGE_QUIZ: 'MANUAL_CHALLENGE_QUIZ',
  AI_CHALLENGE_QUIZ: 'AI_CHALLENGE_QUIZ',
};

export const CHALLENGE_SOURCE_OPTIONS = [
  {
    key: CHALLENGE_SOURCE_MODES.EXISTING_SNAPSHOT,
    labelKey: 'createChallengeWizard.sourceMode.existingLabel',
    labelFallback: 'Existing content',
    descKey: 'createChallengeWizard.sourceMode.existingDesc',
    descFallback: 'Create a snapshot from an existing content set',
  },
  {
    key: CHALLENGE_SOURCE_MODES.MANUAL_CHALLENGE_QUIZ,
    labelKey: 'createChallengeWizard.sourceMode.manualLabel',
    labelFallback: 'Manual challenge',
    descKey: 'createChallengeWizard.sourceMode.manualDesc',
    descFallback: 'Create a draft challenge match and compose questions with the manual editor',
  },
  {
    key: CHALLENGE_SOURCE_MODES.AI_CHALLENGE_QUIZ,
    labelKey: 'createChallengeWizard.sourceMode.aiLabel',
    labelFallback: 'AI challenge',
    descKey: 'createChallengeWizard.sourceMode.aiDesc',
    descFallback: 'Generate a draft challenge match with QuizMate AI',
  },
];

const NEW_CHALLENGE_SOURCE_MODES = new Set([
  CHALLENGE_SOURCE_MODES.MANUAL_CHALLENGE_QUIZ,
  CHALLENGE_SOURCE_MODES.AI_CHALLENGE_QUIZ,
]);

export function isNewChallengeQuizSourceMode(sourceMode) {
  return NEW_CHALLENGE_SOURCE_MODES.has(sourceMode);
}

export function getChallengeCreateSourceMode(sourceMode) {
  return sourceMode === CHALLENGE_SOURCE_MODES.EXISTING_SNAPSHOT
    ? 'EXISTING_SNAPSHOT'
    : 'NEW_CHALLENGE_QUIZ';
}

export function getChallengeDraftEditorMode(sourceMode) {
  if (sourceMode === CHALLENGE_SOURCE_MODES.MANUAL_CHALLENGE_QUIZ) return 'manual';
  if (sourceMode === CHALLENGE_SOURCE_MODES.AI_CHALLENGE_QUIZ) return 'ai';
  return null;
}

export function normalizeChallengeDraftEditorMode(mode) {
  const normalized = String(mode || '').toLowerCase();
  return normalized === 'manual' || normalized === 'ai' ? normalized : null;
}

export function getChallengeDraftModeStorageKey(workspaceId, eventId) {
  const normalizedWorkspaceId = String(workspaceId ?? '').trim();
  const normalizedEventId = Number(eventId);
  if (!normalizedWorkspaceId || !Number.isInteger(normalizedEventId) || normalizedEventId <= 0) {
    return null;
  }
  return `quizmate:challengeDraftMode:${normalizedWorkspaceId}:${normalizedEventId}`;
}

export function writeChallengeDraftEditorMode(workspaceId, eventId, mode) {
  const normalizedMode = normalizeChallengeDraftEditorMode(mode);
  const key = getChallengeDraftModeStorageKey(workspaceId, eventId);
  if (!normalizedMode || !key || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, normalizedMode);
  } catch {
    // Browser storage can be unavailable in private or embedded contexts.
  }
}

export function readChallengeDraftEditorMode(workspaceId, eventId) {
  const key = getChallengeDraftModeStorageKey(workspaceId, eventId);
  if (!key || typeof window === 'undefined') return null;
  try {
    return normalizeChallengeDraftEditorMode(window.sessionStorage.getItem(key));
  } catch {
    return null;
  }
}

export const TEAM_CONFIG_MODES = [
  {
    key: 'AUTO_BALANCE',
    labelKey: 'createChallengeWizard.mode.teamAutoBalanceLabel',
    labelFallback: 'Pre-enroll, auto-balance',
    descKey: 'createChallengeWizard.mode.teamAutoBalanceDesc',
    descFallback: 'Unlimited slots. When the match starts, registered members are split into 2 balanced teams.',
  },
  {
    key: 'FIXED_TEAM_SIZE',
    labelKey: 'createChallengeWizard.mode.teamFixedSizeLabel',
    labelFallback: 'Fixed members per team',
    descKey: 'createChallengeWizard.mode.teamFixedSizeDesc',
    descFallback: 'Registration is limited to 2 teams multiplied by the number of members per team.',
  },
];

export function StepIndicator({ currentStep, isDarkMode, t }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, idx) => (
        <div key={step.key} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
            idx < currentStep
              ? 'bg-green-500 text-white'
              : idx === currentStep
                ? 'bg-orange-500 text-white'
                : (isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500')
          }`}>
            {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
          </div>
          <span className={`hidden text-sm font-medium sm:inline ${
            idx === currentStep
              ? (isDarkMode ? 'text-white' : 'text-slate-900')
              : (isDarkMode ? 'text-slate-500' : 'text-gray-400')
          }`}>
            {t(step.labelKey, step.labelFallback)}
          </span>
          {idx < STEPS.length - 1 && (
            <div className={`h-px w-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function formatDateTime(dt, language) {
  if (!dt) return '-';
  const d = new Date(dt);
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}
