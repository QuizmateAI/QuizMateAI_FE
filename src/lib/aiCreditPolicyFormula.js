export function ceilPolicyUnits(quantity, unitSize) {
  const qty = Math.max(0, Number(quantity) || 0);
  const size = Math.max(1, Number(unitSize) || 1);
  return Math.ceil(qty / size);
}

export function normalizeAiCreditPolicy(source) {
  if (!source) return null;

  const costMode = source.costMode || source.policyCostMode || null;
  if (!costMode) return null;

  return {
    costMode,
    baseCreditCost: Number(source.baseCreditCost ?? source.policyBaseCreditCost ?? 0),
    unitCreditCost: Number(source.unitCreditCost ?? source.policyUnitCreditCost ?? 0),
    unitSize: Math.max(1, Number(source.unitSize ?? source.policyUnitSize ?? 1)),
    displayName: source.displayName || source.policyDisplayName || null,
  };
}

export function calculateAiCreditCostFromPolicy(policy, quantity = 1) {
  const normalized = normalizeAiCreditPolicy(policy);
  if (!normalized) return null;

  const qty = Math.max(0, Number(quantity) || 0);
  const { costMode, baseCreditCost, unitCreditCost, unitSize } = normalized;

  if (costMode === 'FIXED') {
    return {
      ...normalized,
      quantity: qty,
      units: 0,
      total: baseCreditCost,
    };
  }

  const units = ceilPolicyUnits(qty, unitSize);
  return {
    ...normalized,
    quantity: qty,
    units,
    total: baseCreditCost + units * unitCreditCost,
  };
}

export function resolveCreditPolicySource(row, policiesByActionKey) {
  const fromRow = normalizeAiCreditPolicy(row);
  if (fromRow) return fromRow;

  const fromCatalog = policiesByActionKey?.[row?.actionKey];
  return normalizeAiCreditPolicy(fromCatalog);
}

export function buildAiCreditPolicyBreakdown({ row, policy, t }) {
  const quantity = Number(row?.quantity ?? 0);
  const chargedCredit = Number(row?.formulaCreditCost ?? row?.chargedCredit ?? 0);
  const calculation = calculateAiCreditCostFromPolicy(policy, quantity);

  if (!calculation || !t) {
    return {
      hasPolicy: false,
      quantity,
      chargedCredit,
      calculation: null,
      policyDrift: false,
    };
  }

  const unitLabel = t(`aiActionPolicy.costModeUnit.${calculation.costMode}`, calculation.costMode);
  const costModeLabel = t(`aiActionPolicy.costMode.${calculation.costMode}`, calculation.costMode);
  const creditUnit = t('aiActionPolicy.creditUnit', 'credit');
  const actionLabel = calculation.displayName || row?.actionKey || '-';

  let formulaLine;
  let detailLines = [];

  if (calculation.costMode === 'FIXED') {
    formulaLine = `${calculation.baseCreditCost} ${creditUnit}`;
    detailLines = [
      t('aiActionPolicy.formulaFixedNote', 'cố định mỗi lần sử dụng'),
    ];
  } else {
    formulaLine = `${calculation.baseCreditCost} + ${calculation.unitCreditCost} × ceil(${quantity} ${unitLabel} / ${calculation.unitSize}) = ${calculation.total} ${creditUnit}`;
    detailLines = [
      `ceil(${quantity} / ${calculation.unitSize}) = ${calculation.units}`,
      `${calculation.baseCreditCost} + ${calculation.units} × ${calculation.unitCreditCost} = ${calculation.total} ${creditUnit}`,
    ];
  }

  const policyDrift = chargedCredit > 0 && calculation.total !== chargedCredit;

  return {
    hasPolicy: true,
    quantity,
    chargedCredit,
    calculation,
    actionLabel,
    costModeLabel,
    unitLabel,
    formulaLine,
    detailLines,
    policyDrift,
    creditUnit,
  };
}
