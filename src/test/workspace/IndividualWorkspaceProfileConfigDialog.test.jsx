import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import IndividualWorkspaceProfileConfigDialog from '@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog';

function renderDialog(props = {}) {
  const onSave = props.onSave || vi.fn().mockResolvedValue(undefined);
  const onOpenChange = props.onOpenChange || vi.fn();

  const view = render(
    <IndividualWorkspaceProfileConfigDialog
      open
      onOpenChange={onOpenChange}
      onSave={onSave}
      isDarkMode={false}
      {...props}
    />
  );

  return { ...view, onSave, onOpenChange };
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

async function finishKnowledgeAnalysis(knowledgeText, expectedDomainText) {
  fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput')), {
    target: { value: knowledgeText },
  });

  await act(async () => {
    vi.advanceTimersByTime(700);
  });

  await act(async () => {
    if (expectedDomainText) {
      expect(findButtonByText(expectedDomainText)).toBeTruthy();
    }
  });
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
  });
  expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
}

describe('IndividualWorkspaceProfileConfigDialog', () => {
  beforeEach(() => {
    window.localStorage.setItem('app_language', 'vi');
    i18n.changeLanguage('vi');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders the STUDY_NEW fields on step 2 only', async () => {
    const { onSave } = renderDialog();

    expect(getPurposeButtons()).toHaveLength(3);

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'),
      knowledge: 'React hooks nang cao',
      expectedDomainText: 'React',
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(getLearningGoalPlaceholder('STUDY_NEW'))).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.strongAreas'))).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.weakAreas'))).not.toBeInTheDocument();
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

  it('shows the knowledge description nudge when the input is too generic', async () => {
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
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
  });

  it('switches correctly between public and private exam UI for MOCK_TEST', async () => {
    const { onSave } = renderDialog();

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.MOCK_TEST.title'),
      knowledge: 'IELTS Writing task 2',
      expectedDomainText: 'IELTS Writing',
    });

    expect(screen.getByText(i18n.t('workspace.profileConfig.stepTwo.mockTestTitle'))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.publicExamSearch'))).toBeInTheDocument();
    expect(screen.getByText('IELTS Academic')).toBeInTheDocument();

    clickButtonByText(i18n.t('workspace.profileConfig.mockExamMode.PRIVATE'), { exact: true });
    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.privateExamName'))).toBeInTheDocument();

    clickButtonByText(i18n.t('workspace.profileConfig.mockExamMode.PUBLIC'), { exact: true });
    clickButtonByText('IELTS Academic');
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.templatePrompt')), {
      target: { value: 'Tao de nghieng ve writing, tang do kho o phan cuoi.' },
    });
    clickButtonByText(i18n.t('workspace.profileConfig.actions.generateTemplate'));

    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    await act(async () => {
      expect(
        screen.getByText((content) => normalizeText(content).includes('ielts academic') && normalizeText(content).includes('template'))
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'IELTS 6.0' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('MOCK_TEST')), {
      target: { value: 'On dinh writing va giu toc do lam bai.' },
    });
    await act(async () => {
      fireEvent.click(getFooterPrimaryButton());
      await Promise.resolve();
    });

    expect(screen.queryByText(i18n.t('workspace.profileConfig.stepThree.improvementTitle'))).not.toBeInTheDocument();
    expect(screen.queryByText(i18n.t('workspace.profileConfig.stepThree.mockGoalTitle'))).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenNthCalledWith(2, 2, expect.objectContaining({
      workspacePurpose: 'MOCK_TEST',
      mockExamMode: 'PUBLIC',
      mockExamCatalogId: 'ielts',
      currentLevel: 'IELTS 6.0',
      learningGoal: 'On dinh writing va giu toc do lam bai.',
    }));
  });

  it('saves each step separately and hides roadmap setup when review skips roadmap', async () => {
    const { onSave } = renderDialog();

    await moveToStepTwo({
      purposeText: i18n.t('workspace.profileConfig.purpose.REVIEW.title'),
      knowledge: 'xac suat thong ke co ban',
      expectedDomainText: 'Probability & Statistics',
      roadmapChoiceText: i18n.t('workspace.profileConfig.common.no'),
    });

    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel')), {
      target: { value: 'Mat goc xac suat' },
    });
    fireEvent.change(screen.getByPlaceholderText(getLearningGoalPlaceholder('REVIEW')), {
      target: { value: 'Thi cuoi ky dat toi thieu 8 diem' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.strongAreas')), {
      target: { value: 'Lam bai can than' },
    });
    fireEvent.change(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.weakAreas')), {
      target: { value: 'Cong thuc to hop, xac suat co dieu kien' },
    });
    await act(async () => {
      fireEvent.click(getFooterPrimaryButton());
      await Promise.resolve();
    });

    expect(screen.getByText(i18n.t('workspace.profileConfig.stepThree.noRoadmapTitle'))).toBeInTheDocument();
    expect(screen.queryByText(i18n.t('workspace.profileConfig.stepThree.roadmapTitle'))).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(getFooterPrimaryButton());
      await Promise.resolve();
    });
    expect(onSave).toHaveBeenCalledTimes(3);

    expect(onSave).toHaveBeenNthCalledWith(
      1,
      1,
      expect.objectContaining({
        workspacePurpose: 'REVIEW',
        knowledgeInput: 'xac suat thong ke co ban',
        inferredDomain: 'Probability & Statistics',
        enableRoadmap: false,
      })
    );

    expect(onSave).toHaveBeenNthCalledWith(
      2,
      2,
      expect.objectContaining({
        workspacePurpose: 'REVIEW',
        currentLevel: 'Mat goc xac suat',
        learningGoal: 'Thi cuoi ky dat toi thieu 8 diem',
        strongAreas: 'Lam bai can than',
        weakAreas: 'Cong thuc to hop, xac suat co dieu kien',
      })
    );

    expect(onSave).toHaveBeenNthCalledWith(
      3,
      3,
      expect.objectContaining({
        workspacePurpose: 'REVIEW',
        knowledgeInput: 'xac suat thong ke co ban',
        selectedKnowledgeOption: 'xac suat thong ke co ban',
        enableRoadmap: false,
        currentLevel: 'Mat goc xac suat',
        learningGoal: 'Thi cuoi ky dat toi thieu 8 diem',
        strongAreas: 'Lam bai can than',
        weakAreas: 'Cong thuc to hop, xac suat co dieu kien',
        improvementFocus: [],
        adaptationMode: null,
        roadmapSpeedMode: null,
        estimatedTotalDays: null,
        recommendedMinutesPerDay: null,
        customDomain: 'Probability & Statistics',
        customKnowledge: 'xac suat thong ke co ban',
        customCurrentLevel: 'Mat goc xac suat',
      })
    );
  });

  it('keeps domain suggestions close to a specific exam keyword like N1', async () => {
    renderDialog();

    clickButtonByText(i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'));
    await finishKnowledgeAnalysis('n1', 'JLPT N1');

    expect(findButtonByText('JLPT N1')).toBeTruthy();
    expect(findButtonByText('JLPT')).toBeTruthy();
    expect(findButtonByText('Japanese')).toBeTruthy();
    expect(findButtonByText('Business')).toBeFalsy();
    expect(findButtonByText('STEM')).toBeFalsy();
  });

  it('shows the primary domain field filled with the AI domain the user selects', async () => {
    renderDialog();

    clickButtonByText(i18n.t('workspace.profileConfig.purpose.STUDY_NEW.title'));
    await finishKnowledgeAnalysis('n1', 'JLPT N1');
    clickButtonByText('JLPT N1');

    expect(getPrimaryDomainDisplay()).toHaveTextContent('JLPT N1');
    expect(screen.queryByRole('textbox', { name: i18n.t('workspace.profileConfig.fields.primaryDomain') })).not.toBeInTheDocument();
    expect(screen.getAllByText(i18n.t('workspace.profileConfig.stepOne.primaryDomainLockedHint')).length).toBeGreaterThan(0);
  });

  it('resumes at step 2 when the server already saved BASIC_DONE', async () => {
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
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
  });
});
