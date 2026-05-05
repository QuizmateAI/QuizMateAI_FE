import React from 'react';
import { useTranslation } from 'react-i18next';
import { UserCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import GroupProfileOverviewPanel from './GroupProfileOverviewPanel';

/**
 * Wraps the existing profile overview panel inside a Radix dialog so the
 * settings page can surface it on demand instead of rendering the whole
 * snapshot inline. Does not change the panel's internal behaviour — leaders
 * still edit profile fields via the same `onOpenProfileConfig` callback.
 */
function GroupProfileSettingsDialog({
  open,
  onOpenChange,
  group,
  isLeader,
  isDarkMode,
  onOpenProfileConfig,
  profileEditLocked = false,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const handleEditClick = () => {
    onOpenChange?.(false);
    onOpenProfileConfig?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[860px] max-h-[90vh] overflow-y-auto ${fontClass} ${
          isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-cyan-500" />
            {t('groupManage.settings.profileDialog.title')}
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
            {t('groupManage.settings.profileDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1">
          <GroupProfileOverviewPanel
            group={group}
            isDarkMode={isDarkMode}
            isLeader={isLeader}
            onOpenProfileConfig={isLeader ? handleEditClick : undefined}
            profileEditLocked={profileEditLocked}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GroupProfileSettingsDialog;
