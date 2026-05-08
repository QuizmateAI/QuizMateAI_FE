function normalizeNonNegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.trunc(parsed);
}

function normalizePositiveInteger(value) {
  const parsed = normalizeNonNegativeInteger(value);
  if (parsed == null || parsed <= 0) return null;
  return parsed;
}

function pickFirstPositiveInteger(candidates = []) {
  for (const candidate of candidates) {
    const normalized = normalizePositiveInteger(candidate);
    if (normalized != null) return normalized;
  }
  return null;
}

export function normalizePendingInvitationSummary(payload) {
  const invitations = Array.isArray(payload?.invitations) ? payload.invitations : [];
  const normalizedCount = normalizeNonNegativeInteger(payload?.count);

  return {
    count: normalizedCount ?? invitations.length,
    invitations,
  };
}

export function resolveGroupMemberSeatLimit({ groupProfile, groupSubscription } = {}) {
  return pickFirstPositiveInteger([
    groupProfile?.maxMemberOverride,
    groupProfile?.maxMemberSlot,
    groupProfile?.memberSlotLimit,
    groupProfile?.freeMemberSlotLimit,
    groupSubscription?.maxMemberOverride,
    groupSubscription?.maxMemberSlot,
    groupSubscription?.memberSlotLimit,
    groupSubscription?.freeMemberSlotLimit,
    groupSubscription?.planLimit?.maxMemberSlot,
    groupSubscription?.planLimit?.memberSlotLimit,
    groupSubscription?.plan?.maxMemberOverride,
    groupSubscription?.plan?.maxMemberSlot,
    groupSubscription?.plan?.memberSlotLimit,
    groupSubscription?.plan?.freeMemberSlotLimit,
    groupSubscription?.plan?.planLimit?.maxMemberSlot,
    groupSubscription?.plan?.planLimit?.memberSlotLimit,
    groupSubscription?.plan?.entitlement?.maxMemberSlot,
    groupSubscription?.plan?.entitlement?.memberSlotLimit,
    groupSubscription?.plan?.entitlement?.freeMemberSlotLimit,
    groupSubscription?.entitlement?.maxMemberSlot,
    groupSubscription?.entitlement?.memberSlotLimit,
    groupSubscription?.entitlement?.freeMemberSlotLimit,
    groupSubscription?.workspaceConfig?.freeMemberSlotLimit,
    groupSubscription?.config?.freeMemberSlotLimit,
  ]);
}

export function buildGroupMemberSeatSummary({
  groupProfile,
  groupSubscription,
  members = [],
  fallbackAcceptedCount = null,
  pendingInvitations,
} = {}) {
  const limit = resolveGroupMemberSeatLimit({ groupProfile, groupSubscription });
  const normalizedPending = normalizePendingInvitationSummary(pendingInvitations);
  const acceptedCandidates = [
    fallbackAcceptedCount,
    Array.isArray(members) ? members.length : null,
  ]
    .map((candidate) => normalizeNonNegativeInteger(candidate))
    .filter((candidate) => candidate != null);

  const acceptedCount = acceptedCandidates.length > 0 ? Math.max(...acceptedCandidates) : 0;
  const pendingCount = normalizedPending.count;
  const usedCount = acceptedCount + pendingCount;
  const remainingCount = limit == null ? null : Math.max(0, limit - usedCount);
  const overLimitBy = limit == null ? 0 : Math.max(0, usedCount - limit);

  return {
    limit,
    acceptedCount,
    pendingCount,
    usedCount,
    remainingCount,
    overLimitBy,
    isAtLimit: limit != null && usedCount >= limit,
    isOverLimit: limit != null && usedCount > limit,
  };
}

export function buildMemberSeatLimitErrorMessage(t, seatSummary) {
  const limit = Number(seatSummary?.limit);
  if (!Number.isFinite(limit) || limit <= 0) {
    return t('groupWorkspacePage.errors.memberSeatLimitUnknown', 'Nhóm đã đạt giới hạn thành viên của gói hiện tại.');
  }

  const used = Number.isFinite(Number(seatSummary?.usedCount)) ? Number(seatSummary.usedCount) : limit;
  const pending = Number.isFinite(Number(seatSummary?.pendingCount)) ? Number(seatSummary.pendingCount) : 0;
  const overLimitBy = Number.isFinite(Number(seatSummary?.overLimitBy)) ? Number(seatSummary.overLimitBy) : 0;

  if (overLimitBy > 0) {
    return t('groupWorkspacePage.errors.memberSeatLimitExceeded', {
      used,
      limit,
      overLimitBy,
      defaultValue: `Nhóm đang vượt ${overLimitBy} slot thành viên so với giới hạn ${limit}. Hãy giảm thành viên hoặc hủy lời mời chờ trước khi mời thêm.`,
    });
  }

  return t('groupWorkspacePage.errors.memberSeatLimitReached', {
    used,
    limit,
    pending,
    defaultValue: `Nhóm đã dùng hết ${used}/${limit} slot thành viên. Hãy hủy ${pending > 0 ? 'lời mời chờ hoặc ' : ''}nâng cấp gói trước khi mời thêm.`,
  });
}
