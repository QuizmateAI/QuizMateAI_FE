import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n, { preloadRouteNamespaces } from '@/i18n';
import { buildGroupWorkspaceSectionPath } from '@/lib/routePaths';
import ChallengeDetailView from '@/Pages/Users/Group/Components/ChallengeDetailView';
import {
  batchInviteQuizReviewers,
  getChallengeDetail,
} from '@/api/ChallengeAPI';
import { getGroupMembers } from '@/api/GroupAPI';

const navigateSpy = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

vi.mock('@/api/ChallengeAPI', () => ({
  getChallengeDetail: vi.fn(),
  registerForChallenge: vi.fn(),
  acceptChallengeInvitation: vi.fn(),
  startChallengeAttempt: vi.fn(),
  cancelChallenge: vi.fn(),
  updateChallenge: vi.fn(),
  removeQuizReviewContributor: vi.fn(),
  publishChallenge: vi.fn(),
  batchInviteQuizReviewers: vi.fn(),
  startChallenge: vi.fn(),
  createChallengeRoundQuiz: vi.fn(),
}));

vi.mock('@/api/GroupAPI', () => ({
  getGroupMembers: vi.fn(),
}));

vi.mock('@/Components/users/UserDisplayName', () => ({
  default: ({ user, fallback }) => <span>{user?.fullName || user?.username || fallback}</span>,
}));

const baseDetail = {
  challengeEventId: 77,
  title: 'Quiz challenge review',
  description: 'Draft challenge quiz',
  status: 'SCHEDULED',
  published: false,
  matchMode: 'FREE_FOR_ALL',
  creatorId: 101,
  leaderParticipates: false,
  sourceMode: 'NEW_CHALLENGE_QUIZ',
  snapshotQuizId: 901,
  snapshotQuizTitle: 'Draft quiz',
  snapshotQuizStatus: 'DRAFT',
  snapshotQuizTotalQuestion: 0,
  snapshotQuizDuration: 600,
  participantCount: 0,
  registrationMode: 'PUBLIC_GROUP',
  reviewContributors: [],
  participants: [],
};

function renderChallengeDetail(overrides = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ChallengeDetailView
          workspaceId={55}
          eventId={77}
          isDarkMode={false}
          isLeader
          currentUserId={101}
          onBack={vi.fn()}
          {...overrides}
        />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ChallengeDetailView', () => {
  beforeEach(async () => {
    navigateSpy.mockReset();
    getChallengeDetail.mockResolvedValue({ data: { ...baseDetail } });
    getGroupMembers.mockResolvedValue({ data: { content: [] } });
    batchInviteQuizReviewers.mockResolvedValue({ data: {} });
    window.localStorage.clear();
    window.localStorage.setItem('app_language', 'en');
    await preloadRouteNamespaces('/group-workspaces/55', 'en');
    await i18n.changeLanguage('en');
  });

  it('keeps challengeEventId when opening the challenge quiz editor', async () => {
    getChallengeDetail.mockResolvedValueOnce({
      data: {
        ...baseDetail,
      },
    });

    renderChallengeDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Compose challenge quiz' }));

    expect(navigateSpy).toHaveBeenCalledWith(
      buildGroupWorkspaceSectionPath(55, 'quiz', {
        challengeDraftQuizId: 901,
        challengeDraft: 1,
        challengeEventId: 77,
      }),
      { state: { restoreGroupWorkspace: { section: 'challenge', challengeEventId: 77 } } },
    );
  });

  it('invites a reviewer immediately and accepts member.userID payloads', async () => {
    getGroupMembers.mockResolvedValueOnce({
      data: {
        content: [
          { userID: 202, fullName: 'Reviewer One' },
        ],
      },
    });

    renderChallengeDetail();

    const option = await screen.findByRole('option', { name: 'Reviewer One' });
    const select = option.closest('select');
    expect(select).not.toBeNull();
    fireEvent.change(select, { target: { value: '202' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(batchInviteQuizReviewers).toHaveBeenCalledWith(55, 901, [
        {
          userId: 202,
          primaryReviewer: true,
        },
      ]);
    });

    expect(screen.getByText('Only the primary reviewer is needed to publish.')).toBeInTheDocument();
  });

  it('shows realtime websocket progress for the challenge quiz without waiting for detail reload', async () => {
    getChallengeDetail.mockResolvedValueOnce({
      data: {
        ...baseDetail,
        snapshotQuizStatus: 'DRAFT',
      },
    });

    renderChallengeDetail({
      quizGenerationTaskByQuizId: { 901: 'task-901' },
      quizGenerationProgressByQuizId: { 901: 37 },
    });

    expect(await screen.findByText('Challenge quiz is being generated')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('37%')).toBeInTheDocument();
    }, { timeout: 4000 });
    expect(screen.queryByRole('button', { name: 'Compose challenge quiz' })).not.toBeInTheDocument();
  });

  it('trusts server ACTIVE status and hides stale processing state', async () => {
    getChallengeDetail.mockResolvedValueOnce({
      data: {
        ...baseDetail,
        snapshotQuizStatus: 'ACTIVE',
        snapshotQuizTotalQuestion: 10,
      },
    });

    renderChallengeDetail({
      quizGenerationTaskByQuizId: { 901: 'task-901' },
      quizGenerationProgressByQuizId: { 901: 55 },
    });

    expect(await screen.findByText('Draft quiz')).toBeInTheDocument();
    expect(screen.queryByText('Challenge quiz is being generated')).not.toBeInTheDocument();
    expect(screen.queryByText('55%')).not.toBeInTheDocument();
  });
});
