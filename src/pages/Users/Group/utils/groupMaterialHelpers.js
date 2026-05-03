// Helpers thuần cho material/upload flow của group workspace.
// Một số hàm phụ thuộc vào i18nInstance để dịch chuỗi user-facing
// (toast/queue messages); phần còn lại là pure functions.

import i18nInstance from '@/i18n';

export const GROUP_UPLOAD_ACCEPTED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
  '.mp3',
  '.mp4',
]);

export function clampPercent(percent) {
  return Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
}

export function normalizePositiveIds(ids = []) {
  return Array.from(new Set((ids || [])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)));
}

export function normalizeMaterialStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'WARNED') return 'WARN';
  if (normalized === 'REJECTED') return 'REJECT';
  return normalized;
}

export function isProcessingMaterialStatus(status) {
  return ['UPLOADING', 'PROCESSING', 'PENDING', 'QUEUED'].includes(normalizeMaterialStatus(status));
}

export function isReviewableMaterialStatus(status) {
  return ['ACTIVE', 'WARN'].includes(normalizeMaterialStatus(status));
}

export function isTerminalMaterialStatus(status) {
  return ['ACTIVE', 'WARN', 'ERROR', 'REJECT', 'DELETED'].includes(normalizeMaterialStatus(status));
}

export function resolveNeedReviewFlag(...candidates) {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    return Boolean(candidate);
  }
  return true;
}

export function compactToastFilename(name, maxLength = 44) {
  const safeName = String(name || '').trim();
  if (!safeName || safeName.length <= maxLength) return safeName;

  const extensionIndex = safeName.lastIndexOf('.');
  const hasExtension = extensionIndex > 0 && extensionIndex >= safeName.length - 8;
  const extension = hasExtension ? safeName.slice(extensionIndex) : '';
  const availableLength = Math.max(12, maxLength - extension.length - 3);
  return `${safeName.slice(0, availableLength)}...${extension}`;
}

export function normalizeUploadFailureReason(message, lang = 'vi') {
  const rawMessage = String(message || '').replace(/\s+/g, ' ').trim();
  const t = i18nInstance.t.bind(i18nInstance);
  if (!rawMessage) {
    return t('groupWorkspacePage.upload.failedDefault', 'Upload failed.', { lng: lang });
  }

  const qmcMatch = rawMessage.match(/(?:can|cần|need)\s*(\d+)\s*QMC.*?(?:hien co|hiện có|available|currently)\s*(\d+)\s*QMC/i);
  const workspaceCreditIssue = /credit workspace|workspace credit|QMC/i.test(rawMessage);
  if (qmcMatch && workspaceCreditIssue) {
    const needed = qmcMatch[1];
    const available = qmcMatch[2];
    return t('groupWorkspacePage.upload.insufficientCredit', 'Not enough workspace credits: need {{needed}} QMC, available {{available}} QMC.', { needed, available, lng: lang });
  }

  return rawMessage.replace(/\.+$/, '');
}

export function parseUploadFailureEntry(rawEntry, lang = 'vi') {
  const text = String(rawEntry || '').trim();
  const t = i18nInstance.t.bind(i18nInstance);
  if (!text) {
    return {
      label: t('groupWorkspacePage.upload.unknownFile', 'Unknown file', { lng: lang }),
      detail: t('groupWorkspacePage.upload.failedDefault', 'Upload failed.', { lng: lang }),
    };
  }

  const separatorIndex = text.indexOf(':');
  const hasSeparator = separatorIndex > 0 && separatorIndex < text.length - 1;
  const fileName = hasSeparator ? text.slice(0, separatorIndex).trim() : '';
  const reason = hasSeparator ? text.slice(separatorIndex + 1).trim() : text;

  return {
    label: compactToastFilename(fileName || t('groupWorkspacePage.upload.unknownFile', 'Unknown file', { lng: lang })),
    detail: normalizeUploadFailureReason(reason, lang),
  };
}

export function buildUploadFailureToastMessage(failedUploads, lang = 'vi') {
  const safeEntries = Array.isArray(failedUploads) ? failedUploads.filter(Boolean) : [];
  const visibleItems = safeEntries.slice(0, 3).map((entry) => parseUploadFailureEntry(entry, lang));
  const remainingCount = Math.max(0, safeEntries.length - visibleItems.length);
  const t = i18nInstance.t.bind(i18nInstance);

  const titleKey = safeEntries.length > 1
    ? 'groupWorkspacePage.upload.filesFailedTitlePlural'
    : 'groupWorkspacePage.upload.filesFailedTitle';
  const moreKey = remainingCount > 1
    ? 'groupWorkspacePage.upload.moreFiles'
    : 'groupWorkspacePage.upload.moreFile';

  return {
    title: t(titleKey, '{{count}} file(s) could not be uploaded', { count: safeEntries.length, lng: lang }),
    description: t('groupWorkspacePage.upload.filesFailedDescription', 'Please review the failed files below and try again.', { lng: lang }),
    items: visibleItems,
    meta: remainingCount > 0
      ? t(moreKey, '+{{count}} more file(s)', { count: remainingCount, lng: lang })
      : '',
  };
}

export function uploadFailuresIndicateWorkspaceCreditShortage(failedUploads) {
  const safeEntries = Array.isArray(failedUploads) ? failedUploads.filter(Boolean) : [];
  return safeEntries.some((entry) => {
    const text = String(entry || '');
    return /QMC|workspace credit|credit workspace|không đủ credit|insufficient.*credit|Số dư credit không đủ|Not enough workspace credits/i.test(text);
  });
}

export function shouldTrackInLeaderReviewQueue(status, needReview) {
  return isProcessingMaterialStatus(status) || Boolean(needReview);
}

