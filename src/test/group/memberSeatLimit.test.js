import { describe, expect, it } from 'vitest';
import {
  buildGroupMemberSeatSummary,
  buildMemberSeatLimitErrorMessage,
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

  describe('buildMemberSeatLimitErrorMessage', () => {
    // i18next.t supports both t(key, 'default-string') and t(key, { defaultValue }).
    const echoT = (key, secondArg) => {
      if (typeof secondArg === 'string') return secondArg;
      return secondArg?.defaultValue ?? key;
    };

    it('returns "exceeded" copy when overLimitBy > 0', () => {
      const msg = buildMemberSeatLimitErrorMessage(echoT, {
        limit: 5,
        usedCount: 7,
        overLimitBy: 2,
        pendingCount: 1,
      });
      expect(msg).toContain('vượt 2');
      expect(msg).toContain('5');
    });

    it('returns "reached" copy when at limit (no over)', () => {
      const msg = buildMemberSeatLimitErrorMessage(echoT, {
        limit: 5,
        usedCount: 5,
        overLimitBy: 0,
        pendingCount: 0,
      });
      expect(msg).toContain('5/5');
    });

    it('returns generic "unknown" copy when limit is missing/invalid', () => {
      expect(buildMemberSeatLimitErrorMessage(echoT, {})).toBe('Nhóm đã đạt giới hạn thành viên của gói hiện tại.');
      expect(buildMemberSeatLimitErrorMessage(echoT, { limit: 0 })).toBe('Nhóm đã đạt giới hạn thành viên của gói hiện tại.');
    });
  });
});
