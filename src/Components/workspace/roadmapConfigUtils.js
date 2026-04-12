import {
  getRecommendedRoadmapDays,
  getRecommendedRoadmapMinutesPerDay,
  inferRoadmapSpeedModeFromDays,
} from '@/Pages/Users/Individual/Workspace/Components/WorkspaceProfileWizard/mockProfileWizardData';

const DEFAULT_KNOWLEDGE_LOAD = 'BASIC';
const DEFAULT_ADAPTATION_MODE = 'BALANCED';
const DEFAULT_ROADMAP_SPEED_MODE = 'STANDARD';

export function normalizeKnowledgeLoadValue(value) {
  const normalizedValue = String(value || '').toUpperCase();

  if (normalizedValue === 'ADVANCED' || normalizedValue === 'FULL') return 'ADVANCED';
  if (normalizedValue === 'INTERMEDIATE') return 'INTERMEDIATE';
  if (normalizedValue === 'BASIC') return 'BASIC';
  return '';
}

export function normalizeAdaptationModeValue(value) {
  const normalizedValue = String(value || '').toUpperCase();

  if (normalizedValue === 'FLEXIBLE') return 'FLEXIBLE';
  if (normalizedValue === 'STRICT' || normalizedValue === 'BALANCED') return 'BALANCED';
  return '';
}

export function normalizeRoadmapSpeedModeValue(value) {
  const normalizedValue = String(value || '').toUpperCase();

  if (normalizedValue === 'SLOW') return 'SLOW';
  if (normalizedValue === 'FAST') return 'FAST';
  if (normalizedValue === 'STANDARD' || normalizedValue === 'MEDIUM') return 'STANDARD';
  return '';
}

function normalizeNumericRoadmapValue(value) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) && normalizedValue > 0 ? normalizedValue : '';
}

function translateOrFallback(t, key, fallback) {
  const translated = t?.(key);
  return translated && translated !== key ? translated : fallback;
}

function resolveRoadmapDefaults(values = {}) {
  const knowledgeLoad = normalizeKnowledgeLoadValue(values.knowledgeLoad) || DEFAULT_KNOWLEDGE_LOAD;
  const adaptationMode = normalizeAdaptationModeValue(values.adaptationMode) || DEFAULT_ADAPTATION_MODE;
  const roadmapSpeedMode = normalizeRoadmapSpeedModeValue(values.roadmapSpeedMode) || DEFAULT_ROADMAP_SPEED_MODE;
  const estimatedTotalDays =
    normalizeNumericRoadmapValue(values.estimatedTotalDays)
    || getRecommendedRoadmapDays(knowledgeLoad, roadmapSpeedMode);
  const recommendedMinutesPerDay =
    normalizeNumericRoadmapValue(values.recommendedMinutesPerDay)
    || getRecommendedRoadmapMinutesPerDay(knowledgeLoad, estimatedTotalDays);

  return {
    knowledgeLoad,
    adaptationMode,
    roadmapSpeedMode,
    estimatedTotalDays,
    recommendedMinutesPerDay,
  };
}

export function extractRoadmapConfigValues(source = {}) {
  return {
    knowledgeLoad: normalizeKnowledgeLoadValue(source?.knowledgeLoad ?? source?.roadmapKnowledgeLoad),
    adaptationMode: normalizeAdaptationModeValue(source?.adaptationMode),
    roadmapSpeedMode: normalizeRoadmapSpeedModeValue(source?.roadmapSpeedMode ?? source?.speedMode),
    estimatedTotalDays: normalizeNumericRoadmapValue(source?.estimatedTotalDays),
    recommendedMinutesPerDay: normalizeNumericRoadmapValue(
      source?.recommendedMinutesPerDay ?? source?.estimatedMinutesPerDay
    ),
  };
}

