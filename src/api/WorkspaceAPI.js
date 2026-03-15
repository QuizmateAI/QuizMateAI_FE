import api from './api';
import {
  getPublicExamById,
  getPublicExamTemplateConfig,
} from '@/Pages/Users/Individual/Workspace/Components/WorkspaceProfileWizard/mockProfileWizardData';

const QUESTION_TYPE_SINGLE_CHOICE_ID = 1;
const MOCK_TEST_DIFFICULTY = 'MEDIUM';
const MOCK_TEST_POLL_ATTEMPTS = 30;
const MOCK_TEST_POLL_INTERVAL_MS = 1500;

function trimToNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeListField(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n;/]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function extractApiData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function mapAdaptationMode(value) {
  if (value === 'FLEXIBLE') return 'FLEXIBLE';
  if (value === 'STRICT') return 'STRICT';
  if (value === 'BALANCED') return 'STRICT';
  return null;
}

function mapRoadmapSpeedMode(value) {
  if (value === 'SLOW') return 'SLOW';
  if (value === 'FAST') return 'FAST';
  if (value === 'MEDIUM' || value === 'STANDARD') return 'MEDIUM';
  return null;
}

function resolveOutputLanguage() {
  if (typeof window !== 'undefined') {
    const appLanguage = window.localStorage?.getItem('app_language');
    if (appLanguage === 'en') return 'English';
  }

  return 'Vietnamese';
}

function splitQuestionsAcrossSections(totalQuestions, sectionCount) {
  const safeTotal = Math.max(1, Number(totalQuestions) || 1);
  const safeSectionCount = Math.max(1, sectionCount);
  const baseCount = Math.floor(safeTotal / safeSectionCount);
  const remainder = safeTotal % safeSectionCount;

  return Array.from({ length: safeSectionCount }, (_, index) => baseCount + (index < remainder ? 1 : 0))
    .filter((count) => count > 0);
}

function extractLeadingNumber(value) {
  const matched = `${value || ''}`.match(/\d+/);
  return matched ? Number(matched[0]) : 0;
}

function buildSectionConfigs(payload, examName, selectedExam) {
  const publicTemplateConfig =
    payload.mockExamMode === 'PUBLIC' ? getPublicExamTemplateConfig(payload, selectedExam) : null;
  const defaultQuestionCount =
    Number(publicTemplateConfig?.defaults?.templateQuestionCount)
    || Number(payload.templateQuestionCount)
    || 60;

  if (publicTemplateConfig?.sections?.some((section) => section.supported)) {
    const supportedSections = publicTemplateConfig.sections.filter((section) => section.supported);
    const explicitCounts = supportedSections.map((section) => extractLeadingNumber(section.questionLabel));
    const hasExplicitCounts = explicitCounts.every((count) => count > 0);
    const resolvedCounts = hasExplicitCounts
      ? explicitCounts
      : splitQuestionsAcrossSections(defaultQuestionCount, supportedSections.length);

    return supportedSections.map((section, index) => ({
      name: section.name,
      description: section.detail,
      numQuestions: Math.max(1, resolvedCounts[index] || 1),
      questionTypes: [
        {
          questionTypeId: QUESTION_TYPE_SINGLE_CHOICE_ID,
        },
      ],
    }));
  }

  const totalQuestions = Math.max(1, defaultQuestionCount);
  const focusLabel = trimToNull(payload.inferredDomain) || trimToNull(payload.knowledgeInput) || examName || 'Mock Test';
  const format = payload.templateFormat || 'FULL_EXAM';

  const sectionTemplates = {
    FULL_EXAM: ['Full Exam'],
    SECTION_BASED: ['Section 1', 'Section 2', 'Section 3'],
    PRACTICE_SET: ['Core Practice', 'Mixed Review'],
  };

  const sectionNames = sectionTemplates[format] || sectionTemplates.FULL_EXAM;
  const questionCounts = splitQuestionsAcrossSections(totalQuestions, sectionNames.length);

  return questionCounts.map((numQuestions, index) => ({
    name: sectionNames[index] || `Section ${index + 1}`,
    description: `Tap trung vao ${focusLabel}.`,
    numQuestions,
    questionTypes: [
      {
        questionTypeId: QUESTION_TYPE_SINGLE_CHOICE_ID,
      },
    ],
  }));
}

