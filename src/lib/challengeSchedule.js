/** Wall-clock local schedule helpers for group challenges (đồng bộ BE LocalDateTime). */

export const CHALLENGE_MIN_LEAD_DAYS = 0;
export const CHALLENGE_MIN_DURATION_HOURS = 3;
export const CHALLENGE_MIN_DURATION_MINUTES = CHALLENGE_MIN_DURATION_HOURS * 60;

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toDateInputValue(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function toTimeInputValue(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Mặc định: hiện tại + 30 phút, làm tròn lên 5 phút. */
export function defaultStartParts() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30, 0, 0);
  const remainder = d.getMinutes() % 5;
  if (remainder > 0) d.setMinutes(d.getMinutes() + (5 - remainder));
  return { dateStr: toDateInputValue(d), timeStr: toTimeInputValue(d) };
}

/**
 * Đảm bảo start không nằm trong quá khứ.
 * Nếu start hợp lệ (>= now + 5 phút) → giữ nguyên.
 * Nếu start trong quá khứ hoặc invalid → trả về defaultStartParts().
 */
export function clampStartToFutureParts(dateStr, timeStr) {
  const ms = parseLocalDateTimeToMs(dateStr, timeStr);
  const minMs = Date.now() + 5 * 60 * 1000;
  if (!Number.isFinite(ms) || ms < minMs) {
    return defaultStartParts();
  }
  return { dateStr, timeStr };
}

/**
 * Smart bump: chỉ chỉnh end nếu duration < min (3 tiếng), giữ end của user nếu đã đủ.
 * Nếu end chưa nhập → set end = start + 3h.
 */
export function bumpEndIfTooClose(startDate, startTime, endDate, endTime) {
  const startMs = parseLocalDateTimeToMs(startDate, startTime);
  if (!Number.isFinite(startMs)) {
    return { dateStr: endDate, timeStr: endTime };
  }
  const minEndMs = startMs + CHALLENGE_MIN_DURATION_MINUTES * 60 * 1000;
  const endMs = parseLocalDateTimeToMs(endDate, endTime);
  if (!Number.isFinite(endMs) || endMs < minEndMs) {
    return defaultEndPartsFromStart(startDate, startTime);
  }
  return { dateStr: endDate, timeStr: endTime };
}

/** Kết thúc = bắt đầu + min duration (3 tiếng). */
export function defaultEndPartsFromStart(dateStr, timeStr) {
  const ms = parseLocalDateTimeToMs(dateStr, timeStr);
  if (!Number.isFinite(ms)) {
    return defaultStartParts();
  }
  const d = new Date(ms + CHALLENGE_MIN_DURATION_MINUTES * 60 * 1000);
  return { dateStr: toDateInputValue(d), timeStr: toTimeInputValue(d) };
}

export function parseLocalDateTimeToMs(dateStr, timeStr) {
  if (!dateStr || timeStr == null || timeStr === '') return NaN;
  const parts = dateStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const day = parts[2];
  const timeParts = String(timeStr).split(':');
  const hh = Number(timeParts[0]);
  const mm = Number(timeParts[1] ?? 0);
  if (![y, m, day].every((n) => Number.isFinite(n))) return NaN;
  const h = Number.isFinite(hh) ? hh : 0;
  const mi = Number.isFinite(mm) ? mm : 0;
  const dt = new Date(y, m - 1, day, h, mi, 0, 0);
  return dt.getTime();
}

/** Chuỗi gửi API: yyyy-MM-ddTHH:mm:ss */
export function combineToBackendPayload(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const t = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr}T${t}`;
}

export function isoToDateTimeParts(iso) {
  if (!iso) return { dateStr: '', timeStr: '09:00' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { dateStr: '', timeStr: '09:00' };
  return { dateStr: toDateInputValue(d), timeStr: toTimeInputValue(d) };
}

export function minDateStringPlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateInputValue(d);
}

/**
 * @returns {string[]} issue keys: endBeforeStart | shortWindow | startTooSoon | pastStart | pastEnd | invalid
 */
export function getScheduleValidationIssues(startDate, startTime, endDate, endTime) {
  const issues = [];
  const startMs = parseLocalDateTimeToMs(startDate, startTime);
  const endMs = parseLocalDateTimeToMs(endDate, endTime);
  const nowMs = Date.now();

  if (!startDate || startTime == null || startTime === '' || !endDate || endTime == null || endTime === '') {
    return issues;
  }
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    issues.push('invalid');
    return issues;
  }
  if (startMs < nowMs) issues.push('pastStart');
  if (endMs < nowMs) issues.push('pastEnd');
  if (endMs <= startMs) issues.push('endBeforeStart');
  if ((endMs - startMs) < CHALLENGE_MIN_DURATION_MINUTES * 60 * 1000) issues.push('shortWindow');
  return issues;
}
