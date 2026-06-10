import { describe, expect, it } from 'vitest';
import {
  buildAiCreditPolicyBreakdown,
  calculateAiCreditCostFromPolicy,
  ceilPolicyUnits,
  resolveCreditPolicySource,
} from '@/lib/aiCreditPolicyFormula';

const t = (key, fallback, options) => {
  if (options && typeof fallback === 'string') {
    return Object.entries(options).reduce(
      (text, [name, value]) => text.replace(new RegExp(`{{${name}}}`, 'g'), String(value)),
      fallback,
    );
  }
  return typeof fallback === 'string' ? fallback : key;
};

describe('aiCreditPolicyFormula', () => {
  it('calculates variable policy credits with ceil units', () => {
    const result = calculateAiCreditCostFromPolicy({
      costMode: 'PER_QUESTION',
      baseCreditCost: 5,
      unitCreditCost: 1,
      unitSize: 1,
    }, 10);

    expect(ceilPolicyUnits(10, 1)).toBe(10);
    expect(result).toMatchObject({
      total: 15,
      units: 10,
      quantity: 10,
    });
  });

  it('builds a readable breakdown for quiz generation', () => {
    const breakdown = buildAiCreditPolicyBreakdown({
      row: {
        actionKey: 'GENERATE_QUIZ',
        quantity: 10,
        chargedCredit: 15,
        formulaCreditCost: 15,
        policyCostMode: 'PER_QUESTION',
        policyBaseCreditCost: 5,
        policyUnitCreditCost: 1,
        policyUnitSize: 1,
        policyDisplayName: 'Tạo bài kiểm tra',
      },
      policy: resolveCreditPolicySource({
        actionKey: 'GENERATE_QUIZ',
        policyCostMode: 'PER_QUESTION',
        policyBaseCreditCost: 5,
        policyUnitCreditCost: 1,
        policyUnitSize: 1,
        policyDisplayName: 'Tạo bài kiểm tra',
      }, {}),
      t,
    });

    expect(breakdown.hasPolicy).toBe(true);
    expect(breakdown.formulaLine).toContain('5 + 1');
    expect(breakdown.formulaLine).toContain('= 15 credit');
    expect(breakdown.policyDrift).toBe(false);
  });

  it('flags policy drift when stored credits differ from current formula', () => {
    const breakdown = buildAiCreditPolicyBreakdown({
      row: {
        actionKey: 'GENERATE_QUIZ',
        quantity: 10,
        chargedCredit: 20,
        formulaCreditCost: 20,
        policyCostMode: 'PER_QUESTION',
        policyBaseCreditCost: 5,
        policyUnitCreditCost: 1,
        policyUnitSize: 1,
      },
      policy: {
        costMode: 'PER_QUESTION',
        baseCreditCost: 5,
        unitCreditCost: 1,
        unitSize: 1,
      },
      t,
    });

    expect(breakdown.policyDrift).toBe(true);
  });
});
