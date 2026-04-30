import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, ArrowLeft, RefreshCw, Rocket, Sparkles, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { generateMockTest, getBloomSkills } from "@/api/AIAPI";
import { Checkbox } from "@/components/ui/checkbox";
import useWorkspaceMaterialSelection from "./useWorkspaceMaterialSelection";
import { useMockTestStructureSuggestion } from "@/pages/Users/MockTest/hooks/useMockTestStructureSuggestion";
import { MockTestStructureEditor, validateMockTestStructure } from "@/pages/Users/MockTest/components/MockTestStructureEditor";

const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];

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

// BE rule (validateMockTestConfig):
// - Mock test mặc định dùng SINGLE_CHOICE cho mọi leaf section; FE không gửi cấu hình question type.
// - questionUnit=false: difficulty ratio là PHẦN TRĂM — sum = 100.
// - bloomUnit=true: bloom ratio là SỐ CÂU — sum = numQuestions.
// Aggregation: editor structure[{difficulty, bloomSkill, quantity}] → SectionConfigDTO.
// - Difficulty %s tính từ tổng quantity theo bucket, làm tròn rồi bù vào bucket lớn nhất cho đủ 100.
// - Bloom: group quantity theo skill.

function aggregateStructure(structure, bloomMap) {
  const items = Array.isArray(structure) ? structure : [];
  const numQuestions = items.reduce((s, it) => s + (Number(it?.quantity) || 0), 0);

  const diffCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const bloomCounts = {};
  items.forEach((it) => {
    const q = Number(it?.quantity) || 0;
    if (q <= 0) return;
    if (it?.difficulty && diffCounts[it.difficulty] != null) diffCounts[it.difficulty] += q;
    if (it?.bloomSkill) bloomCounts[it.bloomSkill] = (bloomCounts[it.bloomSkill] || 0) + q;
  });

  // Difficulty → % sum=100
  let easyRatio = 0, mediumRatio = 0, hardRatio = 0;
  if (numQuestions > 0) {
    easyRatio = Math.round((diffCounts.EASY / numQuestions) * 100);
    mediumRatio = Math.round((diffCounts.MEDIUM / numQuestions) * 100);
    hardRatio = Math.round((diffCounts.HARD / numQuestions) * 100);
    const sum = easyRatio + mediumRatio + hardRatio;
    if (sum !== 100) {
      const delta = 100 - sum;
      if (diffCounts.MEDIUM >= diffCounts.EASY && diffCounts.MEDIUM >= diffCounts.HARD) mediumRatio += delta;
      else if (diffCounts.EASY >= diffCounts.HARD) easyRatio += delta;
      else hardRatio += delta;
    }
  }

  // Bloom: per-skill count
  const bloomSkills = Object.entries(bloomCounts)
    .map(([skill, count]) => {
      const id = bloomMap?.[skill];
      if (!Number.isFinite(id) || count <= 0) return null;
      return { bloomId: id, ratio: count };
    })
    .filter(Boolean);

  return { numQuestions, easyRatio, mediumRatio, hardRatio, questionTypes: [], bloomSkills };
}

// Build raw structureItems để BE per-row scoring. Mỗi row pair với bloomId resolved từ name.
function buildStructureItems(structure, bloomMap, useScoring) {
  if (!Array.isArray(structure) || !useScoring) return [];
  return structure
    .map((it) => {
      const quantity = Number(it?.quantity) || 0;
      if (quantity <= 0 || !it?.difficulty || !it?.bloomSkill) return null;
      const bloomId = bloomMap?.[it.bloomSkill];
      const score = Number(it?.scorePerQuestion);
      return {
        difficulty: it.difficulty,
        bloomSkill: it.bloomSkill,
        bloomId: Number.isFinite(bloomId) ? bloomId : null,
        quantity,
        scorePerQuestion: Number.isFinite(score) && score > 0 ? score : null,
      };
    })
    .filter(Boolean);
}

// Tổng max score của 1 leaf section (dùng cho field maxScore trong DTO).
function leafSectionMaxScore(structure) {
  if (!Array.isArray(structure)) return 0;
  return structure.reduce((s, it) => {
    const score = Number(it?.scorePerQuestion) || 0;
    const qty = Number(it?.quantity) || 0;
    return s + score * qty;
  }, 0);
}

