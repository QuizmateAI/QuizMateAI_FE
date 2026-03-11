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
import { useToast } from '@/context/ToastContext';
import {
  getActiveDomains,
  getProgramsByDomainId,
  getSchemesByProgramId,
  getLevelsBySchemeId,
} from '@/api/SystemConfigAPI';

function IndividualWorkspaceProfileConfigDialog({ open, onOpenChange, onSave, isDarkMode, initialData, isReadOnly }) {
  const { t, i18n } = useTranslation();
  const { showInfo } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [domains, setDomains] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [levels, setLevels] = useState([]);

  // Form states
  const [schemeMode, setSchemeMode] = useState('system'); // 'system' or 'custom'
  const [domainId, setDomainId] = useState('');
  const [programId, setProgramId] = useState('');
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
    if (domainId) loadPrograms(domainId);
    else setPrograms([]);
  }, [domainId]);

  useEffect(() => {
    if (programId) loadSchemes(programId);
    else setSchemes([]);
  }, [programId]);

  useEffect(() => {
    if (schemeId) loadLevels(schemeId);
    else setLevels([]);
  }, [schemeId]);

  const resetForm = () => {
    if (initialData) {
      setSchemeMode(initialData.domainId || initialData.programId || initialData.schemeId ? 'system' : 'custom');
      setDomainId(initialData.domainId ? String(initialData.domainId) : '');
      setProgramId(initialData.programId ? String(initialData.programId) : '');
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
      setProgramId('');
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

  const loadPrograms = async (dId) => {
    try {
      const res = await getProgramsByDomainId(dId);
      setPrograms(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSchemes = async (pId) => {
    try {
      const res = await getSchemesByProgramId(pId);
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

  const validate = () => {
    const newErrors = {};
    if (schemeMode === 'system') {
      if (!domainId) newErrors.domainId = 'Vui lòng chọn Lĩnh vực học (Domain)';
      if (!programId) newErrors.programId = 'Vui lòng chọn Chương trình (Program)';
      if (!schemeId) newErrors.schemeId = 'Vui lòng chọn Lộ trình/Nguyên tắc (Scheme)';
      if (!requireAiAssessment && !currentLevelId) newErrors.currentLevelId = 'Vui lòng chọn Trình độ hiện tại';
    } else {
      if (!customSchemeName.trim()) newErrors.customSchemeName = 'Vui lòng nhập tên Lộ trình tuỳ chỉnh';
      if (!customSchemeDescription.trim()) newErrors.customSchemeDescription = 'Vui lòng nhập mô tả Lộ trình tuỳ chỉnh';
      if (!requireAiAssessment && !customCurrentLevel.trim()) newErrors.customCurrentLevel = 'Vui lòng nhập Trình độ hiện tại';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSave({
        domainId: schemeMode === 'system' && domainId ? Number(domainId) : null,
        programId: schemeMode === 'system' && programId ? Number(programId) : null,
        schemeId: schemeMode === 'system' && schemeId ? Number(schemeId) : null,
        customSchemeName: schemeMode === 'custom' ? customSchemeName.trim() : null,
        customSchemeDescription: schemeMode === 'custom' ? customSchemeDescription.trim() : null,
        learningGoal: learningGoal.trim() || null,
        strongAreas: strongAreas.trim() || null,
        weakAreas: weakAreas.trim() || null,
        preferredLanguage: preferredLanguage,
        currentLevelId: schemeMode === 'system' && currentLevelId ? Number(currentLevelId) : null,
        targetLevelId: schemeMode === 'system' && targetLevelId ? Number(targetLevelId) : null,
        customCurrentLevel: schemeMode === 'custom' ? customCurrentLevel.trim() : null,
        customTargetLevel: schemeMode === 'custom' ? customTargetLevel.trim() : null,
        targetExamDate: targetExamDate || null,
        requireAiAssessment: requireAiAssessment
      });
    } catch (err) {
      // Bỏ qua lỗi, parent handle
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiAssessClick = () => {
    showInfo('Hệ thống AI đang được nâng cấp để tạo bài kiểm tra năng lực (Pre-learning). Vui lòng thử lại sau!');
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
        <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500`}></div>
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className={`flex items-center gap-2 text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Thiết lập thông tin không gian
            {isReadOnly && <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Đã cập nhật</span>}
          </DialogTitle>
          <DialogDescription className={`text-[15px] pt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {isReadOnly 
              ? 'Tóm tắt các thông tin cấu hình chuyên sâu hiện tại của không gian học tập này.' 
              : 'Cấu hình các thông tin chuyên sâu (Lĩnh vực, Chương trình, Mục tiêu) để hệ thống cá nhân hóa tốt nhất cho bạn.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 flex flex-col h-auto max-h-[85vh]">
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-2">
            {loadingConfig && (
              <div className="flex items-center gap-2 text-sm text-blue-500 font-medium bg-blue-500/10 p-3 rounded-lg mb-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải dữ liệu cấu hình...
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
                    Theo hệ thống
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
                    Tự định nghĩa
                  </button>
                </div>

                {schemeMode === 'system' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Domain */}
                      <div>
                        <label className={labelBase}>
                          Lĩnh vực học tập <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={domainId}
                            onChange={(e) => {
                          setDomainId(e.target.value);
                          setProgramId('');
                          setSchemeId('');
                          setCurrentLevelId('');
                          setTargetLevelId('');
                        }}
                            className={`${selectBase} ${errors.domainId ? 'border-red-500 focus:ring-red-500/20' : ''}`}
                          >
                            <option value="">Chọn Lĩnh vực...</option>
                            {domains.map((d) => (
                              <option key={d.domainId} value={d.domainId}>{d.name}</option>
                            ))}
                          </select>
                          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                        </div>
                        {errors.domainId && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.domainId}</p>}
                      </div>

                      {/* Program */}
                      <div>
                        <label className={labelBase}>
                          Chương trình học <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={programId}
                            onChange={(e) => {
                          setProgramId(e.target.value);
                          setSchemeId('');
                          setCurrentLevelId('');
                          setTargetLevelId('');
                        }}
                            className={`${selectBase} ${errors.programId ? 'border-red-500' : ''} ${!domainId ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                            disabled={!domainId}
                          >
                            <option value="">Chọn Chương trình...</option>
                            {programs.map((p) => (
                              <option key={p.programId} value={p.programId}>{p.name}</option>
                            ))}
                          </select>
                          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                        </div>
                        {errors.programId && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.programId}</p>}
                      </div>
                    </div>

                    {/* Scheme */}
                    <div>
                      <label className={labelBase}>
                        Khung đánh giá (Scheme) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={schemeId}
                          onChange={(e) => {
                          setSchemeId(e.target.value);
                          setCurrentLevelId('');
                          setTargetLevelId('');
                        }}
                          className={`${selectBase} ${errors.schemeId ? 'border-red-500' : ''} ${!programId ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                          disabled={!programId}
                        >
                          <option value="">Chọn Scheme...</option>
                          {schemes.map((s) => (
                            <option key={s.schemeId} value={s.schemeId}>{s.name}</option>
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
                        Tên Lộ trình<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customSchemeName}
                        onChange={(e) => setCustomSchemeName(e.target.value)}
                        placeholder="Ví dụ: Luyện thi IELTS mục tiêu 7.5..."
                        className={`${inputBase} ${errors.customSchemeName ? 'border-red-500 focus:ring-red-500/20' : ''}`}
                      />
                      {errors.customSchemeName && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.customSchemeName}</p>}
                    </div>
                    <div>
                      <label className={labelBase}>
                        Mô tả chi tiết <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={customSchemeDescription}
                        onChange={(e) => setCustomSchemeDescription(e.target.value)}
                        placeholder="Mô tả các yêu cầu, điểm yếu/mạnh để AI lập lộ trình phù hợp..."
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
                        Trình độ hiện tại <span className="text-red-500">*</span>
                      </label>
                    </div>
                    
                    {schemeMode === 'system' ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <select
                            value={currentLevelId}
                            onChange={(e) => setCurrentLevelId(e.target.value)}
                            className={`${selectBase} ${errors.currentLevelId ? 'border-red-500' : ''} ${(!schemeId || requireAiAssessment) ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                            disabled={!schemeId || requireAiAssessment}
                          >
                            <option value="">Chọn trình độ...</option>
                            {levels.map((l) => (
                              <option key={l.levelId} value={l.levelId}>{l.name}</option>
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
                              <span>Bài test đánh giá năng lực AI lập tức</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-normal">Sẽ làm bài moke-test để xác định trình độ</span>
                          </div>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={customCurrentLevel}
                          onChange={(e) => setCustomCurrentLevel(e.target.value)}
                          placeholder="VD: 5.0 IELTS..."
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
                              <span>Bài test đánh giá năng lực AI lập tức</span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-normal">Sẽ làm bài moke-test để xác định trình độ</span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Target Level */}
                  <div>
                    <label className={labelBase}>
                      Mục tiêu cần đạt <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">(Tùy chọn)</span>
                    </label>
                    {schemeMode === 'system' ? (
                      <div className="relative">
                        <select
                          value={targetLevelId}
                          onChange={(e) => setTargetLevelId(e.target.value)}
                          className={`${selectBase} ${!schemeId ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                          disabled={!schemeId}
                        >
                          <option value="">Không xác định</option>
                          {levels.map((l) => (
                            <option key={l.levelId} value={l.levelId}>{l.name}</option>
                          ))}
                        </select>
                        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={customTargetLevel}
                        onChange={(e) => setCustomTargetLevel(e.target.value)}
                        placeholder="VD: Thành thạo, 7.5 IELTS..."
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
                      Điểm mạnh <span className="text-xs font-normal text-slate-500 ml-1">(Tùy chọn)</span>
                    </label>
                    <input
                      type="text"
                      value={strongAreas}
                      onChange={(e) => setStrongAreas(e.target.value)}
                      placeholder="VD: Giao tiếp..."
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>
                      Điểm yếu <span className="text-xs font-normal text-slate-500 ml-1">(Tùy chọn)</span>
                    </label>
                    <input
                      type="text"
                      value={weakAreas}
                      onChange={(e) => setWeakAreas(e.target.value)}
                      placeholder="VD: Ngữ pháp..."
                      className={inputBase}
                    />
                  </div>
                </div>

                
                <div>
                  <label className={labelBase}>
                    Ngôn ngữ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className={selectBase}
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English (Tiếng Anh)</option>
                    </select>
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                  </div>
                </div>
                
                <div>
                  <label className={labelBase}>
                    Mục tiêu cá nhân<span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={learningGoal}
                    onChange={(e) => setLearningGoal(e.target.value)}
                    placeholder="Ví dụ: Đạt điểm cao trong kỳ thi sắp tới, hiểu rõ phần ngữ pháp Tiếng Anh..."
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
              {isReadOnly ? 'Đóng' : 'Bỏ qua'}
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
                    Đang lưu...
                  </>
                ) : (
                  'Hoàn thành thiết lập'
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
