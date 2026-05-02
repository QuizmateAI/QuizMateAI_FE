import { Edit2, Info, Save, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

export default function SystemSettingEditDialog({
  open,
  onOpenChange,
  setting,
  value,
  onValueChange,
  saving,
  onSave,
  onCancel,
  isDarkMode,
  t,
  formatValue,
  getFormatLabel,
  getInputHint,
  getValueFormat,
  categoryMeta,
}) {
  const subtlePanelClass = isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50/80';
  const mutedTextClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const strongTextClass = isDarkMode ? 'text-white' : 'text-slate-900';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('overflow-hidden rounded-xl border p-0 sm:max-w-xl', isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white')}>
        <div className="space-y-5 p-6">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              {t('systemSettings.editTitle')}
            </DialogTitle>
            <DialogDescription>{t('systemSettings.editDescription')}</DialogDescription>
          </DialogHeader>

          {setting && (
            <div className="space-y-5">
              <div className={cn('rounded-xl border px-4 py-4', subtlePanelClass)}>
                <div className="flex flex-wrap items-center gap-2">
                  <code className={cn(
                    'inline-flex rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold',
                    isDarkMode ? 'border-slate-700 bg-slate-950 text-cyan-200' : 'border-slate-200 bg-white text-cyan-700'
                  )}>
                    {setting.key}
                  </code>
                  <Badge
                    variant="outline"
                    className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', categoryMeta.chipClass)}
                  >
                    {t(`systemSettings.categories.${setting.category}`)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                      isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-200' : 'border-slate-200 bg-white text-slate-700'
                    )}
                  >
                    {getFormatLabel(setting.key)}
                  </Badge>
                </div>

                {setting.description && (
                  <div className={cn(
                    'mt-4 flex items-start gap-2 rounded-lg border px-3 py-3 text-sm',
                    isDarkMode ? 'border-slate-700 bg-slate-950 text-slate-300' : 'border-slate-200 bg-white text-slate-700'
                  )}>
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{setting.description}</span>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className={cn('rounded-xl border px-4 py-4', subtlePanelClass)}>
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedTextClass)}>
                    {t('systemSettings.editCurrent')}
                  </p>
                  <p className={cn('mt-2 text-lg font-semibold', strongTextClass)}>
                    {formatValue(setting.key, setting.value)}
                  </p>
                </div>

                <div className={cn('rounded-xl border px-4 py-4', subtlePanelClass)}>
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.08em]', mutedTextClass)}>
                    {t('systemSettings.editPreview')}
                  </p>
                  <p className={cn('mt-2 text-lg font-semibold', strongTextClass)}>
                    {value === '' ? '-' : formatValue(setting.key, value)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className={isDarkMode ? 'text-slate-300' : ''}>{t('systemSettings.colValue')}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={value}
                    onChange={(event) => onValueChange(event.target.value)}
                    autoFocus
                    className={cn(
                      'h-11 rounded-lg pr-16',
                      isDarkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white'
                    )}
                  />

                  {getValueFormat(setting.key) === 'percent' && (
                    <span className={cn(
                      'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold',
                      mutedTextClass
                    )}>
                      %
                    </span>
                  )}

                  {getValueFormat(setting.key) === 'vnd' && (
                    <span className={cn(
                      'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold',
                      mutedTextClass
                    )}>
                      VND
                    </span>
                  )}
                </div>
                <p className={cn('text-xs', mutedTextClass)}>{getInputHint(setting.key)}</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={saving}
              className={cn(
                'rounded-lg',
                isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'
              )}
            >
              <X className="h-4 w-4" />
              {t('systemSettings.cancel')}
            </Button>
            <Button onClick={onSave} disabled={saving || value === ''} className="rounded-lg">
              <Save className="h-4 w-4" />
              {saving ? t('systemSettings.saving') : t('systemSettings.save')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
