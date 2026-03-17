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
    normalizedKnowledge: options.normalizedKnowledge || '',
    message: options.message || '',
    advice: options.advice || '',
    validationHighlights: options.validationHighlights || [],
    refinementSuggestions: options.refinementSuggestions || [],
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
    alignmentHighlights: options.alignmentHighlights || [],
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
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
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

function getStepCardButton(stepNumber) {
  const stepTitle = i18n.t(`workspace.profileConfig.steps.${stepNumber}.title`);

  return screen.getAllByRole('button').find((button) => {
    const text = normalizeText(button.textContent || '');
    return text.includes(normalizeText(stepTitle)) && text.includes(normalizeText(i18n.t('workspace.profileConfig.badge'))) === false;
  });
}

function findButtonByText(text, { exact = false, includeDisabled = false } = {}) {
  const expected = normalizeText(text);

  return screen.getAllByRole('button').find((button) => {
    if (!includeDisabled && button.hasAttribute('disabled')) {
      return false;
    }

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

async function flushStepTwoAiSuggestions() {
  await act(async () => {
    vi.advanceTimersByTime(900);
    await vi.runAllTimersAsync();
  });

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
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

  it('reveals step-two AI suggestions progressively and only suggests learning goals after current context is filled', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['Tiếng Nhật', 'JLPT'], {
        normalizedKnowledge: 'Tiếng Nhật theo hướng JLPT N4.',
      }),
    });
    suggestProfileFields.mockImplementation(async ({ currentLevel, strongAreas, weakAreas }) => {
      if (!currentLevel) {
        return createFieldSuggestionResponse({
          message: 'AI đang gợi ý trình độ hiện tại dựa trên kiến thức và lĩnh vực bạn đã xác nhận ở bước 1.',
          currentLevelSuggestions: ['Đã học xong N5', 'N5 vững', 'Có nền tảng từ vựng và ngữ pháp sơ cấp'],
          strongAreaSuggestions: ['Chữ Hán cơ bản', 'Từ vựng N5'],
          weakAreaSuggestions: ['Ngữ pháp N4 dễ nhầm', 'Đọc hiểu ngắn N4'],
          learningGoalSuggestions: [],
        });
      }

      if (!(strongAreas?.length && weakAreas?.length)) {
        return createFieldSuggestionResponse({
          message: 'AI đang chờ thêm điểm mạnh và điểm yếu trong đúng phạm vi kiến thức này để gợi ý mục tiêu học tập sát hơn.',
          currentLevelSuggestions: ['Đã học xong N5', 'N5 vững', 'Có nền tảng từ vựng và ngữ pháp sơ cấp'],
          strongAreaSuggestions: ['Chữ Hán cơ bản', 'Từ vựng N5'],
          weakAreaSuggestions: ['Ngữ pháp N4 dễ nhầm', 'Đọc hiểu ngắn N4'],
          learningGoalSuggestions: [],
        });
      }

      return createFieldSuggestionResponse({
        message: 'AI đã có đủ bối cảnh để gợi ý mục tiêu học tập bám sát trình độ hiện tại, điểm mạnh và điểm yếu của bạn.',
        currentLevelSuggestions: ['Đã học xong N5', 'N5 vững', 'Có nền tảng từ vựng và ngữ pháp sơ cấp'],
        strongAreaSuggestions: ['Chữ Hán cơ bản', 'Từ vựng N5'],
        weakAreaSuggestions: ['Ngữ pháp N4 dễ nhầm', 'Đọc hiểu ngắn N4'],
        learningGoalSuggestions: ['Khắc phục Ngữ pháp N4 dễ nhầm để học chắc N4.', 'Nắm vững ngữ pháp N4 và mở rộng vốn từ theo đúng phạm vi đang học.'],
      });
    });

    renderDialog();

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'),
      knowledge: 'JLPT N4',
      expectedDomainText: 'Tiếng Nhật',
    });

    await flushStepTwoAiSuggestions();

    expect(screen.getByText(i18n.t('workspace.profileConfig.stepTwo.currentLevelTitle'))).toBeInTheDocument();
    expect(screen.getByText('Đã học xong N5')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.stepTwo.waitForGoalTitle'))).toBeInTheDocument();
    expect(screen.queryByText('Khắc phục Ngữ pháp N4 dễ nhầm để học chắc N4.')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Đã học xong N5' },
    });
    await flushStepTwoAiSuggestions();

    expect(screen.getByText(i18n.t('workspace.profileConfig.stepTwo.strengthWeaknessTitle'))).toBeInTheDocument();
    expect(screen.getByText('Chữ Hán cơ bản')).toBeInTheDocument();
    expect(screen.getByText('Ngữ pháp N4 dễ nhầm')).toBeInTheDocument();
    expect(screen.queryByText('Khắc phục Ngữ pháp N4 dễ nhầm để học chắc N4.')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.strongAreas')), {
      target: { value: 'Chữ Hán cơ bản' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.weakAreas')), {
      target: { value: 'Ngữ pháp N4 dễ nhầm' },
    });
    await flushStepTwoAiSuggestions();

    expect(screen.getByText('Khắc phục Ngữ pháp N4 dễ nhầm để học chắc N4.')).toBeInTheDocument();
    expect(suggestProfileFields).toHaveBeenLastCalledWith(
      expect.objectContaining({
        knowledge: 'JLPT N4',
        currentLevel: 'Đã học xong N5',
        strongAreas: ['Chữ Hán cơ bản'],
        weakAreas: ['Ngữ pháp N4 dễ nhầm'],
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('shows the AI overall review after the user fills enough step-two context', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['Tiếng Nhật', 'JLPT'], {
        normalizedKnowledge: 'Tiếng Nhật theo hướng JLPT N4.',
      }),
      fieldSuggestionResponse: createFieldSuggestionResponse({
        currentLevelSuggestions: ['Đã học xong N5'],
        strongAreaSuggestions: ['Chữ Hán cơ bản'],
        weakAreaSuggestions: ['Ngữ pháp N4 dễ nhầm'],
      }),
      consistencyResponse: createConsistencyResponse({
        message: 'Các thông tin hiện đang bám khá sát với kiến thức và lĩnh vực bạn đã chọn.',
        alignmentHighlights: [
          'Trình độ hiện tại đang bám theo phạm vi JLPT N4 trong lĩnh vực Tiếng Nhật.',
          'Điểm mạnh và điểm yếu đang mô tả các mảng con liên quan trực tiếp đến nội dung bạn đã chọn.',
        ],
        recommendations: ['Bạn có thể tinh chỉnh mục tiêu học tập để bám sát hơn vào điểm yếu hiện tại.'],
      }),
    });

    renderDialog();

    clickButtonByText(i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'));
    await finishKnowledgeAnalysis('JLPT N4', 'Tiếng Nhật');
    clickButtonByText('Tiếng Nhật');

    await act(async () => {
      fireEvent.click(getFooterPrimaryButton());
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(i18n.t('workspace.profileConfig.stepTwo.overallReviewPendingTitle'))).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Đã học xong N5' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.strongAreas')), {
      target: { value: 'Chữ Hán cơ bản' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.weakAreas')), {
      target: { value: 'Ngữ pháp N4 dễ nhầm' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('STUDY_NEW')), {
      target: { value: 'Nắm vững ngữ pháp N4 và mở rộng vốn từ theo đúng phạm vi đang học.' },
    });

    await flushStepTwoAiSuggestions();

    expect(screen.getByText('Các thông tin hiện đang bám khá sát với kiến thức và lĩnh vực bạn đã chọn.')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.stepTwo.alignmentHighlightsTitle'))).toBeInTheDocument();
    expect(screen.getByText((content) => normalizeText(content).includes('pham vi jlpt n4 trong linh vuc tieng nhat'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.stepTwo.recommendationsTitle'))).toBeInTheDocument();
  });

  it('shows a hint to refine knowledge input when the AI flags input as too broad', async () => {
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

    expect(
      screen.getByText((content) =>
        normalizeText(content).includes('hay quay lai o "kien thuc" va nhap cu the hon')
      )
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeDescription'))).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getFooterPrimaryButton());
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
  });

  it('shows detailed AI feedback when the knowledge input contains an invalid standardized level', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['Tiếng Nhật', 'JLPT'], {
        warning: true,
        tooBroad: false,
        message: 'JLPT chỉ có các cấp độ chuẩn từ N5 đến N1. N6 không phải cấp độ hợp lệ.',
        advice: 'Hãy đổi sang JLPT N5, JLPT N4 hoặc mô tả rõ hơn như ngữ pháp JLPT sơ cấp.',
        normalizedKnowledge: 'Tiếng Nhật theo khung JLPT, nhưng cấp độ bạn nhập hiện chưa đúng chuẩn.',
        validationHighlights: [
          'Phát hiện cụm cấp độ N6 trong ngữ cảnh JLPT.',
          'JLPT chuẩn chỉ có N5, N4, N3, N2 và N1.',
        ],
        refinementSuggestions: [
          'Đổi sang cấp độ đúng như JLPT N5 hoặc JLPT N4.',
          'Nếu chưa chắc level, hãy nhập theo phạm vi như ngữ pháp JLPT sơ cấp.',
        ],
      }),
    });

    renderDialog();

    clickButtonByText(i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'));
    await finishKnowledgeAnalysis('JLPT N6', 'Tiếng Nhật');

    expect(screen.getByText((content) => normalizeText(content).includes('jlpt chi co cac cap do chuan tu n5 den n1'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.stepOne.analysisSummaryTitle'))).toBeInTheDocument();
    expect(screen.getByText((content) => normalizeText(content).includes('cap do n6 trong ngu canh jlpt'))).toBeInTheDocument();
    expect(screen.getByText((content) => normalizeText(content).includes('doi sang cap do dung nhu jlpt n5'))).toBeInTheDocument();
  });

  it('shows five related domain suggestions for an ambiguous English-Vietnamese shorthand', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse([
        'Tiếng Anh',
        'Tiếng Việt',
        'Dịch Anh - Việt',
        'Học tiếng Anh bằng tiếng Việt',
        'Học tiếng Việt bằng tiếng Anh',
      ], {
        warning: true,
        tooBroad: true,
        message: 'Cụm này đang chỉ ra cặp ngôn ngữ Anh - Việt, nhưng chưa nói rõ bạn muốn học ngôn ngữ nào hoặc muốn đi theo chiều dịch nào.',
        normalizedKnowledge: 'Cặp Anh - Việt với nhiều hướng hiểu hợp lệ: học tiếng Anh, học tiếng Việt, dịch Anh - Việt, học tiếng Anh bằng tiếng Việt hoặc học tiếng Việt bằng tiếng Anh.',
        validationHighlights: [
          'Đã nhận diện đây là cụm liên quan đến cặp ngôn ngữ Anh - Việt.',
          'Có thể hiểu theo nhiều hướng học hoặc dịch khác nhau, nên hiện chưa đủ rõ để cá nhân hóa sâu.',
        ],
        refinementSuggestions: [
          'Nếu muốn học ngôn ngữ, hãy ghi rõ như từ vựng tiếng Anh giao tiếp cơ bản.',
          'Nếu muốn dịch, hãy ghi rõ chiều dịch như dịch Anh - Việt thương mại.',
        ],
      }),
    });

    renderDialog();

    clickButtonByText(i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'));
    await finishKnowledgeAnalysis('anh việt', 'Tiếng Anh');

    expect(findButtonByText('Tiếng Anh')).toBeTruthy();
    expect(findButtonByText('Tiếng Việt')).toBeTruthy();
    expect(findButtonByText('Dịch Anh - Việt')).toBeTruthy();
    expect(findButtonByText('Học tiếng Anh bằng tiếng Việt')).toBeTruthy();
    expect(findButtonByText('Học tiếng Việt bằng tiếng Anh')).toBeTruthy();
    expect(
      screen.getAllByText((content) => normalizeText(content).includes('cap ngon ngu anh - viet')).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText((content) => normalizeText(content).includes('nhieu huong hoc hoac dich khac nhau')).length
    ).toBeGreaterThan(0);
  });

  it('shows a clear fallback message instead of an empty domain list when AI has no domain suggestions', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse([], {
        warning: true,
        tooBroad: true,
        message: 'Noi dung qua ngan nen chua du co so de xac dinh chinh xac ban muon hoc gi.',
      }),
    });

    renderDialog();

    clickButtonByText(i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'));
    await finishKnowledgeAnalysis('n1');

    expect(screen.getByText(i18n.t('workspace.profileConfig.stepOne.noDomainSuggestionTitle'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.stepOne.noDomainSuggestionDescription'))).toBeInTheDocument();
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

  it('blocks step 3 until at least one valid material matches the roadmap profile', async () => {
    const invalidUploadedMaterials = [
      {
        id: 'material-1',
        name: 'business-overview.pdf',
        materialType: 'application/pdf',
        status: 'READY',
      },
    ];
    const { onSave, onUploadFiles } = renderDialog({
      uploadedMaterials: invalidUploadedMaterials,
    });

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'),
      knowledge: 'React hooks nang cao',
      expectedDomainText: 'React',
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Da biet React co ban va dang hoc hook nang cao' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('STUDY_NEW')), {
      target: { value: 'Xay dung roadmap React nang cao de hoc bai ban.' },
    });

    await moveToUploadStep();

    const nextButton = findButtonByText(i18n.t('workspace.profileConfig.actions.next'), {
      exact: true,
      includeDisabled: true,
    });
    expect(nextButton).toBeTruthy();
    expect(nextButton.className).toContain('cursor-not-allowed');

    await act(async () => {
      fireEvent.click(nextButton);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.getAllByText(i18n.t('workspace.profileConfig.validation.validMaterialsRequired')).length
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText(getUploadInputLabel())).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onUploadFiles).not.toHaveBeenCalled();
  });

  it('does not continue to step 4 just because a queued file looks related before validation finishes', async () => {
    const onUploadFiles = vi.fn().mockResolvedValue([
      {
        id: 'material-processing',
        name: 'react-hooks-nang-cao.pdf',
        materialType: 'application/pdf',
        status: 'PROCESSING',
      },
    ]);
    const { onSave } = renderDialog({ onUploadFiles });

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'),
      knowledge: 'React hooks nang cao',
      expectedDomainText: 'React',
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Da biet React co ban va dang hoc hook nang cao' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('STUDY_NEW')), {
      target: { value: 'Xay dung roadmap React nang cao de hoc bai ban.' },
    });

    await moveToUploadStep();
    await addUploadFile('react-hooks-nang-cao.pdf');

    const uploadButton = findButtonByText(i18n.t('workspace.profileConfig.actions.checkAndUpload'), {
      exact: true,
      includeDisabled: true,
    });
    expect(uploadButton).toBeTruthy();

    await act(async () => {
      fireEvent.click(uploadButton);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onUploadFiles).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText(getUploadInputLabel())).toBeInTheDocument();
    expect(
      screen.getAllByText(i18n.t('workspace.profileConfig.validation.validMaterialsRequired')).length
    ).toBeGreaterThan(0);
  });

  it('does not upload invalid pending files into the workspace', async () => {
    const onUploadFiles = vi.fn().mockResolvedValue([]);
    renderDialog({ onUploadFiles });

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'),
      knowledge: 'React hooks nang cao',
      expectedDomainText: 'React',
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Da biet React co ban va dang hoc hook nang cao' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('STUDY_NEW')), {
      target: { value: 'Xay dung roadmap React nang cao de hoc bai ban.' },
    });

    await moveToUploadStep();
    await addUploadFile('business-overview.pdf');

    const uploadButton = findButtonByText(i18n.t('workspace.profileConfig.actions.checkAndUpload'), {
      exact: true,
      includeDisabled: true,
    });
    expect(uploadButton).toBeTruthy();
    expect(uploadButton.className).toContain('cursor-not-allowed');

    await act(async () => {
      fireEvent.click(uploadButton);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onUploadFiles).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(i18n.t('workspace.profileConfig.validation.validMaterialsRequired')).length
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText(getUploadInputLabel())).toBeInTheDocument();
  });

  it('allows step 3 to continue when the workspace already has a valid material', async () => {
    const validUploadedMaterials = [
      {
        id: 'material-1',
        name: 'react-hooks-nang-cao.pdf',
        materialType: 'application/pdf',
        status: 'READY',
      },
    ];
    const { onSave } = renderDialog({
      uploadedMaterials: validUploadedMaterials,
    });

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'),
      knowledge: 'React hooks nang cao',
      expectedDomainText: 'React',
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Da biet React co ban va dang hoc hook nang cao' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('STUDY_NEW')), {
      target: { value: 'Xay dung roadmap React nang cao de hoc bai ban.' },
    });

    await moveToUploadStep();

    await act(async () => {
      fireEvent.click(findButtonByText(i18n.t('workspace.profileConfig.actions.next'), {
        exact: true,
        includeDisabled: true,
      }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(i18n.t('workspace.profileConfig.fields.adaptationMode'))).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(3);
    expect(onSave).toHaveBeenNthCalledWith(
      3,
      3,
      expect.objectContaining({
        workspacePurpose: 'STUDY_NEW',
        knowledgeInput: 'React hooks nang cao',
        inferredDomain: 'React',
      })
    );
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

  it('returns from step 2 to step 1 without saving again when nothing changed', async () => {
    const { onSave } = renderDialog();

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'),
      knowledge: 'React hooks nang cao',
      expectedDomainText: 'React',
    });

    expect(onSave).toHaveBeenCalledTimes(1);

    const stepOneCard = getStepCardButton(1);
    expect(stepOneCard).toBeTruthy();
    fireEvent.click(stepOneCard);

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput'))).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getFooterPrimaryButton());
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('updates step 1 before returning to step 2 when the user edits previous data', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['Probability & Statistics', 'Mathematics', 'STEM']),
    });

    const { onSave } = renderDialog();

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.REVIEW.title'),
      knowledge: 'xac suat thong ke co ban',
      expectedDomainText: 'Probability & Statistics',
      roadmapChoiceText: i18n.t('workspace.profileConfig.common.no'),
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenNthCalledWith(
      1,
      1,
      expect.objectContaining({
        workspacePurpose: 'REVIEW',
        enableRoadmap: false,
      })
    );

    await act(async () => {
      clickButtonByText(i18n.t('workspace.profileConfig.actions.previous'));
      await Promise.resolve();
    });
    clickButtonByText(i18n.t('workspace.profileConfig.stepOne.enableRoadmap'));

    await act(async () => {
      fireEvent.click(getFooterPrimaryButton());
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenNthCalledWith(
      2,
      1,
      expect.objectContaining({
        workspacePurpose: 'REVIEW',
        enableRoadmap: true,
      })
    );
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
        profileStatus: 'IN_PROGRESS',
        workspaceSetupStatus: 'CREATED',
        currentStep: 1,
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
        profileStatus: 'DONE',
        workspaceSetupStatus: 'PROFILE_DONE',
        currentStep: 3,
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
        profileStatus: 'DONE',
        workspaceSetupStatus: 'PROFILE_DONE',
        currentStep: 3,
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
