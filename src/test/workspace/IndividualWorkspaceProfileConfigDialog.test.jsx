import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import IndividualWorkspaceProfileConfigDialog from '@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog';

// Mock the StudyProfileAPI module
vi.mock('@/api/StudyProfileAPI', () => ({
  analyzeKnowledge: vi.fn(),
  suggestProfileFields: vi.fn(),
  validateProfileConsistency: vi.fn(),
}));

import {
  analyzeKnowledge,
  suggestProfileFields,
  validateProfileConsistency,
} from '@/api/StudyProfileAPI';

function createAnalysisResponse(domainSuggestions, options = {}) {
  return {
    redFlag: false,
    isValid: true,
    warning: false,
    confidence: 0.9,
    tooBroad: options.tooBroad || false,
    quizCompatible: true,
    message: options.message || '',
    advice: options.advice || '',
    domainSuggestions,
    quizConstraintWarnings: [],
    ...options,
  };
}

function createFieldSuggestionResponse(options = {}) {
  return {
    learningMode: options.learningMode || 'STUDY_NEW',
    redFlag: false,
    warning: false,
    quizCompatible: true,
    message: '',
    warnings: [],
    currentLevelSuggestions: options.currentLevelSuggestions || [],
    learningGoalSuggestions: options.learningGoalSuggestions || [],
    strongAreaSuggestions: options.strongAreaSuggestions || [],
    weakAreaSuggestions: options.weakAreaSuggestions || [],
    examNameSuggestions: options.examNameSuggestions || [],
    ...options,
  };
}

function createConsistencyResponse(options = {}) {
  return {
    redFlag: false,
    isConsistent: true,
    warning: false,
    confidence: 0.95,
    quizCompatible: true,
    message: '',
    issues: [],
    recommendations: [],
    quizConstraintWarnings: [],
    ...options,
  };
}

function setupApiMocks({ analysisResponse, fieldSuggestionResponse, consistencyResponse } = {}) {
  analyzeKnowledge.mockResolvedValue(
    analysisResponse || createAnalysisResponse(['React', 'Frontend Development', 'JavaScript'])
  );
  suggestProfileFields.mockResolvedValue(
    fieldSuggestionResponse || createFieldSuggestionResponse()
  );
  validateProfileConsistency.mockResolvedValue(
    consistencyResponse || createConsistencyResponse()
  );
}

function renderDialog(props = {}) {
  const onSave = props.onSave || vi.fn().mockResolvedValue(undefined);
  const onUploadFiles = props.onUploadFiles || vi.fn().mockResolvedValue([]);
  const onOpenChange = props.onOpenChange || vi.fn();

  const view = render(
    <IndividualWorkspaceProfileConfigDialog
      open
      onOpenChange={onOpenChange}
      onSave={onSave}
      onUploadFiles={onUploadFiles}
      uploadedMaterials={props.uploadedMaterials || []}
      workspaceId={props.workspaceId || '123'}
      isDarkMode={false}
      {...props}
    />
  );

  return { ...view, onSave, onUploadFiles, onOpenChange };
}

function normalizeText(value = '') {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function getPurposeButtons() {
  return Array.from(document.body.querySelectorAll('button.group'));
}

function getFooterPrimaryButton() {
  return screen.getAllByRole('button').find((button) => {
    const className = typeof button.className === 'string' ? button.className : '';
    return (className.includes('bg-cyan-600') || className.includes('bg-emerald-600')) && className.includes('px-6');
  });
}

function findButtonByText(text, { exact = false } = {}) {
  const expected = normalizeText(text);

  return screen.getAllByRole('button').find((button) => {
    const actual = normalizeText(button.textContent || '');
    return exact ? actual === expected : actual.includes(expected);
  });
}

function clickButtonByText(text, options) {
  const target = findButtonByText(text, options);
  expect(target).toBeTruthy();
  fireEvent.click(target);
  return target;
}

function getPrimaryDomainDisplay() {
  return screen.getByLabelText(i18n.t('workspace.profileConfig.fields.primaryDomain'));
}

function getLearningGoalPlaceholder(purpose) {
  return i18n.t(`workspace.profileConfig.placeholders.learningGoalByPurpose.${purpose}`);
}

function getUploadInputLabel() {
  return 'Chọn tài liệu để tải lên';
}

async function finishKnowledgeAnalysis(knowledgeText, expectedDomainText) {
  fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput')), {
    target: { value: knowledgeText },
  });

  // Wait for debounce (800ms) + let the promise resolve
  await act(async () => {
    vi.advanceTimersByTime(900);
    await vi.runAllTimersAsync();
  });

  // Additional flush for the API promise
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  if (expectedDomainText) {
    expect(findButtonByText(expectedDomainText)).toBeTruthy();
  }
}

