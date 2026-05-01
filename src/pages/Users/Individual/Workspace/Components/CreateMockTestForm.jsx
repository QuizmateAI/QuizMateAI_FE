import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, ArrowLeft, RefreshCw, Rocket, Sparkles, ChevronLeft, BookmarkPlus, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { generateMockTest, getBloomSkills } from "@/api/AIAPI";
import { Checkbox } from "@/components/ui/checkbox";
import useWorkspaceMaterialSelection from "./useWorkspaceMaterialSelection";
import { useMockTestStructureSuggestion } from "@/pages/Users/MockTest/hooks/useMockTestStructureSuggestion";
import { useSavedMockTestTemplates } from "@/pages/Users/MockTest/hooks/useSavedMockTestTemplates";
import { MockTestStructureEditor, validateMockTestStructure } from "@/pages/Users/MockTest/components/MockTestStructureEditor";
import { MockTestScoringEditor } from "@/pages/Users/MockTest/components/MockTestScoringEditor";
import { MockTestTemplatePicker } from "@/pages/Users/MockTest/components/MockTestTemplatePicker";
import { MockTestExitConfirmDialog } from "@/pages/Users/MockTest/components/MockTestExitConfirmDialog";
import {
  buildMockTestCustomScoring,
  countLeafQuestions,
  normalizeMockTestScoring,
} from "@/pages/Users/MockTest/utils/mockTestScoring";
import { sectionsToServerDTOs } from "@/pages/Users/MockTest/utils/mockTestSectionDTOs";
import {
  clearMockTestDraft,
  loadMockTestDraft,
  saveMockTestDraft,
} from "@/pages/Users/MockTest/utils/mockTestTemplateDraft";
import { buildManualMockTestSections } from "@/pages/Users/MockTest/utils/mockTestManualTemplate";
import {
  buildSavedTemplatePayload,
  buildSavedTemplatePayloadFromSuggestion,
  templateStructureToV1ForForm,
} from "@/pages/Users/MockTest/utils/mockTestTemplateLoader";
import { useToast } from "@/context/ToastContext";

// Map difficulty client → server (server enum: EASY/MEDIUM/HARD)
function uppercaseDifficulty(value) {
  if (!value) return "MEDIUM";
  return String(value).toUpperCase();
}

function getUiLanguage(language) {
  return language === "en" ? "en" : "vi";
}

function normalizeExamLanguage(value, fallback) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^[a-z]{2,3}$/.test(normalized) ? normalized : fallback;
}