export function getPendingMaterialRenderKey(item, prefix = 'pending', fallbackIndex = 0) {
  const materialId = Number(item?.materialId ?? item?.id ?? 0);
  if (Number.isInteger(materialId) && materialId > 0) {
    return `${prefix}:material:${materialId}`;
  }

  const taskId = String(item?.taskId ?? item?.websocketTaskId ?? item?.progressKey ?? item?.key ?? '').trim();
  if (taskId) {
    return `${prefix}:task:${taskId}`;
  }

  const uploadedAt = String(item?.uploadedAt ?? '').trim();
  const title = String(item?.title ?? item?.name ?? 'untitled').trim() || 'untitled';
  return `${prefix}:fallback:${title}:${uploadedAt}:${fallbackIndex}`;
}

export function inferMaterialType(file) {
  if (file?.type) return file.type;
  const fileName = String(file?.name || '').toLowerCase();
  if (fileName.endsWith('.pdf')) return 'application/pdf';
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'application/msword';
  if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return 'application/vnd.ms-powerpoint';
  if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return 'application/vnd.ms-excel';
  if (fileName.endsWith('.txt')) return 'text/plain';
  if (fileName.endsWith('.mp3')) return 'audio/mpeg';
  if (fileName.endsWith('.mp4')) return 'video/mp4';
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

export function getFileExtension(fileName) {
  const normalized = String(fileName || '').trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf('.');
  return dotIndex >= 0 ? normalized.slice(dotIndex) : '';
}

export function isSupportedGroupUploadFile(file) {
  return GROUP_UPLOAD_ACCEPTED_EXTENSIONS.has(getFileExtension(file?.name));
}

export function mapTransportProgressToDisplay(percent) {
  const normalized = clampPercent(percent);
  return Math.max(1, Math.min(24, Math.round((normalized / 100) * 24)));
}

export function mapProcessingProgressToDisplay(percent) {
  const normalized = clampPercent(percent);
  return Math.max(25, Math.min(99, 25 + Math.round((normalized / 100) * 74)));
}

export function createUploadSessionKey(file) {
  return `upload:${Date.now()}:${Math.random().toString(36).slice(2, 8)}:${String(file?.name || 'file')}`;
}

export function getRealtimeMaterialId(payload, fallbackTaskId = null, uploads = []) {
  const directId = Number(
    payload?.materialId
    ?? payload?.material_id
    ?? payload?.data?.materialId
    ?? payload?.data?.material_id
    ?? 0
  );
  if (Number.isInteger(directId) && directId > 0) return directId;

  if (!fallbackTaskId) return null;
  const matchedUpload = (uploads || []).find((item) => String(item?.taskId || '') === String(fallbackTaskId));
  const matchedId = Number(matchedUpload?.materialId ?? 0);
  return Number.isInteger(matchedId) && matchedId > 0 ? matchedId : null;
}

export function normalizeWorkspaceSourceItem(item, fallbackItem = null) {
  const materialId = Number(item?.materialId ?? item?.id ?? fallbackItem?.materialId ?? fallbackItem?.id ?? 0);
  if (!Number.isInteger(materialId) || materialId <= 0) return null;

  const title = item?.title ?? item?.name ?? fallbackItem?.title ?? fallbackItem?.name ?? '';
  const materialType = item?.materialType ?? item?.type ?? fallbackItem?.materialType ?? fallbackItem?.type ?? '';
  const uploadedAt = item?.uploadedAt ?? fallbackItem?.uploadedAt ?? null;
  const status = normalizeMaterialStatus(item?.status ?? fallbackItem?.status);

  return {
    ...(fallbackItem || {}),
    ...item,
    id: materialId,
    materialId,
    title,
    name: title,
    type: materialType,
    materialType,
    uploadedAt,
    status,
  };
}

export function buildPendingQueueMessage(status, currentLang, isLeader = false, needReview = true) {
  const normalized = normalizeMaterialStatus(status);
  const lng = currentLang === 'en' ? 'en' : 'vi';
  const t = i18nInstance.t.bind(i18nInstance);

  if (normalized === 'UPLOADING') {
    return t('groupWorkspacePage.queue.uploading', 'Uploading the file to the server.', { lng });
  }

  if (normalized === 'PROCESSING' || normalized === 'PENDING' || normalized === 'QUEUED') {
    return t('groupWorkspacePage.queue.processing', 'AI is checking this material against the group profile.', { lng });
  }

  if (normalized === 'ACTIVE') {
    if (isLeader && !needReview) {
      return t('groupWorkspacePage.queue.activeLeaderNoReview', 'AI finished processing. This material is now in the shared source list.', { lng });
    }

    return isLeader
      ? t('groupWorkspacePage.queue.activeLeaderReview', 'AI finished processing. You can approve it for the shared source list now.', { lng })
      : t('groupWorkspacePage.queue.activeMemberReview', 'AI finished processing. This material is waiting for leader approval.', { lng });
  }

  if (normalized === 'WARN') {
    return isLeader
      ? t('groupWorkspacePage.queue.warnLeader', 'AI found a warning. Review carefully before approving.', { lng })
      : t('groupWorkspacePage.queue.warnMember', 'AI flagged this material. It is waiting for leader review.', { lng });
  }

  if (normalized === 'ERROR') {
    return t('groupWorkspacePage.queue.error', 'The system could not finish processing this material.', { lng });
  }

  if (normalized === 'REJECT') {
    return t('groupWorkspacePage.queue.reject', 'The material was rejected for this group workspace.', { lng });
  }

  return t('groupWorkspacePage.queue.waitingUpdate', 'This material is waiting for an update.', { lng });
}
