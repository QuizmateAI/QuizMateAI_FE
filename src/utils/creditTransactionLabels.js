const TRANSACTION_TYPE_FALLBACKS = {
  WELCOME: { en: 'Welcome credits', vi: 'QMC chào mừng' },
  TOPUP: { en: 'Top up', vi: 'Nạp QMC' },
  CONSUME: { en: 'Consume', vi: 'Tiêu hao' },
  RESERVE: { en: 'Reserved', vi: 'Tạm giữ' },
  RESERVE_CANCELLED: { en: 'Reserve released', vi: 'Hoàn tạm giữ' },
  REFUND: { en: 'Refund', vi: 'Hoàn QMC' },
  ADJUST: { en: 'Adjustment', vi: 'Điều chỉnh' },
  PLAN_BONUS: { en: 'Plan bonus', vi: 'QMC từ gói' },
  PLAN_EXPIRE_RESET: { en: 'Plan reset', vi: 'Đặt lại QMC gói' },
};

const SOURCE_TYPE_FALLBACKS = {
  SYSTEM: { en: 'System', vi: 'Hệ thống' },
  PAYMENT: { en: 'Payment', vi: 'Thanh toán' },
  AI_USAGE: { en: 'AI usage', vi: 'Sử dụng AI' },
  USER_PLAN: { en: 'User plan', vi: 'Gói cá nhân' },
  WORKSPACE_PLAN: { en: 'Group plan', vi: 'Gói nhóm' },
  ADMIN: { en: 'Admin', vi: 'Quản trị' },
};

function pickFallback(map, key, lang) {
  const entry = map[key];
  if (!entry) return '';
  return lang === 'en' ? entry.en : entry.vi;
}

export function creditTransactionLabel(type, lang, t) {
  const key = String(type || '').toUpperCase();
  if (TRANSACTION_TYPE_FALLBACKS[key]) {
    if (t) {
      return t(`groupWalletTab.creditLabels.${key}`, TRANSACTION_TYPE_FALLBACKS[key].en);
    }
    return pickFallback(TRANSACTION_TYPE_FALLBACKS, key, lang);
  }
  return type || '—';
}

export function creditSourceLabel(type, lang, t) {
  const key = String(type || '').toUpperCase();
  if (SOURCE_TYPE_FALLBACKS[key]) {
    if (t) {
      return t(`groupWalletTab.creditSources.${key}`, SOURCE_TYPE_FALLBACKS[key].en);
    }
    return pickFallback(SOURCE_TYPE_FALLBACKS, key, lang);
  }
  return type || '—';
}

export function sanitizeActivityNote(note) {
  return String(note || '')
    .replace(/\s+\[(?:PARTIAL_REFUND|RELEASED|PLAN_CREDIT_FORFEITED)[^\]]*\]/gi, '')
    .trim();
}

function decodeUiActivityValue(value) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return '';
  try {
    return decodeURIComponent(normalizedValue.replace(/\+/g, '%20'));
  } catch {
    return normalizedValue;
  }
}

export function parseUiActivityNote(note) {
  const normalizedNote = sanitizeActivityNote(note);
  if (normalizedNote.startsWith('UI_ACTIVITY_V2|')) {
    const [, actionKey, encodedTarget = '', encodedWorkspace = ''] = normalizedNote.split('|');
    return {
      actionKey: String(actionKey || '').toUpperCase(),
      target: decodeUiActivityValue(encodedTarget),
      workspaceName: decodeUiActivityValue(encodedWorkspace),
    };
  }

  if (!normalizedNote.startsWith('UI_ACTIVITY|')) return null;

  const [, actionKey, ...targetParts] = normalizedNote.split('|');
  return {
    actionKey: String(actionKey || '').toUpperCase(),
    target: targetParts.join('|').trim(),
    workspaceName: '',
  };
}

