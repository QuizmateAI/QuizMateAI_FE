import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import IndividualWorkspaceProfileConfigDialog from '@/pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog';

vi.mock('@/api/StudyProfileAPI', () => ({
  analyzeKnowledge: vi.fn().mockResolvedValue({
    redFlag: false,
    isValid: true,
    warning: false,
    confidence: 0.9,
    tooBroad: false,
    quizCompatible: true,
    normalizedKnowledge: 'React hooks nang cao',
    domainSuggestions: ['React'],
    quizConstraintWarnings: [],
  }),
  suggestProfileFields: vi.fn().mockResolvedValue({
    learningMode: 'STUDY_NEW',
    redFlag: false,
    warning: false,
    quizCompatible: true,
    message: '',
    warnings: [],
    currentLevelSuggestions: [],
    learningGoalSuggestions: [],
    strongAreaSuggestions: [],
    weakAreaSuggestions: [],
    examNameSuggestions: [],
  }),
  suggestExamTemplates: vi.fn().mockResolvedValue([]),
  validateProfileConsistency: vi.fn().mockResolvedValue({
    redFlag: false,
    isConsistent: true,
    warning: false,
    confidence: 0.95,
    quizCompatible: true,
    message: '',
    alignmentHighlights: [],
    issues: [],
    recommendations: [],
    quizConstraintWarnings: [],
  }),
}));

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('IndividualWorkspaceProfileConfigDialog confirm flow', () => {
  beforeEach(async () => {
    window.localStorage.setItem('app_language', 'vi');
    window.sessionStorage.clear();
    await i18n.changeLanguage('vi');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the confirmation popup open while the confirmed profile is still being applied', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const confirmDeferred = createDeferred();
    const onConfirm = vi.fn().mockImplementation(() => confirmDeferred.promise);

    render(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={onOpenChange}
        onSave={onSave}
        onConfirm={onConfirm}
        workspaceId="123"
        isDarkMode={false}
        initialData={{
          profileStatus: 'DONE',
          workspaceSetupStatus: 'PROFILE_DONE',
          currentStep: 3,
          learningMode: 'STUDY_NEW',
          workspacePurpose: 'STUDY_NEW',
          knowledge: 'React hooks nang cao',
          domain: 'React',
          currentLevel: 'Da biet React co ban',
          learningGoal: 'Xay dung project React co lo trinh ro rang',
          strongAreas: 'Tach component ro rang',
          weakAreas: 'Toi uu performance voi hook nang cao',
          knowledgeLoad: 'BASIC',
          adaptationMode: 'BALANCED',
          roadmapSpeedMode: 'STANDARD',
          estimatedTotalDays: 30,
          recommendedMinutesPerDay: 60,
          enableRoadmap: true,
        }}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Confirm',
        })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const confirmDialog = screen.getByRole('dialog', {
      name: 'Confirm using this profile',
    });
    const confirmProfileButton = within(confirmDialog).getByRole('button', {
      name: 'Use this profile',
    });

    await act(async () => {
      fireEvent.click(confirmProfileButton);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(
      screen.getByRole('dialog', {
        name: 'Confirm using this profile',
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(i18n.t('workspace.profileConfig.stepThree.roadmapTitle'))
    ).not.toBeInTheDocument();
    expect(confirmProfileButton).toBeDisabled();
    expect(
      within(confirmDialog).getByRole('button', {
        name: 'Applying...',
      })
    ).toBeDisabled();

    await act(async () => {
      confirmDeferred.resolve(undefined);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