async function moveToStepTwo({
  purposeText,
  knowledge,
  expectedDomainText,
  roadmapChoiceText,
}) {
  clickButtonByText(purposeText);
  await finishKnowledgeAnalysis(knowledge, expectedDomainText);

  if (expectedDomainText) {
    clickButtonByText(expectedDomainText);
    expect(getPrimaryDomainDisplay()).toHaveTextContent(expectedDomainText);
  }

  if (roadmapChoiceText) {
    clickButtonByText(roadmapChoiceText);
  }

  await act(async () => {
    fireEvent.click(getFooterPrimaryButton());
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
}

async function moveToUploadStep() {
  await act(async () => {
    fireEvent.click(getFooterPrimaryButton());
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(screen.getByLabelText(getUploadInputLabel())).toBeInTheDocument();
}

async function addUploadFile(fileName = 'jlpt-n3-grammar.pdf', type = 'application/pdf') {
  const file = new File(['study material'], fileName, { type });

  await act(async () => {
    fireEvent.change(screen.getByLabelText(getUploadInputLabel()), {
      target: { files: [file] },
    });
    await Promise.resolve();
  });

  return file;
}

describe('IndividualWorkspaceProfileConfigDialog', () => {
  beforeEach(() => {
    window.localStorage.setItem('app_language', 'vi');
    window.sessionStorage.clear();
    i18n.changeLanguage('vi');
    vi.useFakeTimers();
    setupApiMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the STUDY_NEW fields on step 2 only', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['React', 'Frontend Development', 'JavaScript']),
    });

    const { onSave } = renderDialog();

    expect(getPurposeButtons()).toHaveLength(3);

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'),
      knowledge: 'React hooks nang cao',
      expectedDomainText: 'React',
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(getLearningGoalPlaceholder('STUDY_NEW'))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.strongAreas'))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.weakAreas'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('workspace.profileConfig.stepTwo.mockTestTitle'))).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenNthCalledWith(
      1,
      1,
      expect.objectContaining({
        workspacePurpose: 'STUDY_NEW',
        knowledgeInput: 'React hooks nang cao',
        inferredDomain: 'React',
      })
    );
  });

  it('shows the knowledge description nudge when the AI flags input as too broad', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['English', 'English Communication', 'Language Skills'], {
        tooBroad: true,
        warning: true,
        message: 'Nội dung quá rộng, vui lòng cụ thể hơn.',
      }),
    });

    renderDialog();

    clickButtonByText(i18n.t('workspace.profileConfig.purpose.REVIEW.title'));
    await finishKnowledgeAnalysis('English', 'English');
    clickButtonByText('English');
    expect(getPrimaryDomainDisplay()).toHaveTextContent('English');

    expect(screen.getByText(i18n.t('workspace.profileConfig.stepOne.knowledgeNudgeTitle'))).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getFooterPrimaryButton());
      await Promise.resolve();
    });
    expect(screen.getByText(i18n.t('workspace.profileConfig.validation.knowledgeDescriptionRequired'))).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeDescription')), {
      target: { value: 'On tieng Anh giao tiep cho cong viec voi trong tam nghe noi.' },
    });
    await act(async () => {
      fireEvent.click(getFooterPrimaryButton());
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
  });

  it('switches correctly between public and private exam UI for MOCK_TEST', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['IELTS Writing', 'IELTS', 'Academic English']),
    });

    const { onSave } = renderDialog();

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.MOCK_TEST.title'),
      knowledge: 'IELTS Writing task 2',
      expectedDomainText: 'IELTS Writing',
    });

    expect(screen.getByText(i18n.t('workspace.profileConfig.stepTwo.mockTestTitle'))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.publicExamSearch'))).toBeInTheDocument();
    expect(screen.getByText('IELTS Academic')).toBeInTheDocument();
    clickButtonByText('IELTS Academic');
    expect(screen.getByText(i18n.t('workspace.profileConfig.stepTwo.publicTemplateTitle'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.stepTwo.supportNoticeTitle'))).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.templatePrompt'))).not.toBeInTheDocument();

    clickButtonByText(i18n.t('workspace.profileConfig.mockExamMode.PRIVATE'), { exact: true });
    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.privateExamName'))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.templatePrompt'))).toBeInTheDocument();

    clickButtonByText(i18n.t('workspace.profileConfig.mockExamMode.PUBLIC'), { exact: true });
    clickButtonByText('IELTS Academic');

    await act(async () => {
      expect(
        screen.getByText((content) => normalizeText(content).includes('ielts academic') && normalizeText(content).includes('template cong khai'))
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'IELTS 6.0' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('MOCK_TEST')), {
      target: { value: 'On dinh writing va giu toc do lam bai.' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.strongAreas')), {
      target: { value: 'Doc hieu de nhanh' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.weakAreas')), {
      target: { value: 'Quan ly thoi gian khi lam bai' },
    });
    await act(async () => {
      fireEvent.click(getFooterPrimaryButton());
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByLabelText(getUploadInputLabel())).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenNthCalledWith(2, 2, expect.objectContaining({
      workspacePurpose: 'MOCK_TEST',
      mockExamMode: 'PUBLIC',
      mockExamCatalogId: 'ielts',
      currentLevel: 'IELTS 6.0',
      learningGoal: 'On dinh writing va giu toc do lam bai.',
      strongAreas: 'Doc hieu de nhanh',
      weakAreas: 'Quan ly thoi gian khi lam bai',
    }));
  });

  it('requires strengths and weaknesses for REVIEW', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['Probability & Statistics', 'Mathematics', 'STEM']),
    });

    renderDialog();

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.REVIEW.title'),
      knowledge: 'xac suat thong ke co ban',
      expectedDomainText: 'Probability & Statistics',
      roadmapChoiceText: i18n.t('workspace.profileConfig.common.no'),
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Da hoc xac suat co ban' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('REVIEW')), {
      target: { value: 'On lai de thi cuoi ky' },
    });

    await act(async () => {
      fireEvent.click(getFooterPrimaryButton());
      await Promise.resolve();
    });

    expect(screen.getByText(i18n.t('workspace.profileConfig.validation.strongAreasRequired'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.validation.weakAreasRequired'))).toBeInTheDocument();
  });

  it('shows the template generation pending state on mock-test step 2', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['JLPT N2', 'JLPT', 'Japanese']),
    });

    renderDialog({
      initialData: {
        profileStatus: 'BASIC_DONE',
        learningMode: 'MOCK_TEST',
        knowledge: 'JLPT N2',
        domain: 'JLPT N2',
      },
      mockTestGenerationState: 'pending',
      mockTestGenerationMessage: i18n.t('workspace.profileConfig.messages.mockTemplateGenerating'),
    });

    await act(async () => {
      vi.advanceTimersByTime(900);
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getAllByText(i18n.t('workspace.profileConfig.messages.mockTemplateGenerating')).length).toBeGreaterThan(0);
    expect(getFooterPrimaryButton()).toBeDisabled();
    expect(getFooterPrimaryButton()).toHaveTextContent(i18n.t('workspace.profileConfig.actions.generatingTemplate'));
  });

  it('calls the real analyzeKnowledge API with debounce', async () => {
    const mockResponse = createAnalysisResponse(['JLPT N3', 'JLPT', 'Japanese']);
    setupApiMocks({ analysisResponse: mockResponse });

    renderDialog();

    // Clear mocks accumulated from init effects of previous tests
    analyzeKnowledge.mockClear();

    clickButtonByText(i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'));

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput')), {
      target: { value: 'JLPT N3 grammar' },
    });

    // API shouldn't be called yet (still debouncing)
    expect(analyzeKnowledge).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(900);
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(analyzeKnowledge).toHaveBeenCalledWith('JLPT N3 grammar', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(findButtonByText('JLPT N3')).toBeTruthy();
  });

  it('resumes at step 2 when the server already saved BASIC_DONE', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['Probability & Statistics', 'Mathematics', 'STEM']),
    });

    renderDialog({
      initialData: {
        profileStatus: 'BASIC_DONE',
        learningMode: 'REVIEW',
        knowledge: 'xac suat thong ke co ban',
        domain: 'Probability & Statistics',
        roadmapEnabled: false,
      },
    });

    await act(async () => {
      vi.advanceTimersByTime(900);
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
  });

  it('stays on step 1 for a newly created workspace when the backend only returns status metadata', async () => {
    renderDialog({
      initialData: {
        profileStatus: 'BASIC_DONE',
        workspaceSetupStatus: 'PROFILE_IN_PROGRESS',
      },
    });

    await act(async () => {
      vi.advanceTimersByTime(900);
      await vi.runAllTimersAsync();
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput'))).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).not.toBeInTheDocument();
  });

  it('forces step 1 when the onboarding flow starts from workspace creation', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['React', 'Frontend Development', 'JavaScript']),
    });

    window.sessionStorage.setItem('workspace-profile-wizard-123', '3');

    renderDialog({
      forceStartAtStepOne: true,
      initialData: {
        profileStatus: 'PERSONAL_INFO_DONE',
        learningMode: 'STUDY_NEW',
        knowledge: 'React hooks nang cao',
        domain: 'React',
        currentLevel: 'Da biet React co ban',
        learningGoal: 'Xay dung mot project hoan chinh',
      },
    });

    await act(async () => {
      vi.advanceTimersByTime(900);
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput'))).toBeInTheDocument();
    expect(screen.queryByLabelText(getUploadInputLabel())).not.toBeInTheDocument();
  });

  it('resumes at the upload step when personal info is already saved', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['React', 'Frontend Development', 'JavaScript']),
    });

    renderDialog({
      initialData: {
        profileStatus: 'PERSONAL_INFO_DONE',
        learningMode: 'STUDY_NEW',
        knowledge: 'React hooks nang cao',
        domain: 'React',
        currentLevel: 'Da biet React co ban',
        learningGoal: 'Xay dung mot project hoan chinh',
      },
    });

    await act(async () => {
      vi.advanceTimersByTime(900);
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByLabelText(getUploadInputLabel())).toBeInTheDocument();
  });
});
