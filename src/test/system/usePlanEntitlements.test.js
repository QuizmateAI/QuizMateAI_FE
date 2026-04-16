import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlanEntitlements } from '@/hooks/usePlanEntitlements';

vi.mock('@/api/ManagementSystemAPI', () => ({
  getCurrentUserPlan: vi.fn(),
}));

import { getCurrentUserPlan } from '@/api/ManagementSystemAPI';

function createCurrentPlanResponse(canCreateRoadMap) {
  return {
    data: {
      data: {
        planAssignmentId: 1,
        defaultPlan: true,
        plan: {
          planCatalogId: 10,
          displayName: 'Free',
          entitlement: {
            canCreateRoadMap,
            hasWorkspaceAnalytics: false,
            maxIndividualWorkspace: 3,
            maxMaterialInWorkspace: 5,
          },
        },
      },
    },
  };
}

describe('usePlanEntitlements', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('parses entitlements from the current-plan ApiResponse shape', async () => {
    vi.mocked(getCurrentUserPlan).mockResolvedValue(createCurrentPlanResponse(false));

    const { result } = renderHook(() => usePlanEntitlements());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.canCreateRoadmap).toBe(false);
    });

    expect(result.current.maxWorkspaces).toBe(3);
    expect(result.current.maxMaterialsPerWorkspace).toBe(5);
  });

  it('revalidates cached entitlements and replaces stale roadmap access', async () => {
    window.sessionStorage.setItem(
      'quizmate_plan_entitlements',
      JSON.stringify({
        entitlements: {
          canCreateRoadMap: true,
          maxIndividualWorkspace: 10,
          maxMaterialInWorkspace: 20,
        },
        expiresAt: Date.now() + 60_000,
      }),
    );
    vi.mocked(getCurrentUserPlan).mockResolvedValue(createCurrentPlanResponse(false));

    const { result } = renderHook(() => usePlanEntitlements());

    expect(result.current.loading).toBe(false);
    expect(result.current.canCreateRoadmap).toBe(true);

    await waitFor(() => {
      expect(result.current.canCreateRoadmap).toBe(false);
    });

    const cached = JSON.parse(window.sessionStorage.getItem('quizmate_plan_entitlements'));
    expect(cached.entitlements.canCreateRoadMap).toBe(false);
  });
});
