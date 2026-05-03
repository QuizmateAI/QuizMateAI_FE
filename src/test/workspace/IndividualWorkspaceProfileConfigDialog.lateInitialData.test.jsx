import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n, { i18nReady, preloadNamespaces } from '@/i18n';
import IndividualWorkspaceProfileConfigDialog from '@/pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileConfigDialog';

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
      workspaceId="123"
      isDarkMode={false}
      {...props}
    />
  );

  return { ...view, onSave, onOpenChange, onConfirm };
}

function createSavedBasicProfile() {
  return {
    profileStatus: 'BASIC_DONE',
    workspaceSetupStatus: 'CREATED',
    currentStep: 2,
    learningMode: 'REVIEW',
    workspacePurpose: 'REVIEW',
    knowledge: 'Xac suat thong ke co ban',
    knowledgeInput: 'Xac suat thong ke co ban',
    domain: 'Probability & Statistics',
    inferredDomain: 'Probability & Statistics',
    roadmapEnabled: false,
  };
}

describe('IndividualWorkspaceProfileConfigDialog late initial data', () => {
  beforeEach(async () => {
    window.localStorage.setItem('app_language', 'vi');
    window.sessionStorage.clear();
    await i18nReady;
    await preloadNamespaces(['common', 'workspace'], 'vi');
    await i18n.changeLanguage('vi');
    vi.useFakeTimers();
    analyzeKnowledge.mockResolvedValue({
      redFlag: false,
      isValid: true,
      warning: false,
      confidence: 0.9,
      domainSuggestions: ['Probability & Statistics'],
    });
    suggestProfileFields.mockResolvedValue({});
    validateProfileConsistency.mockResolvedValue({ redFlag: false, isConsistent: true });
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('moves to step 2 when saved basic profile data arrives after the dialog is already open', async () => {
    const baseProps = {
      initialData: null,
      canCreateRoadmap: true,
    };
    const { rerender, onSave, onOpenChange, onConfirm } = renderDialog(baseProps);

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput'))).toBeInTheDocument();
    expect(window.sessionStorage.getItem('workspace-profile-wizard-123')).toBe('1');

    rerender(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={onOpenChange}
        onSave={onSave}
        onConfirm={onConfirm}
        workspaceId="123"
        isDarkMode={false}
        initialData={createSavedBasicProfile()}
        canCreateRoadmap={true}
      />
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
    expect(window.sessionStorage.getItem('workspace-profile-wizard-123')).toBe('2');
  });

  it('shows a loading state instead of step 1 while waiting for the saved profile', async () => {
    const { rerender, onSave, onOpenChange, onConfirm } = renderDialog({
      initialData: null,
      initialProfileLoading: true,
      canCreateRoadmap: true,
    });

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải hồ sơ workspace...');
    expect(screen.queryByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput'))).not.toBeInTheDocument();

    rerender(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={onOpenChange}
        onSave={onSave}
        onConfirm={onConfirm}
        workspaceId="123"
        isDarkMode={false}
        initialData={createSavedBasicProfile()}
        initialProfileLoading={false}
        canCreateRoadmap={true}
      />
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();
  });

  it('does not overwrite step 1 edits when profile data arrives after the user starts typing', async () => {
    const { rerender, onSave, onOpenChange, onConfirm } = renderDialog({
      initialData: null,
      canCreateRoadmap: true,
    });
    const knowledgeInput = screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput'));

    fireEvent.change(knowledgeInput, { target: { value: 'User typed knowledge' } });

    rerender(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={onOpenChange}
        onSave={onSave}
        onConfirm={onConfirm}
        workspaceId="123"
        isDarkMode={false}
        initialData={createSavedBasicProfile()}
        canCreateRoadmap={true}
      />
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput'))).toHaveValue('User typed knowledge');
    expect(screen.queryByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).not.toBeInTheDocument();
  });
});
