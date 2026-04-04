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

export const AI_PROVIDER_OPTIONS = ['OPENAI', 'GEMINI', 'ANTHROPIC'];

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
  VALIDATE_STUDY_PROFILE_CONSISTENCY: 'aiActionPolicy.actions.validateStudyProfileConsistency.title',
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
  VALIDATE_STUDY_PROFILE_CONSISTENCY: 'TEXT_GENERATION',
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
  VALIDATE_STUDY_PROFILE_CONSISTENCY: ['OPENAI'],
};

export function getAiModelGroupMeta(modelGroup) {
  return AI_MODEL_GROUP_OPTIONS.find((item) => item.value === modelGroup) ?? null;
}

export function getAiModelGroupLabel(modelGroup, t) {
  if (!modelGroup) return '-';
  const meta = getAiModelGroupMeta(modelGroup);
  return meta ? t(meta.labelKey, modelGroup) : modelGroup;
}

export function getAiActionLabel(actionKey, t) {
  const labelKey = AI_ACTION_LABEL_KEYS[actionKey];
  if (!labelKey) return actionKey;
  const translated = t(labelKey, actionKey);
  if (translated && translated !== labelKey) return translated;
  return String(actionKey || '')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
