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
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'image/png',
  'audio/mpeg',
  'video/mp4',
]);

const MATERIAL_EXT_TO_MIME = Object.freeze({
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
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
  return MATERIAL_EXACT_MIMES.has(m);
}

export function isAvatarMimeAllowed(mime) {
  const m = (mime || '').toLowerCase();
  return AVATAR_MIME_WHITELIST.includes(m);
}

export function validateAvatarFile(file) {
  if (!file) {
    return { ok: false, code: 'NO_FILE', message: 'Khong co file duoc chon.' };
  }
  if (!isAvatarMimeAllowed(file.type)) {
    return {
      ok: false,
      code: 'INVALID_TYPE',
      message: 'Avatar phai la anh JPEG, PNG, WebP hoac GIF (khong ho tro SVG).',
    };
  }
  if (Number(file.size) > AVATAR_MAX_BYTES) {
    return { ok: false, code: 'TOO_LARGE', message: 'Avatar toi da 5MB.' };
  }
  return { ok: true };
}

export function validateMaterialFile(file) {
  if (!file) {
    return { ok: false, code: 'NO_FILE', message: 'Khong co file duoc chon.' };
  }

  const inferredMime = inferMimeFromName(file.name);
  const mime = file.type || inferredMime;

  if (!inferredMime) {
    const label = file.name || 'unknown';
    return {
      ok: false,
      code: 'INVALID_EXTENSION',
      message: `Duoi file khong hop le: ${label}. Chi ho tro: pdf, docx, doc, pptx, ppt, xlsx, xls, txt, png, mp3, mp4.`,
    };
  }

  if (!isMaterialMimeAllowed(mime)) {
    const label = file.type || file.name || 'unknown';
    return {
      ok: false,
      code: 'INVALID_TYPE',
      message: `Loai file khong duoc ho tro: ${label}. Chi ho tro: pdf, docx, doc, pptx, ppt, xlsx, xls, txt, png, mp3, mp4.`,
    };
  }

  return { ok: true };
}
