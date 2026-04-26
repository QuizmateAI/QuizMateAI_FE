import { describe, expect, it } from 'vitest';
import {
  buildGroupMemberSeatSummary,
  normalizePendingInvitationSummary,
  resolveGroupMemberSeatLimit,
} from '@/pages/Users/Group/utils/memberSeatLimit';

describe('memberSeatLimit utilities', () => {
  it('resolves the member seat limit from override before plan data', () => {
    expect(resolveGroupMemberSeatLimit({
      groupProfile: { maxMemberOverride: 7 },
      groupSubscription: {
        plan: {
          planLimit: {
            maxMemberSlot: 5,
          },
        },
      },
    })).toBe(7);
  });

  it('builds seat usage from the highest accepted count plus pending invitations', () => {
    const summary = buildGroupMemberSeatSummary({
      groupSubscription: {
        plan: {
          planLimit: {
            maxMemberSlot: 5,
          },
        },
      },
      members: [{ id: 1 }, { id: 2 }, { id: 3 }],
      fallbackAcceptedCount: 6,
      pendingInvitations: {
        invitations: [{ id: 91 }, { id: 92 }],
      },
    });

    expect(summary).toMatchObject({
      limit: 5,
      acceptedCount: 6,
      pendingCount: 2,
      usedCount: 8,
      remainingCount: 0,
      overLimitBy: 3,
      isAtLimit: true,
      isOverLimit: true,
    });
  });

  it('normalizes pending invitation count from the list when count is missing', () => {
    expect(normalizePendingInvitationSummary({
      invitations: [{ id: 1 }, { id: 2 }, { id: 3 }],
    })).toEqual({
      count: 3,
      invitations: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
  });
});
