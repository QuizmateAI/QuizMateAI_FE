// Helpers thuần cho realtime payload của group members.
//
// Dùng bởi GroupWorkspacePage.handleGroupRealtime để diff state `members`
// theo các WS event đến từ `/topic/workspace/{wsId}/group`. Tách ra utils
// thay vì để inline trong page (4000+ dòng) cho dễ test và tái sử dụng.

export function resolveMemberUserId(member = {}) {
  return member.userId
    ?? member.userID
    ?? member.memberUserId
    ?? member.user?.userId
    ?? member.user?.userID
    ?? null;
}

export function resolveWorkspaceMemberId(member = {}) {
  return member.groupMemberId
    ?? member.workspaceMemberId
    ?? member.memberId
    ?? member.id
    ?? null;
}

export function hasMemberIdentity(value) {
  return Boolean(resolveMemberUserId(value) != null || resolveWorkspaceMemberId(value) != null);
}

export function extractRealtimeMemberPayload(event = {}) {
  const candidates = [
    event?.member,
    event?.workspaceMember,
    event?.groupMember,
    event?.payload?.member,
    event?.payload?.workspaceMember,
    event?.data?.member,
    event?.data?.workspaceMember,
    event?.data?.groupMember,
    event?.user,
  ];

  const nested = candidates.find((candidate) => candidate && typeof candidate === 'object' && hasMemberIdentity(candidate));
  if (nested) return nested;

  const eventLooksLikeMemberPatch = (
    hasMemberIdentity(event)
    && (
      event.onlineStatus != null
      || event.presenceStatus != null
      || event.activityStatus != null
      || event.memberStatus != null
      || event.status != null
      || event.lastActiveAt != null
      || event.lastActivityAt != null
      || event.lastSeenAt != null
      || event.lastLoginAt != null
      || event.role != null
      || event.canUpload != null
    )
  );

  return eventLooksLikeMemberPatch ? event : null;
}

// Event types được phép tự động chèn member mới vào danh sách. Các event
// khác (presence/role/permission update) chỉ MERGE khi member đã có sẵn —
// tránh trường hợp event đến trễ ngay sau MEMBER_REMOVED tự động chèn lại
// member vừa bị kick → UI không cập nhật cho tới khi reload.
export const ADDABLE_MEMBER_EVENT_TYPES = new Set([
  'MEMBER_JOINED',
  'INVITATION_ACCEPTED',
]);

export function mergeRealtimeMember(currentMembers, incomingMember, eventType = null) {
  if (!incomingMember || typeof incomingMember !== 'object') return currentMembers;

  const incomingUserId = resolveMemberUserId(incomingMember);
  const incomingMemberId = resolveWorkspaceMemberId(incomingMember);
  let matched = false;

  const nextMembers = currentMembers.map((member) => {
    const sameUser = incomingUserId != null && String(resolveMemberUserId(member)) === String(incomingUserId);
    const sameMember = incomingMemberId != null && String(resolveWorkspaceMemberId(member)) === String(incomingMemberId);
    if (!sameUser && !sameMember) return member;

    matched = true;
    return {
      ...member,
      ...incomingMember,
      userId: member.userId ?? incomingUserId,
      groupMemberId: member.groupMemberId ?? incomingMember.groupMemberId,
    };
  });

  if (matched) return nextMembers;

  const normalizedEventType = eventType ? String(eventType).toUpperCase() : '';
  if (!ADDABLE_MEMBER_EVENT_TYPES.has(normalizedEventType)) {
    return nextMembers;
  }

  const incomingStatus = String(incomingMember.status || incomingMember.memberStatus || '').toUpperCase();
  const looksRemoved = incomingMember.leftAt != null
    || incomingStatus === 'REMOVED'
    || incomingStatus === 'INACTIVE';
  if (looksRemoved) return nextMembers;

  const hasEnoughMemberShape = incomingMember.fullName
    || incomingMember.username
    || incomingMember.email
    || incomingMember.role;
  return hasEnoughMemberShape ? [incomingMember, ...nextMembers] : nextMembers;
}

export function removeRealtimeMember(currentMembers, event = {}) {
  const removedUserId = event.removedUserId
    ?? event.userId
    ?? event.userID
    ?? event.memberUserId
    ?? event?.member?.userId
    ?? null;
  const removedMemberId = event.removedMemberId
    ?? event.groupMemberId
    ?? event.workspaceMemberId
    ?? event.memberId
    ?? event?.member?.groupMemberId
    ?? null;

  if (removedUserId == null && removedMemberId == null) return currentMembers;

  return currentMembers.filter((member) => {
    const sameUser = removedUserId != null && String(resolveMemberUserId(member)) === String(removedUserId);
    const sameMember = removedMemberId != null && String(resolveWorkspaceMemberId(member)) === String(removedMemberId);
    return !sameUser && !sameMember;
  });
}