function buildMockTestPrompt(payload) {
  const parts = [trimToNull(payload.templatePrompt), trimToNull(payload.templateNotes)].filter(Boolean);
  return parts.length > 0 ? parts.join('\n\n') : null;
}

function buildBasicStepRequest(payload) {
  const learningMode = payload.workspacePurpose || payload.learningMode;

  return {
    learningMode,
    domain: trimToNull(payload.inferredDomain) || trimToNull(payload.customDomain) || trimToNull(payload.domain),
    knowledge: trimToNull(payload.knowledgeInput) || trimToNull(payload.customKnowledge) || trimToNull(payload.knowledge),
    roadmapEnabled: learningMode === 'STUDY_NEW' ? true : Boolean(payload.enableRoadmap ?? payload.roadmapEnabled),
  };
}

function buildPersonalInfoStepRequest(payload) {
  return {
    currentLevel: trimToNull(payload.currentLevel) || trimToNull(payload.customCurrentLevel),
    learningGoal: trimToNull(payload.learningGoal),
    weakAreas: normalizeListField(payload.weakAreas),
    strongAreas: normalizeListField(payload.strongAreas),
  };
}

function buildMockTestPersonalInfoRequest(payload) {
  const examName = trimToNull(payload.mockExamName) || trimToNull(payload.examName);
  const selectedExam = payload.mockExamMode === 'PUBLIC' ? getPublicExamById(payload.mockExamCatalogId) : null;
  const publicTemplateConfig = payload.mockExamMode === 'PUBLIC' ? getPublicExamTemplateConfig(payload, selectedExam) : null;

  return {
    currentLevel: trimToNull(payload.currentLevel) || trimToNull(payload.customCurrentLevel),
    learningGoal: trimToNull(payload.learningGoal),
    examName,
    weakAreas: normalizeListField(payload.weakAreas),
    strongAreas: normalizeListField(payload.strongAreas),
    mockTestRequest: {
      title: publicTemplateConfig?.title || `${examName || trimToNull(payload.inferredDomain) || 'Mock Test'} Template`,
      materialIds: [],
      overallDifficulty: MOCK_TEST_DIFFICULTY,
      durationInMinute: Math.max(
        1,
        Number(publicTemplateConfig?.defaults?.templateDurationMinutes)
        || Number(payload.templateDurationMinutes)
        || 90
      ),
      durationInSecond: 0,
      totalQuestion: Math.max(
        1,
        Number(publicTemplateConfig?.defaults?.templateQuestionCount)
        || Number(payload.templateQuestionCount)
        || 60
      ),
      prompt: buildMockTestPrompt(payload),
      outputLanguage: resolveOutputLanguage(),
      sectionConfigs: buildSectionConfigs(payload, examName, selectedExam),
    },
  };
}

function buildRoadmapConfigStepRequest(payload) {
  const roadmapEnabled = payload.workspacePurpose === 'STUDY_NEW' ? true : Boolean(payload.enableRoadmap ?? payload.roadmapEnabled);

  if (!roadmapEnabled) {
    return {
      adaptationMode: null,
      speedMode: null,
      estimatedTotalDays: null,
      recommendedMinutesPerDay: null,
    };
  }

  return {
    adaptationMode: mapAdaptationMode(payload.adaptationMode),
    speedMode: mapRoadmapSpeedMode(payload.roadmapSpeedMode),
    estimatedTotalDays: Number(payload.estimatedTotalDays) || null,
    recommendedMinutesPerDay: Number(payload.recommendedMinutesPerDay) || null,
  };
}

