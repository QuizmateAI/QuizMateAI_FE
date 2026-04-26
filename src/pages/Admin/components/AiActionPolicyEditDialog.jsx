import {
  Calculator,
  Database,
  Edit2,
  Save,
  Settings2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function FieldLabel({ children, isDarkMode }) {
  return (
    <Label className={`text-[13px] font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
      {children}
    </Label>
  );
}

function Panel({ title, icon: Icon, children, isDarkMode }) {
  return (
    <section className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/45' : 'border-slate-200 bg-slate-50/70'}`}>
      <div className="mb-4 flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDarkMode ? 'bg-slate-800 text-sky-300' : 'bg-blue-100 text-blue-700'}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

export function FormulaPreview({ policy, isDarkMode, t, compact = false }) {
  const isFixed = policy.costMode === 'FIXED';
  const unitLabel = t(`aiActionPolicy.costModeUnit.${policy.costMode}`, policy.costMode);
  const formulaLine = isFixed
    ? `${policy.baseCreditCost ?? 0} QMC`
    : `${policy.baseCreditCost ?? 0} + ${policy.unitCreditCost ?? 0} x ceil(${unitLabel} / ${policy.unitSize ?? 1}) QMC`;

  const summary = isFixed
    ? t('aiActionPolicy.formulaFixedNote')
    : t('aiActionPolicy.formulaSummary', {
      base: policy.baseCreditCost ?? 0,
      unit: policy.unitCreditCost ?? 0,
      size: policy.unitSize ?? 1,
      mode: unitLabel,
    });

  if (compact) {
    return (
      <div className="min-w-[320px] space-y-1">
        <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
          {formulaLine}
        </p>
        <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          {summary}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-white'}`}>
      <p className={`mb-2 text-xs font-semibold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {t('aiActionPolicy.formula')}
      </p>
      <p className={`break-words text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
        {formulaLine}
      </p>
      <p className={`mt-2 text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        {summary}
      </p>
    </div>
  );
}

export default function AiActionPolicyEditDialog({
  open,
  onOpenChange,
  editPolicy,
  form,
  setForm,
  editLabels,
  previewPolicy,
  editableModels,
  saving,
  onSave,
  onWholeNumberChange,
  costModeOptions,
  isDarkMode,
  t,
}) {
  const dk = isDarkMode;
  const inputClass = dk
    ? 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-500'
    : 'border-slate-200 bg-white text-slate-950 placeholder:text-slate-400';
  const disabledInputClass = dk
    ? 'disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-600'
    : 'disabled:bg-slate-100 disabled:text-slate-400';
  const selectClass = `h-10 w-full rounded-lg border px-3 text-sm ${inputClass}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`grid max-h-[92vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-4xl ${
          dk ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-950'
        }`}
      >
        <DialogHeader className={`border-b px-6 py-5 ${dk ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Edit2 className="h-5 w-5 text-blue-600" />
                {t('aiActionPolicy.editTitle')}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl leading-6">
                {t('aiActionPolicy.editDescription')}
              </DialogDescription>
            </div>

            {editPolicy && (
              <div className={`flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2 ${dk ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                <span className={`text-sm font-medium ${dk ? 'text-slate-300' : 'text-slate-700'}`}>
                  {form.isActive ? t('aiActionPolicy.statusActive') : t('aiActionPolicy.statusInactive')}
                </span>
                <Switch
                  checked={Boolean(form.isActive)}
                  onCheckedChange={(value) => setForm((prev) => ({ ...prev, isActive: value }))}
                />
              </div>
            )}
          </div>
        </DialogHeader>

        {editPolicy && (
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
              <div className="space-y-5">
                <Panel title={t('aiActionPolicy.editSectionIdentity')} icon={Settings2} isDarkMode={dk}>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <FieldLabel isDarkMode={dk}>{t('aiActionPolicy.displayName')}</FieldLabel>
                      <Input
                        value={form.displayName ?? ''}
                        onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <FieldLabel isDarkMode={dk}>{t('aiActionPolicy.description')}</FieldLabel>
                      <textarea
                        value={form.description ?? ''}
                        onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                        rows={4}
                        className={`w-full resize-none rounded-lg border px-3 py-2 text-sm leading-6 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${inputClass}`}
                        placeholder={t('aiActionPolicy.descriptionPlaceholder')}
                      />
                    </div>
                  </div>
                </Panel>

                <Panel title={t('aiActionPolicy.editSectionPricing')} icon={Calculator} isDarkMode={dk}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <FieldLabel isDarkMode={dk}>{t('aiActionPolicy.costMode.label')}</FieldLabel>
                      <select
                        value={form.costMode ?? 'FIXED'}
                        onChange={(event) => setForm((prev) => ({ ...prev, costMode: event.target.value }))}
                        className={selectClass}
                      >
                        {costModeOptions.map((mode) => (
                          <option key={mode} value={mode}>
                            {t(`aiActionPolicy.costMode.${mode}`, mode)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <FieldLabel isDarkMode={dk}>
                        {editLabels?.baseCostLabel || t('aiActionPolicy.baseCost')}
                      </FieldLabel>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={form.baseCreditCost ?? ''}
                        onChange={onWholeNumberChange('baseCreditCost')}
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <FieldLabel isDarkMode={dk}>{t('aiActionPolicy.unitField')}</FieldLabel>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={form.unitCreditCost ?? ''}
                        onChange={onWholeNumberChange('unitCreditCost')}
                        disabled={form.costMode === 'FIXED'}
                        className={`${inputClass} ${disabledInputClass}`}
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <FieldLabel isDarkMode={dk}>
                        {editLabels?.unitSizeLabel || t('aiActionPolicy.unitSize')}
                      </FieldLabel>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={form.unitSize ?? ''}
                        onChange={onWholeNumberChange('unitSize')}
                        disabled={form.costMode === 'FIXED'}
                        className={`${inputClass} ${disabledInputClass}`}
                      />
                    </div>
                  </div>
                </Panel>
              </div>

              <aside className="space-y-5">
                <Panel title={t('aiActionPolicy.editSectionRouting')} icon={Database} isDarkMode={dk}>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <FieldLabel isDarkMode={dk}>{t('aiActionPolicy.actionKey')}</FieldLabel>
                      <code className={`block rounded-lg border px-3 py-2 text-xs font-semibold ${dk ? 'border-slate-800 bg-slate-950 text-sky-300' : 'border-blue-100 bg-blue-50 text-blue-700'}`}>
                        {editPolicy.actionKey}
                      </code>
                    </div>

                    <div className="space-y-1.5">
                      <FieldLabel isDarkMode={dk}>{t('aiActionPolicy.defaultModel')}</FieldLabel>
                      <select
                        value={form.defaultModelId ?? ''}
                        onChange={(event) => setForm((prev) => ({ ...prev, defaultModelId: event.target.value }))}
                        className={selectClass}
                      >
                        <option value="">{t('aiActionPolicy.defaultModelUnsetOption')}</option>
                        {editableModels.map((model) => (
                          <option key={model.id} value={String(model.id)}>
                            {`${model.displayName || model.modelCode} (${model.provider})`}
                          </option>
                        ))}
                      </select>
                      <p className={`text-xs leading-relaxed ${dk ? 'text-slate-500' : 'text-slate-500'}`}>
                        {t('aiActionPolicy.defaultModelHint')}
                      </p>
                    </div>
                  </div>
                </Panel>

                <Panel title={t('aiActionPolicy.editSectionPreview')} icon={SlidersHorizontal} isDarkMode={dk}>
                  {previewPolicy && (
                    <FormulaPreview policy={previewPolicy} isDarkMode={dk} t={t} />
                  )}
                </Panel>
              </aside>
            </div>
          </div>
        )}

        <DialogFooter className={`border-t px-6 py-4 ${dk ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50/80'}`}>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className={dk ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
          >
            <X className="mr-1 h-4 w-4" />
            {t('aiActionPolicy.cancel')}
          </Button>
          <Button onClick={onSave} disabled={saving || !editPolicy}>
            <Save className="mr-1 h-4 w-4" />
            {saving ? t('aiActionPolicy.saving') : t('aiActionPolicy.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
