import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword } from '@/api/ProfileAPI';
import { useToast } from '@/context/ToastContext';

const EMPTY_FORM = { oldPassword: '', newPassword: '', confirmNewPassword: '' };
const EMPTY_VISIBILITY = { old: false, new: false, confirm: false };
const MIN_PASSWORD_LENGTH = 6;

function SuperAdminChangePasswordDialog({ open, onOpenChange }) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [visibility, setVisibility] = useState(EMPTY_VISIBILITY);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setVisibility(EMPTY_VISIBILITY);
      setSubmitting(false);
    }
  }, [open]);

  const updateField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const toggleVisibility = (key) => () => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClose = () => {
    if (submitting) return;
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const oldPassword = form.oldPassword.trim();
    const newPassword = form.newPassword.trim();
    const confirmNewPassword = form.confirmNewPassword.trim();

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      showError(t('superAdminLayout.changePassword.fieldsRequired'));
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      showError(t('superAdminLayout.changePassword.tooShort'));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showError(t('superAdminLayout.changePassword.mismatch'));
      return;
    }

    if (newPassword === oldPassword) {
      showError(t('superAdminLayout.changePassword.sameAsOld'));
      return;
    }

    try {
      setSubmitting(true);
      await changePassword({ oldPassword, newPassword, confirmNewPassword });
      showSuccess(t('superAdminLayout.changePassword.success'));
      onOpenChange(false);
    } catch (error) {
      const message = error?.response?.data?.message
        || error?.message
        || t('superAdminLayout.changePassword.error');
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (key, labelKey) => {
    const visibilityKey = key === 'confirmNewPassword' ? 'confirm' : key === 'newPassword' ? 'new' : 'old';
    const isVisible = visibility[visibilityKey];

    return (
      <div className="space-y-2">
        <Label className="text-slate-700 dark:text-slate-200">
          {t(labelKey)}
        </Label>
        <div className="relative">
          <Input
            type={isVisible ? 'text' : 'password'}
            value={form[key]}
            onChange={updateField(key)}
            placeholder={t('superAdminLayout.changePassword.placeholder')}
            disabled={submitting}
            autoComplete={key === 'oldPassword' ? 'current-password' : 'new-password'}
            className="pr-10 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={toggleVisibility(visibilityKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            tabIndex={-1}
            aria-label={t(labelKey)}
          >
            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (submitting ? null : onOpenChange(next))}>
      <DialogContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#0455BF] dark:bg-[#0B1731] dark:text-sky-300">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-slate-900 dark:text-white">
                {t('superAdminLayout.changePassword.title')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400">
                {t('superAdminLayout.changePassword.description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {renderField('oldPassword', 'superAdminLayout.changePassword.oldPassword')}
          {renderField('newPassword', 'superAdminLayout.changePassword.newPassword')}
          {renderField('confirmNewPassword', 'superAdminLayout.changePassword.confirmNewPassword')}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
            className="min-w-[100px] border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            {t('superAdminLayout.changePassword.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="min-w-[140px] bg-[#0455BF] text-white hover:bg-[#033E91] focus-visible:ring-2 focus-visible:ring-[#0455BF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('superAdminLayout.changePassword.saving')}
              </>
            ) : (
              t('superAdminLayout.changePassword.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SuperAdminChangePasswordDialog;
