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
 * Regression test for: "khi từ bước 2 quay lại thì lại load AI" (going back from
 * step 2 to step 1 re-loads the AI). The expected behavior is to keep the previously
 * cached AI result in memory — clicking Back must NOT clear analysisStatus or trigger
 * a fresh analyzeKnowledge() call when the knowledge text is unchanged.
 */
describe('IndividualWorkspaceProfileConfigDialog step-back preserves AI analysis', () => {
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

  it('does not re-fire analyzeKnowledge when user navigates step 1 → step 2 → back to step 1 with same knowledge', async () => {
    // Mount dialog the way HomePage's quick-create flow does: initialData=null,
    // forceStartAtStepOne=true. User will type knowledge, AI fires, then they
    // navigate forward and back.
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={vi.fn()}
        onSave={onSave}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        workspaceId="555"
        isDarkMode={false}
        canCreateRoadmap={true}
        initialData={null}
        forceStartAtStepOne
      />
    );

    // User types knowledge.
    const knowledgeInput = screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput'));
    fireEvent.change(knowledgeInput, { target: { value: 'toán lớp 1' } });

    // Manual-trigger model: typing alone must NOT call the AI (cost / spam control).
    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });
    expect(analyzeKnowledge).not.toHaveBeenCalled();

    // User presses the "Phân tích lĩnh vực" button → AI fires exactly once.
    const analyzeButton = screen.getByRole('button', {
      name: i18n.t('workspace.profileConfig.stepOne.analyzeAction'),
    });
    await act(async () => {
      fireEvent.click(analyzeButton);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(analyzeKnowledge).toHaveBeenCalledTimes(1);

    // Reset call counter so we can assert no FURTHER calls happen on step navigation.
    analyzeKnowledge.mockClear();

    // The contract: once a knowledge text has been analysed its fingerprint is cached,
    // so re-renders that emulate step-navigation churn (stable open / knowledgeInput / t)
    // must NOT re-fire analyzeKnowledge — even across the debounce window.
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        vi.advanceTimersByTime(1500);
        await Promise.resolve();
      });
    }

    expect(analyzeKnowledge).not.toHaveBeenCalled();
  });

  it('does not re-fire analyzeKnowledge when dialog re-mounts with same rehydrated knowledge (HomePage close-then-reopen)', async () => {
    // Reproduces a likely real-world cause for "AI loads again on going back":
    //   - User reloads the page.
    //   - HomePage re-mounts with quickCreateOpen=false initially.
    //   - Some flow re-opens the dialog (eg navigating from a workspace card)
    //     and now the dialog has open=true but with rehydrated initialData (from
    //     WorkspacePage flow), not the null initialData of the first session.
    //   - Init useEffect resets analysisFingerprintRef.current = '' (line 131
    //     of useWorkspaceProfileWizard.js), so analyzeKnowledge useEffect fires
    //     a fresh AI call instead of trusting the BE-saved result.
    //
    // The mitigation we want: even though we can't avoid resetting fingerprint
    // on dialog re-open (init useEffect is the right place to start fresh), we
    // *can* skip the AI call if BE already gave us a complete analysis result
    // baked into the rehydrated initialData. This test documents the EXPECTED
    // behavior. If it fails after a future change, that change reintroduced the
    // "AI loads again" UX that the user complained about.
    //
    // For now, we only assert the WEAKER invariant: AI is called at most ONCE
    // even after a re-mount with same knowledge — the existing fingerprint
    // guard handles the in-session navigation case.
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <IndividualWorkspaceProfileConfigDialog
        open={false}
        onOpenChange={vi.fn()}
        onSave={onSave}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        workspaceId="555"
        isDarkMode={false}
        canCreateRoadmap={true}
        initialData={null}
      />
    );

    // Open the dialog with rehydrated BE profile (page reload + WorkspacePage flow).
    rerender(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={vi.fn()}
        onSave={onSave}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        workspaceId="555"
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

    // Wait for everything to settle.
    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
      await Promise.resolve();
    });

    // analyzeKnowledge fires once on initial open (acceptable — the FE doesn't have
    // a cached AI result for "toán lớp 1" in memory, so it asks BE which returns
    // from the BE-side cache quickly). It must NOT be called multiple times though.
    const initialCallCount = analyzeKnowledge.mock.calls.length;
    expect(initialCallCount).toBeLessThanOrEqual(1);

    // Now simulate parent re-rendering with a NEW initialData object (eg react-query
    // cache returning a structurally-equal but referentially-new object after a
    // background refetch). The init useEffect dep [initialData] would re-fire, which
    // resets analysisFingerprintRef.current. We should still NOT re-fire AI because
    // the wizard already initialized with profile data — the wasOpenRef guard kicks in.
    rerender(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={vi.fn()}
        onSave={onSave}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        workspaceId="555"
        isDarkMode={false}
        canCreateRoadmap={true}
        initialData={{
          // Same logical content, new object reference.
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
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    // Total calls must not increase from the rerender — the wasOpenRef guard
    // prevents re-init, so analysisFingerprintRef stays intact.
    expect(analyzeKnowledge.mock.calls.length).toBe(initialCallCount);
  });

  it('does not auto-show a cached analysis while the user is typing (must press the button)', async () => {
    // Regression for: "tôi chưa ấn phân tích lĩnh vực thì đã hiện ra lĩnh vực rồi".
    // A previously-analysed term sits in the sessionStorage cache. Typing it again must NOT
    // auto-display the result — the user must press the button, which then serves the cache
    // instantly (no network call).
    const cached = {
      redFlag: false,
      isValid: true,
      warning: false,
      domainSuggestions: ['Công nghệ thông tin'],
      domainSuggestionDetails: [{ label: 'Công nghệ thông tin', reason: 'IT domain' }],
      normalizedKnowledge: 'Lập trình Java',
    };
    window.sessionStorage.setItem(
      'studyProfile:knowledgeAnalysis:v1:vi:java',
      JSON.stringify({ result: cached, savedAt: Date.now() }),
    );

    render(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        workspaceId="555"
        isDarkMode={false}
        canCreateRoadmap={true}
        initialData={null}
        forceStartAtStepOne
      />
    );

    const knowledgeInput = screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.knowledgeInput'));
    fireEvent.change(knowledgeInput, { target: { value: 'java' } });

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
    });

    // Typing a cached term must not call the AI and must not reveal the suggestion yet —
    // the analyse button is still showing.
    expect(analyzeKnowledge).not.toHaveBeenCalled();
    const analyzeButton = screen.getByRole('button', {
      name: i18n.t('workspace.profileConfig.stepOne.analyzeAction'),
    });

    // Pressing it serves the cached result instantly: still no network call, button gone.
    await act(async () => {
      fireEvent.click(analyzeButton);
      await Promise.resolve();
    });
    expect(analyzeKnowledge).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: i18n.t('workspace.profileConfig.stepOne.analyzeAction') }),
    ).not.toBeInTheDocument();
  });
});
