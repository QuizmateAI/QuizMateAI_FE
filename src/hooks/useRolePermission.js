import { useMemo } from 'react';
import { getCurrentUser } from '@/api/Authentication';

export const ROLES = Object.freeze({
  USER: 'USER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
});

export const GROUP_ROLES = Object.freeze({
  LEADER: 'LEADER',
  CONTRIBUTOR: 'CONTRIBUTOR',
  MEMBER: 'MEMBER',
});

function normalizeRole(role) {
  return String(role || '').toUpperCase();
}

function matchesRole(role, allowed) {
  const target = normalizeRole(role);
  if (!target) return false;
  if (Array.isArray(allowed)) return allowed.map(normalizeRole).includes(target);
  return normalizeRole(allowed) === target;
}

export function hasRole(role, allowed) {
  return matchesRole(role, allowed);
}

export function isAdmin(user) {
  return matchesRole(user?.role, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
}

export function isSuperAdmin(user) {
  return matchesRole(user?.role, ROLES.SUPER_ADMIN);
}

export function isEndUser(user) {
  return matchesRole(user?.role, ROLES.USER);
}

export function isGroupLeader(groupRole) {
  return matchesRole(groupRole, GROUP_ROLES.LEADER);
}

export function isGroupContributor(groupRole) {
  return matchesRole(groupRole, [GROUP_ROLES.LEADER, GROUP_ROLES.CONTRIBUTOR]);
}

/**
 * Hook đọc user hiện tại từ localStorage và trả về tập cờ role tiện dụng.
 * Chỉ là UX gate — không thay thế cho kiểm tra backend.
 */
export function useRolePermission() {
  return useMemo(() => {
    const user = getCurrentUser();
    const role = normalizeRole(user?.role);
    return {
      user,
      role,
      isAuthenticated: Boolean(user),
      isAdmin: isAdmin(user),
      isSuperAdmin: isSuperAdmin(user),
      isEndUser: isEndUser(user),
      hasRole: (allowed) => matchesRole(role, allowed),
    };
  }, []);
}

/**
 * Hook tính quyền trong ngữ cảnh group (truyền groupRole từ props/context).
 */
export function useGroupRolePermission(groupRole) {
  return useMemo(() => {
    const normalized = normalizeRole(groupRole);
    return {
      role: normalized,
      isLeader: normalized === GROUP_ROLES.LEADER,
      isContributor: normalized === GROUP_ROLES.LEADER || normalized === GROUP_ROLES.CONTRIBUTOR,
      isMember: normalized === GROUP_ROLES.MEMBER,
      canEdit: normalized === GROUP_ROLES.LEADER || normalized === GROUP_ROLES.CONTRIBUTOR,
      canManageMembers: normalized === GROUP_ROLES.LEADER,
    };
  }, [groupRole]);
}
