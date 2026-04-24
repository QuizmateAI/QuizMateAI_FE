import { describe, expect, it } from 'vitest';
import { resolveGroupUiPermissions } from '@/Pages/Users/Group/utils/groupPermissionView';

describe('groupPermissionView', () => {
  it('uses myGroupPermissions to override fallback gating', () => {
    const result = resolveGroupUiPermissions({
      myGroupPermissions: {
        canCreateQuiz: false,
        canCreateFlashcard: true,
        canCreateMockTest: false,
        canCreateRoadmap: false,
        canCreateChallenge: false,
        canUpload: true,
        canManageMembers: false,
        canViewMemberDashboard: true,
      },
      fallbackCanCreateContent: true,
      fallbackCanUploadSource: false,
      fallbackCanManageMembers: true,
      fallbackCanViewMemberDashboard: false,
    });

    expect(result.canCreateQuiz).toBe(false);
    expect(result.canCreateFlashcard).toBe(true);
    expect(result.canCreateMockTest).toBe(false);
    expect(result.canCreateRoadmap).toBe(false);
    expect(result.canCreateChallenge).toBe(false);
    expect(result.canCreateContent).toBe(true);
    expect(result.canUploadSource).toBe(true);
    expect(result.canManageMembers).toBe(false);
    expect(result.canViewMemberDashboard).toBe(true);
  });

  it('falls back to role-derived values when permissions are unavailable', () => {
    const result = resolveGroupUiPermissions({
      myGroupPermissions: null,
      fallbackCanCreateContent: true,
      fallbackCanUploadSource: true,
      fallbackCanManageMembers: false,
      fallbackCanViewMemberDashboard: false,
    });

    expect(result.canCreateQuiz).toBe(true);
    expect(result.canCreateFlashcard).toBe(true);
    expect(result.canCreateContent).toBe(true);
    expect(result.canUploadSource).toBe(true);
    expect(result.canManageMembers).toBe(false);
    expect(result.canViewMemberDashboard).toBe(false);
  });
});
