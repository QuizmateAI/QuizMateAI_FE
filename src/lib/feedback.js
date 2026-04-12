export function safeParseFeedbackConfig(configJson) {
  if (!configJson || typeof configJson !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(configJson);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function isEnglishLanguage(language) {
  return String(language || '').toLowerCase().startsWith('en');
}

function getLocalizedEnumLabel(value, labels, language) {
  const normalizedValue = String(value || '').toUpperCase();
  if (!normalizedValue) {
    return '-';
  }

  const dictionary = isEnglishLanguage(language) ? labels.en : labels.vi;
  return dictionary[normalizedValue] || normalizedValue;
}

const FEEDBACK_TARGET_LABELS = {
  vi: {
    QUIZ: 'Bài quiz',
    PHASE: 'Giai đoạn',
    FLASHCARD: 'Flashcard',
    ROADMAP: 'Lộ trình',
    WORKSPACE: 'Workspace',
    SYSTEM_MILESTONE: 'Mốc hệ thống',
    SUPPORT: 'Hỗ trợ',
  },
  en: {
    QUIZ: 'Quiz',
    PHASE: 'Phase',
    FLASHCARD: 'Flashcard',
    ROADMAP: 'Roadmap',
    WORKSPACE: 'Workspace',
    SYSTEM_MILESTONE: 'System milestone',
    SUPPORT: 'Support',
  },
};

const FEEDBACK_CHANNEL_LABELS = {
  vi: {
    PRODUCT: 'Sản phẩm',
    SYSTEM: 'Hệ thống',
    GROUP: 'Nhóm',
  },
  en: {
    PRODUCT: 'Product',
    SYSTEM: 'System',
    GROUP: 'Group',
  },
};

const FEEDBACK_TRIGGER_LABELS = {
  vi: {
    AFTER_COMPLETION: 'Sau khi hoàn thành',
    AFTER_TIME: 'Sau một khoảng thời gian',
    AFTER_N_COMPLETIONS: 'Sau khi đạt đủ số lần',
    MANUAL: 'Thủ công',
  },
  en: {
    AFTER_COMPLETION: 'After completion',
    AFTER_TIME: 'After a time delay',
    AFTER_N_COMPLETIONS: 'After N completions',
    MANUAL: 'Manual',
  },
};

const FEEDBACK_QUESTION_TYPE_LABELS = {
  vi: {
    STAR_RATING: 'Đánh giá sao',
    YES_NO: 'Có / Không',
    TEXT: 'Văn bản',
    SINGLE_CHOICE: 'Chọn một đáp án',
    MULTIPLE_CHOICE: 'Chọn nhiều đáp án',
  },
  en: {
    STAR_RATING: 'Star rating',
    YES_NO: 'Yes / No',
    TEXT: 'Text response',
    SINGLE_CHOICE: 'Single choice',
    MULTIPLE_CHOICE: 'Multiple choice',
  },
};

const FEEDBACK_REQUEST_STATUS_LABELS = {
  vi: {
    PENDING: 'Đang chờ',
    SUBMITTED: 'Đã gửi',
    COMPLETED: 'Hoàn tất',
    EXPIRED: 'Hết hạn',
    CANCELLED: 'Đã hủy',
    FAILED: 'Lỗi',
  },
  en: {
    PENDING: 'Pending',
    SUBMITTED: 'Submitted',
    COMPLETED: 'Completed',
    EXPIRED: 'Expired',
    CANCELLED: 'Cancelled',
    FAILED: 'Failed',
  },
};

const FEEDBACK_RESOLUTION_STATUS_LABELS = {
  vi: {
    OPEN: 'Mới tạo',
    IN_PROGRESS: 'Đang xử lý',
    RESOLVED: 'Đã giải quyết',
    CLOSED: 'Đã đóng',
  },
  en: {
    OPEN: 'Open',
    IN_PROGRESS: 'In progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
  },
};

export function getFeedbackTargetLabel(targetType, language = 'vi') {
  return getLocalizedEnumLabel(targetType, FEEDBACK_TARGET_LABELS, language);
}

export function getFeedbackChannelLabel(channelType, language = 'vi') {
  return getLocalizedEnumLabel(channelType, FEEDBACK_CHANNEL_LABELS, language);
}

export function getFeedbackTriggerLabel(triggerType, language = 'vi') {
  return getLocalizedEnumLabel(triggerType, FEEDBACK_TRIGGER_LABELS, language);
}

export function getFeedbackQuestionTypeLabel(questionType, language = 'vi') {
  return getLocalizedEnumLabel(questionType, FEEDBACK_QUESTION_TYPE_LABELS, language);
}

export function getFeedbackRequestStatusLabel(status, language = 'vi') {
  return getLocalizedEnumLabel(status, FEEDBACK_REQUEST_STATUS_LABELS, language);
}

export function getFeedbackResolutionStatusLabel(status, language = 'vi') {
  return getLocalizedEnumLabel(status, FEEDBACK_RESOLUTION_STATUS_LABELS, language);
}

export function getFeedbackStatusLabel(active, language = 'vi') {
  if (isEnglishLanguage(language)) {
    return active ? 'Active' : 'Inactive';
  }

  return active ? 'Đang bật' : 'Đã tắt';
}

export function getFeedbackRequiredLabel(required, language = 'vi') {
  if (isEnglishLanguage(language)) {
    return required ? 'Required' : 'Optional';
  }

  return required ? 'Bắt buộc' : 'Tùy chọn';
}

export function getFeedbackStatusBadgeClass(active, isDarkMode = false) {
  if (active) {
    return isDarkMode
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return isDarkMode
    ? 'border-slate-700 bg-slate-800 text-slate-300'
    : 'border-slate-200 bg-slate-100 text-slate-700';
}

export function getFeedbackRequiredBadgeClass(required, isDarkMode = false) {
  if (required) {
    return isDarkMode
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      : 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return isDarkMode
    ? 'border-slate-700 bg-slate-800 text-slate-300'
    : 'border-slate-200 bg-slate-100 text-slate-700';
}

export function getFeedbackRequestStatusBadgeClass(status, isDarkMode = false) {
  const normalizedStatus = String(status || '').toUpperCase();

  if (normalizedStatus === 'SUBMITTED' || normalizedStatus === 'COMPLETED') {
    return isDarkMode
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalizedStatus === 'PENDING') {
    return isDarkMode
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      : 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalizedStatus === 'EXPIRED' || normalizedStatus === 'CANCELLED' || normalizedStatus === 'FAILED') {
    return isDarkMode
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      : 'border-rose-200 bg-rose-50 text-rose-700';
  }

  return isDarkMode
    ? 'border-slate-700 bg-slate-800 text-slate-300'
    : 'border-slate-200 bg-slate-100 text-slate-700';
}

export function getFeedbackResolutionStatusBadgeClass(status, isDarkMode = false) {
  const normalizedStatus = String(status || '').toUpperCase();

  if (normalizedStatus === 'RESOLVED' || normalizedStatus === 'CLOSED') {
    return isDarkMode
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalizedStatus === 'IN_PROGRESS') {
    return isDarkMode
      ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
      : 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (normalizedStatus === 'OPEN') {
    return isDarkMode
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      : 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return isDarkMode
    ? 'border-slate-700 bg-slate-800 text-slate-300'
    : 'border-slate-200 bg-slate-100 text-slate-700';
}

function normalizePositiveIntegerString(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? String(Math.round(numericValue))
    : '';
}

function clampRating(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.min(5, Math.max(1, Math.round(numericValue)));
}

function extractOptionLabels(config) {
  const candidates = config.options ?? config.choices ?? config.items ?? [];
  if (!Array.isArray(candidates)) {
    return [];
  }

  return candidates
    .map((option) => {
      if (typeof option === 'string') {
        return option.trim();
      }
      if (option && typeof option === 'object') {
        return String(option.label ?? option.name ?? option.value ?? option.code ?? '').trim();
      }
      return '';
    })
    .filter(Boolean);
}

export function parseFeedbackFormConfig(configJson) {
  const config = safeParseFeedbackConfig(configJson);
  return {
    daysAfter: normalizePositiveIntegerString(config.daysAfter),
    recurrenceDays: normalizePositiveIntegerString(config.recurrenceDays),
    minCompletedQuizCount: normalizePositiveIntegerString(config.minCompletedQuizCount),
  };
}

export function buildFeedbackFormConfig(triggerType, configValues = {}) {
  const normalizedTriggerType = String(triggerType || '').toUpperCase();
  if (normalizedTriggerType === 'AFTER_TIME') {
    const payload = {};
    const daysAfter = Number(configValues.daysAfter);
    const recurrenceDays = Number(configValues.recurrenceDays);

    if (Number.isFinite(daysAfter) && daysAfter > 0) {
      payload.daysAfter = Math.round(daysAfter);
    }
    if (Number.isFinite(recurrenceDays) && recurrenceDays > 0) {
      payload.recurrenceDays = Math.round(recurrenceDays);
    }

    return Object.keys(payload).length > 0 ? JSON.stringify(payload) : '';
  }

  if (normalizedTriggerType === 'AFTER_N_COMPLETIONS') {
    const minCompletedQuizCount = Number(configValues.minCompletedQuizCount);
    if (Number.isFinite(minCompletedQuizCount) && minCompletedQuizCount > 0) {
      return JSON.stringify({ minCompletedQuizCount: Math.round(minCompletedQuizCount) });
    }
  }

  return '';
}

export function parseFeedbackQuestionConfig(questionType, configJson) {
  const normalizedQuestionType = String(questionType || '').toUpperCase();
  const config = safeParseFeedbackConfig(configJson);
  const options = extractOptionLabels(config);

  return {
    min: String(clampRating(config.min, 1)),
    max: String(clampRating(config.max, 5)),
    options: (normalizedQuestionType === 'SINGLE_CHOICE' || normalizedQuestionType === 'MULTIPLE_CHOICE')
      ? (options.length > 0 ? options : ['', ''])
      : options,
    optionsText: extractOptionLabels(config).join('\n'),
    placeholder: typeof config.placeholder === 'string' ? config.placeholder : '',
  };
}

export function buildFeedbackQuestionConfig(questionType, configValues = {}) {
  const normalizedQuestionType = String(questionType || '').toUpperCase();

  if (normalizedQuestionType === 'STAR_RATING') {
    const min = clampRating(configValues.min, 1);
    const max = clampRating(configValues.max, 5);
    const lower = Math.min(min, max);
    const upper = Math.max(min, max);
    if (lower === 1 && upper === 5) {
      return '';
    }
    return JSON.stringify({ min: lower, max: upper });
  }

  if (normalizedQuestionType === 'SINGLE_CHOICE' || normalizedQuestionType === 'MULTIPLE_CHOICE') {
    const options = Array.isArray(configValues.options)
      ? configValues.options.map((option) => String(option || '').trim()).filter(Boolean)
      : String(configValues.optionsText || '')
          .split(/\r?\n/)
          .map((option) => option.trim())
          .filter(Boolean);

    return options.length > 0 ? JSON.stringify({ options }) : '';
  }

  if (normalizedQuestionType === 'TEXT') {
    const placeholder = String(configValues.placeholder || '').trim();
    return placeholder ? JSON.stringify({ placeholder }) : '';
  }

  return '';
}

export function getFeedbackQuestionOptions(question) {
  const config = safeParseFeedbackConfig(question?.configJson);
  const candidates = config.options ?? config.choices ?? config.items ?? [];
  if (!Array.isArray(candidates)) {
    return [];
  }

  return candidates
    .map((option) => {
      if (typeof option === 'string') {
        return { label: option, value: option };
      }
      if (option && typeof option === 'object') {
        const value = option.value ?? option.code ?? option.label ?? option.name;
        const label = option.label ?? option.name ?? option.value ?? option.code;
        if (value == null || label == null) {
          return null;
        }
        return { label: String(label), value: String(value) };
      }
      return null;
    })
    .filter(Boolean);
}

export function getFeedbackRatingBounds(question) {
  const config = safeParseFeedbackConfig(question?.configJson);
  const min = Number(config.min);
  const max = Number(config.max);

  return {
    min: Number.isFinite(min) && min > 0 ? min : 1,
    max: Number.isFinite(max) && max >= 1 ? max : 5,
  };
}

export function isFeedbackAnswerFilled(question, answerValue) {
  const questionType = String(question?.questionType || '').toUpperCase();

  if (questionType === 'STAR_RATING') {
    return Number.isFinite(Number(answerValue));
  }

  if (questionType === 'YES_NO') {
    return typeof answerValue === 'boolean';
  }

  if (questionType === 'SINGLE_CHOICE') {
    return typeof answerValue === 'string' && answerValue.trim().length > 0;
  }

  if (questionType === 'MULTIPLE_CHOICE') {
    return Array.isArray(answerValue) && answerValue.some((value) => typeof value === 'string' && value.trim().length > 0);
  }

  return typeof answerValue === 'string' && answerValue.trim().length > 0;
}

export function buildFeedbackSubmissionPayload(questions, answersByQuestionId) {
  let overallRating = null;
  let satisfied = null;
  let comment = null;

  const answers = questions.reduce((result, question) => {
    const rawAnswer = answersByQuestionId?.[question.questionId];
    if (!isFeedbackAnswerFilled(question, rawAnswer)) {
      return result;
    }

    const questionType = String(question?.questionType || '').toUpperCase();
    const payload = { questionId: question.questionId };

    if (questionType === 'STAR_RATING') {
      const numericValue = Number(rawAnswer);
      payload.answerNumber = numericValue;
      if (overallRating == null) {
        overallRating = Math.round(numericValue);
      }
    } else if (questionType === 'YES_NO') {
      payload.answerBoolean = Boolean(rawAnswer);
      if (satisfied == null) {
        satisfied = Boolean(rawAnswer);
      }
    } else if (questionType === 'SINGLE_CHOICE') {
      payload.selectedOption = String(rawAnswer).trim();
    } else if (questionType === 'MULTIPLE_CHOICE') {
      payload.selectedOptions = (Array.isArray(rawAnswer) ? rawAnswer : [])
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim());
    } else {
      payload.answerText = String(rawAnswer).trim();
      if (!comment) {
        comment = payload.answerText;
      }
    }

    result.push(payload);
    return result;
  }, []);

  return {
    overallRating,
    satisfied,
    comment,
    answers,
  };
}
