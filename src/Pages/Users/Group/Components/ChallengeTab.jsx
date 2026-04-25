import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Swords } from 'lucide-react';
import { listChallenges } from '../../../../api/ChallengeAPI';
import ChallengeListView from './ChallengeListView';
import ChallengeDetailView from './ChallengeDetailView';
import CreateChallengeWizard from './CreateChallengeWizard';

const SUB_TABS = [
  { key: 'SCHEDULED', labelKey: 'groupWorkspace.challenge.tabs.scheduled', fallback: 'Upcoming' },
  { key: 'LIVE', labelKey: 'groupWorkspace.challenge.tabs.live', fallback: 'Live' },
  { key: 'FINISHED', labelKey: 'groupWorkspace.challenge.tabs.finished', fallback: 'Finished' },
];

const MODE_TABS = [
  { key: 'ALL', labelKey: 'groupWorkspace.challenge.modes.all', fallback: 'All' },
  { key: 'FREE_FOR_ALL', labelKey: 'groupWorkspace.challenge.modes.freeForAll', fallback: 'Free-for-all' },
  { key: 'TEAM_BATTLE', labelKey: 'groupWorkspace.challenge.modes.teamBattle', fallback: 'Team battle' },
  { key: 'SOLO_BRACKET', labelKey: 'groupWorkspace.challenge.modes.soloBracket', fallback: '1v1 bracket' },
];

export default function ChallengeTab({
  workspaceId,
  isDarkMode,
  isLeader,
  currentUserId,
  quizGenerationTaskByQuizId = {},
  quizGenerationProgressByQuizId = {},
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const challengeEventIdFromUrl = searchParams.get('challengeEventId');
  const challengeEventIdFromRoute = (() => {
    const raw = Number(challengeEventIdFromUrl);
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  })();

  const [activeSubTab, setActiveSubTab] = useState('SCHEDULED');
  const [activeMode, setActiveMode] = useState('ALL');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const activeEventId = challengeEventIdFromRoute ?? selectedEventId;

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['challenges', workspaceId, activeSubTab],
    queryFn: async () => {
      const res = await listChallenges(workspaceId, activeSubTab);
      return res.data || [];
    },
    enabled: Boolean(workspaceId) && !activeEventId,
    refetchInterval: 15000,
  });

  const visibleChallenges = useMemo(
    () => activeMode === 'ALL'
      ? challenges
      : challenges.filter((challenge) => String(challenge.matchMode || 'FREE_FOR_ALL') === activeMode),
    [activeMode, challenges],
  );

  const handleSelectChallenge = useCallback((eventId) => {
    setSelectedEventId(eventId);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedEventId(null);
    if (challengeEventIdFromUrl) {
      const next = new URLSearchParams(searchParams);
      next.delete('challengeEventId');
      setSearchParams(next, { replace: true });
    }
    queryClient.invalidateQueries({ queryKey: ['challenges', workspaceId] });
  }, [challengeEventIdFromUrl, queryClient, searchParams, setSearchParams, workspaceId]);

  const handleChallengeCreated = useCallback(() => {
    setShowCreateWizard(false);
    queryClient.invalidateQueries({ queryKey: ['challenges', workspaceId] });
  }, [queryClient, workspaceId]);

  if (activeEventId) {
    return (
      <ChallengeDetailView
        workspaceId={workspaceId}
        eventId={activeEventId}
        isDarkMode={isDarkMode}
        isLeader={isLeader}
        currentUserId={currentUserId}
        onBack={handleBackToList}
        quizGenerationTaskByQuizId={quizGenerationTaskByQuizId}
        quizGenerationProgressByQuizId={quizGenerationProgressByQuizId}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className={`h-6 w-6 ${isDarkMode ? 'text-orange-300' : 'text-orange-500'}`} />
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('groupWorkspace.challenge.title')}
          </h2>
        </div>
        {isLeader && (
          <button
            onClick={() => setShowCreateWizard(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            {t('groupWorkspace.challenge.createChallenge')}
          </button>
        )}
      </div>

      <div className={`flex gap-1 rounded-xl p-1 ${
        isDarkMode ? 'bg-slate-800' : 'bg-gray-100'
      }`}>
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeSubTab === tab.key
                ? (isDarkMode
                    ? 'bg-orange-500/20 text-orange-300 shadow-sm'
                    : 'bg-white text-orange-600 shadow-sm')
                : (isDarkMode
                    ? 'text-slate-400 hover:text-slate-300'
                    : 'text-gray-500 hover:text-gray-700')
            }`}
          >
            {t(tab.labelKey, tab.fallback)}
          </button>
        ))}
      </div>

      <div className={`flex flex-wrap gap-1 rounded-xl p-1 ${
        isDarkMode ? 'bg-slate-800/70' : 'bg-gray-100/80'
      }`}>
        {MODE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveMode(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeMode === tab.key
                ? (isDarkMode ? 'bg-teal-500/20 text-teal-100' : 'bg-white text-teal-700 shadow-sm')
                : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700')
            }`}
          >
            {t(tab.labelKey, tab.fallback)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : (
        <ChallengeListView
          challenges={visibleChallenges}
          isDarkMode={isDarkMode}
          onSelectChallenge={handleSelectChallenge}
          onCreateChallenge={isLeader ? () => setShowCreateWizard(true) : undefined}
        />
      )}

      {showCreateWizard && (
        <CreateChallengeWizard
          workspaceId={workspaceId}
          isDarkMode={isDarkMode}
          currentUserId={currentUserId}
          onClose={() => setShowCreateWizard(false)}
          onCreated={handleChallengeCreated}
        />
      )}
    </div>
  );
}
