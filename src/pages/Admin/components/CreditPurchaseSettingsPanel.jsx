import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/context/ToastContext';
import { buildAdminErrorPayload } from '@/utils/getErrorMessage';
import { updateSystemSetting } from '@/api/ManagementSystemAPI';

const SETTINGS = [
  {
    key: 'credit.unit_price_vnd',
    titleKey: 'creditPackageManagement.systemSettings.unitPrice',
    titleFallback: 'Đơn giá 1 credit (VND)',
    descKey: 'creditPackageManagement.systemSettings.unitPriceDesc',
    descFallback: 'Đơn giá dùng để tính tổng tiền cho mọi loại mua credit (package & mua lẻ).',
  },
  {
    key: 'credit.custom_min_units',
    titleKey: 'creditPackageManagement.systemSettings.customMinUnits',
    titleFallback: 'Số credit tối thiểu khi mua lẻ',
    descKey: 'creditPackageManagement.systemSettings.customMinUnitsDesc',
    descFallback: 'User phải nhập tối thiểu số credit này khi mua theo số lượng tự nhập.',
  },
];

function formatNumber(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('vi-VN');
}

export default function CreditPurchaseSettingsPanel({
  isDarkMode,
  canWrite,
  settings,
  onSettingsUpdated,
}) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [editingKey, setEditingKey] = useState(null);
  const [draftValue, setDraftValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const dk = isDarkMode;

  const settingsByKey = (Array.isArray(settings) ? settings : []).reduce((acc, item) => {
    if (item?.key) acc[item.key] = item;
    return acc;
  }, {});

  const startEdit = (entry) => {
    const current = settingsByKey[entry.key];
    setEditingKey(entry.key);
    setDraftValue(String(current?.value ?? ''));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraftValue('');
  };

  const handleDraftChange = (event) => {
    const next = event.target.value;
    if (next === '' || /^\d+$/.test(next)) {
      setDraftValue(next);
    }
  };

  const handleSave = async (entry) => {
    const trimmed = draftValue.trim();
    if (!/^\d+$/.test(trimmed) || Number(trimmed) <= 0) {
      showError(t('creditPackageManagement.systemSettings.invalid', 'Giá trị phải là số nguyên dương.'));
      return;
    }
    setIsSaving(true);
    try {
      await updateSystemSetting(entry.key, { value: trimmed });
      showSuccess(t('creditPackageManagement.systemSettings.updateSuccess', 'Cập nhật cấu hình thành công.'));
      cancelEdit();
      onSettingsUpdated?.();
    } catch (err) {
      showError(buildAdminErrorPayload(t, err, 'Không cập nhật được cấu hình'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-5 ${
        dk ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/40">
          <Coins className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className={`text-lg font-bold ${dk ? 'text-white' : 'text-slate-800'}`}>
            {t('creditPackageManagement.systemSettings.title', 'Cấu hình mua credit')}
          </h2>
          <p className={`text-xs ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
            {t(
              'creditPackageManagement.systemSettings.subtitle',
              'Áp dụng cho cả gói credit có sẵn và mua lẻ theo số lượng tự nhập.',
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {SETTINGS.map((entry) => {
          const current = settingsByKey[entry.key];
          const isEditing = editingKey === entry.key;
          return (
            <div
              key={entry.key}
              className={`rounded-xl border p-4 ${
                dk ? 'border-white/[0.06] bg-white/[0.03]' : 'border-slate-100 bg-slate-50/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t(entry.titleKey, entry.titleFallback)}
                  </p>
                  <p className={`mt-1 text-xs ${dk ? 'text-slate-500' : 'text-slate-500'}`}>
                    {t(entry.descKey, entry.descFallback)}
                  </p>
                </div>
                {canWrite && !isEditing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(entry)}
                    className={dk ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    {t('common.edit', 'Sửa')}
                  </Button>
                ) : null}
              </div>

              {isEditing ? (
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={draftValue}
                    onChange={handleDraftChange}
                    disabled={isSaving}
                    className={`h-10 flex-1 rounded-lg ${
                      dk ? 'bg-white/5 border-white/10 text-white' : 'border-slate-200'
                    }`}
                  />
                  <Button
                    type="button"
                    onClick={() => handleSave(entry)}
                    disabled={isSaving}
                    className="h-10 bg-blue-600 px-3 text-white hover:bg-blue-700"
                  >
                    <Save className="mr-1 h-3.5 w-3.5" />
                    {t('common.save', 'Lưu')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={cancelEdit}
                    disabled={isSaving}
                    className={`h-10 px-2 ${dk ? 'text-slate-200 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <p className={`mt-3 text-2xl font-black tabular-nums ${dk ? 'text-white' : 'text-slate-900'}`}>
                  {formatNumber(current?.value)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
