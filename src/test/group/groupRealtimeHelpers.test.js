import { describe, expect, it } from 'vitest';
import {
  ADDABLE_MEMBER_EVENT_TYPES,
  extractRealtimeMemberPayload,
  hasMemberIdentity,
  mergeRealtimeMember,
  removeRealtimeMember,
  resolveMemberUserId,
  resolveWorkspaceMemberId,
} from '@/pages/Users/Group/utils/groupRealtimeHelpers';

describe('groupRealtimeHelpers', () => {
  describe('resolveMemberUserId / resolveWorkspaceMemberId', () => {
    it('reads canonical fields first', () => {
      expect(resolveMemberUserId({ userId: 7, userID: 9 })).toBe(7);
      expect(resolveWorkspaceMemberId({ groupMemberId: 1, workspaceMemberId: 2 })).toBe(1);
    });

    it('falls back to alternate field aliases', () => {
      expect(resolveMemberUserId({ memberUserId: 11 })).toBe(11);
      expect(resolveMemberUserId({ user: { userID: 12 } })).toBe(12);
      expect(resolveWorkspaceMemberId({ memberId: 5 })).toBe(5);
    });

    it('returns null when no recognizable id is present', () => {
      expect(resolveMemberUserId({})).toBeNull();
      expect(resolveWorkspaceMemberId({})).toBeNull();
    });
  });

  describe('hasMemberIdentity', () => {
    it('is true when any id alias is present', () => {
      expect(hasMemberIdentity({ userId: 1 })).toBe(true);
      expect(hasMemberIdentity({ groupMemberId: 2 })).toBe(true);
    });

    it('is false for empty payloads', () => {
      expect(hasMemberIdentity({})).toBe(false);
      expect(hasMemberIdentity({ presenceStatus: 'active' })).toBe(false);
    });
  });

  describe('extractRealtimeMemberPayload', () => {
    it('returns nested member object when present', () => {
      const member = { userId: 9, fullName: 'Alice' };
      expect(extractRealtimeMemberPayload({ member })).toBe(member);
      expect(extractRealtimeMemberPayload({ data: { workspaceMember: member } })).toBe(member);
    });

    it('returns the event itself when it looks like a member patch', () => {
      const event = { userId: 9, presenceStatus: 'active' };
      expect(extractRealtimeMemberPayload(event)).toBe(event);
    });

    it('returns null for non-member events (eg MEMBER_REMOVED with removed* keys only)', () => {
      const event = {
        type: 'MEMBER_REMOVED',
        workspaceId: 5,
        removedUserId: 9,
        removedMemberId: 12,
      };
      expect(extractRealtimeMemberPayload(event)).toBeNull();
    });
  });

  describe('mergeRealtimeMember', () => {
    const baseMembers = [
      { groupMemberId: 1, userId: 11, fullName: 'Alice', role: 'LEADER' },
      { groupMemberId: 2, userId: 12, fullName: 'Bob', role: 'MEMBER' },
    ];

    it('merges into existing member when ids match', () => {
      const next = mergeRealtimeMember(baseMembers, { userId: 12, role: 'CONTRIBUTOR' });
      expect(next.find((m) => m.userId === 12)?.role).toBe('CONTRIBUTOR');
      expect(next.length).toBe(2);
    });

    it('does NOT add member back when event is a non-join update for a kicked user', () => {
      const next = mergeRealtimeMember(
        baseMembers,
        { userId: 99, fullName: 'Ghost', role: 'MEMBER' },
        'MEMBER_ROLE_UPDATED',
      );
      expect(next.length).toBe(2);
      expect(next.find((m) => m.userId === 99)).toBeUndefined();
    });

    it('adds member when eventType is MEMBER_JOINED and shape is valid', () => {
      const next = mergeRealtimeMember(
        baseMembers,
        { userId: 99, fullName: 'Carol', role: 'MEMBER' },
        'MEMBER_JOINED',
      );
      expect(next.length).toBe(3);
      expect(next[0].userId).toBe(99);
    });

    it('does not add when MEMBER_JOINED payload looks removed (leftAt set)', () => {
      const next = mergeRealtimeMember(
        baseMembers,
        { userId: 99, fullName: 'Carol', role: 'MEMBER', leftAt: '2026-05-03T00:00:00Z' },
        'MEMBER_JOINED',
      );
      expect(next.length).toBe(2);
    });

    it('does not add when MEMBER_JOINED payload status is REMOVED', () => {
      const next = mergeRealtimeMember(
        baseMembers,
        { userId: 99, fullName: 'Carol', role: 'MEMBER', status: 'REMOVED' },
        'MEMBER_JOINED',
      );
      expect(next.length).toBe(2);
    });

    it('returns currentMembers untouched for null/invalid input', () => {
      expect(mergeRealtimeMember(baseMembers, null, 'MEMBER_JOINED')).toBe(baseMembers);
      expect(mergeRealtimeMember(baseMembers, 'not-an-object', 'MEMBER_JOINED')).toBe(baseMembers);
    });

    it('exposes the addable event-type allow-list', () => {
      expect(ADDABLE_MEMBER_EVENT_TYPES.has('MEMBER_JOINED')).toBe(true);
      expect(ADDABLE_MEMBER_EVENT_TYPES.has('INVITATION_ACCEPTED')).toBe(true);
      expect(ADDABLE_MEMBER_EVENT_TYPES.has('MEMBER_REMOVED')).toBe(false);
      expect(ADDABLE_MEMBER_EVENT_TYPES.has('MEMBER_ROLE_UPDATED')).toBe(false);
    });
  });

  describe('removeRealtimeMember', () => {
    const baseMembers = [
      { groupMemberId: 1, userId: 11, fullName: 'Alice' },
      { groupMemberId: 2, userId: 12, fullName: 'Bob' },
      { groupMemberId: 3, userId: 13, fullName: 'Cara' },
    ];

    it('removes by removedUserId (BE payload key)', () => {
      const event = { type: 'MEMBER_REMOVED', removedUserId: 12 };
      const next = removeRealtimeMember(baseMembers, event);
      expect(next.length).toBe(2);
      expect(next.find((m) => m.userId === 12)).toBeUndefined();
    });

    it('removes by removedMemberId (BE payload key) even when removedUserId is missing', () => {
      const event = { type: 'MEMBER_REMOVED', removedMemberId: 3 };
      const next = removeRealtimeMember(baseMembers, event);
      expect(next.length).toBe(2);
      expect(next.find((m) => m.groupMemberId === 3)).toBeUndefined();
    });

    it('returns currentMembers untouched when payload has no removed ids', () => {
      const next = removeRealtimeMember(baseMembers, { type: 'MEMBER_REMOVED' });
      expect(next).toBe(baseMembers);
    });
  });
});
