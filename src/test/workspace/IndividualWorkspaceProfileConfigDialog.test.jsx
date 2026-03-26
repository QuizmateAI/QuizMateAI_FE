import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import IndividualWorkspaceProfileConfigDialog from '@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog';

// Mock the StudyProfileAPI module
vi.mock('@/api/StudyProfileAPI', () => ({
  analyzeKnowledge: vi.fn(),
  suggestProfileFields: vi.fn(),
  suggestExamTemplates: vi.fn(),
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

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
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
  const onOpenChange = props.onOpenChange || vi.fn();
  const onConfirm = props.onConfirm || vi.fn().mockResolvedValue(undefined);

  const view = render(
    <IndividualWorkspaceProfileConfigDialog
      open
      onOpenChange={onOpenChange}
      onSave={onSave}
      onConfirm={onConfirm}
      workspaceId={props.workspaceId || '123'}
      isDarkMode={false}
      {...props}
    />
  );

  return { ...view, onSave, onOpenChange, onConfirm };
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

function clickPurposeButtonByText(text) {
  const expected = normalizeText(text);
  const target = getPurposeButtons().find((button) => {
    const actual = normalizeText(button.textContent || '');
    return actual.includes(expected);
  });

  expect(target).toBeTruthy();
  fireEvent.click(target);
  return target;
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

function clickMockTestStepTwoTab(tab) {
  const labelCandidates = tab === 'mocktest'
    ? ['Cấu hình Đề thi', 'Cáº¥u hÃ¬nh Äá» thi', 'CÃ¡ÂºÂ¥u hÃƒÂ¬nh Ã„ÂÃ¡Â»Â thi']
    : ['Hồ sơ Năng lực', 'Há»“ sÆ¡ NÄƒng lá»±c', 'HÃ¡Â»â€œ sÃ†Â¡ NÃ„Æ’ng lÃ¡Â»Â±c'];

  let target = screen.getAllByRole('button').find((button) => {
    const actual = normalizeText(button.textContent || '');
    return labelCandidates.some((label) => actual.includes(normalizeText(label)));
  });

  if (!target) {
    const tabs = screen.getAllByRole('button').filter((button) => {
      const className = typeof button.className === 'string' ? button.className : '';
      return className.includes('px-7') && className.includes('py-2.5') && className.includes('rounded-xl');
    });

    target = tab === 'mocktest' ? tabs[1] : tabs[0];
  }

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

async function finishKnowledgeAnalysis(knowledgeText, expectedDomainText) {
  fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput')), {
    target: { value: knowledgeText },
  });

  // Wait for debounce (900ms) + let the promise resolve
  await act(async () => {
    vi.advanceTimersByTime(1200);
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
  clickPurposeButtonByText(purposeText);
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

async function moveToStepThree() {
  await act(async () => {
    fireEvent.click(getFooterPrimaryButton());
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(screen.getByText(i18n.t('workspace.profileConfig.stepThree.roadmapTitle'))).toBeInTheDocument();
}

async function clickConfirmButton() {
  await act(async () => {
    fireEvent.click(findButtonByText('Xác nhận', { exact: true, includeDisabled: true }));
    await Promise.resolve();
    await Promise.resolve();
  });

  await act(async () => {
    fireEvent.click(findButtonByText(i18n.t('workspace.profileConfig.actions.confirmProfileUse'), { exact: true, includeDisabled: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function openConfirmProfilePopup() {
  await act(async () => {
    fireEvent.click(findButtonByText('Xác nhận', { exact: true, includeDisabled: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function flushStepTwoAiSuggestions() {
  await act(async () => {
    vi.advanceTimersByTime(1200);
    await vi.runAllTimersAsync();
  });

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function getAiOverallReviewSummaryCard(message) {
  return screen.getByText(message).closest('div.min-w-0')?.parentElement?.parentElement ?? null;
}

function getAiOverallReviewDetailCard() {
  const alignmentTitle = screen.getByText(i18n.t('workspace.profileConfig.stepTwo.alignmentHighlightsTitle'));
  return alignmentTitle.parentElement?.parentElement ?? null;
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

    expect(
      screen.getByText((content) => content.includes('Điểm mạnh và điểm yếu'))
    ).toBeInTheDocument();
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

  it('keeps step 2 locked until Quizmate AI finishes the overall review for roadmap flows', async () => {
    const consistencyDeferred = createDeferred();

    setupApiMocks({
      analysisResponse: createAnalysisResponse(['React', 'Frontend Development', 'JavaScript']),
      fieldSuggestionResponse: createFieldSuggestionResponse({
        currentLevelSuggestions: ['Da biet React co ban'],
        strongAreaSuggestions: ['Component tach nho'],
        weakAreaSuggestions: ['Hook nang cao'],
      }),
    });
    validateProfileConsistency.mockImplementation(() => consistencyDeferred.promise);

    const { onSave } = renderDialog();

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'),
      knowledge: 'React hooks nang cao',
      expectedDomainText: 'React',
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Da biet React co ban' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.strongAreas')), {
      target: { value: 'Component tach nho' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.weakAreas')), {
      target: { value: 'Hook nang cao' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('STUDY_NEW')), {
      target: { value: 'Muon hoc bai ban de dung hook nang cao dung cach.' },
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(validateProfileConsistency).toHaveBeenCalled();
    expect(getFooterPrimaryButton()).toBeDisabled();
    expect(getFooterPrimaryButton()).toHaveTextContent(i18n.t('workspace.profileConfig.stepTwo.overallReviewLoadingTitle'));
    expect(screen.queryByText(i18n.t('workspace.profileConfig.stepThree.roadmapTitle'))).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      consistencyDeferred.resolve(createConsistencyResponse({
        message: 'Thong tin dang bam sat voi muc tieu hien tai.',
        alignmentHighlights: ['Muc tieu hoc tap dang hop voi pham vi React da chon.'],
      }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getFooterPrimaryButton()).not.toBeDisabled();

    await moveToStepThree();

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenNthCalledWith(
      2,
      2,
      expect.objectContaining({
        workspacePurpose: 'STUDY_NEW',
        learningGoal: 'Muon hoc bai ban de dung hook nang cao dung cach.',
      })
    );
  });

  it('keeps the AI overall review green when the profile is clearly aligned', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['Java Core'], {
        normalizedKnowledge: 'Java Core',
      }),
      fieldSuggestionResponse: createFieldSuggestionResponse({
        currentLevelSuggestions: ['Da hoc bien va vong lap'],
        strongAreaSuggestions: ['Cu phap co ban'],
        weakAreaSuggestions: ['Lap trinh huong doi tuong'],
      }),
      consistencyResponse: createConsistencyResponse({
        message: 'Thong tin dang khop tot voi ho so hoc tap hien tai.',
        alignmentHighlights: [
          'Noi dung hien tai dang tap trung vao Java Core.',
        ],
        recommendations: [
          'Co the tiep tuc mo rong sang OOP sau khi cung co nen tang.',
        ],
      }),
    });

    renderDialog();

    clickButtonByText(i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'));
    await finishKnowledgeAnalysis('Java Core', 'Java Core');
    clickButtonByText('Java Core');

    await act(async () => {
      fireEvent.click(getFooterPrimaryButton());
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Da hoc bien va vong lap' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.strongAreas')), {
      target: { value: 'Cu phap co ban' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.weakAreas')), {
      target: { value: 'Lap trinh huong doi tuong' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('STUDY_NEW')), {
      target: { value: 'Muon hoc vung Java Core truoc khi hoc sau hon ve OOP.' },
    });

    await flushStepTwoAiSuggestions();

    const summaryCard = getAiOverallReviewSummaryCard('Thong tin dang khop tot voi ho so hoc tap hien tai.');
    const detailCard = getAiOverallReviewDetailCard();
    expect(summaryCard?.className).toContain('border-emerald-200');
    expect(detailCard?.className).toContain('border-emerald-200');
  });

  it('switches the AI overall review to yellow when the profile is only partially aligned', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['Java Core'], {
        normalizedKnowledge: 'Java Core',
      }),
      fieldSuggestionResponse: createFieldSuggestionResponse({
        currentLevelSuggestions: ['Da hoc bien va vong lap'],
        strongAreaSuggestions: ['Cu phap co ban'],
        weakAreaSuggestions: ['Tieng Anh chuyen nganh'],
      }),
      consistencyResponse: createConsistencyResponse({
        isConsistent: false,
        warning: true,
        message: 'Thong tin chua khop lam voi muc tieu hien tai.',
        alignmentHighlights: [
          'Noi dung kien thuc van xoay quanh Java Core.',
        ],
        issues: [
          'Diem yeu hien tai nghieng ve tieng Anh hon la lo hong chuyen mon.',
        ],
        recommendations: [
          'Can can nhac bo sung muc tieu hoc tieng Anh chuyen nganh.',
        ],
      }),
    });

    renderDialog();

    clickButtonByText(i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'));
    await finishKnowledgeAnalysis('Java Core', 'Java Core');
    clickButtonByText('Java Core');

    await act(async () => {
      fireEvent.click(getFooterPrimaryButton());
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Da hoc bien va vong lap' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.strongAreas')), {
      target: { value: 'Cu phap co ban' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.weakAreas')), {
      target: { value: 'Tieng Anh chuyen nganh' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('STUDY_NEW')), {
      target: { value: 'Muon hoc vung Java Core de lam bai tap va doc tai lieu tot hon.' },
    });

    await flushStepTwoAiSuggestions();

    const summaryCard = getAiOverallReviewSummaryCard('Thong tin chua khop lam voi muc tieu hien tai.');
    const detailCard = getAiOverallReviewDetailCard();
    expect(summaryCard?.className).toContain('border-amber-200');
    expect(detailCard?.className).toContain('border-amber-200');
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

  it('renders the domain suggestion reason from the backend detail payload', async () => {
    const backendReason = 'HSK 1 là cấp độ sơ cấp trong hệ thống đánh giá năng lực tiếng Trung.';
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['Tiếng Trung'], {
        domainSuggestionDetails: [
          { label: 'Tiếng Trung', reason: backendReason },
        ],
      }),
    });

    renderDialog();

    clickButtonByText(i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'));
    await finishKnowledgeAnalysis('HSK 1');

    expect(findButtonByText('Tiếng Trung')).toBeTruthy();
    expect(screen.getByText(backendReason)).toBeInTheDocument();
  });

  it('finishes step 3 with default roadmap values for STUDY_NEW', async () => {
    const { onSave } = renderDialog();

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

    await moveToStepThree();
    await clickConfirmButton();

    expect(onSave).toHaveBeenCalledTimes(3);
    expect(onSave).toHaveBeenNthCalledWith(
      3,
      3,
      expect.objectContaining({
        workspacePurpose: 'STUDY_NEW',
        knowledgeLoad: expect.any(String),
        adaptationMode: expect.any(String),
        roadmapSpeedMode: expect.any(String),
      })
    );
  });

  it('finishes on step 2 when roadmap is disabled for REVIEW', async () => {
    const { onSave, onConfirm } = renderDialog();

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.REVIEW.title'),
      knowledge: 'xac suat thong ke co ban',
      expectedDomainText: 'React',
      roadmapChoiceText: i18n.t('workspace.profileConfig.common.no'),
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Da hoc xac suat co ban' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('REVIEW')), {
      target: { value: 'On lai de thi cuoi ky' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.strongAreas')), {
      target: { value: 'Cong thuc co ban' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.weakAreas')), {
      target: { value: 'Bai toan xac suat tong hop' },
    });

    await flushStepTwoAiSuggestions();

    expect(screen.getAllByText(i18n.t('workspace.profileConfig.footerHint', { current: 2, total: 2 })).length).toBeGreaterThan(0);
    expect(getStepCardButton(3)).toBeUndefined();

    await clickConfirmButton();

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenNthCalledWith(2, 2, expect.objectContaining({ workspacePurpose: 'REVIEW' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('asks for confirmation before applying the profile on the final confirm action', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['Probability & Statistics', 'Mathematics', 'STEM']),
    });

    const { onSave, onConfirm } = renderDialog();

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
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.strongAreas')), {
      target: { value: 'Cong thuc co ban' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.weakAreas')), {
      target: { value: 'Bai toan xac suat tong hop' },
    });

    await flushStepTwoAiSuggestions();
    await openConfirmProfilePopup();

    const confirmDialog = screen.getByRole('dialog', {
      name: i18n.t('workspace.profileConfig.confirmProfileDialog.title'),
    });

    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.confirmProfileDialog.description'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.confirmProfileDialog.sections.purpose'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.confirmProfileDialog.sections.knowledgeDomain'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.confirmProfileDialog.sections.currentLevel'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.confirmProfileDialog.sections.strengthWeakness'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.confirmProfileDialog.sections.learningGoal'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.confirmProfileDialog.sections.roadmapConfig'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.purpose.REVIEW.title'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText('xac suat thong ke co ban')).toBeInTheDocument();
    expect(within(confirmDialog).getByText('Probability & Statistics')).toBeInTheDocument();
    expect(within(confirmDialog).getByText('Da hoc xac suat co ban')).toBeInTheDocument();
    expect(within(confirmDialog).getByText('Cong thuc co ban')).toBeInTheDocument();
    expect(within(confirmDialog).getByText('Bai toan xac suat tong hop')).toBeInTheDocument();
    expect(within(confirmDialog).getByText('On lai de thi cuoi ky')).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.confirmProfileDialog.roadmapDisabled'))).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(within(confirmDialog).getByRole('button', { name: i18n.t('workspace.profileConfig.actions.cancel') }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByRole('heading', { name: i18n.t('workspace.profileConfig.confirmProfileDialog.title') })).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows roadmap configuration details in the confirmation popup when the roadmap step is enabled', async () => {
    const { onSave, onConfirm } = renderDialog();

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'),
      knowledge: 'React hooks nang cao',
      expectedDomainText: 'React',
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Da biet React co ban' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('STUDY_NEW')), {
      target: { value: 'Xay dung mot project React co lo trinh ro rang.' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.strongAreas')), {
      target: { value: 'Tach component ro rang' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.weakAreas')), {
      target: { value: 'Toi uu performance voi hook nang cao' },
    });

    await flushStepTwoAiSuggestions();
    await moveToStepThree();
    await openConfirmProfilePopup();

    const confirmDialog = screen.getByRole('dialog', {
      name: i18n.t('workspace.profileConfig.confirmProfileDialog.title'),
    });

    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.confirmProfileDialog.sections.roadmapConfig'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.fields.knowledgeLoad'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.knowledgeLoad.BASIC.title'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.fields.adaptationMode'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.adaptationMode.BALANCED.title'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.fields.roadmapSpeedMode'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.roadmapSpeedMode.STANDARD.title'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.fields.estimatedTotalDays'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.confirmProfileDialog.values.estimatedTotalDays', { value: 30 }))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.fields.recommendedMinutesPerDay'))).toBeInTheDocument();
    expect(within(confirmDialog).getByText(i18n.t('workspace.profileConfig.confirmProfileDialog.values.recommendedMinutesPerDay', { value: 60 }))).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('automatically reclassifies roadmap speed when the user extends the estimated study days', async () => {
    const { onSave } = renderDialog();

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'),
      knowledge: 'React hooks nang cao',
      expectedDomainText: 'React',
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Da biet React co ban va dang hoc hook nang cao' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('STUDY_NEW')), {
      target: { value: 'Hoc co he thong de xay dung project React on dinh hon.' },
    });

    await moveToStepThree();

    clickButtonByText(i18n.t('workspace.profileConfig.knowledgeLoad.INTERMEDIATE.title'));
    clickButtonByText(i18n.t('workspace.profileConfig.roadmapSpeedMode.FAST.title'));

    const [estimatedDaysInput, recommendedMinutesInput] = screen.getAllByRole('spinbutton');
    expect(estimatedDaysInput).toHaveValue(30);
    expect(recommendedMinutesInput).toHaveValue(140);

    fireEvent.change(estimatedDaysInput, {
      target: { value: '60' },
    });

    expect(recommendedMinutesInput).toHaveValue(70);

    await clickConfirmButton();

    expect(onSave).toHaveBeenCalledTimes(3);
    expect(onSave).toHaveBeenNthCalledWith(
      3,
      3,
      expect.objectContaining({
        workspacePurpose: 'STUDY_NEW',
        knowledgeLoad: 'INTERMEDIATE',
        roadmapSpeedMode: 'STANDARD',
        estimatedTotalDays: 60,
        recommendedMinutesPerDay: 70,
      })
    );
  });

  it('keeps the final confirm disabled on step 2 until Quizmate AI finishes the overall review', async () => {
    const consistencyDeferred = createDeferred();

    setupApiMocks({
      analysisResponse: createAnalysisResponse(['Probability & Statistics', 'Mathematics', 'STEM']),
      fieldSuggestionResponse: createFieldSuggestionResponse({
        currentLevelSuggestions: ['Da hoc xac suat co ban'],
        strongAreaSuggestions: ['Cong thuc co ban'],
        weakAreaSuggestions: ['Bai toan xac suat tong hop'],
      }),
    });
    validateProfileConsistency.mockImplementation(() => consistencyDeferred.promise);

    const { onSave, onConfirm } = renderDialog();

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
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.strongAreas')), {
      target: { value: 'Cong thuc co ban' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.weakAreas')), {
      target: { value: 'Bai toan xac suat tong hop' },
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(validateProfileConsistency).toHaveBeenCalled();
    expect(getFooterPrimaryButton()).toBeDisabled();
    expect(getFooterPrimaryButton()).toHaveTextContent(i18n.t('workspace.profileConfig.stepTwo.overallReviewLoadingTitle'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    await act(async () => {
      consistencyDeferred.resolve(createConsistencyResponse({
        message: 'Thong tin on tap dang hop voi ho so hien tai.',
        alignmentHighlights: ['Muc tieu on tap bam sat voi phan kien thuc da chon.'],
      }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getFooterPrimaryButton()).not.toBeDisabled();

    await clickConfirmButton();

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenNthCalledWith(
      2,
      2,
      expect.objectContaining({
        workspacePurpose: 'REVIEW',
        learningGoal: 'On lai de thi cuoi ky',
      })
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('treats step 2 as the final step for MOCK_TEST when roadmap is disabled', async () => {
    const onSave = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ deferred: true });
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    renderDialog({ onSave, onConfirm });

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.MOCK_TEST.title'),
      knowledge: 'IELTS Writing task 2',
      expectedDomainText: 'IELTS Writing',
      roadmapChoiceText: i18n.t('workspace.profileConfig.common.no'),
    });

    clickMockTestStepTwoTab('mocktest');
    clickButtonByText('Custom');
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.privateExamName')), {
      target: { value: 'IELTS Academic' },
    });

    clickMockTestStepTwoTab('profile');
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

    await flushStepTwoAiSuggestions();

    expect(screen.getAllByText(i18n.t('workspace.profileConfig.footerHint', { current: 2, total: 2 })).length).toBeGreaterThan(0);
    expect(getStepCardButton(3)).toBeUndefined();

    await clickConfirmButton();

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenNthCalledWith(2, 2, expect.objectContaining({
      workspacePurpose: 'MOCK_TEST',
      enableRoadmap: false,
      mockExamName: 'IELTS Academic',
    }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does not require strengths and weaknesses for absolute beginners in MOCK_TEST mode', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['Tiếng Nhật', 'JLPT']),
      fieldSuggestionResponse: createFieldSuggestionResponse({
        currentLevelSuggestions: ['Mới bắt đầu học tiếng Nhật'],
        strongAreaSuggestions: ['Chữ Hán cơ bản'],
        weakAreaSuggestions: ['Ngữ pháp N5'],
        learningGoalSuggestions: ['Nắm nền tảng sơ cấp trong 6 tuần đầu.'],
      }),
      consistencyResponse: createConsistencyResponse({
        message: 'Thông tin hiện tại phù hợp với giai đoạn mới bắt đầu.',
      }),
    });

    const onSave = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ deferred: true });

    renderDialog({ onSave });

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.MOCK_TEST.title'),
      knowledge: 'Tiếng Nhật nhập môn',
      expectedDomainText: 'Tiếng Nhật',
      roadmapChoiceText: i18n.t('workspace.profileConfig.common.no'),
    });

    clickMockTestStepTwoTab('mocktest');
    clickButtonByText('Custom');
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.privateExamName')), {
      target: { value: 'JLPT N5 Starter' },
    });

    clickMockTestStepTwoTab('profile');
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Mới bắt đầu học tiếng Nhật' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('MOCK_TEST')), {
      target: { value: 'Làm quen cấu trúc đề và xây nền tảng N5 cơ bản.' },
    });

    await flushStepTwoAiSuggestions();
    await clickConfirmButton();

    expect(screen.queryByText(i18n.t('workspace.profileConfig.validation.strongAreasRequired'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('workspace.profileConfig.validation.weakAreasRequired'))).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenNthCalledWith(2, 2, expect.objectContaining({
      workspacePurpose: 'MOCK_TEST',
      mockExamName: 'JLPT N5 Starter',
      currentLevel: 'Mới bắt đầu học tiếng Nhật',
      strongAreas: null,
      weakAreas: null,
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
    const yesRoadmapButton = screen.getAllByRole('button').find((button) => {
      const text = normalizeText(button.textContent || '');
      return text.includes(normalizeText(i18n.t('workspace.profileConfig.common.yes')))
        && text.includes(normalizeText(i18n.t('workspace.profileConfig.stepOne.enableRoadmap')));
    });
    expect(yesRoadmapButton).toBeTruthy();
    fireEvent.click(yesRoadmapButton);

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
      vi.advanceTimersByTime(1200);
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

  it('skips knowledge-analysis API calls for invalid live input and only calls AI after the text becomes valid', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['C++', 'Programming']),
    });

    renderDialog();
    analyzeKnowledge.mockClear();

    clickButtonByText(i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'));

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput')), {
      target: { value: '@@' },
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
      await vi.runAllTimersAsync();
    });

    expect(analyzeKnowledge).not.toHaveBeenCalled();
    expect(
      screen.getByText('Chỉ dùng chữ, số và các dấu câu cơ bản. Ký tự không hợp lệ sẽ không được gửi lên AI.')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput')), {
      target: { value: 'C++' },
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(analyzeKnowledge).toHaveBeenCalledTimes(1);
    expect(analyzeKnowledge).toHaveBeenCalledWith('C++', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('waits for a valid current-level description before refetching step-two AI suggestions', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['React', 'Frontend Development', 'JavaScript']),
      fieldSuggestionResponse: createFieldSuggestionResponse({
        currentLevelSuggestions: ['Da biet React co ban'],
      }),
    });

    renderDialog();

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'),
      knowledge: 'React hooks nang cao',
      expectedDomainText: 'React',
    });

    await flushStepTwoAiSuggestions();
    suggestProfileFields.mockClear();

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'ab' },
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
      await vi.runAllTimersAsync();
    });

    expect(suggestProfileFields).not.toHaveBeenCalled();
    expect(screen.getByText('Mô tả trình độ hiện tại tối thiểu 4 ký tự có nghĩa.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Da biet React co ban' },
    });

    await flushStepTwoAiSuggestions();

    expect(suggestProfileFields).toHaveBeenCalledTimes(1);
    expect(suggestProfileFields).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currentLevel: 'Da biet React co ban',
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
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
      vi.advanceTimersByTime(1200);
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
      vi.advanceTimersByTime(1200);
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
      vi.advanceTimersByTime(1200);
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
      vi.advanceTimersByTime(1200);
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('workspace.profileConfig.fields.adaptationMode'))).not.toBeInTheDocument();
  });

  it('resumes at step 3 when personal info is already saved', async () => {
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
      vi.advanceTimersByTime(1200);
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(i18n.t('workspace.profileConfig.stepThree.roadmapTitle'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.fields.adaptationMode'))).toBeInTheDocument();
  });

  it('clamps back to step 2 when roadmap is disabled and the backend reports PROFILE_DONE', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['Probability & Statistics', 'Mathematics', 'STEM']),
    });

    renderDialog({
      initialData: {
        profileStatus: 'DONE',
        workspaceSetupStatus: 'PROFILE_DONE',
        currentStep: 3,
        learningMode: 'REVIEW',
        knowledge: 'xac suat thong ke co ban',
        domain: 'Probability & Statistics',
        roadmapEnabled: false,
        currentLevel: 'Da hoc xac suat co ban',
        learningGoal: 'On lai de thi cuoi ky',
        strongAreas: 'Cong thuc co ban',
        weakAreas: 'Bai toan xac suat tong hop',
      },
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('workspace.profileConfig.stepThree.roadmapTitle'))).not.toBeInTheDocument();
    expect(screen.getAllByText(i18n.t('workspace.profileConfig.footerHint', { current: 2, total: 2 })).length).toBeGreaterThan(0);
  });

  it('does not resume past backend step when profile status is DONE but workspace step 2 is not completed', async () => {
    setupApiMocks({
      analysisResponse: createAnalysisResponse(['React', 'Frontend Development', 'JavaScript']),
    });

    window.sessionStorage.setItem('workspace-profile-wizard-123', '3');

    renderDialog({
      initialData: {
        profileStatus: 'DONE',
        workspaceSetupStatus: 'CREATED',
        learningMode: 'STUDY_NEW',
        knowledge: 'React hooks nang cao',
        domain: 'React',
        currentLevel: 'Da biet React co ban',
        learningGoal: 'Xay dung mot project hoan chinh',
      },
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('workspace.profileConfig.stepThree.roadmapTitle'))).not.toBeInTheDocument();
  });
});
