import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/context/ToastContext';
import {
  getGroupRankingPointsConfig,
  updateGroupRankingPointsConfig,
} from '@/api/WorkspaceAPI';

const QUIZ_TYPES = ['regular', 'roadmap', 'mock'];
const FIELD_KEYS = ['Base', 'BonusPerfect', 'BonusHigh', 'BonusMid', 'BonusLow'];

const buildFieldName = (type, suffix) => `${type}${suffix}`;

const ALL_FIELDS = QUIZ_TYPES.flatMap((type) =>
  FIELD_KEYS.map((suffix) => buildFieldName(type, suffix)),
);

const emptyDraft = () =>
  ALL_FIELDS.reduce((acc, key) => {
    acc[key] = '';
    return acc;
  }, {});

const overridesToDraft = (overrides) =>
  ALL_FIELDS.reduce((acc, key) => {
    const value = overrides?.[key];
    acc[key] = value === null || value === undefined ? '' : String(value);
    return acc;
  }, {});

function GroupRankingPointsDialog({ open, onOpenChange, workspaceId, isLeader, isDarkMode }) {
  const { t, i18n } = useTranslation();
  const { showError, showSuccess } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [draft, setDraft] = useState(() => emptyDraft());
  const [errorMsg, setErrorMsg] = useState('');

  const loadConfig = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await getGroupRankingPointsConfig(workspaceId);
      const payload = res?.data?.data ?? res?.data;
      setConfig(payload);
      setDraft(overridesToDraft(payload?.overrides));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || t('groupManage.settings.rankingPoints.loadError');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, t]);

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open, loadConfig]);

  const defaults = config?.defaults;
  const effective = config?.effective;

  const handleChange = (key) => (event) => {
    const raw = event.target.value;
    if (raw === '') {
      setDraft((prev) => ({ ...prev, [key]: '' }));
      return;
    }
    if (!/^-?\d{0,3}$/.test(raw)) return;
    setDraft((prev) => ({ ...prev, [key]: raw }));
  };

  const handleResetAll = () => {
    setDraft(emptyDraft());
  };

  const handleResetField = (key) => {
    setDraft((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSave = async () => {
    if (!isLeader) return;
    const payload = ALL_FIELDS.reduce((acc, key) => {
      const raw = draft[key];
      acc[key] = raw === '' ? null : Number(raw);
      return acc;
    }, {});
    setSaving(true);
    try {
      const res = await updateGroupRankingPointsConfig(workspaceId, payload);
      const data = res?.data?.data ?? res?.data;
      setConfig(data);
      setDraft(overridesToDraft(data?.overrides));
      showSuccess(t('groupManage.settings.rankingPoints.saveSuccess'));
      onOpenChange?.(false);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || t('groupManage.settings.rankingPoints.saveError');
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const previewByType = useMemo(() => {
    if (!effective) return null;
    return QUIZ_TYPES.reduce((acc, type) => {
      const base = readEffective(draft, effective, type, 'Base');
      const bonus = readEffective(draft, effective, type, 'BonusPerfect');
      acc[type] = Math.max(0, base + bonus);
      return acc;
    }, {});
  }, [draft, effective]);

  const inputClass = `w-full rounded-lg border px-3 py-1.5 text-base text-center font-bold tabular-nums outline-none transition-all ${
    isDarkMode
      ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400 placeholder:text-slate-300 placeholder:font-bold'
      : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500 placeholder:text-slate-600 placeholder:font-bold'
  }`;
  const headerCellClass = `px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
    isDarkMode ? 'text-slate-400' : 'text-slate-500'
  }`;
  const rowLabelClass = `pr-2 py-1.5 text-sm font-medium ${
    isDarkMode ? 'text-slate-200' : 'text-slate-700'
  }`;
  const cardClass = `rounded-2xl border p-3 ${
    isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/60'
  }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[820px] max-h-[90vh] overflow-y-auto ${fontClass} ${
          isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-500" />
            {t('groupManage.settings.rankingPoints.title')}
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
            {t('groupManage.settings.rankingPoints.description')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
          </div>
        ) : (
          <>
            <div className={cardClass}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={`${headerCellClass} text-left`}>
                        {t('groupManage.settings.rankingPoints.tier')}
                      </th>
                      {QUIZ_TYPES.map((type) => (
                        <th key={type} className={`${headerCellClass} text-center`}>
                          {t(`groupManage.settings.rankingPoints.type.${type}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FIELD_KEYS.map((suffix) => (
                      <tr key={suffix} className={isDarkMode ? 'border-t border-white/5' : 'border-t border-slate-200'}>
                        <td className={rowLabelClass}>
                          {t(`groupManage.settings.rankingPoints.row.${suffix}`)}
                        </td>
                        {QUIZ_TYPES.map((type) => {
                          const key = buildFieldName(type, suffix);
                          const placeholder = defaults?.[key] != null ? String(defaults[key]) : '—';
                          return (
                            <td key={key} className="px-1.5 py-1 align-middle">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={draft[key]}
                                  onChange={handleChange(key)}
                                  placeholder={placeholder}
                                  disabled={!isLeader}
                                  className={inputClass}
                                />
                                {draft[key] !== '' && isLeader ? (
                                  <button
                                    type="button"
                                    onClick={() => handleResetField(key)}
                                    title={t('groupManage.settings.rankingPoints.useDefault')}
                                    className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
                                      isDarkMode
                                        ? 'text-slate-400 hover:text-white hover:bg-white/10'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                                    }`}
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </button>
                                ) : (
                                  <span className="w-6" aria-hidden="true" />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className={`mt-2 text-[11px] leading-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('groupManage.settings.rankingPoints.fallbackHint')}
              </p>
            </div>

            {previewByType ? (
              <div className={`mt-3 grid gap-2 sm:grid-cols-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {QUIZ_TYPES.map((type) => (
                  <div
                    key={type}
                    className={`rounded-xl border p-2.5 text-center ${
                      isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t(`groupManage.settings.rankingPoints.type.${type}`)}
                    </p>
                    <p className="mt-0.5 text-xl font-black tabular-nums">+{previewByType[type]}</p>
                    <p className={`text-[10px] leading-tight ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t('groupManage.settings.rankingPoints.previewHint')}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {!isLeader ? (
              <div
                className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  isDarkMode ? 'border-amber-400/20 bg-amber-400/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}
              >
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                {t('groupManage.settings.leaderOnly')}
              </div>
            ) : null}

            {errorMsg ? (
              <div
                className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
                  isDarkMode ? 'border-red-400/20 bg-red-400/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                {errorMsg}
              </div>
            ) : null}
          </>
        )}

        <DialogFooter className="mt-4 gap-2">
          {isLeader ? (
            <button
              type="button"
              onClick={handleResetAll}
              disabled={saving}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                isDarkMode
                  ? 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.10]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              {t('groupManage.settings.rankingPoints.resetAll')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            disabled={saving}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              isDarkMode
                ? 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.10]'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t('home.group.cancel')}
          </button>
          {isLeader ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('groupManage.settings.save')}
            </button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function readEffective(draft, effective, type, suffix) {
  const key = `${type}${suffix}`;
  const raw = draft[key];
  if (raw !== '' && raw !== undefined && raw !== null) {
    const num = Number(raw);
    if (Number.isFinite(num)) return num;
  }
  const fallback = effective?.[key];
  return Number.isFinite(fallback) ? fallback : 0;
}

export default GroupRankingPointsDialog;
