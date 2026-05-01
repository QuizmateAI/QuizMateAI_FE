import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import { cn } from '@/lib/utils';
import { changePassword } from '@/api/ProfileAPI';
import { useToast } from '@/context/ToastContext';
import { useDarkMode } from '@/hooks/useDarkMode';

const EMPTY_FORM = { oldPassword: '', newPassword: '', confirmNewPassword: '' };
const EMPTY_VISIBILITY = { old: false, new: false, confirm: false };

function PasswordField({ isDarkMode, label, value, onChange, show, onToggle, placeholder, showLabel, hideLabel }) {
  return (
    <div className="space-y-2">
      <Label className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{label}</Label>
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(
            'pr-10',
            isDarkMode
              ? 'border-slate-700 bg-slate-800 text-white placeholder:text-slate-500'
              : 'border-slate-300 bg-white',
          )}
        />
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2',
            isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700',
          )}
          aria-label={show ? hideLabel : showLabel}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function SuperAdminChangePasswordDialog({ open, onOpenChange }) {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showSuccess, showError } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [visibility, setVisibility] = useState(EMPTY_VISIBILITY);
  const [submitting, setSubmitting] = useState(false);

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setVisibility(EMPTY_VISIBILITY);
      setSubmitting(false);
    }
  }, [open]);

  const updateField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));
  const toggleVisibility = (field) => () => setVisibility((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const { oldPassword, newPassword, confirmNewPassword } = form;

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      showError(t('superAdminLayout.changePassword.fieldsRequired'));
      return;
    }
    if (newPassword.length < 6) {
      showError(t('superAdminLayout.changePassword.tooShort'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showError(t('superAdminLayout.changePassword.mismatch'));
      return;
    }
    if (oldPassword === newPassword) {
      showError(t('superAdminLayout.changePassword.sameAsOld'));
      return;
    }

    try {
      setSubmitting(true);
      await changePassword({ oldPassword, newPassword, confirmNewPassword });
      showSuccess(t('superAdminLayout.changePassword.success'));
      onOpenChange?.(false);
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || t('superAdminLayout.changePassword.error');
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!submitting ? onOpenChange?.(next) : null)}>
      <DialogContent
        className={cn(fontClass, isDarkMode ? 'border-slate-700 bg-slate-900 text-white' : 'bg-white')}
      >
        <DialogHeader>
          <DialogTitle className={isDarkMode ? 'text-white' : 'text-slate-900'}>
            {t('superAdminLayout.changePassword.title')}
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
            {t('superAdminLayout.changePassword.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <PasswordField
            isDarkMode={isDarkMode}
            label={t('superAdminLayout.changePassword.oldPassword')}
            value={form.oldPassword}
            onChange={updateField('oldPassword')}
            show={visibility.old}
            onToggle={toggleVisibility('old')}
            placeholder={t('superAdminLayout.changePassword.placeholder')}
            showLabel={t('common.showPassword', 'Show password')}
            hideLabel={t('common.hidePassword', 'Hide password')}
          />
          <PasswordField
            isDarkMode={isDarkMode}
            label={t('superAdminLayout.changePassword.newPassword')}
            value={form.newPassword}
            onChange={updateField('newPassword')}
            show={visibility.new}
            onToggle={toggleVisibility('new')}
            placeholder={t('superAdminLayout.changePassword.placeholder')}
            showLabel={t('common.showPassword', 'Show password')}
            hideLabel={t('common.hidePassword', 'Hide password')}
          />
          <PasswordField
            isDarkMode={isDarkMode}
            label={t('superAdminLayout.changePassword.confirmNewPassword')}
            value={form.confirmNewPassword}
            onChange={updateField('confirmNewPassword')}
            show={visibility.confirm}
            onToggle={toggleVisibility('confirm')}
            placeholder={t('superAdminLayout.changePassword.placeholder')}
            showLabel={t('common.showPassword', 'Show password')}
            hideLabel={t('common.hidePassword', 'Hide password')}
          />

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={submitting}
              className={cn('min-w-[100px]', isDarkMode && 'border-slate-700 hover:bg-slate-800')}
            >
              {t('superAdminLayout.changePassword.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="min-w-[120px] bg-[#0455BF] text-white hover:bg-[#0344A0]"
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