export function formatUiActivityTitle(actionKey, target, lang, t) {
  const safeTarget = String(target || '').trim();
  const withTarget = (viPrefix, enPrefix, fallback, prefixKey, fallbackKey) => {
    const prefix = t && prefixKey
      ? t(`groupWalletTab.uiActivity.${prefixKey}`, enPrefix)
      : (lang === 'en' ? enPrefix : viPrefix);
    const fallbackLabel = t && fallbackKey
      ? t(`groupWalletTab.uiActivity.${fallbackKey}`, fallback)
      : fallback;
    return safeTarget ? `${prefix}${safeTarget}` : fallbackLabel;
  };

  const fallback = t
    ? t('groupWalletTab.uiActivity.fallback', 'Used an AI feature')
    : (lang === 'en' ? 'Used an AI feature' : 'Đã dùng một tính năng AI');
  const titleMap = {
    PROCESS_PDF: withTarget('Đã tải lên PDF: ', 'Uploaded PDF: ', lang === 'en' ? 'Uploaded a PDF' : 'Đã tải lên PDF', 'processPdfPrefix', 'processPdfFallback'),
    PROCESS_DOCX: withTarget('Đã tải lên file Word: ', 'Uploaded Word file: ', lang === 'en' ? 'Uploaded a Word file' : 'Đã tải lên file Word', 'processDocxPrefix', 'processDocxFallback'),
    PROCESS_PPTX: withTarget('Đã tải lên slide: ', 'Uploaded slides: ', lang === 'en' ? 'Uploaded slides' : 'Đã tải lên slide', 'processPptxPrefix', 'processPptxFallback'),
    PROCESS_XLSX: withTarget('Đã tải lên file Excel: ', 'Uploaded Excel file: ', lang === 'en' ? 'Uploaded an Excel file' : 'Đã tải lên file Excel', 'processXlsxPrefix', 'processXlsxFallback'),
    PROCESS_IMAGE: withTarget('Đã tải lên ảnh: ', 'Uploaded image: ', lang === 'en' ? 'Uploaded an image' : 'Đã tải lên ảnh', 'processImagePrefix', 'processImageFallback'),
    PROCESS_AUDIO: withTarget('Đã tải lên audio: ', 'Uploaded audio: ', lang === 'en' ? 'Uploaded audio' : 'Đã tải lên audio', 'processAudioPrefix', 'processAudioFallback'),
    PROCESS_VIDEO: withTarget('Đã tải lên video: ', 'Uploaded video: ', lang === 'en' ? 'Uploaded a video' : 'Đã tải lên video', 'processVideoPrefix', 'processVideoFallback'),
    GENERATE_QUIZ: withTarget('Đã tạo quiz: ', 'Generated quiz: ', lang === 'en' ? 'Generated a quiz' : 'Đã tạo quiz', 'generateQuizPrefix', 'generateQuizFallback'),
    GENERATE_FLASHCARDS: withTarget('Đã tạo flashcard từ: ', 'Generated flashcards from: ', lang === 'en' ? 'Generated flashcards' : 'Đã tạo flashcard', 'generateFlashcardsPrefix', 'generateFlashcardsFallback'),
    GENERATE_MOCK_TEST: withTarget('Đã tạo mock test: ', 'Generated mock test: ', lang === 'en' ? 'Generated a mock test' : 'Đã tạo mock test', 'generateMockTestPrefix', 'generateMockTestFallback'),
  };

  if (titleMap[actionKey]) return titleMap[actionKey];
  const defaultPrefix = t
    ? t('groupWalletTab.uiActivity.defaultPrefix', 'Used AI for: ')
    : (lang === 'en' ? 'Used AI for: ' : 'Đã dùng AI cho: ');
  return safeTarget ? `${defaultPrefix}${safeTarget}` : fallback;
}

export function formatUiActivitySubtitle(workspaceName, lang, t) {
  const safeWorkspaceName = String(workspaceName || '').trim();
  if (!safeWorkspaceName) return '';
  if (t) {
    return t('groupWalletTab.uiActivity.inWorkspace', 'In workspace: {{name}}', { name: safeWorkspaceName });
  }
  return lang === 'en'
    ? `In workspace: ${safeWorkspaceName}`
    : `Trong workspace: ${safeWorkspaceName}`;
}
