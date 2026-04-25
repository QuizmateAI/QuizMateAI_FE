import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useRolePermission,
  useGroupRolePermission,
  hasRole,
  isAdmin,
  isSuperAdmin,
  isEndUser,
  isGroupLeader,
  isGroupContributor,
  ROLES,
  GROUP_ROLES,
} from '@/hooks/useRolePermission';

function setUser(user) {
  window.localStorage.setItem('user', JSON.stringify(user));
}

describe('useRolePermission helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('hasRole is case-insensitive and handles arrays', () => {
    expect(hasRole('admin', ROLES.ADMIN)).toBe(true);
    expect(hasRole('ADMIN', [ROLES.ADMIN, ROLES.SUPER_ADMIN])).toBe(true);
    expect(hasRole('user', [ROLES.ADMIN])).toBe(false);
    expect(hasRole(null, ROLES.USER)).toBe(false);
  });

  it('isAdmin covers ADMIN and SUPER_ADMIN', () => {
    expect(isAdmin({ role: 'ADMIN' })).toBe(true);
    expect(isAdmin({ role: 'SUPER_ADMIN' })).toBe(true);
    expect(isAdmin({ role: 'USER' })).toBe(false);
    expect(isSuperAdmin({ role: 'ADMIN' })).toBe(false);
    expect(isSuperAdmin({ role: 'SUPER_ADMIN' })).toBe(true);
    expect(isEndUser({ role: 'USER' })).toBe(true);
  });

  it('group helpers distinguish leader and contributor', () => {
    expect(isGroupLeader(GROUP_ROLES.LEADER)).toBe(true);
    expect(isGroupLeader(GROUP_ROLES.CONTRIBUTOR)).toBe(false);
    expect(isGroupContributor(GROUP_ROLES.LEADER)).toBe(true);
    expect(isGroupContributor(GROUP_ROLES.CONTRIBUTOR)).toBe(true);
    expect(isGroupContributor(GROUP_ROLES.MEMBER)).toBe(false);
  });
});

describe('useRolePermission hook', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns unauthenticated state when no user', () => {
    const { result } = renderHook(() => useRolePermission());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.role).toBe('');
  });

  it('exposes admin flag for ADMIN role', () => {
    setUser({ role: 'ADMIN' });
    const { result } = renderHook(() => useRolePermission());
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.hasRole('ADMIN')).toBe(true);
  });

  it('exposes super admin flag', () => {
    setUser({ role: 'SUPER_ADMIN' });
    const { result } = renderHook(() => useRolePermission());
    expect(result.current.isSuperAdmin).toBe(true);
    expect(result.current.isAdmin).toBe(true);
  });
});

describe('useGroupRolePermission', () => {
  it('derives canEdit / canManageMembers from group role', () => {
    const { result: leader } = renderHook(() => useGroupRolePermission('LEADER'));
    expect(leader.current.canEdit).toBe(true);
    expect(leader.current.canManageMembers).toBe(true);

    const { result: contrib } = renderHook(() => useGroupRolePermission('CONTRIBUTOR'));
    expect(contrib.current.canEdit).toBe(true);
    expect(contrib.current.canManageMembers).toBe(false);

    const { result: member } = renderHook(() => useGroupRolePermission('MEMBER'));
    expect(member.current.canEdit).toBe(false);
    expect(member.current.canManageMembers).toBe(false);
  });
});
