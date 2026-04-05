import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { AlertTriangle, Loader2, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import WorkspaceProfileStepThree from '@/Pages/Users/Individual/Workspace/Components/WorkspaceProfileWizard/WorkspaceProfileStepThree';
import {
  buildInitialRoadmapValues,
  syncRoadmapConfigFieldValues,
  validateRoadmapConfigValues,
} from '@/Components/workspace/roadmapConfigUtils';

function RoadmapConfigEditDialog({
  open,
  onOpenChange,
  isDarkMode = false,
  initialValues = {},
  mode = 'edit',
  hasExistingRoadmap = false,
  onSave,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const isSetupMode = mode === 'setup';
  const [saving, setSaving] = useState(false);
  const [localValues, setLocalValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const closeLabel = t('common.close', i18n.language === 'en' ? 'Close' : 'Đóng');
  const saveLabel = isSetupMode
    ? t('workspace.roadmap.setupButton', i18n.language === 'en' ? 'Set up roadmap' : 'Thiết lập lộ trình')
    : t('common.save', i18n.language === 'en' ? 'Save changes' : 'Lưu thay đổi');
  const savingLabel = t('common.saving', i18n.language === 'en' ? 'Saving...' : 'Đang lưu...');
  const confirmBackLabel = t('workspace.roadmap.updateConfirmBack', i18n.language === 'en' ? 'Go back' : 'Quay lại');
  const confirmActionLabel = isSetupMode
    ? t('workspace.roadmap.setupConfirmAction', i18n.language === 'en' ? 'Confirm setup' : 'Xác nhận thiết lập')
    : t('workspace.roadmap.updateConfirmAction', i18n.language === 'en' ? 'Confirm update' : 'Xác nhận cập nhật');
  const dialogTitle = isSetupMode
    ? t('workspace.roadmap.setupConfigTitle', i18n.language === 'en' ? 'Set up roadmap' : 'Thiết lập lộ trình')
    : t('workspace.roadmap.editConfigTitle', i18n.language === 'en' ? 'Edit roadmap' : 'Chỉnh sửa lộ trình');
  const dialogDescription = isSetupMode
    ? t(
      'workspace.roadmap.setupConfigDescription',
      i18n.language === 'en'
        ? 'Set the knowledge amount, pacing, total days, and daily study time before creating phases for this roadmap.'
        : 'Thiết lập lượng kiến thức, nhịp học, số ngày dự kiến và số phút mỗi ngày trước khi tạo phase cho lộ trình này.'
    )
    : t(
      'workspace.roadmap.editConfigDescription',
      i18n.language === 'en'
        ? 'Update the knowledge amount, pacing, total days, and daily study time for the current roadmap.'
        : 'Cập nhật lượng kiến thức, nhịp học, số ngày dự kiến và số phút mỗi ngày cho lộ trình hiện tại.'
    );
  const confirmTitle = isSetupMode
    ? t(
      'workspace.roadmap.setupConfirmTitle',
      i18n.language === 'en' ? 'Confirm roadmap setup' : 'Xác nhận thiết lập lộ trình'
    )
    : hasExistingRoadmap
      ? t(
        'workspace.roadmap.updateExistingConfirmTitle',
        i18n.language === 'en' ? 'You already have a roadmap in use' : 'Bạn đang có lộ trình đang sử dụng'
      )
      : t(
        'workspace.roadmap.updateConfirmTitle',
        i18n.language === 'en' ? 'Confirm roadmap update' : 'Xác nhận cập nhật lộ trình'
      );
  const confirmDescription = isSetupMode
    ? t(
      'workspace.roadmap.setupConfirmDescription',
      i18n.language === 'en'
        ? 'Are you sure you want to save this roadmap configuration for the group?'
        : 'Bạn có chắc chắn muốn lưu cấu hình lộ trình này cho nhóm không?'
    )
    : hasExistingRoadmap
      ? t(
        'workspace.roadmap.updateExistingConfirmDescription',
        i18n.language === 'en'
          ? 'If you update these values, the roadmap currently in use will be removed. Are you sure you want to update the roadmap information?'
          : 'Nếu cập nhật, lộ trình đang sử dụng sẽ bị mất đi. Bạn chắc chắn với quyết định cập nhật thông tin lộ trình không?'
      )
      : t(
        'workspace.roadmap.updateConfirmDescription',
        i18n.language === 'en'
          ? 'Are you sure you want to update the roadmap information?'
          : 'Bạn có chắc chắn muốn cập nhật thông tin lộ trình không?'
      );

  useEffect(() => {
    if (open) {
      setLocalValues(buildInitialRoadmapValues(initialValues));
      setSaving(false);
      setErrors({});
      setSaveError('');
      setConfirmOpen(false);
    }
  }, [open, initialValues]);

  const handleFieldChange = useCallback((field, value) => {
    setLocalValues((prev) => syncRoadmapConfigFieldValues(prev, field, value));
    setSaveError('');
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
          'workspace.profileConfig.validation.saveFailed',
          i18n.language === 'en'
            ? 'Save failed. Please try again.'
            : 'Lưu thất bại. Vui lòng thử lại.'
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
              <WorkspaceProfileStepThree
                t={t}
                isDarkMode={isDarkMode}
                values={localValues}
                errors={errors}
                disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
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
