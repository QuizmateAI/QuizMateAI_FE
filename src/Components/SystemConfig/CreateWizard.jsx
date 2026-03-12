import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  CircleX,
  GraduationCap,
  Layers,
  BarChart3,
  Check,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import {
  createDomain,
  createKnowledge,
  createScheme,
  createLevel,
  deleteLevel,
  getAllDomains,
  getKnowledgeByDomainId,
  getSchemesByKnowledgeId,
  getLevelsByKnowledgeId,
  updateKnowledge,
  updateScheme,
} from '@/api/SystemConfigAPI';

const STEPS = [
  { key: 'domain', icon: BookOpenText },
  { key: 'knowledge', icon: GraduationCap },
  { key: 'scheme', icon: Layers },
  { key: 'level', icon: BarChart3 },
];

const LEVEL_SYSTEM_OPTIONS = ['SCORE_BASED', 'THREE_LEVEL'];
const DEFAULT_THREE_LEVELS = ['Sơ cấp', 'Trung cấp', 'Cao cấp'];

function CreateWizard({ open, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [domains, setDomains] = useState([]);
  const [knowledges, setKnowledges] = useState([]);
  const [schemes, setSchemes] = useState([]);

  const [domainTitle, setDomainTitle] = useState('');
  const [domainDescription, setDomainDescription] = useState('');
  const [createdDomainId, setCreatedDomainId] = useState(null);

  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [knowledgeMode, setKnowledgeMode] = useState('create');
  const [selectedKnowledgeIdForUpdate, setSelectedKnowledgeIdForUpdate] = useState('');
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [knowledgeDescription, setKnowledgeDescription] = useState('');
  const [levelSystemType, setLevelSystemType] = useState('SCORE_BASED');
  const [createdKnowledgeId, setCreatedKnowledgeId] = useState(null);

  const [schemeMode, setSchemeMode] = useState('create');
  const [selectedSchemeIdForUpdate, setSelectedSchemeIdForUpdate] = useState('');
  const [schemeTitle, setSchemeTitle] = useState('');
  const [schemeDescription, setSchemeDescription] = useState('');
  const [createdSchemeId, setCreatedSchemeId] = useState(null);
  const [skipScheme, setSkipScheme] = useState(false);

  const [levelValuesList, setLevelValuesList] = useState([]);
  const [levelValueInput, setLevelValueInput] = useState('');
  const [levelCustomMode, setLevelCustomMode] = useState('DEFAULT');
  const [customLevelCount, setCustomLevelCount] = useState(4);
  const [customLevelNames, setCustomLevelNames] = useState(['', '', '', '']);

  const selectedDomain = domains.find((d) => String(d.domainId) === String(selectedDomainId));
  const selectedKnowledge = knowledges.find((k) => String(k.knowledgeId) === String(createdKnowledgeId));

  const fetchDomains = async () => {
    try {
      const res = await getAllDomains();
      setDomains(res?.data?.content ?? []);
    } catch {
      setDomains([]);
    }
  };

  const fetchKnowledges = async (domainId) => {
    if (!domainId) {
      setKnowledges([]);
      return;
    }
    try {
      const res = await getKnowledgeByDomainId(domainId);
      setKnowledges(res?.data ?? []);
    } catch (_) {
      setKnowledges([]);
    }
  };

  const fetchSchemes = async (knowledgeId) => {
    if (!knowledgeId) {
      setSchemes([]);
      return;
    }
    try {
      const res = await getSchemesByKnowledgeId(knowledgeId);
      setSchemes(res?.data ?? []);
    } catch (_) {
      setSchemes([]);
    }
  };

  useEffect(() => {
    if (open) {
      fetchDomains();
    }
  }, [open]);

  useEffect(() => {
    if (open && selectedDomainId) {
      fetchKnowledges(selectedDomainId);
    }
  }, [open, selectedDomainId]);

  useEffect(() => {
    if (selectedKnowledgeIdForUpdate && knowledges.length > 0) {
      const k = knowledges.find((x) => String(x.knowledgeId) === String(selectedKnowledgeIdForUpdate));
      if (k) {
        setKnowledgeTitle(k.title || '');
        setKnowledgeDescription(k.description || '');
        setLevelSystemType(k.levelSystemType || 'SCORE_BASED');
      }
    }
  }, [selectedKnowledgeIdForUpdate, knowledges]);

  useEffect(() => {
    if (open && createdKnowledgeId) {
      fetchSchemes(createdKnowledgeId);
    }
  }, [open, createdKnowledgeId]);

  useEffect(() => {
    if (selectedSchemeIdForUpdate && schemes.length > 0) {
      const s = schemes.find((x) => String(x.schemeId) === String(selectedSchemeIdForUpdate));
      if (s) {
        setSchemeTitle(s.title || '');
        setSchemeDescription(s.description || '');
      }
    }
  }, [selectedSchemeIdForUpdate, schemes]);

  useEffect(() => {
    if (createdDomainId && !selectedDomainId) {
      setSelectedDomainId(String(createdDomainId));
    }
  }, [createdDomainId]);

  const resetWizard = () => {
    setStep(1);
    setErrors({});
    setDomainTitle('');
    setDomainDescription('');
    setCreatedDomainId(null);
    setSelectedDomainId('');
    setKnowledgeMode('create');
    setSelectedKnowledgeIdForUpdate('');
    setKnowledgeTitle('');
    setKnowledgeDescription('');
    setLevelSystemType('SCORE_BASED');
    setCreatedKnowledgeId(null);
    setSchemeMode('create');
    setSelectedSchemeIdForUpdate('');
    setSchemeTitle('');
    setSchemeDescription('');
    setCreatedSchemeId(null);
    setSkipScheme(false);
    setLevelValuesList([]);
    setLevelValueInput('');
    setLevelCustomMode('DEFAULT');
    setCustomLevelCount(4);
    setCustomLevelNames(['', '', '', '']);
  };

  const handleClose = () => {
    resetWizard();
    onClose?.();
  };

  const validateStep1 = () => {
    const next = {};
    if (!domainTitle.trim() && !selectedDomainId && domains.length > 0) {
      next.domain = t('systemConfig.wizard.step1CreateOrSelect');
    }
    if (domainTitle.trim() && !selectedDomainId && !createdDomainId) {
      return 'create_domain';
    }
    if (!selectedDomainId && domains.length === 0 && !domainTitle.trim()) {
      next.domain = t('systemConfig.validation.required');
    }
    if (domainTitle.trim() && domains.length === 0) {
      return 'create_domain';
    }
    if (selectedDomainId) return 'next';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return null;
    }
    return 'next';
  };

  const validateStep2 = () => {
    const next = {};
    if (!selectedDomainId) next.domainId = t('systemConfig.validation.required');
    if (knowledgeMode === 'update') {
      if (!selectedKnowledgeIdForUpdate) next.selectedKnowledge = t('systemConfig.validation.required');
      if (!knowledgeTitle.trim()) next.title = t('systemConfig.validation.required');
    } else {
      if (!knowledgeTitle.trim()) next.title = t('systemConfig.validation.required');
      if (!levelSystemType) next.levelSystemType = t('systemConfig.validation.required');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep3 = () => {
    if (skipScheme) return true;
    const next = {};
    if (schemeTitle.trim() && !createdSchemeId) return 'create_scheme';
    return true;
  };

  const validateStep4 = () => {
    const next = {};
    if (levelSystemType === 'SCORE_BASED') {
      if (levelValuesList.length === 0) next.levelValues = t('systemConfig.validation.required');
    } else {
      if (levelCustomMode === 'CUSTOM') {
        const names = levelCustomMode === 'CUSTOM' ? customLevelNames.slice(0, customLevelCount) : [];
        const empty = names.some((n) => !String(n).trim());
        if (empty) next.customLevels = t('systemConfig.wizard.customLevelNamesRequired');
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNext = async () => {
    setErrors({});

    if (step === 1) {
      const result = validateStep1();
      if (result === 'create_domain') {
        try {
          setIsSubmitting(true);
          const res = await createDomain({
            title: domainTitle.trim(),
            description: domainDescription.trim() || null,
          });
          const id = res?.data?.domainId;
          setCreatedDomainId(id);
          setSelectedDomainId(String(id));
          await fetchDomains();
          setDomainTitle('');
          setDomainDescription('');
          setStep(2);
        } catch (e) {
          setErrors({ domain: e?.message || t('systemConfig.messages.saveError', { entity: 'Domain' }) });
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
      if (result === 'next' || selectedDomainId) {
        setStep(2);
        return;
      }
      return;
    }

    if (step === 2) {
      if (!validateStep2()) return;
      try {
        setIsSubmitting(true);
        if (knowledgeMode === 'update') {
          await updateKnowledge(Number(selectedKnowledgeIdForUpdate), {
            domainId: Number(selectedDomainId),
            title: knowledgeTitle.trim(),
            levelSystemType,
            description: knowledgeDescription.trim() || null,
          });
          setCreatedKnowledgeId(Number(selectedKnowledgeIdForUpdate));
        } else {
          const res = await createKnowledge({
            domainId: Number(selectedDomainId),
            title: knowledgeTitle.trim(),
            levelSystemType,
            description: knowledgeDescription.trim() || null,
          });
          setCreatedKnowledgeId(res?.data?.knowledgeId);
        }
        setStep(3);
      } catch (e) {
        setErrors({ submit: e?.message || t('systemConfig.messages.saveError', { entity: 'Knowledge' }) });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (step === 3) {
      if (skipScheme) {
        setStep(4);
        return;
      }
      if (schemeMode === 'update') {
        const next = {};
        if (!selectedSchemeIdForUpdate) next.selectedScheme = t('systemConfig.validation.required');
        if (!schemeTitle.trim()) next.title = t('systemConfig.validation.required');
        if (Object.keys(next).length > 0) {
          setErrors(next);
          return;
        }
        try {
          setIsSubmitting(true);
          await updateScheme(Number(selectedSchemeIdForUpdate), {
            knowledgeId: createdKnowledgeId,
            title: schemeTitle.trim(),
            description: schemeDescription.trim() || null,
          });
          setCreatedSchemeId(Number(selectedSchemeIdForUpdate));
          setStep(4);
        } catch (e) {
          setErrors({ submit: e?.message || t('systemConfig.messages.saveError', { entity: 'Scheme' }) });
        } finally {
          setIsSubmitting(false);
        }
        return;
      }
      if (schemeTitle.trim()) {
        try {
          setIsSubmitting(true);
          const res = await createScheme({
            knowledgeId: createdKnowledgeId,
            title: schemeTitle.trim(),
            description: schemeDescription.trim() || null,
          });
          setCreatedSchemeId(res?.data?.schemeId);
          setStep(4);
        } catch (e) {
          setErrors({ submit: e?.message || t('systemConfig.messages.saveError', { entity: 'Scheme' }) });
        } finally {
          setIsSubmitting(false);
        }
      } else {
        setStep(4);
      }
      return;
    }

    if (step === 4) {
      if (!validateStep4()) return;
      try {
        setIsSubmitting(true);
        if (levelSystemType === 'SCORE_BASED') {
          // Tạo 1 Level riêng cho mỗi điểm số → mỗi option có levelId khác nhau → current/target có thể khác nhau
          for (const val of levelValuesList) {
            await createLevel({
              knowledgeId: createdKnowledgeId,
              schemeId: createdSchemeId || null,
              levelValues: val.trim(),
              levelGroup: null,
              description: null,
            });
          }
        } else {
          if (levelCustomMode === 'CUSTOM') {
            const existingRes = await getLevelsByKnowledgeId(createdKnowledgeId);
            const existing = existingRes?.data ?? [];
            for (const lev of existing) {
              await deleteLevel(lev.levelId);
            }
            const names = customLevelNames
              .slice(0, customLevelCount)
              .map((n) => n.trim())
              .filter(Boolean);
            for (const name of names) {
              await createLevel({
                knowledgeId: createdKnowledgeId,
                schemeId: createdSchemeId || null,
                levelValues: null,
                levelGroup: name,
                description: null,
              });
            }
          }
          // THREE_LEVEL DEFAULT: levels already created by KnowledgeService, nothing to do
        }
        onSuccess?.();
        handleClose();
      } catch (e) {
        setErrors({ submit: e?.message || t('systemConfig.messages.saveError', { entity: 'Level' }) });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const canGoNext = () => {
    if (step === 1) return domainTitle.trim() || selectedDomainId || domains.length === 0;
    if (step === 2) {
      if (!selectedDomainId) return false;
      if (knowledgeMode === 'update') return selectedKnowledgeIdForUpdate && knowledgeTitle.trim();
      return knowledgeTitle.trim();
    }
    if (step === 3) return true;
    if (step === 4) return levelSystemType === 'SCORE_BASED' ? levelValuesList.length > 0 : true;
    return false;
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 py-4">
      {STEPS.map((s, i) => {
        const num = i + 1;
        const active = step === num;
        const done = step > num;
        const Icon = s.icon;
        return (
          <React.Fragment key={s.key}>
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-300 ease-out ${
                active
                  ? 'bg-blue-500/20 ring-2 ring-blue-500/50 text-blue-600 dark:text-blue-400 scale-105'
                  : done
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                  active ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className="hidden text-sm font-semibold sm:inline">{t(`systemConfig.wizard.step${num}`)}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-6 rounded transition-all duration-500 ${
                  done ? 'bg-emerald-500/50' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-5 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
      <p className="text-sm text-slate-500 dark:text-slate-400">{t('systemConfig.wizard.step1Desc')}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>{t('systemConfig.wizard.createNewDomain')}</Label>
          <Input
            className="mt-1.5"
            placeholder={t('systemConfig.wizard.domainTitlePlaceholder')}
            value={domainTitle}
            onChange={(e) => setDomainTitle(e.target.value)}
          />
          {errors.domain && <p className="mt-1 text-xs text-red-500">{errors.domain}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label>{t('systemConfig.wizard.orSelectExisting')}</Label>
          <select
            className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedDomainId}
            onChange={(e) => {
              setSelectedDomainId(e.target.value);
              if (e.target.value) setDomainTitle('');
            }}
          >
            <option value="">{t('systemConfig.placeholders.selectDomain')}</option>
            {domains.map((d) => (
              <option key={d.domainId} value={d.domainId}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
      <div>
        <Label>{t('systemConfig.fields.domain')} *</Label>
        <select
          className={`mt-1.5 flex h-10 w-full rounded-md border bg-background px-3 text-sm ${
            errors.domainId ? 'border-red-500' : 'border-input'
          }`}
          value={selectedDomainId}
          onChange={(e) => {
            setSelectedDomainId(e.target.value);
            setSelectedKnowledgeIdForUpdate('');
          }}
        >
          <option value="">{t('systemConfig.placeholders.selectDomain')}</option>
          {domains.map((d) => (
            <option key={d.domainId} value={d.domainId}>
              {d.title}
            </option>
          ))}
        </select>
        {errors.domainId && <p className="mt-1 text-xs text-red-500">{errors.domainId}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setKnowledgeMode('create');
            setSelectedKnowledgeIdForUpdate('');
            setKnowledgeTitle('');
            setKnowledgeDescription('');
            setLevelSystemType('SCORE_BASED');
          }}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            knowledgeMode === 'create'
              ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
              : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
          }`}
        >
          <span className="block text-sm font-semibold">{t('systemConfig.wizard.knowledgeCreateNew')}</span>
        </button>
        <button
          type="button"
          onClick={() => setKnowledgeMode('update')}
          className={`rounded-xl border-2 p-4 text-left transition-all ${
            knowledgeMode === 'update'
              ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
              : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
          }`}
        >
          <span className="block text-sm font-semibold">{t('systemConfig.wizard.knowledgeUpdateExisting')}</span>
        </button>
      </div>

      {knowledgeMode === 'create' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col">
            <Label>{t('systemConfig.fields.title')} *</Label>
            <Input
              className={`mt-1.5 h-10 ${errors.title ? 'border-red-500' : ''}`}
              placeholder="English, Toán học..."
              value={knowledgeTitle}
              onChange={(e) => setKnowledgeTitle(e.target.value)}
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
          </div>
          <div className="flex flex-col">
            <Label>{t('systemConfig.fields.levelSystemType')} *</Label>
            <select
              className={`mt-1.5 flex h-10 w-full rounded-md border bg-background px-3 text-sm ${
                errors.levelSystemType ? 'border-red-500' : 'border-input'
              }`}
              value={levelSystemType}
              onChange={(e) => setLevelSystemType(e.target.value)}
            >
              {LEVEL_SYSTEM_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`systemConfig.levelSystems.${opt}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>{t('systemConfig.fields.description')}</Label>
            <textarea
              className="mt-1.5 min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={t('systemConfig.placeholders.description')}
              value={knowledgeDescription}
              onChange={(e) => setKnowledgeDescription(e.target.value)}
            />
          </div>
        </div>
      )}

      {knowledgeMode === 'update' && selectedDomainId && (
        <div className="space-y-3">
          <div>
            <Label>{t('systemConfig.wizard.selectKnowledgeToUpdate')} *</Label>
            <select
              className={`mt-1.5 flex h-10 w-full rounded-md border bg-background px-3 text-sm ${
                errors.selectedKnowledge ? 'border-red-500' : 'border-input'
              }`}
              value={selectedKnowledgeIdForUpdate}
              onChange={(e) => setSelectedKnowledgeIdForUpdate(e.target.value)}
            >
              <option value="">{t('systemConfig.placeholders.selectKnowledge')}</option>
              {knowledges.map((k) => (
                <option key={k.knowledgeId} value={k.knowledgeId}>
                  {k.title} ({t(`systemConfig.levelSystems.${k.levelSystemType || 'SCORE_BASED'}`)})
                </option>
              ))}
            </select>
            {errors.selectedKnowledge && <p className="mt-1 text-xs text-red-500">{errors.selectedKnowledge}</p>}
          </div>
          {selectedKnowledgeIdForUpdate && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col">
                <Label>{t('systemConfig.fields.title')} *</Label>
                <Input
                  className={`mt-1.5 h-10 ${errors.title ? 'border-red-500' : ''}`}
                  value={knowledgeTitle}
                  onChange={(e) => setKnowledgeTitle(e.target.value)}
                />
                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
              </div>
              <div className="flex flex-col">
                <Label>{t('systemConfig.fields.levelSystemType')}</Label>
                <select
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={levelSystemType}
                  onChange={(e) => setLevelSystemType(e.target.value)}
                >
                  {LEVEL_SYSTEM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {t(`systemConfig.levelSystems.${opt}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>{t('systemConfig.fields.description')}</Label>
                <textarea
                  className="mt-1.5 min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={t('systemConfig.placeholders.description')}
                  value={knowledgeDescription}
                  onChange={(e) => setKnowledgeDescription(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">
        {t('systemConfig.wizard.schemeLevelTypeInherited')}:{' '}
        <strong>{t(`systemConfig.levelSystems.${levelSystemType}`)}</strong>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="skipScheme"
          checked={skipScheme}
          onChange={(e) => {
            setSkipScheme(e.target.checked);
            if (e.target.checked) {
              setSchemeMode('create');
              setSelectedSchemeIdForUpdate('');
            }
          }}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="skipScheme" className="cursor-pointer">
          {t('systemConfig.wizard.skipScheme')}
        </Label>
      </div>
      {!skipScheme && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSchemeMode('create');
                setSelectedSchemeIdForUpdate('');
                setSchemeTitle('');
                setSchemeDescription('');
              }}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                schemeMode === 'create'
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                  : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <span className="block text-sm font-semibold">{t('systemConfig.wizard.schemeCreateNew')}</span>
            </button>
            <button
              type="button"
              onClick={() => setSchemeMode('update')}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                schemeMode === 'update'
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                  : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <span className="block text-sm font-semibold">{t('systemConfig.wizard.schemeUpdateExisting')}</span>
            </button>
          </div>

          {schemeMode === 'create' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col">
                <Label>{t('systemConfig.fields.title')} *</Label>
                <Input
                  className="mt-1.5 h-10"
                  placeholder="IELTS, TOEIC..."
                  value={schemeTitle}
                  onChange={(e) => setSchemeTitle(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>{t('systemConfig.fields.description')}</Label>
                <textarea
                  className="mt-1.5 min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={t('systemConfig.placeholders.description')}
                  value={schemeDescription}
                  onChange={(e) => setSchemeDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {schemeMode === 'update' && createdKnowledgeId && (
            <div className="space-y-3">
              <div>
                <Label>{t('systemConfig.wizard.selectSchemeToUpdate')} *</Label>
                <select
                  className={`mt-1.5 flex h-10 w-full rounded-md border bg-background px-3 text-sm ${
                    errors.selectedScheme ? 'border-red-500' : 'border-input'
                  }`}
                  value={selectedSchemeIdForUpdate}
                  onChange={(e) => setSelectedSchemeIdForUpdate(e.target.value)}
                >
                  <option value="">{t('systemConfig.placeholders.selectScheme')}</option>
                  {schemes.map((s) => (
                    <option key={s.schemeId} value={s.schemeId}>
                      {s.title}
                    </option>
                  ))}
                </select>
                {errors.selectedScheme && <p className="mt-1 text-xs text-red-500">{errors.selectedScheme}</p>}
              </div>
              {selectedSchemeIdForUpdate && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col">
                    <Label>{t('systemConfig.fields.title')} *</Label>
                    <Input
                      className="mt-1.5 h-10"
                      value={schemeTitle}
                      onChange={(e) => setSchemeTitle(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>{t('systemConfig.fields.description')}</Label>
                    <textarea
                      className="mt-1.5 min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder={t('systemConfig.placeholders.description')}
                      value={schemeDescription}
                      onChange={(e) => setSchemeDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-5 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
      <p className="text-sm text-slate-500 dark:text-slate-400">{t('systemConfig.wizard.step4Desc')}</p>
      {levelSystemType === 'SCORE_BASED' ? (
        <div className="space-y-3">
          <Label>{t('systemConfig.fields.levelValues')} *</Label>
          <Input
            className={errors.levelValues ? 'border-red-500' : ''}
            placeholder={t('systemConfig.wizard.scoreInputPlaceholder')}
            value={levelValueInput}
            onChange={(e) => setLevelValueInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const val = levelValueInput.trim();
                if (val && !levelValuesList.includes(val)) {
                  setLevelValuesList((prev) => [...prev, val]);
                  setLevelValueInput('');
                  setErrors((err) => ({ ...err, levelValues: null }));
                }
              }
            }}
          />
          <p className="text-xs text-slate-500">{t('systemConfig.wizard.scoreListHint')}</p>
          {levelValuesList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {levelValuesList.map((val, i) => (
                <span
                  key={`${val}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300"
                >
                  {val}
                  <button
                    type="button"
                    onClick={() => setLevelValuesList((prev) => prev.filter((_, j) => j !== i))}
                    className="rounded-full p-0.5 hover:bg-emerald-500/30"
                    aria-label="Remove"
                  >
                    <CircleX className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.levelValues && <p className="text-xs text-red-500">{errors.levelValues}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="radio"
              id="levelDefault"
              name="levelMode"
              checked={levelCustomMode === 'DEFAULT'}
              onChange={() => setLevelCustomMode('DEFAULT')}
              className="h-4 w-4"
            />
            <Label htmlFor="levelDefault" className="cursor-pointer">
              {t('systemConfig.wizard.threeLevelDefault')}
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="radio"
              id="levelCustom"
              name="levelMode"
              checked={levelCustomMode === 'CUSTOM'}
              onChange={() => setLevelCustomMode('CUSTOM')}
              className="h-4 w-4"
            />
            <Label htmlFor="levelCustom" className="cursor-pointer">
              {t('systemConfig.wizard.threeLevelCustom')}
            </Label>
          </div>
          {levelCustomMode === 'CUSTOM' && (
            <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-200 space-y-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30 p-4">
              <div className="flex items-center gap-2">
                <Label>{t('systemConfig.wizard.customLevelCount')}</Label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={customLevelCount}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setCustomLevelCount(n);
                    setCustomLevelNames((prev) => {
                      const next = [...prev];
                      while (next.length < n) next.push('');
                      return next.slice(0, n);
                    });
                  }}
                >
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: customLevelCount }).map((_, i) => (
                  <div key={i}>
                    <Label className="text-xs">Level {i + 1}</Label>
                    <Input
                      placeholder={DEFAULT_THREE_LEVELS[i] || `Level ${i + 1}`}
                      value={customLevelNames[i] ?? ''}
                      onChange={(e) => {
                        const next = [...customLevelNames];
                        next[i] = e.target.value;
                        setCustomLevelNames(next);
                      }}
                    />
                  </div>
                ))}
              </div>
              {errors.customLevels && (
                <p className="text-xs text-red-500">{errors.customLevels}</p>
              )}
            </div>
          )}
          {levelCustomMode === 'DEFAULT' && (
            <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30 p-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {t('systemConfig.wizard.defaultLevelsPreview')}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {DEFAULT_THREE_LEVELS.map((name, i) => (
                  <li
                    key={i}
                    className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  const isLastStep = step === 4;
  const nextLabel = isLastStep ? t('systemConfig.wizard.finish') : t('common.next');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('systemConfig.wizard.title')}</DialogTitle>
          <DialogDescription>{t('systemConfig.wizard.description')}</DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="min-h-[280px] py-4">{renderStepContent()}</div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={handleBack} disabled={step === 1 || isSubmitting}>
            <ChevronLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={
              isSubmitting ||
              (step === 1 && !domainTitle.trim() && !selectedDomainId) ||
              (step === 2 && (!selectedDomainId || !knowledgeTitle.trim())) ||
              (step === 4 && levelSystemType === 'SCORE_BASED' && levelValuesList.length === 0)
            }
          >
            {isSubmitting ? (
              t('systemConfig.dialogs.saving')
            ) : (
              <>
                {nextLabel}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateWizard;