export function hasMeaningfulRoadmapConfig(source = {}) {
  const normalizedValues = extractRoadmapConfigValues(source);

  return Boolean(
    normalizedValues.knowledgeLoad
    || normalizedValues.adaptationMode
    || normalizedValues.roadmapSpeedMode
    || Number(normalizedValues.estimatedTotalDays) > 0
    || Number(normalizedValues.recommendedMinutesPerDay) > 0
  );
}

export function buildInitialRoadmapValues(initialValues = {}) {
  const normalizedValues = resolveRoadmapDefaults(extractRoadmapConfigValues(initialValues));

  return {
    workspacePurpose: 'STUDY_NEW',
    enableRoadmap: true,
    ...normalizedValues,
  };
}

export function syncRoadmapConfigFieldValues(currentValues = {}, field, value) {
  const nextValues = {
    ...currentValues,
    [field]: value,
  };

  const knowledgeLoad = normalizeKnowledgeLoadValue(nextValues.knowledgeLoad) || DEFAULT_KNOWLEDGE_LOAD;
  const adaptationMode = normalizeAdaptationModeValue(nextValues.adaptationMode) || DEFAULT_ADAPTATION_MODE;
  let roadmapSpeedMode = normalizeRoadmapSpeedModeValue(nextValues.roadmapSpeedMode) || DEFAULT_ROADMAP_SPEED_MODE;
  let estimatedTotalDays = normalizeNumericRoadmapValue(nextValues.estimatedTotalDays);
  let recommendedMinutesPerDay = normalizeNumericRoadmapValue(nextValues.recommendedMinutesPerDay);

  if (field === 'knowledgeLoad' || field === 'roadmapSpeedMode') {
    estimatedTotalDays = getRecommendedRoadmapDays(knowledgeLoad, roadmapSpeedMode);
    recommendedMinutesPerDay = getRecommendedRoadmapMinutesPerDay(knowledgeLoad, estimatedTotalDays);
  } else if (field === 'estimatedTotalDays') {
    if (estimatedTotalDays) {
      roadmapSpeedMode = inferRoadmapSpeedModeFromDays(knowledgeLoad, estimatedTotalDays);
      recommendedMinutesPerDay = getRecommendedRoadmapMinutesPerDay(knowledgeLoad, estimatedTotalDays);
    } else {
      recommendedMinutesPerDay = '';
    }
  }

  return {
    ...nextValues,
    knowledgeLoad,
    adaptationMode,
    roadmapSpeedMode,
    estimatedTotalDays,
    recommendedMinutesPerDay,
  };
}

export function validateRoadmapConfigValues(values = {}, t) {
  const errors = {};

  if (!normalizeKnowledgeLoadValue(values.knowledgeLoad)) {
    errors.knowledgeLoad = translateOrFallback(
      t,
      'workspace.profileConfig.validation.knowledgeLoadRequired',
      'Please choose the amount of knowledge to cover.'
    );
  }

  if (!normalizeAdaptationModeValue(values.adaptationMode)) {
    errors.adaptationMode = translateOrFallback(
      t,
      'workspace.profileConfig.validation.adaptationModeRequired',
      'Please choose an adaptation mode.'
    );
  }

  if (!normalizeRoadmapSpeedModeValue(values.roadmapSpeedMode)) {
    errors.roadmapSpeedMode = translateOrFallback(
      t,
      'workspace.profileConfig.validation.roadmapSpeedModeRequired',
      'Please choose a roadmap speed mode.'
    );
  }

  if (!normalizeNumericRoadmapValue(values.estimatedTotalDays)) {
    errors.estimatedTotalDays = translateOrFallback(
      t,
      'workspace.profileConfig.validation.estimatedTotalDaysRequired',
      'Please enter a total number of days greater than 0.'
    );
  }

  if (!normalizeNumericRoadmapValue(values.recommendedMinutesPerDay)) {
    errors.recommendedMinutesPerDay = translateOrFallback(
      t,
      'workspace.profileConfig.validation.recommendedMinutesRequired',
      'Please enter a daily study time greater than 0.'
    );
  }

  return errors;
}
