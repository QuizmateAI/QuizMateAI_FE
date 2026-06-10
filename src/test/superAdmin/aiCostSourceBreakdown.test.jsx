import { describe, expect, it } from 'vitest';
import {
  getAiCostSourceMetrics,
  resolveAiCostAudience,
} from '@/pages/SuperAdmin/Components/AiCostSourceBreakdown';

describe('AiCostSourceBreakdown helpers', () => {
  it('splits provider cost into free, user-plan, and group-plan buckets', () => {
    const metrics = getAiCostSourceMetrics({
      totalChargedVnd: 620_200,
      totalProviderCostVnd: 159_079,
      freeUserProviderCostVnd: 1_085,
      userPlanProviderCostVnd: 100_678,
      groupPlanProviderCostVnd: 57_316,
      freeUserChargedVnd: 0,
      userPlanChargedVnd: 509_285,
      groupPlanChargedVnd: 110_915,
    });

    expect(metrics.freeUserProviderCostVnd).toBe(1_085);
    expect(metrics.userPlanProviderCostVnd).toBe(100_678);
    expect(metrics.groupPlanProviderCostVnd).toBe(57_316);
    expect(metrics.userPlanMarginVnd).toBe(408_607);
    expect(metrics.groupPlanMarginVnd).toBe(53_599);
    expect(metrics.freeUserProfitImpactVnd).toBe(-1_085);
  });

  it('resolves audience from plan scope and free plan name', () => {
    expect(resolveAiCostAudience({ planDisplayName: 'Free' })).toBe('freeUser');
    expect(resolveAiCostAudience({})).toBe('freeUser');
    expect(resolveAiCostAudience({ planDisplayName: 'User Pro', planScope: 'USER' })).toBe('userPlan');
    expect(resolveAiCostAudience({ planDisplayName: 'User Pro', chargedCredit: 20 })).toBe('userPlan');
    expect(resolveAiCostAudience({ planDisplayName: 'TEAM', planScope: 'WORKSPACE' })).toBe('groupPlan');
    expect(resolveAiCostAudience({ planDisplayName: 'Team', planScope: 'GROUP_WORKSPACE' })).toBe('groupPlan');
  });

  it('resolves group plans from charge scope, workspace charge, and team catalog', () => {
    expect(resolveAiCostAudience({
      planDisplayName: 'Team',
      planCode: 'TEAM',
      chargeScope: 'WORKSPACE',
    })).toBe('groupPlan');
    expect(resolveAiCostAudience({
      planDisplayName: 'Team',
      chargedWorkspaceId: 42,
    })).toBe('groupPlan');
    expect(resolveAiCostAudience({
      planDisplayName: 'Team',
      planCode: 'TEAM',
    })).toBe('groupPlan');
    expect(resolveAiCostAudience({
      planDisplayName: 'Titanium',
      planCode: 'TITANIUM',
      chargeScope: 'USER',
    })).toBe('userPlan');
  });
});