function sectionsToServerDTOs(sections, bloomMap, useScoring) {
  if (!Array.isArray(sections)) return [];
  return sections.map((sec) => {
    const hasSubs = sec.subConfigs && sec.subConfigs.length > 0;
    if (hasSubs) {
      return {
        name: sec.name,
        description: sec.description,
        numQuestions: null,
        // Wrapper: BE auto recompute từ leaves; FE gửi null cho rõ.
        maxScore: useScoring ? null : null,
        structureItems: [],
        easyRatio: 0,
        mediumRatio: 0,
        hardRatio: 0,
        questionUnit: false,
        bloomUnit: true,
        timerMode: true,
        requiresSharedContext: false,
        questionTypes: [],
        bloomSkills: [],
        subConfigs: sectionsToServerDTOs(sec.subConfigs, bloomMap, useScoring),
      };
    }
    const agg = aggregateStructure(sec.structure, bloomMap);
    const leafMax = useScoring ? leafSectionMaxScore(sec.structure) : 0;
    return {
      name: sec.name,
      description: sec.description,
      numQuestions: agg.numQuestions,
      maxScore: useScoring && leafMax > 0 ? leafMax : null,
      structureItems: buildStructureItems(sec.structure, bloomMap, useScoring),
      easyRatio: agg.easyRatio,
      mediumRatio: agg.mediumRatio,
      hardRatio: agg.hardRatio,
      questionUnit: false,
      bloomUnit: true,
      timerMode: true,
      requiresSharedContext: sec.requiresSharedContext === true,
      questionTypes: agg.questionTypes,
      bloomSkills: agg.bloomSkills,
      subConfigs: [],
    };
  });
}

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
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // State step machine
  const [step, setStep] = useState("BASIC"); // 'BASIC' | 'STRUCTURE' | 'GENERATING'
  const [examName, setExamName] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [totalQuestions, setTotalQuestions] = useState(30);
  const [duration, setDuration] = useState(60);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSections, setAiSections] = useState([]);
  const [aiTopNotice, setAiTopNotice] = useState("");
  const [examLanguage, setExamLanguage] = useState("");
  // Toggle "dùng cấu trúc điểm" — bật ở step 2 header. Khi off, BE/UI bỏ qua mọi maxScore + per-row score.
  const [useScoring, setUseScoring] = useState(false);

  // Map tên → ID cho bloom skill (fetch 1 lần khi mở form)
  const [bloomMap, setBloomMap] = useState({});

  const {
    suggestion,
    isLoading: isSuggesting,
    error: suggestError,
    requestSuggestion,
    regenerate,
  } = useMockTestStructureSuggestion();

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

  // Khi suggestion mới về → chuyển sang STRUCTURE
  useEffect(() => {
    if (suggestion) {
      const uiLanguage = getUiLanguage(i18n.language);
      setAiSections(suggestion.sections || []);
      setAiTopNotice(suggestion.description || "");
      setExamLanguage(normalizeExamLanguage(suggestion.examLanguage, uiLanguage));
      setStep("STRUCTURE");
    }
  }, [suggestion, i18n.language]);

  const handleRequestSuggestion = useCallback(async () => {
    setError("");
    if (!examName.trim()) {
      setError(t("mockTestForms.common.nameRequired", "Please enter a name."));
      return;
    }
    try {
      const uiLanguage = getUiLanguage(i18n.language);
      setExamLanguage("");
      await requestSuggestion({
        examName: examName.trim(),
        description: aiPrompt?.trim() || undefined,
        totalQuestion: Number(totalQuestions) || 1,
        durationInMinute: Number(duration) || 60,
        overallDifficulty: uppercaseDifficulty(difficulty),
        outputLanguage: uiLanguage,
        workspaceId: Number(contextId),
      });
    } catch (e) {
      setError(e?.message || t("mockTestForms.common.createFailed", "Failed to suggest structure."));
    }
  }, [examName, aiPrompt, totalQuestions, duration, difficulty, contextId, i18n.language, requestSuggestion, t]);

  const handleBackToBasic = useCallback(() => {
    setStep("BASIC");
  }, []);

  // Skip AI suggest — user tự thiết kế cấu trúc từ blank canvas. Dùng khi user đã biết
  // chính xác đề mình muốn (ví dụ giáo viên có sẵn ma trận đề), không cần AI gợi ý.
  const handleStartManualDesign = useCallback(() => {
    setError("");
    if (!examName.trim()) {
      setError(t("mockTestForms.common.nameRequired", "Please enter a name."));
      return;
    }
    const uiLanguage = getUiLanguage(i18n.language);
    setAiSections([]);
    setAiTopNotice("");
    setExamLanguage(uiLanguage);
    setStep("STRUCTURE");
  }, [examName, i18n.language, t]);

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
      const sectionConfigs = sectionsToServerDTOs(aiSections, bloomMap, useScoring);
      const uiLanguage = getUiLanguage(i18n.language);
      const payload = {
        title: examName.trim(),
        overallDifficulty: uppercaseDifficulty(difficulty),
        totalQuestion: Number(totalQuestions) || 1,
        durationInMinute: Number(duration) || 60,
        durationInSecond: 0,
        prompt: aiPrompt?.trim() || "",
        outputLanguage: uiLanguage,
        examLanguage: normalizeExamLanguage(examLanguage, uiLanguage),
        materialIds: effectiveSelectedSourceIds || [],
        workspaceId: Number(contextId),
        sectionConfigs,
      };
      const result = await generateMockTest(payload);
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
  }, [aiSections, totalQuestions, bloomMap, examName, difficulty, duration, aiPrompt, i18n.language, examLanguage, effectiveSelectedSourceIds, contextId, onCreateMockTest, t, useScoring]);

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500"
              : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"
  }`;
  const selectCls = `${inputCls} appearance-none cursor-pointer`;
  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button type="button" onClick={onBack} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
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
                "Mock tests only generate single-answer multiple-choice questions. Listening, Writing, and Speaking are not supported, so AI will skip them and only suggest text-based sections for exams like IELTS or TOEIC."
              )}
            </div>

            <div>
              <label className={labelCls}>{t("mockTestForms.create.name", "Mock Test Name")}</label>
              <input
                className={inputCls}
                placeholder={t("mockTestForms.create.nameExample", "E.g. IELTS, TOEIC 900, final Math 12 exam...")}
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("mockTestForms.common.difficulty", "Difficulty")}</label>
                <select className={selectCls} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  {DIFFICULTY_LEVELS.map((d) => <option key={d} value={d}>{t(`mockTestForms.common.difficulty${d.charAt(0).toUpperCase() + d.slice(1)}`, d)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("mockTestForms.common.totalQuestions", "Total questions")}</label>
                <input type="number" className={inputCls} value={totalQuestions} onChange={(e) => setTotalQuestions(Number(e.target.value))} min={1} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t("mockTestForms.common.timeDuration", "Duration (minutes)")}</label>
              <input type="number" className={inputCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={1} />
            </div>
            <div>
              <label className={labelCls}>{t("mockTestForms.common.additionalPrompt", "Additional prompt")}</label>
              <textarea className={`${inputCls} min-h-[80px] resize-none`} placeholder={t("mockTestForms.common.promptPlaceholder", "Add extra instructions for the AI...")} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
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
            <MockTestStructureEditor
              sections={aiSections}
              onChange={setAiSections}
              targetTotalQuestions={Number(totalQuestions) || undefined}
              topNotice={aiTopNotice}
              useScoring={useScoring}
              onUseScoringChange={setUseScoring}
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
        <Button variant="outline" onClick={onBack} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
          {t("mockTestForms.common.cancel", "Cancel")}
        </Button>

        {step === "BASIC" && (
          <>
            <Button
              variant="outline"
              onClick={handleStartManualDesign}
              disabled={isSuggesting}
              className={isDarkMode ? "border-slate-700 text-slate-300" : ""}
            >
              {t("mockTestForms.create.manualDesign", "Design manually")}
            </Button>
            <Button onClick={handleRequestSuggestion} disabled={isSuggesting} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {isSuggesting
                ? t("mockTestForms.create.requestingSuggestion", "Generating suggestion...")
                : t("mockTestForms.create.requestSuggestion", "Get structure suggestion")}
            </Button>
          </>
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
    </div>
  );
}

export default CreateMockTestForm;