function delay(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function waitForMockTestPersonalInfoDone(workspaceId) {
  for (let attempt = 0; attempt < MOCK_TEST_POLL_ATTEMPTS; attempt += 1) {
    const response = await getIndividualWorkspaceProfile(workspaceId);
    const profile = extractApiData(response);

    if (profile?.profileStatus === 'PERSONAL_INFO_DONE' || profile?.profileStatus === 'DONE') {
      return response;
    }

    await delay(MOCK_TEST_POLL_INTERVAL_MS);
  }

  throw new Error('Mock test onboarding chưa hoàn tất ở bước 2. Vui lòng thử lại sau ít phút.');
}

// Lấy danh sách workspace theo user đang đăng nhập (có hỗ trợ phân trang)
export const getWorkspacesByUser = async (page = 0, size = 10) => {
  const response = await api.get(`/workSpace/getByUser?page=${page}&size=${size}`);
  return response;
};

// Tạo workspace mới
export const createWorkspace = async (data) => {
  const payload = { ...(data || {}) };
  if (payload.title !== undefined && payload.name === undefined) {
    payload.name = payload.title;
  }
  delete payload.title;

  const response = await api.post('/workSpace/create/individual', payload);
  return response;
};

// Cập nhật thông tin workspace
export const updateWorkspace = async (workspaceId, data) => {
  const payload = { ...(data || {}) };
  if (payload.title !== undefined && payload.name === undefined) {
    payload.name = payload.title;
  }
  delete payload.title;

  const response = await api.put(`/workSpace/${workspaceId}`, payload);
  return response;
};

// Xóa workspace
export const deleteIndividualWorkspace = async (workspaceId) => {
  const response = await api.delete(`/workSpace/individual/${workspaceId}`);
  return response;
};

export const deleteWorkspace = async (workspaceId) => {
  return deleteIndividualWorkspace(workspaceId);
};

// Lấy chi tiết workspace
export const getWorkspaceById = async (workspaceId) => {
  const response = await api.get(`/workSpace/${workspaceId}`);
  return response;
};

// Lấy danh sách roadmap của workspace (có phân trang)
export const getRoadmapsByWorkspace = async (workspaceId, page = 0, size = 10) => {
  const response = await api.get(`/roadmap/workspace/${workspaceId}?page=${page}&size=${size}`);
  return response;
};

// Lấy danh sách topics (có phân trang)
export const getAllTopics = async (page = 0, size = 100) => {
  const response = await api.get(`/topic/all?page=${page}&size=${size}`);
  return response;
};

export const saveIndividualWorkspaceBasicStep = async (workspaceId, data) => {
  const response = await api.put(`/workspace-profile/individual/${workspaceId}/steps/basic`, buildBasicStepRequest(data));
  return response;
};

export const saveIndividualWorkspacePersonalInfoStep = async (workspaceId, data) => {
  const response = await api.put(`/workspace-profile/individual/${workspaceId}/steps/personal-info`, buildPersonalInfoStepRequest(data));
  return response;
};

export const startIndividualWorkspaceMockTestPersonalInfoStep = async (workspaceId, data) => {
  const response = await api.post(
    `/workspace-profile/individual/${workspaceId}/steps/personal-info/mock-test`,
    buildMockTestPersonalInfoRequest(data)
  );
  return response;
};

export const saveIndividualWorkspaceRoadmapConfigStep = async (workspaceId, data) => {
  const response = await api.put(
    `/workspace-profile/individual/${workspaceId}/steps/roadmap-config`,
    buildRoadmapConfigStepRequest(data)
  );
  return response;
};

// Cấu hình Individual Workspace Profile theo flow 3 bước mới
export const configureIndividualWorkspaceProfile = async (workspaceId, data) => {
  await saveIndividualWorkspaceBasicStep(workspaceId, data);

  if ((data.workspacePurpose || data.learningMode) === 'MOCK_TEST') {
    await startIndividualWorkspaceMockTestPersonalInfoStep(workspaceId, data);
    await waitForMockTestPersonalInfoDone(workspaceId);
  } else {
    await saveIndividualWorkspacePersonalInfoStep(workspaceId, data);
  }

  return await saveIndividualWorkspaceRoadmapConfigStep(workspaceId, data);
};

// Lấy Profile Cá nhân của Workspace
export const getIndividualWorkspaceProfile = async (workspaceId) => {
  const response = await api.get(`/workspace-profile/individual/${workspaceId}`);
  return response;
};
