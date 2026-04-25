import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, BrainCircuit, CheckCircle2, Loader2, Save, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import WorkspaceProfileStepThree from '@/pages/Users/Individual/Workspace/Components/WorkspaceProfileWizard/WorkspaceProfileStepThree';
import {
  applyRoadmapSuggestionValues,
  buildInitialRoadmapValues,
  syncRoadmapConfigFieldValues,
  validateRoadmapConfigValues,
} from '@/components/features/workspace/roadmapConfigUtils';

function RoadmapConfigEditDialog({
  open,
  onOpenChange,
  isDarkMode = false,
  initialValues = {},
  mode = 'edit',
  hasExistingRoadmap = false,
  onSave,
  onSuggest,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const isSetupMode = mode === 'setup';
  const [saving, setSaving] = useState(false);
  const [localValues, setLocalValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState('');
  const [suggestionMeta, setSuggestionMeta] = useState(null);
  const canSuggest = typeof onSuggest === 'function';
  const closeLabel = t('roadmapConfigEditDialog.close', 'Close');
  const saveLabel = isSetupMode
    ? t('roadmapConfigEditDialog.setupButton', 'Set up roadmap')
    : t('roadmapConfigEditDialog.saveChanges', 'Save changes');
  const savingLabel = t('roadmapConfigEditDialog.saving', 'Saving...');
  const suggestLabel = t('roadmapConfigEditDialog.suggestButton', 'Suggest with AI');
  const suggestingLabel = t('roadmapConfigEditDialog.suggesting', 'Generating suggestion...');
  const confirmBackLabel = t('roadmapConfigEditDialog.confirmBack', 'Go back');
  const confirmActionLabel = isSetupMode
    ? t('roadmapConfigEditDialog.setupConfirmAction', 'Confirm setup')
    : t('roadmapConfigEditDialog.updateConfirmAction', 'Confirm update');
  const dialogTitle = isSetupMode
    ? t('roadmapConfigEditDialog.setupTitle', 'Set up roadmap')
    : t('roadmapConfigEditDialog.editTitle', 'Edit roadmap');
  const dialogDescription = isSetupMode
    ? t(
      'roadmapConfigEditDialog.setupDescription',
      'Set the knowledge amount, pacing, total days, and daily study time before creating phases for this roadmap.'
    )
    : t(
      'roadmapConfigEditDialog.editDescription',
      'Update the knowledge amount, pacing, total days, and daily study time for the current roadmap.'
    );
  const confirmTitle = isSetupMode
    ? t(
      'roadmapConfigEditDialog.setupConfirmTitle',
      'Confirm roadmap setup'
    )
    : hasExistingRoadmap
      ? t(
        'roadmapConfigEditDialog.updateExistingConfirmTitle',
        'You already have a roadmap in use'
      )
      : t(
        'roadmapConfigEditDialog.updateConfirmTitle',
        'Confirm roadmap update'
      );
  const confirmDescription = isSetupMode
    ? t(
      'roadmapConfigEditDialog.setupConfirmDescription',
      'Are you sure you want to save this roadmap configuration for this workspace?'
    )
    : hasExistingRoadmap
      ? t(
        'roadmapConfigEditDialog.updateExistingConfirmDescription',
        'If you update these values, the roadmap currently in use will be removed. Are you sure you want to update the roadmap information?'
      )
      : t(
        'roadmapConfigEditDialog.updateConfirmDescription',
        'Are you sure you want to update the roadmap information?'
      );

  useEffect(() => {
    if (open) {
      setLocalValues(buildInitialRoadmapValues(initialValues));
      setSaving(false);
      setErrors({});
      setSaveError('');
      setConfirmOpen(false);
      setSuggesting(false);
      setSuggestError('');
      setSuggestionMeta(null);
    }
  }, [open, initialValues]);

  const handleFieldChange = useCallback((field, value) => {
    setLocalValues((prev) => syncRoadmapConfigFieldValues(prev, field, value));
    setSaveError('');
    setSuggestError('');
    setErrors((prev) => {
      if (!prev || Object.keys(prev).length === 0) return prev;

      const nextErrors = { ...prev };
      delete nextErrors[field];

      if (field === 'knowledgeLoad' || field === 'roadmapSpeedMode' || field === 'estimatedTotalDays') {
        delete nextErrors.estimatedTotalDays;
        delete nextErrors.recommendedMinutesPerDay;
        delete nextErrors.roadmapSpeedMode;
      }

      return nextErrors;
    });
  }, []);

  const handleConfirmSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await onSave?.(localValues);
      setConfirmOpen(false);
      onOpenChange?.(false);
    } catch (error) {
      console.error('Failed to update roadmap config:', error);
      setSaveError(
        error?.message
        || t(
          'roadmapConfigEditDialog.saveFailed',
          'Save failed. Please try again.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRequestSave = () => {
    if (saving) return;
    const nextErrors = validateRoadmapConfigValues(localValues, t);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setConfirmOpen(false);
      return;
    }

    setSaveError('');
    setConfirmOpen(true);
  };

  const handleSuggest = useCallback(async () => {
    if (!canSuggest || saving || suggesting) return;

    setSuggesting(true);
    setSuggestError('');

    try {
      const suggestion = await onSuggest();
      if (!suggestion || typeof suggestion !== 'object') {
        throw new Error(
          t(
            'roadmapConfigEditDialog.suggestInvalid',
            'AI did not return a valid roadmap suggestion.'
          )
        );
      }

      setLocalValues((current) => applyRoadmapSuggestionValues(current, suggestion));
      setErrors({});
      setSaveError('');
      setSuggestionMeta({
        rationale: String(suggestion?.rationale || '').trim(),
        recommendations: Array.isArray(suggestion?.recommendations)
          ? suggestion.recommendations.filter(Boolean)
          : [],
        preLearningRequired: null,
      });
    } catch (error) {
      console.error('Failed to suggest roadmap config:', error);
      setSuggestError(
        error?.message
        || t(
          'roadmapConfigEditDialog.suggestFailed',
          'Unable to generate an AI suggestion right now.'
        )
      );
    } finally {
      setSuggesting(false);
    }
  }, [canSuggest, onSuggest, saving, suggesting, t]);

  const handleDialogOpenChange = useCallback((nextOpen) => {
    if (!nextOpen) {
      setConfirmOpen(false);
      setSaveError('');
    }
    onOpenChange?.(nextOpen);
  }, [onOpenChange]);

  const handleClose = () => handleDialogOpenChange(false);

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          hideClose
          className={`grid h-[88vh] w-[min(1100px,calc(100vw-24px))] max-w-none grid-rows-[1fr,auto] gap-0 overflow-hidden rounded-[28px] border p-0 shadow-[0_30px_90px_-18px_rgba(15,23,42,0.35)] ${
            isDarkMode
              ? 'border-slate-700 bg-slate-950 text-white'
              : 'border-slate-200 bg-white text-slate-900'
          } ${fontClass}`}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={saving}
            aria-label={closeLabel}
            className={`absolute right-5 top-5 z-10 h-10 w-10 rounded-2xl ${
              isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </Button>

          <DialogTitle className="sr-only">
            {dialogTitle}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {dialogDescription}
          </DialogDescription>

          <div className="min-h-0 overflow-y-auto px-1 py-5 sm:px-2 sm:py-6 lg:px-2">
            <div className="w-full">
              {canSuggest ? (
                <div className={`mb-5 rounded-[24px] border p-5 ${
                  isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50/80'
                }`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        isDarkMode ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-700'
                      }`}>
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {t('roadmapConfigEditDialog.suggestTitle', 'Use AI to prefill this roadmap')}
                        </p>
                        <p className={`mt-1 text-sm leading-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {t(
                            'roadmapConfigEditDialog.suggestDescription',
                            'The suggestion uses the saved workspace profile to estimate depth, pacing, study days, and daily workload.'
                          )}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSuggest}
                      disabled={saving || suggesting}
                      className={`h-11 rounded-2xl px-5 text-sm font-semibold ${
                        isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'hover:bg-white'
                      }`}
                    >
                      {suggesting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {suggestingLabel}
                        </>
                      ) : (
                        <>
                          <BrainCircuit className="mr-2 h-4 w-4" />
                          {suggestLabel}
                        </>
                      )}
                    </Button>
                  </div>

                  {suggestError ? (
                    <p className="mt-4 text-sm font-medium text-rose-500">{suggestError}</p>
                  ) : null}

                  {suggestionMeta ? (
                    <div className={`mt-4 rounded-[20px] border px-4 py-4 ${
                      isDarkMode ? 'border-emerald-400/15 bg-emerald-500/10' : 'border-emerald-200 bg-white'
                    }`}>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${
                          isDarkMode ? 'text-emerald-200' : 'text-emerald-600'
                        }`} />
                        <div className="min-w-0 flex-1 space-y-3">
                          {suggestionMeta.rationale ? (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] opacity-75">
                                {t('roadmapConfigEditDialog.suggestRationaleLabel', 'Why this setup')}
                              </p>
                              <p className={`mt-1 text-sm leading-6 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                {suggestionMeta.rationale}
                              </p>
                            </div>
                          ) : null}

                          {suggestionMeta.preLearningRequired != null ? (
                            <p className={`text-sm font-medium ${
                              isDarkMode ? 'text-amber-200' : 'text-amber-700'
                            }`}>
                              {suggestionMeta.preLearningRequired
                                ? t('roadmapConfigEditDialog.preLearningRequired', 'AI recommends enabling a pre-learning check before the roadmap starts.')
                                : t('roadmapConfigEditDialog.preLearningNotRequired', 'AI suggests this workspace can enter the roadmap directly.')}
                            </p>
                          ) : null}

                          {suggestionMeta.recommendations.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] opacity-75">
                                {t('roadmapConfigEditDialog.suggestRecommendationsLabel', 'AI notes')}
                              </p>
                              <ul className={`mt-2 space-y-2 text-sm leading-6 ${
                                isDarkMode ? 'text-slate-200' : 'text-slate-700'
                              }`}>
                                {suggestionMeta.recommendations.map((item) => (
                                  <li key={item} className="flex gap-2">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <WorkspaceProfileStepThree
                t={t}
                isDarkMode={isDarkMode}
                values={localValues}
                errors={errors}
                disabled={saving || suggesting}
                onFieldChange={handleFieldChange}
                roadmapTitle={dialogTitle}
                roadmapDescription={dialogDescription}
              />
            </div>
          </div>

          <DialogFooter className={`gap-3 border-t px-2 py-4 sm:px-3 sm:py-5 lg:px-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving || suggesting}
              className={`h-11 rounded-2xl px-7 text-base font-medium ${
                isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'hover:bg-slate-100'
              }`}
            >
              <X className="w-4 h-4 mr-2" />
              {closeLabel}
            </Button>

            <Button
              type="button"
              onClick={handleRequestSave}
              disabled={saving || suggesting}
              className="h-11 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-9 text-base font-semibold shadow-lg shadow-emerald-600/30 transition-all hover:from-emerald-700 hover:to-emerald-800 active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {savingLabel}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  {saveLabel}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          hideClose
          hideOverlay
          className={`max-w-[560px] rounded-[26px] border p-0 shadow-[0_25px_70px_-20px_rgba(15,23,42,0.35)] ${
            isDarkMode
              ? 'border-slate-700 bg-slate-950 text-white'
              : 'border-slate-200 bg-white text-slate-900'
          } ${fontClass}`}
        >
          <DialogHeader className={`border-b px-6 py-5 text-left ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-start gap-3 pr-8">
              <div className={isDarkMode ? 'rounded-2xl bg-amber-500/15 p-3 text-amber-300' : 'rounded-2xl bg-amber-50 p-3 text-amber-600'}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                  {confirmTitle}
                </DialogTitle>
                <DialogDescription className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {confirmDescription}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {saveError ? (
            <div className={`px-6 pt-4 text-sm font-medium ${isDarkMode ? 'text-rose-300' : 'text-rose-600'}`}>
              {saveError}
            </div>
          ) : null}

          <DialogFooter className={`gap-3 px-6 py-5 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
              className={`h-11 rounded-2xl px-6 text-base font-medium ${
                isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'hover:bg-slate-100'
              }`}
            >
              {confirmBackLabel}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSave}
              disabled={saving}
              className={hasExistingRoadmap
                ? 'h-11 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 px-7 text-base font-semibold text-white shadow-lg shadow-rose-600/30 transition-all hover:from-rose-700 hover:to-red-700 active:scale-[0.98]'
                : 'h-11 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-7 text-base font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:from-emerald-700 hover:to-emerald-800 active:scale-[0.98]'}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {savingLabel}
                </>
              ) : (
                confirmActionLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RoadmapConfigEditDialog;
