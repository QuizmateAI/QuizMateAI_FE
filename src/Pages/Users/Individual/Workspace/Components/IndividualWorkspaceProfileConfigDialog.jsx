import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Loader2, ChevronDown, Sparkles } from 'lucide-react';
import {
  getActiveDomains,
  getKnowledgeByDomainId,
  getSchemesByKnowledgeId,
  getLevelsBySchemeId,
} from '@/api/SystemConfigAPI';

function IndividualWorkspaceProfileConfigDialog({ open, onOpenChange, onSave, isDarkMode, initialData, isReadOnly }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [domains, setDomains] = useState([]);
  const [knowledges, setKnowledges] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [levels, setLevels] = useState([]);

  // Form states
  const [schemeMode, setSchemeMode] = useState('system'); // 'system' or 'custom'
  const [domainId, setDomainId] = useState('');
  const [knowledgeId, setKnowledgeId] = useState('');
  const [schemeId, setSchemeId] = useState('');
  const [customSchemeName, setCustomSchemeName] = useState('');
  const [customSchemeDescription, setCustomSchemeDescription] = useState('');
  const [customCurrentLevel, setCustomCurrentLevel] = useState('');
  const [customTargetLevel, setCustomTargetLevel] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('vi');
  const [strongAreas, setStrongAreas] = useState('');
  const [weakAreas, setWeakAreas] = useState('');
  const [requireAiAssessment, setRequireAiAssessment] = useState(false);
  const [currentLevelId, setCurrentLevelId] = useState('');
  const [targetLevelId, setTargetLevelId] = useState('');
  const [targetExamDate, setTargetExamDate] = useState('');

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      loadDomains();
      resetForm();
    } else {
      resetForm();
    }
  }, [open, initialData]);

  useEffect(() => {
    if (domainId) loadKnowledges(domainId);
    else setKnowledges([]);
  }, [domainId]);

  useEffect(() => {
    if (knowledgeId) loadSchemes(knowledgeId);
    else setSchemes([]);
  }, [knowledgeId]);

  useEffect(() => {
    if (schemeId) loadLevels(schemeId);
    else setLevels([]);
  }, [schemeId]);

  // Sync currentLevelId/targetLevelId when levels load with legacy numeric ids (convert to composite for multi-value)
  useEffect(() => {
    if (!levels.length) return;
    const opts = levels.flatMap((l) => {
      const list = l.levelValuesList?.length ? l.levelValuesList : (l.levelValues ? l.levelValues.split(',').map((v) => v.trim()).filter(Boolean) : []);
      if (list.length > 1) return list.map((val) => ({ levelId: l.levelId, label: val, value: `${l.levelId}::${val}` }));
      return [{ levelId: l.levelId, label: l.levelGroup || l.levelValues || (list[0] || '-'), value: l.levelId }];
    });
    const syncCurrent = (val, setter) => {
      if (!val) return;
      const str = String(val);
      if (str.includes('::')) return;
      const match = opts.find((o) => String(o.levelId) === str);
      if (match && match.value !== val) setter(match.value);
    };
    const syncTarget = (val, setter) => {
      if (!val) return;
      const str = String(val);
      if (str.includes('::')) return;
      const match = opts.find((o) => String(o.levelId) === str);
      if (!match || match.value === val) return;
      const targetOpts = opts.filter((o) => {
        const curOpt = opts.find((x) => (String(currentLevelId).includes('::') ? x.value : String(x.levelId)) === currentLevelId) || opts.find((x) => String(x.levelId) === String(currentLevelId));
        if (!curOpt) return true;
        const curNum = parseFloat(curOpt.label);
        const isNum = !Number.isNaN(curNum);
        return isNum ? parseFloat(o.label) > curNum : opts.indexOf(o) > opts.indexOf(curOpt);
      });
      const validMatch = targetOpts.find((o) => String(o.levelId) === str);
      if (validMatch) setter(validMatch.value);
      else setter(match.value);
    };
    syncCurrent(currentLevelId, setCurrentLevelId);
    syncTarget(targetLevelId, setTargetLevelId);
  }, [levels, currentLevelId, targetLevelId]);

  // Reset target when it's no longer valid (e.g. current changed to higher value)
  // Chỉ chạy khi đã load levels để tránh xóa targetLevelId khi đang load
  useEffect(() => {
    if (!targetLevelId || allOpts.length === 0) return;
    const valid = getTargetLevelOptions().some((o) => optValue(o) === targetLevelId)
      || allOpts.some((o) => String(o.levelId) === String(targetLevelId));
    if (!valid) {
      setTargetLevelId('');
      setErrors((prev) => ({ ...prev, targetLevelId: null }));
    }
  }, [currentLevelId]);

  const resetForm = () => {
    if (initialData) {
      setSchemeMode(initialData.domainId || initialData.knowledgeId || initialData.schemeId ? 'system' : 'custom');
      setDomainId(initialData.domainId ? String(initialData.domainId) : '');
      setKnowledgeId(initialData.knowledgeId ? String(initialData.knowledgeId) : '');
      setSchemeId(initialData.schemeId ? String(initialData.schemeId) : '');
      setCustomSchemeName(initialData.customSchemeName || '');
      setCustomSchemeDescription(initialData.customSchemeDescription || '');
      setCustomCurrentLevel(initialData.customCurrentLevel || '');
      setCustomTargetLevel(initialData.customTargetLevel || '');
      setLearningGoal(initialData.learningGoal || '');
      setPreferredLanguage(initialData.preferredLanguage || 'vi');
      setStrongAreas(initialData.strongAreas || '');
      setWeakAreas(initialData.weakAreas || '');
      setRequireAiAssessment(false); // don't re-trigger on view
      setCurrentLevelId(initialData.currentLevelId ? String(initialData.currentLevelId) : '');
      setTargetLevelId(initialData.targetLevelId ? String(initialData.targetLevelId) : '');
      setTargetExamDate(initialData.targetExamDate?.substring(0, 10) || '');
    } else {
      setSchemeMode('system');
      setDomainId('');
      setKnowledgeId('');
      setSchemeId('');
      setCustomSchemeName('');
      setCustomSchemeDescription('');
      setCustomCurrentLevel('');
      setCustomTargetLevel('');
      setLearningGoal('');
      setPreferredLanguage('vi');
      setStrongAreas('');
      setWeakAreas('');
      setRequireAiAssessment(false);
      setCurrentLevelId('');
      setTargetLevelId('');
      setTargetExamDate('');
    }
    setErrors({});
  };

  const loadDomains = async () => {
    try {
      setLoadingConfig(true);
      const res = await getActiveDomains();
      setDomains(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadKnowledges = async (dId) => {
    try {
      const res = await getKnowledgeByDomainId(dId);
      setKnowledges(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSchemes = async (kId) => {
    try {
      const res = await getSchemesByKnowledgeId(kId);
      setSchemes(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadLevels = async (sId) => {
    try {
      const res = await getLevelsBySchemeId(sId);
      setLevels(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Flatten levels into dropdown options: SCORE_BASED with multiple values → one option per value (vertical list)
  const getLevelOptions = () => {
    const opts = [];
    let idx = 0;
    levels.forEach((l) => {
      const list = l.levelValuesList?.length ? l.levelValuesList : (l.levelValues ? l.levelValues.split(',').map((v) => v.trim()).filter(Boolean) : []);
      if (list.length > 1) {
        list.forEach((val) => opts.push({ levelId: l.levelId, label: val, index: idx++ }));
      } else {
        opts.push({ levelId: l.levelId, label: l.levelGroup || l.levelValues || (list[0] || '-'), index: idx++ });
      }
    });
    return opts;
  };

  const parseLevelId = (val) => (val && String(val).includes('::') ? Number(String(val).split('::')[0]) : val ? Number(val) : null);
  const allOpts = getLevelOptions();
  const optValue = (opt) => (opt.label && allOpts.filter((o) => o.levelId === opt.levelId).length > 1 ? `${opt.levelId}::${opt.label}` : opt.levelId);

  // Target level: only options higher than current (numeric compare or index for THREE_LEVEL)
  const getTargetLevelOptions = (currentVal = currentLevelId) => {
    if (!currentVal) return allOpts;
    const currentOpt = allOpts.find((o) => optValue(o) === currentVal) || allOpts.find((o) => String(o.levelId) === String(currentVal));
    if (!currentOpt) return allOpts;
    const currentNum = parseFloat(currentOpt.label);
    const isNumeric = !Number.isNaN(currentNum);
    return allOpts.filter((o) => {
      if (isNumeric) return parseFloat(o.label) > currentNum;
      return o.index > currentOpt.index;
    });
  };

  const validate = () => {
    const newErrors = {};
    if (schemeMode === 'system') {
      if (!domainId) newErrors.domainId = t('workspace.profileConfig.errDomain');
      if (!knowledgeId) newErrors.knowledgeId = t('workspace.profileConfig.errKnowledge');
      if (!schemeId) newErrors.schemeId = t('workspace.profileConfig.errScheme');
      if (!requireAiAssessment && !currentLevelId) newErrors.currentLevelId = t('workspace.profileConfig.errCurrentLevel');
      if (targetLevelId) {
        const targetOpts = getTargetLevelOptions();
        const valid = targetOpts.some((o) => optValue(o) === targetLevelId);
        if (!valid) newErrors.targetLevelId = t('workspace.profileConfig.errTargetLevelHigher');
      }
    } else {
      if (!customSchemeName.trim()) newErrors.customSchemeName = t('workspace.profileConfig.errCustomSchemeName');
      if (!customSchemeDescription.trim()) newErrors.customSchemeDescription = t('workspace.profileConfig.errCustomSchemeDesc');
      if (!requireAiAssessment && !customCurrentLevel.trim()) newErrors.customCurrentLevel = t('workspace.profileConfig.errCustomCurrentLevel');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        domainId: schemeMode === 'system' && domainId ? Number(domainId) : null,
        knowledgeId: schemeMode === 'system' && knowledgeId ? Number(knowledgeId) : null,
        schemeId: schemeMode === 'system' && schemeId ? Number(schemeId) : null,
        customSchemeName: schemeMode === 'custom' ? customSchemeName.trim() : null,
        customSchemeDescription: schemeMode === 'custom' ? customSchemeDescription.trim() : null,
        learningGoal: learningGoal.trim() || null,
        strongAreas: strongAreas.trim() || null,
        weakAreas: weakAreas.trim() || null,
        preferredLanguage: preferredLanguage,
        currentLevelId: schemeMode === 'system' && currentLevelId ? parseLevelId(currentLevelId) : null,
        targetLevelId: schemeMode === 'system' && targetLevelId ? (parseLevelId(targetLevelId) ?? null) : null,
        customCurrentLevel: schemeMode === 'custom' ? customCurrentLevel.trim() : null,
        customTargetLevel: schemeMode === 'custom' ? customTargetLevel.trim() : null,
        targetExamDate: targetExamDate || null,
        requireAiAssessment: requireAiAssessment
      };
      await onSave(payload);
    } catch {
      // Bỏ qua lỗi, parent handle
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiAssessClick = () => {
    console.info(t('workspace.profileConfig.aiUpgradeInfo'));
  };

  const inputBase = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-300 shadow-sm focus:ring-2 focus:ring-blue-500/20 ${
    isDarkMode
      ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500'
      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400'
  }`;

  const selectBase = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all duration-300 shadow-sm appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 ${
    isDarkMode
      ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 hover:border-slate-600'
      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 hover:border-gray-400'
  }`;

  const labelBase = `block text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[1000px] overflow-hidden ${fontClass} ${
          isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500`} />
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className={`flex items-center gap-2 text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('workspace.profileConfig.title')}
            {isReadOnly && <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{t('workspace.profileConfig.updated')}</span>}
          </DialogTitle>
          <DialogDescription className={`text-[15px] pt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {isReadOnly 
              ? t('workspace.profileConfig.readOnlyDesc')
              : t('workspace.profileConfig.editDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 flex flex-col h-auto max-h-[85vh]">
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-2">
            {loadingConfig && (
              <div className="flex items-center gap-2 text-sm text-blue-500 font-medium bg-blue-500/10 p-3 rounded-lg mb-4">
                <Loader2 className="w-4 h-4 animate-spin" /> {t('workspace.profileConfig.loadingConfig')}
              </div>
            )}
            
            <fieldset disabled={isReadOnly} className={`border-0 p-0 m-0 w-full ${isReadOnly ? "opacity-90 grayscale-[10%]" : ""}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* CỘT TRÁI: THÔNG TIN LỘ TRÌNH VÀ TRÌNH ĐỘ */}
              <div className="space-y-5">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-2">
                  <button
                    type="button"
                    onClick={() => setSchemeMode('system')}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                      schemeMode === 'system'
                        ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {t('workspace.profileConfig.modeSystem')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchemeMode('custom')}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                      schemeMode === 'custom'
                        ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {t('workspace.profileConfig.modeCustom')}
                  </button>
                </div>

                {schemeMode === 'system' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Domain */}
                      <div>
                        <label className={labelBase}>
                          {t('workspace.profileConfig.domainLabel')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={domainId}
                            onChange={(e) => {
                          setDomainId(e.target.value);
                          setKnowledgeId('');
                          setSchemeId('');
                          setCurrentLevelId('');
                          setTargetLevelId('');
                        }}
                            className={`${selectBase} ${errors.domainId ? 'border-red-500 focus:ring-red-500/20' : ''}`}
                          >
                            <option value="">{t('workspace.profileConfig.domainPlaceholder')}</option>
                            {domains.map((d) => (
                              <option key={d.domainId} value={d.domainId}>{d.title || d.name}</option>
                            ))}
                          </select>
                          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                        </div>
                        {errors.domainId && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.domainId}</p>}
                      </div>

                      {/* Knowledge */}
                      <div>
                        <label className={labelBase}>
                          {t('workspace.profileConfig.knowledgeLabel')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={knowledgeId}
                            onChange={(e) => {
                          setKnowledgeId(e.target.value);
                          setSchemeId('');
                          setCurrentLevelId('');
                          setTargetLevelId('');
                        }}
                            className={`${selectBase} ${errors.knowledgeId ? 'border-red-500' : ''} ${!domainId ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                            disabled={!domainId}
                          >
                            <option value="">{t('workspace.profileConfig.knowledgePlaceholder')}</option>
                            {knowledges.map((k) => (
                              <option key={k.knowledgeId} value={k.knowledgeId}>{k.title || k.name}</option>
                            ))}
                          </select>
                          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                        </div>
                        {errors.knowledgeId && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.knowledgeId}</p>}
                      </div>
                    </div>

                    {/* Scheme */}
                    <div>
                      <label className={labelBase}>
                        {t('workspace.profileConfig.schemeLabel')} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={schemeId}
                          onChange={(e) => {
                          setSchemeId(e.target.value);
                          setCurrentLevelId('');
                          setTargetLevelId('');
                        }}
                          className={`${selectBase} ${errors.schemeId ? 'border-red-500' : ''} ${!knowledgeId ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                          disabled={!knowledgeId}
                        >
                          <option value="">{t('workspace.profileConfig.schemePlaceholder')}</option>
                          {schemes.map((s) => (
                            <option key={s.schemeId} value={s.schemeId}>{s.title || s.name}</option>
                          ))}
                        </select>
                        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                      </div>
                      {errors.schemeId && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.schemeId}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className={labelBase}>
                        {t('workspace.profileConfig.customSchemeNameLabel')}<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customSchemeName}
                        onChange={(e) => setCustomSchemeName(e.target.value)}
                        placeholder={t('workspace.profileConfig.customSchemeNamePlaceholder')}
                        className={`${inputBase} ${errors.customSchemeName ? 'border-red-500 focus:ring-red-500/20' : ''}`}
                      />
                      {errors.customSchemeName && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.customSchemeName}</p>}
                    </div>
                    <div>
                      <label className={labelBase}>
                        {t('workspace.profileConfig.customSchemeDescLabel')} <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={customSchemeDescription}
                        onChange={(e) => setCustomSchemeDescription(e.target.value)}
                        placeholder={t('workspace.profileConfig.customSchemeDescPlaceholder')}
                        rows={2}
                        className={`${inputBase} resize-none ${errors.customSchemeDescription ? 'border-red-500 focus:ring-red-500/20' : ''}`}
                      />
                      {errors.customSchemeDescription && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.customSchemeDescription}</p>}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {/* Current Level */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block">
                        {t('workspace.profileConfig.currentLevelLabel')} <span className="text-red-500">*</span>
                      </label>
                    </div>
                    
                    {schemeMode === 'system' ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <select
                            value={currentLevelId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentLevelId(val);
                              const targetOpts = getTargetLevelOptions(val);
                              if (targetLevelId && !targetOpts.some((o) => optValue(o) === targetLevelId)) {
                                setTargetLevelId('');
                                setErrors((prev) => ({ ...prev, targetLevelId: null }));
                              }
                            }}
                            className={`${selectBase} ${errors.currentLevelId ? 'border-red-500' : ''} ${(!schemeId || requireAiAssessment) ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                            disabled={!schemeId || requireAiAssessment}
                          >
                            <option value="">{t('workspace.profileConfig.currentLevelPlaceholder')}</option>
                            {allOpts.map((opt, idx) => (
                              <option key={`${opt.levelId}-${opt.label}-${idx}`} value={optValue(opt)}>{opt.label}</option>
                            ))}
                          </select>
                          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                        </div>
                        {errors.currentLevelId && !requireAiAssessment && <p className="text-red-500 text-xs font-medium">{errors.currentLevelId}</p>}
                        
                        <label className="flex items-start gap-2 mt-2 cursor-pointer w-fit">
                          <input
                            type="checkbox"
                            checked={requireAiAssessment}
                            onChange={(e) => {
                              setRequireAiAssessment(e.target.checked);
                              if (e.target.checked) {
                                setCurrentLevelId('');
                                setErrors(prev => ({...prev, currentLevelId: null}));
                              }
                            }}
                            className="w-4 h-4 mt-0.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <div className="flex flex-col gap-0.5 text-slate-700 dark:text-slate-300 text-[13px] font-medium transition-all">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>{t('workspace.profileConfig.aiAssessCheckbox')}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-normal">{t('workspace.profileConfig.aiAssessCheckboxDesc')}</span>
                          </div>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={customCurrentLevel}
                          onChange={(e) => setCustomCurrentLevel(e.target.value)}
                          placeholder={t('workspace.profileConfig.customCurrentLevelPlaceholder')}
                          className={`${inputBase} ${errors.customCurrentLevel ? 'border-red-500' : ''}`}
                          disabled={requireAiAssessment}
                        />
                        {errors.customCurrentLevel && !requireAiAssessment && <p className="text-red-500 text-xs font-medium">{errors.customCurrentLevel}</p>}
                        
                        <label className="flex items-start gap-2 mt-2 cursor-pointer w-fit">
                          <input
                            type="checkbox"
                            checked={requireAiAssessment}
                            onChange={(e) => {
                              setRequireAiAssessment(e.target.checked);
                              if (e.target.checked) {
                                setCustomCurrentLevel('');
                                setErrors(prev => ({...prev, customCurrentLevel: null}));
                              }
                            }}
                            className="w-4 h-4 mt-0.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <div className="flex flex-col gap-0.5 text-slate-700 dark:text-slate-300 text-[13px] font-medium transition-all">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>{t('workspace.profileConfig.aiAssessCheckbox')}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-normal">{t('workspace.profileConfig.aiAssessCheckboxDesc')}</span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Target Level */}
                  <div>
                    <label className={labelBase}>
                      {t('workspace.profileConfig.targetLevelLabel')} <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">{t('workspace.profileConfig.optional')}</span>
                    </label>
                    {schemeMode === 'system' ? (
                      <div className="relative">
                        <select
                          value={(() => {
                            const targetOpts = getTargetLevelOptions();
                            if (targetOpts.some((o) => optValue(o) === targetLevelId)) return targetLevelId;
                            if (targetLevelId && targetOpts.some((o) => String(o.levelId) === String(targetLevelId)))
                              return optValue(targetOpts.find((o) => String(o.levelId) === String(targetLevelId)));
                            return '';
                          })()}
                          onChange={(e) => {
                            setTargetLevelId(e.target.value);
                            setErrors((prev) => ({ ...prev, targetLevelId: null }));
                          }}
                          className={`${selectBase} ${errors.targetLevelId ? 'border-red-500' : ''} ${!schemeId ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                          disabled={!schemeId}
                        >
                          <option value="">{t('workspace.profileConfig.targetLevelPlaceholder')}</option>
                          {getTargetLevelOptions().map((opt, idx) => (
                            <option key={`${opt.levelId}-${opt.label}-${idx}`} value={optValue(opt)}>{opt.label}</option>
                          ))}
                        </select>
                        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                        {errors.targetLevelId && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.targetLevelId}</p>}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={customTargetLevel}
                        onChange={(e) => setCustomTargetLevel(e.target.value)}
                        placeholder={t('workspace.profileConfig.customTargetLevelPlaceholder')}
                        className={inputBase}
                      />
                    )}
                  </div>

                </div>
              </div>

              {/* CỘT PHẢI: ĐIỂM MẠNH YẾU VÀ MỤC TIÊU */}
              <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelBase}>
                      {t('workspace.profileConfig.strongAreasLabel')} <span className="text-xs font-normal text-slate-500 ml-1">{t('workspace.profileConfig.optional')}</span>
                    </label>
                    <input
                      type="text"
                      value={strongAreas}
                      onChange={(e) => setStrongAreas(e.target.value)}
                      placeholder={t('workspace.profileConfig.strongAreasPlaceholder')}
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>
                      {t('workspace.profileConfig.weakAreasLabel')} <span className="text-xs font-normal text-slate-500 ml-1">{t('workspace.profileConfig.optional')}</span>
                    </label>
                    <input
                      type="text"
                      value={weakAreas}
                      onChange={(e) => setWeakAreas(e.target.value)}
                      placeholder={t('workspace.profileConfig.weakAreasPlaceholder')}
                      className={inputBase}
                    />
                  </div>
                </div>

                
                <div>
                  <label className={labelBase}>
                    {t('workspace.profileConfig.languageLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className={selectBase}
                    >
                      <option value="vi">{t('workspace.profileConfig.langVi')}</option>
                      <option value="en">{t('workspace.profileConfig.langEn')}</option>
                    </select>
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                  </div>
                </div>
                
                <div>
                  <label className={labelBase}>
                    {t('workspace.profileConfig.learningGoalLabel')}<span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={learningGoal}
                    onChange={(e) => setLearningGoal(e.target.value)}
                    placeholder={t('workspace.profileConfig.learningGoalPlaceholder')}
                    rows={4}
                    className={`${inputBase} resize-none`}
                  />
                </div>
              </div>
            </div>
            </fieldset>
          </div>

          <DialogFooter className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 sm:justify-end gap-3 px-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className={`rounded-xl px-5 py-2.5 h-auto text-sm font-semibold transition-all ${isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {isReadOnly ? t('workspace.profileConfig.closeBtn') : t('workspace.profileConfig.cancelBtn')}
            </Button>
            {!isReadOnly && (
              <Button
                type="submit"
                disabled={submitting}
                className={`rounded-xl px-6 py-2.5 h-auto text-sm font-bold shadow-md hover:shadow-lg transition-all ${submitting ? 'opacity-80' : ''} bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('workspace.profileConfig.saving')}
                  </>
                ) : (
                  t('workspace.profileConfig.submitBtn')
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default IndividualWorkspaceProfileConfigDialog;
