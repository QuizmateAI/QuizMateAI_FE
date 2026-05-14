import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '@/api/api';
import {
  BATCH_REVIEWER_INVITATIONS_MAX,
  CHALLENGE_INVITE_USER_IDS_MAX,
  batchInviteQuizReviewers,
  inviteToChallenge,
} from '@/api/ChallengeAPI';

vi.mock('@/api/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ChallengeAPI BE bounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ statusCode: 200, data: {} });
  });

  describe('inviteToChallenge', () => {
    it('slices userIds to BE max (100)', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => i + 1);
      await inviteToChallenge(7, 42, ids);

      const sentBody = api.post.mock.calls[0][1];
      expect(sentBody.userIds).toHaveLength(CHALLENGE_INVITE_USER_IDS_MAX);
      expect(sentBody.userIds[0]).toBe(1);
      expect(sentBody.userIds[CHALLENGE_INVITE_USER_IDS_MAX - 1]).toBe(CHALLENGE_INVITE_USER_IDS_MAX);
    });

    it('passes through arrays at or under bound', async () => {
      await inviteToChallenge(7, 42, [1, 2, 3]);
      expect(api.post.mock.calls[0][1].userIds).toEqual([1, 2, 3]);
    });

    it('coerces non-array input to empty list', async () => {
      await inviteToChallenge(7, 42, null);
      expect(api.post.mock.calls[0][1].userIds).toEqual([]);
    });
  });

  describe('batchInviteQuizReviewers', () => {
    it('slices invitations to BE max (2)', async () => {
      const invitations = [{ userId: 1 }, { userId: 2 }, { userId: 3 }];
      await batchInviteQuizReviewers(7, 42, invitations);

      const sentBody = api.post.mock.calls[0][1];
      expect(sentBody.invitations).toHaveLength(BATCH_REVIEWER_INVITATIONS_MAX);
      expect(sentBody.invitations).toEqual([{ userId: 1 }, { userId: 2 }]);
    });

    it('passes through arrays at or under bound', async () => {
      await batchInviteQuizReviewers(7, 42, [{ userId: 5 }]);
      expect(api.post.mock.calls[0][1].invitations).toEqual([{ userId: 5 }]);
    });

    it('coerces non-array input to empty list', async () => {
      await batchInviteQuizReviewers(7, 42, undefined);
      expect(api.post.mock.calls[0][1].invitations).toEqual([]);
    });
  });
});
