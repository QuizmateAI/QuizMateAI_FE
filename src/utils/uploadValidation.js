export const AVATAR_MIME_WHITELIST = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const MATERIAL_EXACT_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

const MATERIAL_PREFIX_MIMES = Object.freeze(['image/', 'audio/', 'video/']);

const MATERIAL_EXT_TO_MIME = Object.freeze({
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
});

export const AVATAR_ACCEPT_ATTR = AVATAR_MIME_WHITELIST.join(',');
export const MATERIAL_ACCEPT_ATTR = Object.keys(MATERIAL_EXT_TO_MIME).join(',');

function inferMimeFromName(name) {
  const lower = (name || '').toLowerCase();
  const ext = Object.keys(MATERIAL_EXT_TO_MIME).find((e) => lower.endsWith(e));
  return ext ? MATERIAL_EXT_TO_MIME[ext] : null;
}

export function isMaterialMimeAllowed(mime) {
  const m = (mime || '').toLowerCase();
  if (!m) return false;
  if (MATERIAL_EXACT_MIMES.has(m)) return true;
  return MATERIAL_PREFIX_MIMES.some((p) => m.startsWith(p));
}

export function isAvatarMimeAllowed(mime) {
  const m = (mime || '').toLowerCase();
  return AVATAR_MIME_WHITELIST.includes(m);
}

export function validateAvatarFile(file) {
  if (!file) {
    return { ok: false, code: 'NO_FILE', message: 'Không có file được chọn.' };
  }
  if (!isAvatarMimeAllowed(file.type)) {
    return {
      ok: false,
      code: 'INVALID_TYPE',
      message: 'Avatar phải là ảnh JPEG, PNG, WebP hoặc GIF (không hỗ trợ SVG).',
    };
  }
  if (Number(file.size) > AVATAR_MAX_BYTES) {
    return { ok: false, code: 'TOO_LARGE', message: 'Avatar tối đa 5MB.' };
  }
  return { ok: true };
}

export function validateMaterialFile(file) {
  if (!file) {
    return { ok: false, code: 'NO_FILE', message: 'Không có file được chọn.' };
  }
  const mime = file.type || inferMimeFromName(file.name);
  if (!isMaterialMimeAllowed(mime)) {
    const label = file.type || file.name || 'unknown';
    return {
      ok: false,
      code: 'INVALID_TYPE',
      message: `Loại file không được hỗ trợ: ${label}`,
    };
  }
  return { ok: true };
}
