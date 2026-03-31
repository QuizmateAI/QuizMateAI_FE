import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw, Edit2, Settings2, Save, X, Info, RefreshCcw,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/Components/ui/dialog';
import { Label } from '@/Components/ui/label';
import ListSpinner from '@/Components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import {
  getAllSystemSettings,
  updateSystemSetting,
  resyncCreditPackagePrices,
} from '@/api/ManagementSystemAPI';

function SystemSettingManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { permissions, loading: permLoading } = useAdminPermissions();
  const { showSuccess, showError } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const dk = isDarkMode;

  const canWrite = !permLoading && permissions.has('system-settings:write');
  const canResync = !permLoading && permissions.has('credit-package:write');

  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editSetting, setEditSetting] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Resync dialog
  const [resyncOpen, setResyncOpen] = useState(false);
  const [resyncing, setResyncing] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllSystemSettings();
      setSettings(res?.data?.data ?? res?.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const openEdit = (setting) => {
    setEditSetting(setting);
    setEditValue(setting.value ?? '');
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editSetting) return;
    setSaving(true);
    try {
      await updateSystemSetting(editSetting.key, { value: editValue });
      showSuccess(t('systemSettings.updateSuccess'));
      setEditOpen(false);
      fetchSettings();
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleResync = async () => {
    setResyncing(true);
    try {
      await resyncCreditPackagePrices();
      showSuccess(t('systemSettings.resyncSuccess'));
      setResyncOpen(false);
    } catch (err) {
      showError(getErrorMessage(err));
    } finally {
      setResyncing(false);
    }
  };

  const getValueFormat = (key = '') => {
    if (key.endsWith('_percent') || key.includes('.percent')) return 'percent';
    if (key.endsWith('_vnd') || key.includes('.vnd')) return 'vnd';
    return 'number';
  };

  const formatValue = (key, value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    const fmt = getValueFormat(key);
    if (fmt === 'percent') return `${num.toLocaleString()}%`;
    if (fmt === 'vnd') return `${num.toLocaleString('vi-VN')} VND`;
    return num.toLocaleString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`min-h-screen p-6 ${fontClass} ${dk ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${dk ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
            <Settings2 className={`w-6 h-6 ${dk ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${dk ? 'text-white' : 'text-gray-900'}`}>
              {t('systemSettings.title')}
            </h1>
            <p className={`text-sm mt-0.5 ${dk ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('systemSettings.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canResync && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResyncOpen(true)}
              className={dk ? 'border-amber-700 text-amber-400 hover:bg-amber-500/10' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              {t('systemSettings.resyncPrices')}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSettings}
            disabled={loading}
            className={dk ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('systemSettings.refresh')}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${dk ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        {loading ? (
          <div className="flex justify-center py-16">
            <ListSpinner />
          </div>
        ) : settings.length === 0 ? (
          <div className={`text-center py-16 ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
            {t('systemSettings.empty')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className={dk ? 'border-slate-800 bg-slate-800/50' : 'bg-gray-50'}>
                <TableHead className={`font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'}`}>
                  {t('systemSettings.colKey')}
                </TableHead>
                <TableHead className={`font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'}`}>
                  {t('systemSettings.colDescription')}
                </TableHead>
                <TableHead className={`font-semibold text-right ${dk ? 'text-slate-300' : 'text-gray-700'}`}>
                  {t('systemSettings.colValue')}
                </TableHead>
                <TableHead className={`font-semibold ${dk ? 'text-slate-300' : 'text-gray-700'}`}>
                  {t('systemSettings.colUpdatedAt')}
                </TableHead>
                {canWrite && (
                  <TableHead className={`font-semibold text-center ${dk ? 'text-slate-300' : 'text-gray-700'}`}>
                    {t('systemSettings.colActions')}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((s) => (
                <TableRow
                  key={s.key}
                  className={`transition-colors ${dk ? 'border-slate-800 hover:bg-slate-800/40' : 'hover:bg-gray-50'}`}
                >
                  <TableCell>
                    <code className={`text-xs px-2 py-1 rounded ${dk ? 'bg-slate-800 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                      {s.key}
                    </code>
                  </TableCell>
                  <TableCell className={`text-sm max-w-xs ${dk ? 'text-slate-400' : 'text-gray-600'}`}>
                    {s.description || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-lg font-semibold tabular-nums ${dk ? 'text-white' : 'text-gray-900'}`}>
                      {formatValue(s.key, s.value)}
                    </span>
                  </TableCell>
                  <TableCell className={`text-sm ${dk ? 'text-slate-500' : 'text-gray-400'}`}>
                    {formatDate(s.updatedAt)}
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(s)}
                        className={dk ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-100'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Resync Prices Dialog */}
      <Dialog open={resyncOpen} onOpenChange={setResyncOpen}>
        <DialogContent className={dk ? 'bg-slate-900 border-slate-800 text-white' : ''}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 text-amber-500" />
              {t('systemSettings.resyncPrices')}
            </DialogTitle>
            <DialogDescription>
              {t('systemSettings.resyncDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setResyncOpen(false)}
              disabled={resyncing}
              className={dk ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
            >
              <X className="w-4 h-4 mr-1" />
              {t('systemSettings.cancel')}
            </Button>
            <Button
              onClick={handleResync}
              disabled={resyncing}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <RefreshCcw className={`w-4 h-4 mr-1 ${resyncing ? 'animate-spin' : ''}`} />
              {resyncing ? t('systemSettings.resyncing') : t('systemSettings.resyncConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={dk ? 'bg-slate-900 border-slate-800 text-white' : ''}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              {t('systemSettings.editTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('systemSettings.editDescription')}
            </DialogDescription>
          </DialogHeader>

          {editSetting && (
            <div className="space-y-4 py-2">
              {/* Key (read-only) */}
              <div className="space-y-1.5">
                <Label className={dk ? 'text-slate-300' : ''}>{t('systemSettings.colKey')}</Label>
                <code className={`block text-sm px-3 py-2 rounded-lg ${dk ? 'bg-slate-800 text-indigo-300' : 'bg-gray-100 text-indigo-700'}`}>
                  {editSetting.key}
                </code>
              </div>

              {/* Description (read-only) */}
              {editSetting.description && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${dk ? 'bg-slate-800/50 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{editSetting.description}</span>
                </div>
              )}

              {/* Value input */}
              <div className="space-y-1.5">
                <Label className={dk ? 'text-slate-300' : ''}>{t('systemSettings.colValue')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className={dk ? 'bg-slate-800 border-slate-700 text-white' : ''}
                    autoFocus
                  />
                  {getValueFormat(editSetting?.key) === 'percent' && (
                    <span className={`text-sm font-semibold px-2 py-1 rounded ${dk ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>%</span>
                  )}
                  {getValueFormat(editSetting?.key) === 'vnd' && (
                    <span className={`text-sm font-semibold px-2 py-1 rounded ${dk ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>VND</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
              className={dk ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
            >
              <X className="w-4 h-4 mr-1" />
              {t('systemSettings.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || editValue === ''}
            >
              <Save className="w-4 h-4 mr-1" />
              {saving ? t('systemSettings.saving') : t('systemSettings.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SystemSettingManagement;
