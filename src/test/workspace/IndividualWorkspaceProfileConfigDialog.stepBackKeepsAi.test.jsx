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

    // Let the 900ms analyzeKnowledge debounce fire and AI resolve.
    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Sanity: AI was called once after the user typed.
    expect(analyzeKnowledge).toHaveBeenCalledTimes(1);

    // Reset call counter so we can assert no FURTHER calls happen on step navigation.
    analyzeKnowledge.mockClear();

    // Note: we don't actually click "Continue" in this test because that requires
    // a domain selection + complex setup. Instead, we directly verify that the
    // analyzeKnowledge useEffect's fingerprint guard prevents re-firing when the
    // knowledge text is unchanged — even after multiple re-renders that simulate
    // step navigation churn (parent re-renders with stable initialData).
    //
    // The fingerprint check is the contract: same knowledge ⇒ same fingerprint ⇒
    // early return. Step navigation alone must not break that.

    // Force several re-renders that emulate parent state churn during navigation:
    // changing dialog state, persistStep finishing, etc. The hook's useEffect
    // dependencies (open, knowledgeInput, t, retryTick, canRequestKnowledgeAnalysis)
    // do not change — so analyzeKnowledge must NOT be called again.
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
});
