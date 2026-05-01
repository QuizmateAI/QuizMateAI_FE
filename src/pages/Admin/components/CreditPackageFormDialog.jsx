import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function CreditPackageFormDialog({
  open,
  onOpenChange,
  editingPackage,
  formData,
  setFormData,
  validator,
  calculatePrice,
  isSubmitting,
  onSubmit,
  isDarkMode,
  t,
}) {
  const dk = isDarkMode;
  const inputCls = `mt-1.5 h-10 rounded-lg transition-colors duration-200 ${
    dk
      ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-ocean-500 focus:ring-ocean-500/20'
      : 'bg-white border-slate-200 text-slate-900 focus:border-ocean-500 focus:ring-ocean-500/20'
  }`;
  const sectionCls = `rounded-xl border p-4 ${
    dk ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50/80 border-slate-100'
  }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={`max-w-lg max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden ${
          dk ? 'bg-[#0f1629] border-white/[0.08]' : 'bg-white'
        }`}
      >
        <div className={`flex-shrink-0 px-6 pt-6 pb-4 border-b ${dk ? 'border-white/[0.06]' : 'border-slate-100'}`}>
          <DialogHeader className="p-0 space-y-1">
            <DialogTitle className={`text-xl font-bold ${dk ? 'text-white' : 'text-slate-900'}`}>
              {editingPackage
                ? t('creditPackageManagement.editTitle', 'Edit credit package')
                : t('creditPackageManagement.addTitle', 'Add credit package')}
            </DialogTitle>
            <DialogDescription className={dk ? 'text-slate-400' : 'text-slate-500'}>
              {t('creditPackageManagement.formDesc', 'Enter the package details. The price and bonus credits are calculated automatically based on the credit amount.')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={onSubmit} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          <div className={sectionCls}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-4 ${dk ? 'text-ocean-300' : 'text-ocean-700'}`}>
              {t('creditPackage.basicInfo', 'Thông tin cơ bản')}
            </p>
            <div className="space-y-4">
              <div>
                <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('creditPackageManagement.form.name', 'Name')} *
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData({ ...formData, name: v });
                    validator.change('name', v, { ...formData, name: v });
                  }}
                  onBlur={() => validator.touch('name', formData.name, formData)}
                  placeholder={t('creditPackage.form.namePlaceholder', 'VD: Starter, Pro, Enterprise...')}
                  className={cn(
                    inputCls,
                    validator.hasError('name') && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30',
                  )}
                  aria-invalid={validator.hasError('name')}
                />
                {validator.errorOf('name') ? (
                  <p className="mt-1 text-xs text-rose-500">{validator.errorOf('name')}</p>
                ) : null}
              </div>
              <div>
                <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('creditPackageManagement.form.description', 'Description')}
                </Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('creditPackageManagement.form.descriptionPlaceholder', 'Short description of what this package offers')}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('creditPackage.form.creditAmount', 'Số Credit')}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="100000000"
                    value={formData.creditAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      const n = parseInt(value, 10) || 0;
                      const bonus = Math.floor(n * 0.1);
                      const next = {
                        ...formData,
                        creditAmount: value,
                        price: String(calculatePrice(n)),
                        bonusCredit: String(bonus),
                      };
                      setFormData(next);
                      validator.change('creditAmount', value, next);
                    }}
                    onBlur={() => {
                      const n = parseInt(formData.creditAmount, 10) || 0;
                      const bonus = Math.floor(n * 0.1);
                      const next = {
                        ...formData,
                        creditAmount: String(n),
                        price: String(calculatePrice(n)),
                        bonusCredit: String(bonus),
                      };
                      setFormData(next);
                      validator.touch('creditAmount', next.creditAmount, next);
                    }}
                    className={cn(
                      inputCls,
                      validator.hasError('creditAmount') && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30',
                    )}
                    aria-invalid={validator.hasError('creditAmount')}
                  />
                  {validator.errorOf('creditAmount') ? (
                    <p className="mt-1 text-xs text-rose-500">{validator.errorOf('creditAmount')}</p>
                  ) : null}
                </div>
                <div>
                  <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('creditPackageManagement.form.price', 'Price (VND)')}
                  </Label>
                  <Input
                    type="text"
                    value={(parseInt(formData.price, 10) || 0).toLocaleString('vi-VN')}
                    readOnly
                    tabIndex={-1}
                    aria-disabled="true"
                    className={`${inputCls} bg-transparent dark:bg-transparent cursor-default pointer-events-none select-none`}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('creditPackageManagement.form.bonusCredit', 'Bonus credits')}
                  </Label>
                  <span className={`text-[11px] ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t('creditPackageManagement.form.bonusCreditHint', '+10% of Credit Amount')}
                  </span>
                </div>
                <Input
                  type="text"
                  value={(parseInt(formData.bonusCredit, 10) || 0).toLocaleString('vi-VN')}
                  readOnly
                  tabIndex={-1}
                  aria-disabled="true"
                  className={`${inputCls} bg-transparent dark:bg-transparent cursor-default pointer-events-none select-none`}
                />
              </div>
            </div>
          </div>

          <div className={`flex justify-end gap-3 pt-2 border-t ${dk ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={`rounded-lg cursor-pointer ${dk ? 'border-white/10 text-slate-300 hover:bg-white/5' : ''}`}
            >
              {t('auth.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-ocean-cta hover:brightness-110 text-white rounded-lg shadow-lg shadow-ocean-500/25 cursor-pointer"
            >
              {isSubmitting
                ? t('creditPackageManagement.submitting', 'Saving...')
                : editingPackage
                  ? t('creditPackageManagement.save', 'Save changes')
                  : t('creditPackageManagement.create', 'Create package')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
