/**
 * Human-readable group activity text; personalizes quiz assignment for the signed-in member when metadata is present.
 */
export function formatGroupLogDescription(log, currentUserId, lang = 'vi') {
  const uid = currentUserId != null ? Number(currentUserId) : null;
  const hasUid = uid != null && Number.isFinite(uid);

  const parseMeta = (raw) => {
    if (raw == null || raw === '') return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  };

  if (log?.action === 'QUIZ_AUDIENCE_UPDATED_IN_GROUP' && log?.metadata) {
    const m = parseMeta(log.metadata);
    if (m) {
      const title = m.quizTitle || (lang === 'en' ? 'Quiz' : 'Quiz');
      const leader = m.leaderName || (lang === 'en' ? 'A leader' : 'Leader');
      const mode = m.audienceMode;
      const ids = Array.isArray(m.assignedUserIds) ? m.assignedUserIds.map(Number) : [];
      if (mode === 'SELECTED_MEMBERS' && hasUid && ids.includes(uid)) {
        return lang === 'en'
          ? `${leader} assigned you the quiz «${title}».`
          : `${leader} đã giao bạn bài quiz «${title}».`;
      }
      if (mode === 'ALL_MEMBERS') {
        return lang === 'en'
          ? `${leader} set quiz «${title}» for the whole group.`
          : `${leader} đặt quiz «${title}» cho cả nhóm.`;
      }
      if (mode === 'SELECTED_MEMBERS' && ids.length) {
        return lang === 'en'
          ? `${leader} assigned quiz «${title}» to ${ids.length} member(s).`
          : `${leader} đã giao quiz «${title}» cho ${ids.length} thành viên.`;
      }
    }
  }

  if (log?.action === 'QUIZ_PUBLISHED_IN_GROUP' && log?.metadata) {
    const m = parseMeta(log.metadata);
    if (m) {
      const title = m.quizTitle || (lang === 'en' ? 'Quiz' : 'Quiz');
      const leader = m.leaderName || (lang === 'en' ? 'A leader' : 'Leader');
      const mode = m.audienceMode;
      const ids = Array.isArray(m.assignedUserIds) ? m.assignedUserIds.map(Number) : [];
      if (mode === 'SELECTED_MEMBERS' && hasUid && ids.includes(uid)) {
        return lang === 'en'
          ? `Quiz «${title}» is now published — open it when you are ready.`
          : `Quiz «${title}» đã được xuất bản — bạn có thể vào làm khi sẵn sàng.`;
      }
      if (mode === 'ALL_MEMBERS') {
        return lang === 'en'
          ? `${leader} published quiz «${title}» for everyone in the group.`
          : `${leader} đã xuất bản quiz «${title}» cho cả nhóm.`;
      }
    }
  }

  return (
    log?.description
    || (lang === 'en' ? 'Group activity updated' : 'Hoạt động nhóm được cập nhật')
  );
}
