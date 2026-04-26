import {
  AudioLines,
  Bot,
  FileSearch,
  Speech,
} from 'lucide-react';

export const AI_MODEL_GROUP_OPTIONS = [
  {
    value: 'TEXT_GENERATION',
    labelKey: 'aiModels.groups.TEXT_GENERATION',
    icon: Bot,
    accent: 'from-sky-500 to-blue-600',
    softTone: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  },
  {
    value: 'DOCUMENT_PROCESSING',
    labelKey: 'aiModels.groups.DOCUMENT_PROCESSING',
    icon: FileSearch,
    accent: 'from-emerald-500 to-teal-600',
    softTone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  {
    value: 'TRANSCRIPTION',
    labelKey: 'aiModels.groups.TRANSCRIPTION',
    icon: AudioLines,
    accent: 'from-violet-500 to-purple-600',
    softTone: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  },
  {
    value: 'TEXT_TO_SPEECH',
    labelKey: 'aiModels.groups.TEXT_TO_SPEECH',
    icon: Speech,
    accent: 'from-amber-500 to-orange-600',
    softTone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
];

export const AI_MODEL_STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

export const AI_COST_STATUS_OPTIONS = ['SUCCESS', 'ERROR', 'FAILED', 'UNMATCHED'];

export const AI_PROVIDER_OPTIONS = ['OPENAI', 'GEMINI'];

export function normalizeAiProvider(provider) {
  return String(provider || '').trim().toUpperCase();
}

export function isSupportedAiProvider(provider) {
  return AI_PROVIDER_OPTIONS.includes(normalizeAiProvider(provider));
}

export function filterSupportedAiModels(models = []) {
  return models.filter((model) => isSupportedAiProvider(model?.provider));
}

export const AI_ACTION_LABEL_KEYS = {
  GENERATE_QUIZ: 'aiActionPolicy.actions.generateQuiz.title',
  PREVIEW_QUIZ_STRUCTURE: 'aiActionPolicy.actions.previewQuizStructure.title',
  GENERATE_FLASHCARDS: 'aiActionPolicy.actions.generateFlashcards.title',
  GENERATE_MOCK_TEST: 'aiActionPolicy.actions.generateMockTest.title',
  GENERATE_ROADMAP: 'aiProviders.actions.generateRoadmap',
  GENERATE_ROADMAP_PHASES: 'aiProviders.actions.generateRoadmapPhases',
  GENERATE_ROADMAP_PHASE_CONTENT: 'aiProviders.actions.generateRoadmapPhaseContent',
  GENERATE_ROADMAP_KNOWLEDGE_QUIZ: 'aiActionPolicy.actions.generateRoadmapQuiz.title',
  SUGGEST_LEARNING_RESOURCES: 'aiProviders.actions.suggestLearningResources',
  ANALYZE_STUDY_PROFILE_KNOWLEDGE: 'aiActionPolicy.actions.analyzeStudyProfileKnowledge.title',
  SUGGEST_STUDY_PROFILE_FIELDS: 'aiActionPolicy.actions.suggestStudyProfileFields.title',
  SUGGEST_STUDY_PROFILE_EXAM_TEMPLATES: 'aiActionPolicy.actions.suggestStudyProfileExamTemplates.title',
  SUGGEST_WORKSPACE_NAME: 'aiActionPolicy.actions.suggestWorkspaceName.title',
  VALIDATE_STUDY_PROFILE_CONSISTENCY: 'aiActionPolicy.actions.validateStudyProfileConsistency.title',
  COMPANION_INTERPRET: 'aiAudit.features.COMPANION_INTERPRET',
  COMPANION_TRANSCRIBE: 'aiAudit.features.COMPANION_TRANSCRIBE',
  COMPANION_TTS: 'aiAudit.features.COMPANION_TTS',
  PROCESS_PDF: 'aiActionPolicy.actions.processPdf.title',
  PROCESS_IMAGE: 'aiActionPolicy.actions.processImage.title',
  PROCESS_TEXT: 'aiActionPolicy.actions.processText.title',
  PROCESS_DOCX: 'aiActionPolicy.actions.processDocx.title',
  PROCESS_XLSX: 'aiActionPolicy.actions.processXlsx.title',
  PROCESS_PPTX: 'aiActionPolicy.actions.processPptx.title',
  PROCESS_AUDIO: 'aiActionPolicy.actions.processAudio.title',
  PROCESS_VIDEO: 'aiActionPolicy.actions.processVideo.title',
};

export const AI_ACTION_GROUP_MAP = {
  GENERATE_QUIZ: 'TEXT_GENERATION',
  PREVIEW_QUIZ_STRUCTURE: 'TEXT_GENERATION',
  GENERATE_FLASHCARDS: 'TEXT_GENERATION',
  GENERATE_MOCK_TEST: 'TEXT_GENERATION',
  GENERATE_ROADMAP: 'TEXT_GENERATION',
  GENERATE_ROADMAP_PHASES: 'TEXT_GENERATION',
  GENERATE_ROADMAP_PHASE_CONTENT: 'TEXT_GENERATION',
  GENERATE_ROADMAP_KNOWLEDGE_QUIZ: 'TEXT_GENERATION',
  SUGGEST_LEARNING_RESOURCES: 'TEXT_GENERATION',
  ANALYZE_STUDY_PROFILE_KNOWLEDGE: 'TEXT_GENERATION',
  SUGGEST_STUDY_PROFILE_FIELDS: 'TEXT_GENERATION',
  SUGGEST_STUDY_PROFILE_EXAM_TEMPLATES: 'TEXT_GENERATION',
  SUGGEST_WORKSPACE_NAME: 'TEXT_GENERATION',
  VALIDATE_STUDY_PROFILE_CONSISTENCY: 'TEXT_GENERATION',
  COMPANION_INTERPRET: 'TEXT_GENERATION',
  COMPANION_TRANSCRIBE: 'TRANSCRIPTION',
  COMPANION_TTS: 'TEXT_TO_SPEECH',
  PROCESS_PDF: 'DOCUMENT_PROCESSING',
  PROCESS_IMAGE: 'DOCUMENT_PROCESSING',
  PROCESS_TEXT: 'DOCUMENT_PROCESSING',
  PROCESS_DOCX: 'DOCUMENT_PROCESSING',
  PROCESS_XLSX: 'DOCUMENT_PROCESSING',
  PROCESS_PPTX: 'DOCUMENT_PROCESSING',
  PROCESS_VIDEO: 'DOCUMENT_PROCESSING',
  PROCESS_AUDIO: 'TRANSCRIPTION',
};

export const AI_ACTION_OPTIONS = Object.keys(AI_ACTION_LABEL_KEYS);

export const AI_ACTION_PROVIDER_ALLOWLIST = {
  PREVIEW_QUIZ_STRUCTURE: ['OPENAI'],
  ANALYZE_STUDY_PROFILE_KNOWLEDGE: ['OPENAI'],
  SUGGEST_STUDY_PROFILE_FIELDS: ['OPENAI'],
  SUGGEST_STUDY_PROFILE_EXAM_TEMPLATES: ['OPENAI'],
  SUGGEST_WORKSPACE_NAME: ['OPENAI'],
  VALIDATE_STUDY_PROFILE_CONSISTENCY: ['OPENAI'],
  COMPANION_INTERPRET: ['OPENAI'],
  COMPANION_TRANSCRIBE: ['OPENAI'],
  COMPANION_TTS: ['OPENAI'],
};

const coreFeature = (actionKey, displayOrder) => ({
  actionKey,
  category: 'CORE',
  entitlementKey: null,
  modelGroup: AI_ACTION_GROUP_MAP[actionKey],
  allowedProviders: AI_ACTION_PROVIDER_ALLOWLIST[actionKey] ?? AI_PROVIDER_OPTIONS,
  displayOrder,
});

const advancedFeature = (actionKey, entitlementKey, displayOrder) => ({
  actionKey,
  category: 'ADVANCED',
  entitlementKey,
  modelGroup: AI_ACTION_GROUP_MAP[actionKey],
  allowedProviders: AI_ACTION_PROVIDER_ALLOWLIST[actionKey] ?? AI_PROVIDER_OPTIONS,
  displayOrder,
});

export const DEFAULT_AI_FEATURE_CATALOG = [
  coreFeature('GENERATE_QUIZ', 10),
  coreFeature('GENERATE_FLASHCARDS', 20),
  coreFeature('GENERATE_MOCK_TEST', 30),
  coreFeature('SUGGEST_LEARNING_RESOURCES', 40),
  coreFeature('ANALYZE_STUDY_PROFILE_KNOWLEDGE', 50),
  coreFeature('SUGGEST_STUDY_PROFILE_FIELDS', 60),
  coreFeature('SUGGEST_STUDY_PROFILE_EXAM_TEMPLATES', 70),
  coreFeature('VALIDATE_STUDY_PROFILE_CONSISTENCY', 80),
  coreFeature('SUGGEST_WORKSPACE_NAME', 90),
  advancedFeature('PREVIEW_QUIZ_STRUCTURE', 'hasAdvanceQuizConfig', 110),
  advancedFeature('GENERATE_ROADMAP', 'canCreateRoadMap', 120),
  advancedFeature('GENERATE_ROADMAP_PHASES', 'canCreateRoadMap', 130),
  advancedFeature('GENERATE_ROADMAP_PHASE_CONTENT', 'canCreateRoadMap', 140),
  advancedFeature('GENERATE_ROADMAP_KNOWLEDGE_QUIZ', 'canCreateRoadMap', 150),
  advancedFeature('COMPANION_INTERPRET', 'hasAiCompanionMode', 160),
  advancedFeature('COMPANION_TRANSCRIBE', 'hasAiCompanionMode', 170),
  advancedFeature('COMPANION_TTS', 'hasAiCompanionMode', 180),
  advancedFeature('PROCESS_TEXT', 'canProcessText', 210),
  advancedFeature('PROCESS_PDF', 'canProcessPdf', 220),
  advancedFeature('PROCESS_DOCX', 'canProcessWord', 230),
  advancedFeature('PROCESS_PPTX', 'canProcessSlide', 240),
  advancedFeature('PROCESS_XLSX', 'canProcessExcel', 250),
  advancedFeature('PROCESS_IMAGE', 'canProcessImage', 260),
  advancedFeature('PROCESS_AUDIO', 'canProcessAudio', 270),
  advancedFeature('PROCESS_VIDEO', 'canProcessVideo', 280),
];

export function normalizeAiFeatureCatalog(items = DEFAULT_AI_FEATURE_CATALOG) {
  const source = Array.isArray(items) && items.length > 0 ? items : DEFAULT_AI_FEATURE_CATALOG;
  return source
    .map((item, index) => {
      const actionKey = item?.actionKey;
      const allowedProviders = Array.isArray(item?.allowedProviders) && item.allowedProviders.length > 0
        ? item.allowedProviders
        : getAiActionAllowedProviders(actionKey);
      return {
        actionKey,
        category: item?.category === 'ADVANCED' ? 'ADVANCED' : 'CORE',
        entitlementKey: item?.entitlementKey ?? null,
        modelGroup: item?.modelGroup ?? getAiActionGroup(actionKey),
        allowedProviders: allowedProviders.map((provider) => normalizeAiProvider(provider)),
        displayOrder: Number.isFinite(Number(item?.displayOrder)) ? Number(item.displayOrder) : index + 1,
      };
    })
    .filter((item) => item.actionKey && item.modelGroup)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.actionKey.localeCompare(right.actionKey));
}

export function isAiFeatureEnabled(item, entitlement = {}) {
  if (!item) return false;
  if (item.category === 'CORE') return true;
  if (!item.entitlementKey) return true;
  return Boolean(entitlement[item.entitlementKey]);
}

export function getEnabledAiFeatureItems(featureCatalog, entitlement = {}) {
  return normalizeAiFeatureCatalog(featureCatalog).filter((item) => isAiFeatureEnabled(item, entitlement));
}

export function getAiModelGroupMeta(modelGroup) {
  return AI_MODEL_GROUP_OPTIONS.find((item) => item.value === modelGroup) ?? null;
}

function humanizeAiKey(value) {
  return String(value || '')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getAiModelGroupLabel(modelGroup, t) {
  if (!modelGroup) return '-';
  const meta = getAiModelGroupMeta(modelGroup);
  const fallback = humanizeAiKey(modelGroup);
  const translated = meta && typeof t === 'function' ? t(meta.labelKey, fallback) : fallback;
  if (translated && translated !== meta?.labelKey && translated !== modelGroup) return translated;
  return fallback;
}

export function getAiActionLabel(actionKey, t) {
  const labelKey = AI_ACTION_LABEL_KEYS[actionKey];
  const translated = labelKey && typeof t === 'function' ? t(labelKey, '') : '';
  if (translated && translated !== labelKey && translated !== actionKey) return translated;
  return humanizeAiKey(actionKey);
}

export function getAiActionGroup(actionKey) {
  return AI_ACTION_GROUP_MAP[actionKey] ?? null;
}

export function getAiActionAllowedProviders(actionKey) {
  return AI_ACTION_PROVIDER_ALLOWLIST[actionKey] ?? AI_PROVIDER_OPTIONS;
}

export function filterAiModelsForAction(actionKey, models = []) {
  const expectedGroup = getAiActionGroup(actionKey);
  const allowedProviders = new Set(
    getAiActionAllowedProviders(actionKey).map((provider) => String(provider || '').toUpperCase()),
  );

  return models.filter((model) => {
    const modelGroup = model?.modelGroup ?? null;
    const provider = String(model?.provider || '').toUpperCase();
    return (!expectedGroup || modelGroup === expectedGroup) && allowedProviders.has(provider);
  });
}

export function filterAiModelsForFeature(feature, models = []) {
  const allowedProviders = new Set(
    (feature?.allowedProviders ?? getAiActionAllowedProviders(feature?.actionKey))
      .map((provider) => normalizeAiProvider(provider)),
  );
  const expectedGroup = feature?.modelGroup ?? getAiActionGroup(feature?.actionKey);

  return models.filter((model) => {
    if (expectedGroup && model?.modelGroup !== expectedGroup) return false;
    return allowedProviders.has(normalizeAiProvider(model?.provider));
  });
}

export function getPlanAiCoverage({
  featureCatalog,
  entitlement,
  availableAiModels = [],
  functionAssignmentMap = {},
  aiModelAssignments = {},
} = {}) {
  const enabledFeatures = getEnabledAiFeatureItems(featureCatalog, entitlement);
  const rows = enabledFeatures.map((feature) => {
    const compatibleModels = filterAiModelsForFeature(feature, availableAiModels);
    const selectedActionModelId = functionAssignmentMap[feature.actionKey] ?? '';
    const selectedGroupModelId = aiModelAssignments[feature.modelGroup] ?? '';
    const hasActionAssignment = String(selectedActionModelId || '').trim() !== '';
    const hasGroupAssignment = String(selectedGroupModelId || '').trim() !== '';
    const assignedActionModel = availableAiModels.find((model) => String(model.aiModelId) === String(selectedActionModelId)) ?? null;
    const assignedGroupModel = availableAiModels.find((model) => String(model.aiModelId) === String(selectedGroupModelId)) ?? null;
    const selectedModel = hasActionAssignment ? assignedActionModel : hasGroupAssignment ? assignedGroupModel : null;
    const source = hasActionAssignment ? 'ACTION' : hasGroupAssignment ? 'GROUP' : null;
    const selectedModelCompatible = Boolean(
      selectedModel && compatibleModels.some((model) => String(model.aiModelId) === String(selectedModel.aiModelId))
    );
    const isActive = selectedModel?.status === 'ACTIVE';

    return {
      ...feature,
      selectedModel,
      selectedModelId: selectedModel?.aiModelId != null ? String(selectedModel.aiModelId) : '',
      source,
      compatibleModelCount: compatibleModels.length,
      covered: Boolean(selectedModel) && selectedModelCompatible && isActive,
      inactiveSelection: Boolean(selectedModel) && !isActive,
      incompatibleSelection: Boolean(selectedModel) && !selectedModelCompatible,
    };
  });

  const missing = rows.filter((row) => !row.covered);
  return {
    rows,
    missing,
    total: rows.length,
    covered: rows.length - missing.length,
    isComplete: missing.length === 0,
  };
}

// Returns the model groups that an action depends on. The matrix override page
// iterates groups so future actions that span multiple groups Just Work.
export function getModelGroupsForAction(actionKey) {
  const primary = AI_ACTION_GROUP_MAP[actionKey];
  return primary ? [primary] : [];
}

// Same shape as filterAiModelsForAction, but accepts an explicit modelGroup so
// the caller can filter rows in the (Action × ModelGroup) matrix.
export function filterModelsForAction(models = [], actionKey, modelGroup) {
  const allowedProviders = new Set(
    getAiActionAllowedProviders(actionKey).map((provider) => String(provider || '').toUpperCase()),
  );

  return models.filter((model) => {
    if (modelGroup && model?.modelGroup !== modelGroup) return false;
    return allowedProviders.has(String(model?.provider || '').toUpperCase());
  });
}

export function groupAiActionsByModelGroup() {
  return AI_MODEL_GROUP_OPTIONS.map((group) => ({
    ...group,
    actions: AI_ACTION_OPTIONS.filter((actionKey) => AI_ACTION_GROUP_MAP[actionKey] === group.value),
  })).filter((group) => group.actions.length > 0);
}

export function buildAiModelAssignmentMap(assignments = []) {
  return AI_MODEL_GROUP_OPTIONS.reduce((acc, group) => {
    const matched = assignments.find((item) => item.modelGroup === group.value);
    acc[group.value] = matched?.aiModelId != null ? String(matched.aiModelId) : '';
    return acc;
  }, {});
}

export function buildAiModelAssignmentsPayload(assignmentMap = {}) {
  return Object.entries(assignmentMap)
    .filter(([, aiModelId]) => aiModelId !== null && aiModelId !== undefined && String(aiModelId).trim() !== '')
    .map(([modelGroup, aiModelId]) => ({
      modelGroup,
      aiModelId: Number(aiModelId),
    }));
}

export function buildFunctionAssignmentMap(assignments = []) {
  return AI_ACTION_OPTIONS.reduce((acc, actionKey) => {
    const matched = assignments.find((item) => item.actionKey === actionKey);
    acc[actionKey] = matched?.aiModelId != null ? String(matched.aiModelId) : '';
    return acc;
  }, {});
}

export function buildFunctionAssignmentsPayload(functionAssignmentMap = {}) {
  return Object.entries(functionAssignmentMap)
    .filter(([, aiModelId]) => aiModelId !== null && aiModelId !== undefined && String(aiModelId).trim() !== '')
    .map(([actionKey, aiModelId]) => ({
      actionKey,
      aiModelId: Number(aiModelId),
    }));
}