function resolveMaterialIdsForMockTest(selectedIds, sources) {
  if (Array.isArray(selectedIds) && selectedIds.length > 0) return selectedIds;
  return (Array.isArray(sources) ? sources : [])
    .map((source) => Number(source?.id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

// Aggregation logic moved to ../../MockTest/utils/mockTestSectionDTOs (shared with other entry points).

/**
 * Form tạo Mock Test bằng AI — flow 3-step:
 * 1. BASIC: nhập exam name, độ khó, số câu, thời lượng, prompt bổ sung, chọn material (optional).
 * 2. STRUCTURE: AI gợi ý sections, user edit qua MockTestStructureEditor.
 * 3. GENERATING: BE async sinh câu hỏi, FE chờ MOCKTEST_COMPLETED qua WebSocket.
 *
 * Mock test là đề thử độc lập ở workspace level, không gắn roadmap nào.
 * Chỉ sinh câu trắc nghiệm một đáp án.
 */
function CreateMockTestForm({
  isDarkMode = false,
  onCreateMockTest,
  onBack,
  contextId,
  sources,
  selectedSourceIds,
  onToggleMaterialSelection,
  initialSavedTemplate = null,
}) {
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // State step machine
  const [step, setStep] = useState("BASIC"); // 'BASIC' | 'STRUCTURE' | 'GENERATING'
  const [examName, setExamName] = useState("");
  // Difficulty/total/duration are now AUTO-FILLED from template after suggestion (v2 redesign).
  // Defaults below are placeholders only — overridden by suggestion.totalQuestion/durationMinutes.
  const [difficulty] = useState("medium");
  const [totalQuestions, setTotalQuestions] = useState(30);
  const [duration, setDuration] = useState(60);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSections, setAiSections] = useState([]);
  const [aiTopNotice, setAiTopNotice] = useState("");
  const [examLanguage, setExamLanguage] = useState("");
  const [scoring, setScoring] = useState(() => normalizeMockTestScoring());
  // Template metadata after suggestion (display only).
  const [matchedTemplate, setMatchedTemplate] = useState(null);
  // Exit confirm dialog visibility
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  // Saved-template state for the "Lưu template" button on STRUCTURE step
  const [savingActive, setSavingActive] = useState(false);
  const [savedActiveTemplateId, setSavedActiveTemplateId] = useState(null);

  // Map tên → ID cho bloom skill (fetch 1 lần khi mở form)
  const [bloomMap, setBloomMap] = useState({});

  const {
    suggestion,
    suggestions: templateOptions,
    isLoading: isSuggesting,
    error: suggestError,
    requestSuggestion,
    regenerate,
    selectSuggestion,
  } = useMockTestStructureSuggestion();

  // Saved template library (for "save AI template" button + cross-marking saved cards)
  const {
    templates: savedTemplates,
    savingTemplateId,
    derivedFromTemplateIds,
    save: saveTemplateToLibrary,
  } = useSavedMockTestTemplates({ enabled: true });

  // Set of template ids already saved (derived from), so picker shows "Đã lưu" badge
  const savedDerivedIds = useMemo(() => {
    const set = new Set(derivedFromTemplateIds || []);
    // Also infer from displayName + structure equivalence isn't reliable; rely on derivedFromTemplateIds
    // populated when user saves. On reload, savedTemplates won't have derivedFromTemplateId field
    // (entity has it stored separately) — so initial state shows nothing as saved which is OK.
    return set;
  }, [derivedFromTemplateIds, savedTemplates]);

  const {
    allSelected,
    clearSelectedSources,
    materialsError,
    materialsLoading,
    normalizedSources,
    selectAllSources,
    selectedIdSet,
    selectedIds: effectiveSelectedSourceIds,
    toggleSourceSelection,
  } = useWorkspaceMaterialSelection({
    contextId,
    onToggleMaterialSelection,
    selectedSourceIds,
    sources,
    t,
  });

  const selectedSourceItems = useMemo(
    () => normalizedSources.filter((item) => selectedIdSet.has(item.id)),
    [normalizedSources, selectedIdSet],
  );

  // Fetch bloom skills 1 lần để map name → id khi submit.
  // Question type của mock-test do backend tự set SINGLE_CHOICE.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bloomRes = await getBloomSkills();
        if (cancelled) return;
        const bloomList = bloomRes?.data || bloomRes || [];
        const bm = {};
        bloomList.forEach((it) => {
          const n = String(it.bloomName || it.bloomSkillName || it.name || it.label || "").toUpperCase();
          const id = Number(it.bloomId ?? it.bloomSkillId ?? it.id);
          if (n && Number.isFinite(id)) {
            bm[n] = id;
          }
        });
        setBloomMap(bm);
      } catch (e) {
        console.error("Lỗi tải bloom skills:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const applySuggestion = useCallback((nextSuggestion) => {
    if (!nextSuggestion) return;
    setAiSections(nextSuggestion.sections || []);
    setAiTopNotice(nextSuggestion.description || "");
    setExamLanguage(normalizeExamLanguage(nextSuggestion.examLanguage, ""));
    if (Number.isFinite(nextSuggestion.totalQuestion) && nextSuggestion.totalQuestion > 0) {
      setTotalQuestions(nextSuggestion.totalQuestion);
    }
    if (Number.isFinite(nextSuggestion.durationMinutes) && nextSuggestion.durationMinutes > 0) {
      setDuration(nextSuggestion.durationMinutes);
    }
    setScoring(normalizeMockTestScoring(nextSuggestion.scoring, nextSuggestion.totalQuestion));
    setMatchedTemplate(nextSuggestion.v2Template || null);
    setStep("STRUCTURE");
  }, []);

  // Khi suggestion mới về → auto-fill template defaults rồi chuyển sang STRUCTURE.
  useEffect(() => {
    applySuggestion(suggestion);
  }, [suggestion, applySuggestion]);

  useEffect(() => {
    const draft = loadMockTestDraft("individual", contextId);
    if (!draft) return;
    setExamName(draft.examName || "");
    setAiPrompt(draft.aiPrompt || "");
    setAiSections(Array.isArray(draft.sections) ? draft.sections : []);
    setAiTopNotice(draft.topNotice || "");
    setExamLanguage(draft.examLanguage || "");
    setMatchedTemplate(draft.matchedTemplate || null);
    setTotalQuestions(Number(draft.totalQuestions) || 30);
    setDuration(Number(draft.duration) || 60);
    setScoring(normalizeMockTestScoring(draft.scoring, draft.totalQuestions));
    if (Array.isArray(draft.sections) && draft.sections.length > 0) {
      setStep("STRUCTURE");
    }
  }, [contextId]);

  useEffect(() => {
    if (!contextId) return;
    if (!examName.trim() && aiSections.length === 0) return;
    saveMockTestDraft("individual", contextId, {
      examName,
      aiPrompt,
      sections: aiSections,
      topNotice: aiTopNotice,
      examLanguage,
      matchedTemplate,
      totalQuestions,
      duration,
      scoring,
    });
  }, [contextId, examName, aiPrompt, aiSections, aiTopNotice, examLanguage, matchedTemplate, totalQuestions, duration, scoring]);

  useEffect(() => {
    const leafTotal = countLeafQuestions(aiSections);
    if (leafTotal > 0 && leafTotal !== Number(totalQuestions)) {
      setTotalQuestions(leafTotal);
    }
  }, [aiSections, totalQuestions]);

  const handleRequestSuggestion = useCallback(async () => {
    setError("");
    if (!examName.trim()) {
      setError(t("mockTestForms.common.nameRequired", "Please enter a name."));
      return;
    }
    try {
      const uiLanguage = getUiLanguage(i18n.language);
      const materialIds = resolveMaterialIdsForMockTest(effectiveSelectedSourceIds, normalizedSources);
      setExamLanguage("");
      // V2 redesign: total/duration sẽ tự fill từ template — gửi 0 để hook không
      // ép distribution với số sai. Hook sẽ dùng template.totalQuestion làm default.
      await requestSuggestion({
        examName: examName.trim(),
        description: aiPrompt?.trim() || undefined,
        totalQuestion: 0,
        outputLanguage: uiLanguage,
        workspaceId: Number(contextId),
        materialIds,
      });
    } catch (e) {
      setError(e?.message || t("mockTestForms.common.createFailed", "Failed to suggest structure."));
    }
  }, [examName, aiPrompt, contextId, i18n.language, requestSuggestion, t, effectiveSelectedSourceIds, normalizedSources]);

  const handleStartManualTemplate = useCallback(() => {
    const title = examName.trim() || t("mockTestForms.create.manualTitle", "Mock test thủ công");
    const sections = buildManualMockTestSections(title);
    setExamName(title);
    setAiSections(sections);
    setAiTopNotice(t("mockTestForms.create.manualNotice", "Template thủ công, bạn có thể chỉnh từng phần, loại câu, độ khó, Bloom và điểm trước khi tạo."));
    setMatchedTemplate(null);
    setExamLanguage("");
    setTotalQuestions(countLeafQuestions(sections));
    setDuration(60);
    setScoring(normalizeMockTestScoring({ totalPoints: 100, passingScore: 50 }, 40));
    setStep("STRUCTURE");
  }, [examName, t]);

  const handleBackToBasic = useCallback(() => {
    setStep("BASIC");
  }, []);

  const handleSubmit = useCallback(async () => {
    setError("");
    const validation = validateMockTestStructure(aiSections, Number(totalQuestions) || undefined, t);
    if (!validation.isValid) {
      setError(validation.errors.join(" | "));
      return;
    }
    setSubmitting(true);
    setStep("GENERATING");
    try {
      const materialIds = resolveMaterialIdsForMockTest(effectiveSelectedSourceIds, normalizedSources);
      if (materialIds.length === 0) {
        throw new Error(t("mockTestForms.common.materialRequired", "Please select at least one material."));
      }
      const normalizedScoring = normalizeMockTestScoring(scoring, totalQuestions);
      const sectionConfigs = sectionsToServerDTOs(aiSections, bloomMap, normalizedScoring);
      const uiLanguage = getUiLanguage(i18n.language);
      const payload = {
        title: examName.trim(),
        overallDifficulty: uppercaseDifficulty(difficulty),
        totalQuestion: Number(totalQuestions) || 1,
        durationInMinute: Number(duration) || 60,
        durationInSecond: 0,
        prompt: aiPrompt?.trim() || "",
        outputLanguage: uiLanguage,
        examLanguage: normalizeExamLanguage(examLanguage, "") || undefined,
        materialIds,
        workspaceId: Number(contextId),
        sectionConfigs,
        customScoring: buildMockTestCustomScoring(normalizedScoring, aiSections),
      };
      const result = await generateMockTest(payload);
      clearMockTestDraft("individual", contextId);
      await onCreateMockTest?.({
        quizId: result?.quizId,
        taskId: result?.taskId,
        websocketTaskId: result?.websocketTaskId,
        status: result?.status,
        ...result,
      });
    } catch (e) {
      console.error("Lỗi khi tạo mock test:", e);
      setError(e?.message || t("mockTestForms.common.createFailed", "Failed to create. Please try again."));
      setStep("STRUCTURE");
    } finally {
      setSubmitting(false);
    }
  }, [aiSections, totalQuestions, bloomMap, scoring, examName, difficulty, duration, aiPrompt, i18n.language, examLanguage, effectiveSelectedSourceIds, normalizedSources, contextId, onCreateMockTest, t]);

  const handleSelectTemplate = useCallback((option) => {
    const selected = selectSuggestion(option?.v2Template?.mockTestTemplateId) || option;
    applySuggestion(selected);
    setSavedActiveTemplateId(null);
  }, [selectSuggestion, applySuggestion]);

  // Build a SaveMockTestTemplateRequest payload from current form state.
  const buildSavePayload = useCallback(() => buildSavedTemplatePayload({
    sections: aiSections,
    scoring,
    totalQuestions,
    duration,
    examName,
    examLanguage,
    aiTopNotice,
    matchedTemplate,
  }), [aiSections, scoring, totalQuestions, duration, examName, examLanguage, aiTopNotice, matchedTemplate]);

  // Save the AI-suggested template (the one shown in the picker card).
  const handleSaveSuggestedTemplate = useCallback(async (option) => {
    if (!option) return;
    try {
      const payload = buildSavedTemplatePayloadFromSuggestion(option);
      if (!payload) return;
      await saveTemplateToLibrary(payload);
      showSuccess?.(t("mockTestForms.savedTemplates.savedToast", "Đã lưu template vào kho riêng."));
    } catch (e) {
      showError?.(e?.message || t("mockTestForms.savedTemplates.saveFailed", "Lưu template thất bại."));
    }
  }, [saveTemplateToLibrary, showSuccess, showError, t]);

  // Save the currently-edited template (after user has tweaked structure/scoring).
  const handleSaveCurrentTemplate = useCallback(async () => {
    if (savingActive) return;
    setSavingActive(true);
    try {
      const validation = validateMockTestStructure(aiSections, undefined, t);
      if (!validation.isValid) {
        showError?.(validation.errors[0] || t("mockTestForms.savedTemplates.validationFailed", "Cấu trúc chưa hợp lệ."));
        return;
      }
      const payload = buildSavePayload();
      const result = await saveTemplateToLibrary(payload);
      setSavedActiveTemplateId(result?.mockTestTemplateId || true);
      showSuccess?.(t("mockTestForms.savedTemplates.savedToast", "Đã lưu template vào kho riêng."));
    } catch (e) {
      showError?.(e?.message || t("mockTestForms.savedTemplates.saveFailed", "Lưu template thất bại."));
    } finally {
      setSavingActive(false);
    }
  }, [savingActive, aiSections, buildSavePayload, saveTemplateToLibrary, showSuccess, showError, t]);

  const hasUnsavedWork = useMemo(() => {
    if (step === "BASIC") return Boolean(examName.trim());
    if (step === "STRUCTURE") return Array.isArray(aiSections) && aiSections.length > 0;
    return false;
  }, [step, examName, aiSections]);

  const handleRequestClose = useCallback(() => {
    if (!hasUnsavedWork) {
      onBack?.();
      return;
    }
    setExitConfirmOpen(true);
  }, [hasUnsavedWork, onBack]);

  const handleDiscardAndExit = useCallback(() => {
    clearMockTestDraft("individual", contextId);
    setExitConfirmOpen(false);
    onBack?.();
  }, [contextId, onBack]);

  const handleSaveAndExit = useCallback(async () => {
    try {
      if (Array.isArray(aiSections) && aiSections.length > 0) {
        const payload = buildSavePayload();
        await saveTemplateToLibrary(payload);
        showSuccess?.(t("mockTestForms.savedTemplates.savedToast", "Đã lưu template vào kho riêng."));
      }
    } catch (e) {
      showError?.(e?.message || t("mockTestForms.savedTemplates.saveFailed", "Lưu template thất bại."));
      return;
    } finally {
      clearMockTestDraft("individual", contextId);
    }
    setExitConfirmOpen(false);
    onBack?.();
  }, [aiSections, buildSavePayload, contextId, onBack, saveTemplateToLibrary, showSuccess, showError, t]);

  // Apply initialSavedTemplate (when MockTestListView opens form via "Use saved template")
  useEffect(() => {
    if (!initialSavedTemplate || !initialSavedTemplate.structure) return;
    const sectionsFromV2 = templateStructureToV1ForForm(initialSavedTemplate);
    setExamName(initialSavedTemplate.displayName || "");
    setAiSections(sectionsFromV2);
    setAiTopNotice(initialSavedTemplate.description || "");
    setExamLanguage(normalizeExamLanguage(initialSavedTemplate.contentLanguage, ""));
    setTotalQuestions(initialSavedTemplate.totalQuestion || countLeafQuestions(sectionsFromV2) || 30);
    setDuration(initialSavedTemplate.durationMinutes || 60);
    setScoring(normalizeMockTestScoring(initialSavedTemplate.scoring, initialSavedTemplate.totalQuestion));
    setMatchedTemplate({
      mockTestTemplateId: initialSavedTemplate.mockTestTemplateId,
      displayName: initialSavedTemplate.displayName,
      examType: initialSavedTemplate.examType,
      contentLanguage: initialSavedTemplate.contentLanguage,
      structure: initialSavedTemplate.structure,
      scoring: initialSavedTemplate.scoring,
    });
    setStep("STRUCTURE");
  }, [initialSavedTemplate]);

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500"
              : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"
  }`;
  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button type="button" onClick={handleRequestClose} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-purple-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
            {t("mockTestForms.create.title", "Create Mock Test")}
          </p>
        </div>
      </div>

      {/* Nội dung form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t("mockTestForms.create.desc", "Create a comprehensive test covering an entire roadmap.")}
        </p>

        {/* Step indicator */}
        <div className={`flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
          <span className={step === "BASIC" ? "font-semibold text-purple-600" : ""}>{t("mockTestForms.create.stepBasic", "1. Configuration")}</span>
          <span>›</span>
          <span className={step === "STRUCTURE" ? "font-semibold text-purple-600" : ""}>{t("mockTestForms.create.stepStructure", "2. Structure")}</span>
          <span>›</span>
          <span className={step === "GENERATING" ? "font-semibold text-purple-600" : ""}>{t("mockTestForms.create.stepGenerating", "3. Generate Questions")}</span>
        </div>

        {/* Block chọn material - chỉ show ở step BASIC */}
        {step === "BASIC" && (
          <div className={`rounded-xl border p-3 space-y-3 ${isDarkMode ? "border-slate-800 bg-slate-900/40" : "border-gray-200 bg-white"}`}>
            <div className="flex items-start justify-between gap-2">
              <p className={`text-xs font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
                {t("mockTestForms.common.selectedMaterials", "Selected materials")}
              </p>
              {normalizedSources.length > 0 && (
                <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  {t("mockTestForms.common.materialsSelectedSummary", "{{selected}}/{{total}} selected", {
                    selected: selectedSourceItems.length,
                    total: normalizedSources.length,
                  })}
                </span>
              )}
            </div>
            {materialsLoading && (
              <div className={`flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t("mockTestForms.common.materialsLoading", "Loading materials...")}
              </div>
            )}
            {materialsError && !materialsLoading && (
              <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-red-950/20 text-red-400 border border-red-900/30" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {materialsError}
              </div>
            )}
            {normalizedSources.length > 0 && !materialsLoading && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline"
                    className={`h-7 px-3 text-[11px] ${isDarkMode ? "border-slate-700 text-slate-300" : "border-gray-200 text-gray-700"}`}
                    onClick={selectAllSources} disabled={allSelected}>
                    {t("mockTestForms.common.selectAll", "Select all")}
                  </Button>
                  <Button type="button" size="sm" variant="outline"
                    className={`h-7 px-3 text-[11px] ${isDarkMode ? "border-slate-700 text-slate-300" : "border-gray-200 text-gray-700"}`}
                    onClick={clearSelectedSources} disabled={selectedSourceItems.length === 0}>
                    {t("mockTestForms.common.deselectAll", "Deselect all")}
                  </Button>
                </div>
                <div className={`max-h-36 overflow-y-auto rounded-lg border ${isDarkMode ? "border-slate-800 divide-y divide-slate-800" : "border-gray-200 divide-y divide-gray-100"}`}>
                  {normalizedSources.map((item) => (
                    <label key={item.id} className={`flex items-start gap-3 px-3 py-2 text-xs cursor-pointer ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-gray-50"}`}>
                      <Checkbox checked={selectedIdSet.has(item.id)}
                        onCheckedChange={(checked) => toggleSourceSelection(item.id, checked === true)}
                        className={`mt-0.5 ${isDarkMode ? "border-slate-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" : "border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"}`} />
                      <span className={`min-w-0 flex-1 break-words ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                        {item.name || t("mockTestForms.common.materialFallback", "Material #{{id}}", { id: item.id })}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
            {normalizedSources.length === 0 && !materialsLoading && (
              <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                {t("mockTestForms.common.workspaceMaterialsEmpty", "No materials available in this workspace.")}
              </p>
            )}
          </div>
        )}

        {step === "BASIC" && (
          <>
            {/* Notice scope mock test */}
            <div className={`rounded-lg border p-3 text-xs ${isDarkMode ? "border-blue-800/50 bg-blue-950/20 text-blue-200" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
              {t(
                "mockTestForms.create.scopeNotice",
                "Mock tests support single choice, multiple choice, and true/false questions. Listening, Writing, and Speaking are skipped, so AI only suggests text-based sections."
              )}
            </div>

            <div>
              <label className={labelCls}>
                {t("mockTestForms.create.name", "Mock Test Name")}
              </label>
              <input
                className={inputCls}
                placeholder={t("mockTestForms.create.nameExample", "E.g. IELTS, TOEIC 900, JLPT N5, VSTEP B2, THPT...")}
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && examName.trim() && !isSuggesting) {
                    e.preventDefault();
                    handleRequestSuggestion();
                  }
                }}
                autoFocus
              />
              <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                {t(
                  "mockTestForms.create.nameHint",
                  "Nhập tên kỳ thi rồi nhấn Enter — hệ thống sẽ tự gợi ý template chuẩn (số câu, thời gian, cấu trúc).",
                )}
              </p>
            </div>

            {(error || suggestError) && (
              <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
                {error || suggestError?.message || t("mockTestForms.common.genericError", "Something went wrong.")}
              </div>
            )}
          </>
        )}

        {step === "STRUCTURE" && (
          <>
            <div className="flex items-center justify-between">
              <button type="button" onClick={handleBackToBasic} className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"}`}>
                <ChevronLeft className="w-3.5 h-3.5" /> {t("mockTestForms.create.backToConfig", "Back to configuration")}
              </button>
              <Button type="button" size="sm" variant="outline" onClick={() => regenerate()} disabled={isSuggesting}>
                {isSuggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                {t("mockTestForms.create.regenerate", "Regenerate")}
              </Button>
            </div>
            {matchedTemplate && (
              <div className={`rounded-lg border p-3 ${isDarkMode ? "border-purple-800/40 bg-purple-950/20" : "border-purple-200 bg-purple-50"}`}>
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className={`w-3.5 h-3.5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                  <span className={`font-semibold ${isDarkMode ? "text-purple-200" : "text-purple-900"}`}>
                    {t("mockTestForms.create.matchedTemplate", "Matched template")}: {matchedTemplate.displayName}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider ${isDarkMode ? "text-purple-400/70" : "text-purple-600/70"}`}>
                    {matchedTemplate.examType}
                  </span>
                </div>
                <div className={`mt-1 text-[11px] ${isDarkMode ? "text-purple-300/80" : "text-purple-700"}`}>
                  {Number(totalQuestions) || 0} {t("mockTestForms.common.questionsShort", "câu")} · {Number(duration) || 0} {t("mockTestForms.common.minutesShort", "phút")} · {(aiSections || []).length} {t("mockTestForms.common.sectionsShort", "phần")}
                </div>
              </div>
            )}
            <MockTestTemplatePicker
              options={templateOptions}
              selectedTemplateId={matchedTemplate?.mockTestTemplateId}
              onSelect={handleSelectTemplate}
              onSaveTemplate={handleSaveSuggestedTemplate}
              savedTemplateIds={savedDerivedIds}
              savingTemplateId={savingTemplateId}
              isDarkMode={isDarkMode}
            />
            <MockTestScoringEditor
              sections={aiSections}
              scoring={scoring}
              onChange={setScoring}
              isDarkMode={isDarkMode}
            />
            <MockTestStructureEditor
              sections={aiSections}
              onChange={setAiSections}
              targetTotalQuestions={Number(totalQuestions) || undefined}
              topNotice={aiTopNotice}
            />
            {error && (
              <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
                {error}
              </div>
            )}
          </>
        )}

        {step === "GENERATING" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
            <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
              {t("mockTestForms.create.generatingTitle", "Generating questions for your mock test...")}
            </p>
            <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
              {t("mockTestForms.create.generatingHint", "This may take from 30 seconds to a few minutes depending on the number of questions.")}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`px-4 py-3 border-t flex justify-end gap-2 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <Button variant="outline" onClick={handleRequestClose} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
          {t("mockTestForms.common.cancel", "Cancel")}
        </Button>

        {step === "STRUCTURE" && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveCurrentTemplate}
            disabled={savingActive || aiSections.length === 0}
            className={isDarkMode ? "border-slate-700 text-slate-300" : ""}
          >
            {savingActive ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : savedActiveTemplateId ? (
              <Check className="w-4 h-4 mr-2 text-emerald-500" />
            ) : (
              <BookmarkPlus className="w-4 h-4 mr-2" />
            )}
            {savedActiveTemplateId
              ? t("mockTestForms.savedTemplates.savedShort", "Đã lưu")
              : savingActive
                ? t("mockTestForms.savedTemplates.savingShort", "Đang lưu...")
                : t("mockTestForms.savedTemplates.saveShort", "Lưu template")}
          </Button>
        )}

        {step === "BASIC" && (
          <Button
            type="button"
            variant="outline"
            onClick={handleStartManualTemplate}
            disabled={isSuggesting}
            className={isDarkMode ? "border-slate-700 text-slate-300" : ""}
          >
            {t("mockTestForms.create.manualTemplate", "Tạo thủ công")}
          </Button>
        )}

        {step === "BASIC" && (
          <Button onClick={handleRequestSuggestion} disabled={isSuggesting} className="bg-purple-600 hover:bg-purple-700 text-white">
            {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {isSuggesting
              ? t("mockTestForms.create.requestingSuggestion", "Generating suggestion...")
              : t("mockTestForms.create.requestSuggestion", "Get structure suggestion")}
          </Button>
        )}

        {step === "STRUCTURE" && (
          <Button onClick={handleSubmit} disabled={submitting} className="bg-purple-600 hover:bg-purple-700 text-white">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}
            {submitting
              ? t("mockTestForms.create.creatingExam", "Creating mock test...")
              : t("mockTestForms.create.createExam", "Create mock test")}
          </Button>
        )}
      </div>

      <MockTestExitConfirmDialog
        open={exitConfirmOpen}
        onCancel={() => setExitConfirmOpen(false)}
        onDiscard={handleDiscardAndExit}
        onSaveAndExit={handleSaveAndExit}
        canSaveTemplate={Array.isArray(aiSections) && aiSections.length > 0 && step === "STRUCTURE"}
      />
    </div>
  );
}

export default CreateMockTestForm;
