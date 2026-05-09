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

/**
 * Direct regression for the user's complaint:
 *   "khi từ bước 2 quay lại thì lại load AI. phải get những gì user đã điền ở bước 1 chứ"
 *   (When going back from step 2 to step 1, AI loads again. It should restore
 *    what the user already entered at step 1.)
 *
 * The most reproducible cause is a hard page reload mid-flow:
 *   - In-memory wizard state (knowledgeAnalysis, domainOptions, analysisStatus) is lost
 *   - Dialog re-mounts and analyzeKnowledge useEffect would fire a fresh AI call
 *   - User sees "Quizmate AI đang phân tích kiến thức..." spinner again
 *
 * The fix layers a sessionStorage cache (keyed by trimmed knowledge + UI locale,
 * 30-min TTL) so the second mount finds the previously analyzed result and
 * restores it synchronously without hitting the AI.
 */
describe('IndividualWorkspaceProfileConfigDialog AI analysis sessionStorage cache', () => {
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
      confidence: 0.95,
      domainSuggestions: ['Toán học'],
      domainSuggestionDetails: [{ label: 'Toán học', reason: 'Math domain' }],
      normalizedKnowledge: 'Toán lớp 1',
    });
    suggestProfileFields.mockResolvedValue({
      currentLevelSuggestions: [],
      learningGoalSuggestions: [],
      strongAreaSuggestions: [],
      weakAreaSuggestions: [],
      examNameSuggestions: [],
    });
    validateProfileConsistency.mockResolvedValue({ redFlag: false, isConsistent: true });
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('skips the AI call when the same knowledge was analyzed earlier in the session', async () => {
    // First mount: user types knowledge, AI runs, result is cached to sessionStorage.
    const firstRender = render(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        workspaceId="777"
        isDarkMode={false}
        canCreateRoadmap={true}
        initialData={null}
        forceStartAtStepOne
      />
    );

    fireEvent.change(
      screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput')),
      { target: { value: 'toán lớp 1' } }
    );

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(analyzeKnowledge).toHaveBeenCalledTimes(1);

    // Cleanup the first mount (mimics page reload — entire component tree torn down).
    firstRender.unmount();
    analyzeKnowledge.mockClear();

    // Second mount: same UI language, dialog opens with rehydrated BE profile that
    // contains the same knowledge. WITHOUT the sessionStorage cache, this would
    // trigger a fresh analyzeKnowledge call and the user would see the spinner again.
    render(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        workspaceId="777"
        isDarkMode={false}
        canCreateRoadmap={true}
        initialData={{
          profileStatus: 'BASIC_DONE',
          workspaceSetupStatus: 'CREATED',
          currentStep: 2,
          learningMode: 'STUDY_NEW',
          workspacePurpose: 'STUDY_NEW',
          knowledge: 'toán lớp 1',
          knowledgeInput: 'toán lớp 1',
          domain: 'Toán học',
          inferredDomain: 'Toán học',
          roadmapEnabled: true,
        }}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Critical assertion: the AI was NOT re-called — the sessionStorage cache served
    // the previous result instantly.
    expect(analyzeKnowledge).not.toHaveBeenCalled();
  });

  it('still calls AI on second mount when the knowledge text changed', async () => {
    // Sanity: the cache must be keyed by knowledge so a different knowledge value
    // does NOT incorrectly serve a stale result.
    const firstRender = render(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        workspaceId="888"
        isDarkMode={false}
        canCreateRoadmap={true}
        initialData={null}
        forceStartAtStepOne
      />
    );

    fireEvent.change(
      screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput')),
      { target: { value: 'toán lớp 1' } }
    );
    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(analyzeKnowledge).toHaveBeenCalledTimes(1);

    firstRender.unmount();
    analyzeKnowledge.mockClear();

    // Second mount with DIFFERENT knowledge text — must trigger a fresh AI call.
    render(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        workspaceId="888"
        isDarkMode={false}
        canCreateRoadmap={true}
        initialData={{
          profileStatus: 'BASIC_DONE',
          workspaceSetupStatus: 'CREATED',
          currentStep: 2,
          learningMode: 'STUDY_NEW',
          workspacePurpose: 'STUDY_NEW',
          knowledge: 'toán lớp 5',
          knowledgeInput: 'toán lớp 5',
          domain: 'Toán học',
          inferredDomain: 'Toán học',
          roadmapEnabled: true,
        }}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(analyzeKnowledge).toHaveBeenCalledTimes(1);
  });
});
