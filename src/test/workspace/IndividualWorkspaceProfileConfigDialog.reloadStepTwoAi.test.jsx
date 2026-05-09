import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
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
 * Regression test for the "AI stops suggesting after page reload on step 2" bug.
 *
 * Flow that previously broke:
 *   1. User completes step 1 (BE saves knowledge + domain)
 *   2. User starts typing on step 2 (currentLevel)
 *   3. User accidentally reloads the page
 *   4. Dialog re-opens with rehydrated BE data (initialData includes
 *      knowledge="..." and domain="...")
 *   5. Wizard mounts → init useEffect rehydrates values; analyzeKnowledge useEffect
 *      runs ONCE in the same render cycle with closure-captured stale values
 *      (knowledgeInput=''). canRequestKnowledgeAnalysis=false → wipes inferredDomain
 *      via setValues(current => ({...current, inferredDomain: '', ...}))
 *   6. The wipe nukes the freshly-rehydrated domain → step 2 useEffect now sees
 *      empty domain → field-suggestion AI never fires.
 *
 * Fix: in analyzeKnowledge useEffect's "no knowledge" branch, skip the wipe when
 * `current.inferredDomain` or `current.selectedKnowledgeOption` is already set —
 * those were rehydrated from BE and must not be clobbered.
 */
describe('IndividualWorkspaceProfileConfigDialog reload-then-step-2 AI trigger', () => {
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
      domainSuggestions: ['情報技術'],
      domainSuggestionDetails: [{ label: '情報技術', reason: 'IT domain' }],
    });
    suggestProfileFields.mockResolvedValue({
      currentLevelSuggestions: ['Beginner', 'Intermediate'],
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

  it('triggers field-suggestion AI on step 2 after reload (rehydrated BE profile preserves inferredDomain)', async () => {
    // Simulate a reload: dialog opens directly with BE profile that already has
    // step 1 saved (BASIC_DONE). Wizard should land on step 2 and immediately
    // call suggestProfileFields with the rehydrated knowledge + domain.
    render(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        workspaceId="999"
        isDarkMode={false}
        canCreateRoadmap={true}
        initialData={{
          profileStatus: 'BASIC_DONE',
          workspaceSetupStatus: 'CREATED',
          currentStep: 2,
          learningMode: 'STUDY_NEW',
          workspacePurpose: 'STUDY_NEW',
          knowledge: 'java',
          knowledgeInput: 'java',
          domain: '情報技術',
          inferredDomain: '情報技術',
          roadmapEnabled: true,
        }}
      />
    );

    // Allow init useEffect + analyzeKnowledge useEffect + step-2 useEffect to settle.
    // The step-2 effect schedules fetchFieldSuggestions in 700ms (FIELD_SUGGESTION_DEBOUNCE_MS).
    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Wizard should land on step 2 (rehydrated BASIC_DONE).
    expect(screen.getByPlaceholderText(i18n.t('workspace.profileConfig.placeholders.currentLevel'))).toBeInTheDocument();

    // The actual regression check: suggestProfileFields MUST have been invoked with
    // the rehydrated knowledge + domain. Before the fix, the analyzeKnowledge useEffect
    // would have wiped inferredDomain and this call would never have fired.
    expect(suggestProfileFields).toHaveBeenCalled();
    const lastCall = suggestProfileFields.mock.calls.at(-1);
    expect(lastCall[0]).toMatchObject({
      knowledge: 'java',
      domain: '情報技術',
      learningMode: 'STUDY_NEW',
    });
  });

  it('still triggers field-suggestion AI when initialData arrives AFTER dialog opens (late-rehydration race)', async () => {
    // The harder race scenario: dialog opens with initialData=null (eg WorkspacePage
    // mounts and shows the dialog before the profile-fetch query resolves), then BE
    // profile arrives. analyzeKnowledge useEffect fires twice — once with empty values
    // and once after rehydration. Even with the empty closure, the wipe must NOT
    // overwrite the freshly-rehydrated inferredDomain.
    //
    // This is the variant that the previous fix's `setValues(current => guard)`
    // pattern could miss because `current` may still snapshot the pre-init state
    // depending on React's scheduling of batched updates.
    const onOpenChange = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={onOpenChange}
        onSave={onSave}
        onConfirm={onConfirm}
        workspaceId="999"
        isDarkMode={false}
        canCreateRoadmap={true}
        initialData={null}
      />
    );

    // Late rehydration with BE profile.
    rerender(
      <IndividualWorkspaceProfileConfigDialog
        open
        onOpenChange={onOpenChange}
        onSave={onSave}
        onConfirm={onConfirm}
        workspaceId="999"
        isDarkMode={false}
        canCreateRoadmap={true}
        initialData={{
          profileStatus: 'BASIC_DONE',
          workspaceSetupStatus: 'CREATED',
          currentStep: 2,
          learningMode: 'STUDY_NEW',
          workspacePurpose: 'STUDY_NEW',
          knowledge: 'java',
          knowledgeInput: 'java',
          domain: '情報技術',
          inferredDomain: '情報技術',
          roadmapEnabled: true,
        }}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(1500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(suggestProfileFields).toHaveBeenCalled();
    const lastCall = suggestProfileFields.mock.calls.at(-1);
    // The critical assertion: domain must still be '情報技術', NOT empty string.
    // Empty domain would mean the wipe ran successfully and stomped over the rehydrated value.
    expect(lastCall[0]).toMatchObject({
      knowledge: 'java',
      domain: '情報技術',
      learningMode: 'STUDY_NEW',
    });
  });
});
