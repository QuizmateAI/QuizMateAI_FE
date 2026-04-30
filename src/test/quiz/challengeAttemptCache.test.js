import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { markChallengeAttemptFinished } from '@/pages/Users/Quiz/utils/challengeAttemptCache';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe('markChallengeAttemptFinished', () => {
  it('updates cached challenge detail and list entries immediately', () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(['challenge-detail', '12', '34'], {
      challengeEventId: 34,
      myParticipantStatus: 'PLAYING',
      participants: [
        { participantId: 56, status: 'PLAYING', fullName: 'Member A' },
        { participantId: 57, status: 'WAITING', fullName: 'Member B' },
      ],
    });
    queryClient.setQueryData(['challenges', 12, 'LIVE'], [
      { challengeEventId: 34, myParticipantStatus: 'PLAYING' },
      { challengeEventId: 35, myParticipantStatus: 'PLAYING' },
    ]);

    markChallengeAttemptFinished(queryClient, {
      workspaceId: 12,
      eventId: 34,
      participantId: 56,
    });

    expect(queryClient.getQueryData(['challenge-detail', '12', '34'])).toMatchObject({
      myParticipantStatus: 'FINISHED',
      participants: [
        { participantId: 56, status: 'FINISHED' },
        { participantId: 57, status: 'WAITING' },
      ],
    });
    expect(queryClient.getQueryData(['challenges', 12, 'LIVE'])).toEqual([
      { challengeEventId: 34, myParticipantStatus: 'FINISHED' },
      { challengeEventId: 35, myParticipantStatus: 'PLAYING' },
    ]);
  });
});
