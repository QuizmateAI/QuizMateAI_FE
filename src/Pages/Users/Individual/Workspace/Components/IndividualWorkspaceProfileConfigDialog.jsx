import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Loader2 } from 'lucide-react';

function IndividualWorkspaceProfileConfigDialog({ open, onOpenChange, onSave, isDarkMode, initialData, isReadOnly }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [documentDescription, setDocumentDescription] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [weakAreas, setWeakAreas] = useState('');
  const [strongAreas, setStrongAreas] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, initialData]);

  const resetForm = () => {
    if (initialData) {
      setDocumentDescription(initialData.documentDescription || '');
      setCurrentLevel(initialData.currentLevel || '');
      setLearningGoal(initialData.learningGoal || '');
      setWeakAreas(initialData.weakAreas || '');
      setStrongAreas(initialData.strongAreas || '');
    } else {
      setDocumentDescription('');
      setCurrentLevel('');
      setLearningGoal('');
      setWeakAreas('');
      setStrongAreas('');
    }
    setErrors({});
  };

  const validate = () => {
    const newErrors = {};
    if (!learningGoal?.trim()) {
      newErrors.learningGoal = t('workspace.profileConfig.errLearningGoal');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        documentDescription: documentDescription.trim() || null,
        currentLevel: currentLevel.trim() || null,
        learningGoal: learningGoal.trim() || null,
        weakAreas: weakAreas.trim() || null,
        strongAreas: strongAreas.trim() || null,
      };
      await onSave(payload);
    } catch {
      // Parent handles error
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20 ${
    isDarkMode
      ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500'
      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400'
  }`;

  const labelBase = `block text-xs font-semibold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`;
  const hintBase = `text-xs font-normal ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;
  const sectionBase = `rounded-2xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[640px] overflow-hidden ${fontClass} ${
          isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500`} />
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className={`flex items-center gap-2 text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('workspace.profileConfig.title')}
            {isReadOnly && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{t('workspace.profileConfig.updated')}</span>}
          </DialogTitle>
          <DialogDescription className={`text-[15px] pt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {isReadOnly ? t('workspace.profileConfig.readOnlyDesc') : t('workspace.profileConfig.editDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 flex flex-col">
          <fieldset disabled={isReadOnly} className={`border-0 p-0 m-0 w-full ${isReadOnly ? "opacity-90" : ""}`}>
            <div className="space-y-4">
              <div className={sectionBase}>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelBase}>{t('workspace.profileConfig.documentDescriptionLabel')}</label>
                      <span className={hintBase}>{t('workspace.profileConfig.optional')}</span>
                    </div>
                    <textarea
                      value={documentDescription}
                      onChange={(e) => setDocumentDescription(e.target.value)}
                      placeholder={t('workspace.profileConfig.documentDescriptionPlaceholder')}
                      rows={3}
                      className={`${inputBase} resize-none`}
                    />
                  </div>
                </div>
              </div>

              <div className={sectionBase}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                </div>

                <div className="mt-4">
                  <label className={labelBase}>{t('workspace.profileConfig.learningGoalLabel')} <span className="text-red-500">*</span></label>
                  <textarea
                    value={learningGoal}
                    onChange={(e) => setLearningGoal(e.target.value)}
                    placeholder={t('workspace.profileConfig.learningGoalPlaceholder')}
                    rows={3}
                    className={`${inputBase} resize-none ${errors.learningGoal ? 'border-red-500 focus:ring-red-500/20' : ''}`}
                  />
                  {errors.learningGoal && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.learningGoal}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelBase}>{t('workspace.profileConfig.strongAreasLabel')}</label>
                      <span className={hintBase}>{t('workspace.profileConfig.optional')}</span>
                    </div>
                    <input
                      type="text"
                      value={strongAreas}
                      onChange={(e) => setStrongAreas(e.target.value)}
                      placeholder={t('workspace.profileConfig.strongAreasPlaceholder')}
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelBase}>{t('workspace.profileConfig.weakAreasLabel')}</label>
                      <span className={hintBase}>{t('workspace.profileConfig.optional')}</span>
                    </div>
                    <input
                      type="text"
                      value={weakAreas}
                      onChange={(e) => setWeakAreas(e.target.value)}
                      placeholder={t('workspace.profileConfig.weakAreasPlaceholder')}
                      className={inputBase}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <label className={labelBase}>{t('workspace.profileConfig.currentLevelLabel')}</label>
                    <span className={hintBase}>{t('workspace.profileConfig.optional')}</span>
                  </div>
                  <input
                    type="text"
                    value={currentLevel}
                    onChange={(e) => setCurrentLevel(e.target.value)}
                    placeholder={t('workspace.profileConfig.currentLevelPlaceholder')}
                    className={inputBase}
                  />
                </div>
              </div>
            </div>
          </fieldset>

          <DialogFooter className="pt-4 mt-3 border-t border-slate-200 dark:border-slate-800 sm:justify-end gap-3 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className={`rounded-xl px-5 py-2.5 h-auto text-sm font-semibold ${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {isReadOnly ? t('workspace.profileConfig.closeBtn') : t('workspace.profileConfig.cancelBtn')}
            </Button>
            {!isReadOnly && (
              <Button
                type="submit"
                disabled={submitting}
                className={`rounded-xl px-6 py-2.5 h-auto text-sm font-bold shadow-md hover:shadow-lg transition-all ${submitting ? 'opacity-80' : ''} bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('workspace.profileConfig.saving')}
                  </>
                ) : (
                  t('workspace.profileConfig.submitBtn')
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default IndividualWorkspaceProfileConfigDialog;
