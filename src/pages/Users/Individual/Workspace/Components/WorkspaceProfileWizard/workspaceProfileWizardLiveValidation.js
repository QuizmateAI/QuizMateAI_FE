import { ensureString, hasTextValue, translateOrFallback } from './workspaceProfileWizardUtils';

export const LIVE_ALLOWED_INPUT_REGEX = /^[\p{L}\p{M}\p{N}\s.,:;!?()[\]/'"&+#%+-]*$/u;
export const SHORT_KNOWLEDGE_TOKEN_REGEX = /^[\p{L}\p{M}\p{N}#+./-]{2,5}$/u;
export const REPEATED_CHARACTER_REGEX = /(.)\1{5,}/u;
export const STUDY_PROFILE_ANALYSIS_ERROR_CODES = {
  EXPIRED: 1190,
  NOT_FOUND: 1191,
  OPTION_INVALID: 1192,
};
export const LIVE_INPUT_RULES = {
  knowledgeInput: {
    minCompactLength: 3,
    minMeaningfulChars: 3,
    allowShortToken: true,
  },
  inferredDomain: {
    minCompactLength: 2,
    minMeaningfulChars: 2,
  },
  currentLevel: {
    minCompactLength: 4,
    minMeaningfulChars: 4,
  },
  learningGoal: {
    minCompactLength: 10,
    minMeaningfulChars: 10,
  },
  strongAreas: {
    minCompactLength: 4,
    minMeaningfulChars: 4,
  },
  weakAreas: {
    minCompactLength: 4,
    minMeaningfulChars: 4,
  },
  mockExamName: {
    minCompactLength: 3,
    minMeaningfulChars: 3,
    allowShortToken: true,
  },
};


export function normalizeLiveInput(value) {
  return ensureString(value).replace(/\r\n/g, '\n').trim();
}

export function getCompactLiveInputLength(value) {
  return normalizeLiveInput(value).replace(/\s+/g, '').length;
}

export function countMeaningfulLiveChars(value) {
  return (normalizeLiveInput(value).match(/[\p{L}\p{M}\p{N}+#]/gu) || []).length;
}

export function hasInvalidLiveCharacters(value) {
  const normalizedValue = normalizeLiveInput(value);
  return normalizedValue.length > 0 && !LIVE_ALLOWED_INPUT_REGEX.test(normalizedValue);
}

export function isRepeatedNoiseText(value) {
  const compactValue = normalizeLiveInput(value).replace(/\s+/g, '');
  return compactValue.length > 0 && REPEATED_CHARACTER_REGEX.test(compactValue);
}

export function isShortSemanticToken(value) {
  const compactValue = normalizeLiveInput(value).replace(/\s+/g, '');
  return SHORT_KNOWLEDGE_TOKEN_REGEX.test(compactValue);
}

export function evaluateLiveInputValue(value, rule = {}) {
  const normalizedValue = normalizeLiveInput(value);

  if (!normalizedValue) {
    return {
      status: 'empty',
      normalizedValue,
      reason: '',
    };
  }

  if (hasInvalidLiveCharacters(normalizedValue)) {
    return {
      status: 'invalid',
      normalizedValue,
      reason: 'invalidCharacters',
    };
  }

  if (isRepeatedNoiseText(normalizedValue)) {
    return {
      status: 'invalid',
      normalizedValue,
      reason: 'noise',
    };
  }

  const compactLength = getCompactLiveInputLength(normalizedValue);
  const meaningfulChars = countMeaningfulLiveChars(normalizedValue);

  if (rule.allowShortToken && isShortSemanticToken(normalizedValue)) {
    return {
      status: 'ready',
      normalizedValue,
      reason: '',
    };
  }

  if (
    compactLength < (rule.minCompactLength || 1)
    || meaningfulChars < (rule.minMeaningfulChars || 1)
  ) {
    return {
      status: 'invalid',
      normalizedValue,
      reason: 'tooShort',
    };
  }

  return {
    status: 'ready',
    normalizedValue,
    reason: '',
  };
}

export function getLiveFieldEvaluation(field, value) {
  return evaluateLiveInputValue(value, LIVE_INPUT_RULES[field] || {});
}

export function getReadyLiveFieldValue(field, value) {
  const evaluation = getLiveFieldEvaluation(field, value);
  return evaluation.status === 'ready' ? evaluation.normalizedValue : '';
}

export function hasBlockingLiveFieldValue(field, value) {
  const evaluation = getLiveFieldEvaluation(field, value);
  return evaluation.status === 'invalid';
}

export function getLiveFieldErrorMessage(field, value, t) {
  const evaluation = getLiveFieldEvaluation(field, value);

  if (evaluation.status !== 'invalid') {
    return '';
  }

  if (evaluation.reason === 'invalidCharacters') {
    return translateOrFallback(
      t,
      `workspace.profileConfig.validation.${field}InvalidCharacters`,
      t(
        'useWorkspaceProfileWizard.validation.invalidCharacters',
        'Only use letters, numbers, and basic punctuation. Invalid characters will not be sent to the AI.'
      )
    );
  }

  if (evaluation.reason === 'noise') {
    return translateOrFallback(
      t,
      `workspace.profileConfig.validation.${field}Noise`,
      t(
        'useWorkspaceProfileWizard.validation.noise',
        'The content has too many repeated characters or symbols. Please enter it more clearly before the system calls the AI.'
      )
    );
  }

  switch (field) {
    case 'knowledgeInput':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.knowledgeInputTooShort',
        t(
          'useWorkspaceProfileWizard.validation.knowledgeInputTooShort',
          'Enter at least 3 meaningful characters so the AI can analyze your knowledge.'
        )
      );
    case 'currentLevel':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.currentLevelTooShort',
        t(
          'useWorkspaceProfileWizard.validation.currentLevelTooShort',
          'Describe your current level with at least 4 meaningful characters.'
        )
      );
    case 'learningGoal':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.learningGoalTooShort',
        t(
          'useWorkspaceProfileWizard.validation.learningGoalTooShort',
          'Your learning goal should have at least 10 meaningful characters before being sent to the AI.'
        )
      );
    case 'strongAreas':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.strongAreasTooShort',
        t(
          'useWorkspaceProfileWizard.validation.strongAreasTooShort',
          'Strong areas should have at least 4 meaningful characters.'
        )
      );
    case 'weakAreas':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.weakAreasTooShort',
        t(
          'useWorkspaceProfileWizard.validation.weakAreasTooShort',
          'Weak areas should have at least 4 meaningful characters.'
        )
      );
    case 'mockExamName':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.mockExamNameTooShort',
        t(
          'useWorkspaceProfileWizard.validation.mockExamNameTooShort',
          'The exam name should have at least 3 meaningful characters.'
        )
      );
    case 'inferredDomain':
      return translateOrFallback(
        t,
        'workspace.profileConfig.validation.inferredDomainTooShort',
        t(
          'useWorkspaceProfileWizard.validation.inferredDomainTooShort',
          'The domain needs at least 2 meaningful characters.'
        )
      );
    default:
      return translateOrFallback(
        t,
        `workspace.profileConfig.validation.${field}TooShort`,
        t(
          'useWorkspaceProfileWizard.validation.defaultTooShort',
          'The content is still too short to be sent to the AI.'
        )
      );
  }
}

export function buildLiveValidationErrors(values, t) {
  const nextErrors = {};

  ['knowledgeInput', 'currentLevel', 'learningGoal', 'strongAreas', 'weakAreas', 'mockExamName'].forEach((field) => {
    if (!hasTextValue(values?.[field])) {
      return;
    }

    const message = getLiveFieldErrorMessage(field, values[field], t);
    if (message) {
      nextErrors[field] = message;
    }
  });

  return nextErrors;
}
