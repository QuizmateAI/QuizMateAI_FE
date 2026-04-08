import React from 'react';
import { Coins } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';

/**
 * Shown when a paid group plan exists but workspace QMC is insufficient.
 * (When there is no paid plan, the app navigates to the group plans page instead.)
 */
export default function GroupWorkspaceCreditGateModal({
  open,
  onOpenChange,
  isDarkMode = false,
  lang = 'vi',
  onPrimary,
}) {
  const isEn = String(lang || '').toLowerCase().startsWith('en');

  const title = isEn ? 'Not enough group credits' : 'Số dư credit nhóm không đủ';
  const description = isEn
    ? 'Balance is too low for this action. Open the group wallet to buy more credits.'
    : 'Số dư credit trong nhóm không đủ. Mở ví nhóm để mua thêm credit và tiếp tục.';
  const primaryLabel = isEn ? 'Open group wallet' : 'Mở ví nhóm';

  const shell = isDarkMode
    ? 'bg-slate-950 border-slate-800 text-white'
    : 'bg-white border-slate-200 text-slate-900';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`gap-0 overflow-hidden p-0 sm:max-w-[380px] ${shell}`}>
        <div className="px-5 pt-5 pb-1">
          <DialogHeader className="space-y-3 text-left sm:text-left">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isDarkMode ? 'bg-cyan-500/15' : 'bg-cyan-50'
                }`}
              >
                <Coins className={`h-5 w-5 ${isDarkMode ? 'text-cyan-300' : 'text-cyan-600'}`} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <DialogTitle className="text-left text-base font-semibold leading-snug">
                  {title}
                </DialogTitle>
                <DialogDescription
                  className={`text-left text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  {description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>
        <DialogFooter className="flex-row justify-end gap-2 border-t px-5 py-4 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={isDarkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600'}
            onClick={() => onOpenChange(false)}
          >
            {isEn ? 'Later' : 'Để sau'}
          </Button>
          <Button
            type="button"
            size="sm"
            className={
              isDarkMode
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                : 'bg-cyan-600 hover:bg-cyan-700 text-white'
            }
            onClick={() => {
              if (typeof onPrimary === 'function') onPrimary();
            }}
          >
            {primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
