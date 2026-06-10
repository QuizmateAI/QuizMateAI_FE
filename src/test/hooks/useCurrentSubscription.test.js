import { beforeEach, describe, expect, it } from 'vitest';
import {
  createPlanSummaryFromPurchase,
  createPlanSummaryFromSubscription,
  isPersonalPlanPurchase,
  resolvePersonalPlanSummary,
  resolvePlanTypeFromSubscription,
} from '@/hooks/useCurrentSubscription';

describe('useCurrentSubscription helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('treats workspace-bound subscriptions as group plans', () => {
    expect(resolvePlanTypeFromSubscription({
      workspaceId: 42,
      plan: { displayName: 'Team', planScope: 'USER' },
    })).toBe('GROUP');
  });

  it('hides group plans from the personal header summary', () => {
    const summary = createPlanSummaryFromSubscription({
      plan: {
        displayName: 'Team',
        planScope: 'WORKSPACE',
      },
      endDate: '2026-12-31T00:00:00Z',
    });

    expect(summary?.planType).toBe('GROUP');
    expect(resolvePersonalPlanSummary({
      plan: {
        displayName: 'Team',
        planScope: 'WORKSPACE',
      },
      endDate: '2026-12-31T00:00:00Z',
    })).toBeNull();
  });

  it('keeps individual plans in the personal header summary', () => {
    const summary = resolvePersonalPlanSummary({
      plan: {
        displayName: 'Titanium',
        planScope: 'USER',
        entitlement: { maxIndividualWorkspace: 5 },
      },
      endDate: '2026-08-15T00:00:00Z',
      status: 'ACTIVE',
    });

    expect(summary).toMatchObject({
      planName: 'Titanium',
      planType: 'INDIVIDUAL',
      endDate: '2026-08-15T00:00:00Z',
      source: 'subscription',
    });
  });

  it('does not treat recent credit purchases as the active personal plan', () => {
    window.localStorage.setItem('quizmate_recent_plan_purchase', JSON.stringify({
      purchaseType: 'CREDIT',
      creditPackageId: '9',
      planName: 'Mega 5000 credit',
      planType: 'INDIVIDUAL',
      timestamp: Date.now(),
    }));

    const summary = resolvePersonalPlanSummary({
      plan: {
        displayName: 'Titanium',
        planScope: 'USER',
        entitlement: { maxIndividualWorkspace: 5 },
      },
      endDate: '2026-08-15T00:00:00Z',
    });

    expect(summary?.planName).toBe('Titanium');
    expect(summary?.endDate).toBe('2026-08-15T00:00:00Z');
  });

  it('uses subscription end date when a recent personal plan purchase is still syncing', () => {
    window.localStorage.setItem('quizmate_recent_plan_purchase', JSON.stringify({
      purchaseType: 'PLAN',
      planId: '12',
      planName: 'Pro',
      planType: 'INDIVIDUAL',
      timestamp: Date.now(),
    }));

    const summary = resolvePersonalPlanSummary({
      plan: {
        displayName: 'Free',
        planScope: 'USER',
        entitlement: { maxIndividualWorkspace: 1 },
      },
      endDate: '2026-09-01T00:00:00Z',
      status: 'ACTIVE',
    });

    expect(summary).toMatchObject({
      planName: 'Pro',
      planType: 'INDIVIDUAL',
      endDate: '2026-09-01T00:00:00Z',
      source: 'recent-purchase',
    });
  });

  it('rejects group and workspace-scoped recent purchases', () => {
    expect(isPersonalPlanPurchase({
      purchaseType: 'PLAN',
      planName: 'Team',
      planType: 'GROUP',
    })).toBe(false);

    expect(isPersonalPlanPurchase({
      purchaseType: 'PLAN',
      planName: 'Team',
      planType: 'INDIVIDUAL',
      workspaceId: '77',
    })).toBe(false);

    expect(createPlanSummaryFromPurchase({
      purchaseType: 'CREDIT',
      planName: 'Mega 5000 credit',
      planType: 'INDIVIDUAL',
    })).toMatchObject({
      planName: 'Mega 5000 credit',
      planType: 'INDIVIDUAL',
    });
  });
});
