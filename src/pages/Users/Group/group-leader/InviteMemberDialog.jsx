import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Mail } from 'lucide-react';
import { getErrorMessage } from '@/utils/getErrorMessage';

// Dialog mời thành viên bằng email
function InviteMemberDialog({
  open,
  onOpenChange,
  onInvite,
  isDarkMode,
  memberSeatLimit = null,
  memberSeatUsage = null,
  memberSeatRemaining = null,
  isMemberSeatLimitReached = false,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form khi đóng dialog
  useEffect(() => {
    if (!open) {
      setEmail('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const normalizedMemberSeatLimit = Number(memberSeatLimit);
  const normalizedMemberSeatUsage = Number(memberSeatUsage);
  const normalizedMemberSeatRemaining = Number(memberSeatRemaining);
  const hasMemberSeatLimit = Number.isFinite(normalizedMemberSeatLimit) && normalizedMemberSeatLimit > 0;
  const inviteBlockedBySeatLimit = Boolean(
    hasMemberSeatLimit
    && (
      isMemberSeatLimitReached
      || (Number.isFinite(normalizedMemberSeatRemaining) && normalizedMemberSeatRemaining <= 0)
    )
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inviteBlockedBySeatLimit) {
      setError(t('home.group.memberSeatLimitReached', {
        used: Number.isFinite(normalizedMemberSeatUsage) ? normalizedMemberSeatUsage : normalizedMemberSeatLimit,
        limit: normalizedMemberSeatLimit,
        defaultValue: `Nhóm đã dùng hết ${Number.isFinite(normalizedMemberSeatUsage) ? normalizedMemberSeatUsage : normalizedMemberSeatLimit}/${normalizedMemberSeatLimit} slot thành viên.`,
      }));
      return;
    }

    if (!email.trim()) {
      setError(t('home.group.emailRequired'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onInvite(email.trim());
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(t, err) || t('home.group.inviteError'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase = `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all ${
    isDarkMode
      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500'
      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400'
  }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[420px] ${fontClass} ${
          isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        <DialogHeader>
          <DialogTitle className={isDarkMode ? 'text-white' : 'text-gray-900'}>
            {t('home.group.inviteTitle')}
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>
            {t('home.group.inviteDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {hasMemberSeatLimit ? (
            <div className={`rounded-lg border px-3 py-2.5 text-xs leading-5 ${
              inviteBlockedBySeatLimit
                ? (isDarkMode ? 'border-red-400/30 bg-red-500/10 text-red-100' : 'border-red-200 bg-red-50 text-red-700')
                : (isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600')
            }`}>
              {inviteBlockedBySeatLimit
                ? t('home.group.memberSeatLimitReached', {
                  used: Number.isFinite(normalizedMemberSeatUsage) ? normalizedMemberSeatUsage : normalizedMemberSeatLimit,
                  limit: normalizedMemberSeatLimit,
                  defaultValue: `Nhóm đã dùng hết ${Number.isFinite(normalizedMemberSeatUsage) ? normalizedMemberSeatUsage : normalizedMemberSeatLimit}/${normalizedMemberSeatLimit} slot thành viên. Hãy hủy lời mời chờ hoặc nâng cấp gói trước khi mời thêm.`,
                })
                : t('home.group.memberSeatLimitRemaining', {
                  remaining: Number.isFinite(normalizedMemberSeatRemaining) ? normalizedMemberSeatRemaining : 0,
                  limit: normalizedMemberSeatLimit,
                  used: Number.isFinite(normalizedMemberSeatUsage) ? normalizedMemberSeatUsage : 0,
                  defaultValue: `Còn ${Number.isFinite(normalizedMemberSeatRemaining) ? normalizedMemberSeatRemaining : 0} slot trong tổng ${normalizedMemberSeatLimit} slot thành viên.`,
                })}
            </div>
          ) : null}

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              {t('home.group.emailLabel')}
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('home.group.emailPlaceholder')}
                className={`${inputBase} pl-10 ${error ? 'border-red-500' : ''}`}
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={`rounded-lg ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}`}
            >
              {t('home.group.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting || inviteBlockedBySeatLimit}
              className="rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t('home.group.sending')}
                </>
              ) : (
                t('home.group.sendInvite')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default InviteMemberDialog;
