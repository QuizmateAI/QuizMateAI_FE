import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bot,
  ChevronLeft,
  ClipboardList,
  Loader2,
  RefreshCw,
  Rocket,
  Sparkles,
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import { generateMockTest, getBloomSkills } from "@/api/AIAPI";
import { getMaterialsByWorkspace } from "@/api/MaterialAPI";
import { useMockTestStructureSuggestion } from "@/Pages/Users/MockTest/hooks/useMockTestStructureSuggestion";
import { MockTestStructureEditor, validateMockTestStructure } from "@/Pages/Users/MockTest/components/MockTestStructureEditor";

function unwrapMaterialList(response) {
  const payload = response?.data?.data ?? response?.data ?? response;
  return Array.isArray(payload) ? payload : [];
}

function normalizeMaterialItem(item, index, t) {
  const id = Number(item?.materialId ?? item?.id ?? 0);
  if (!Number.isInteger(id) || id <= 0) return null;
  const status = String(item?.status || "").toUpperCase();
  if (status !== "ACTIVE") return null;
  return {
    id,
    name: String(item?.title || item?.name || t("createGroupMockTestForm.materials.itemFallback", "Material #{{index}}", { index: index + 1 })),
  };
}

function normalizeMaterialIds(ids) {
  return Array.from(new Set(
    (Array.isArray(ids) ? ids : [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  ));
}

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

// Aggregation: editor structure[{difficulty, bloomSkill, quantity}] → SectionConfigDTO.
// BE rule: mock test tự dùng SINGLE_CHOICE. Difficulty = %, bloom = số câu.
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

  const bloomSkills = Object.entries(bloomCounts)
    .map(([skill, count]) => {
      const id = bloomMap?.[skill];
      if (!Number.isFinite(id) || count <= 0) return null;
      return { bloomId: id, ratio: count };
    })
    .filter(Boolean);

  return { numQuestions, easyRatio, mediumRatio, hardRatio, questionTypes: [], bloomSkills };
}

function sectionsToServerDTOs(sections, bloomMap) {
  if (!Array.isArray(sections)) return [];
  return sections.map((sec) => {
    const hasSubs = sec.subConfigs && sec.subConfigs.length > 0;
    if (hasSubs) {
      return {
        name: sec.name,
        description: sec.description,
        numQuestions: null,
        easyRatio: 0,
        mediumRatio: 0,
        hardRatio: 0,
        questionUnit: false,
        bloomUnit: true,
        timerMode: true,
        requiresSharedContext: false,
        questionTypes: [],
        bloomSkills: [],
        subConfigs: sectionsToServerDTOs(sec.subConfigs, bloomMap),
      };
    }
    const agg = aggregateStructure(sec.structure, bloomMap);
    return {
      name: sec.name,
      description: sec.description,
      numQuestions: agg.numQuestions,
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
 * Tạo mock test cho group workspace bằng AI — flow 3 step:
 * 1. BASIC: leader nhập exam name + difficulty + total + duration + custom prompt.
 * 2. STRUCTURE: AI gợi ý sections, leader edit qua MockTestStructureEditor.
 * 3. GENERATING: BE async sinh câu hỏi. Quiz lưu status=DRAFT, leader publish sau.
 *
 * Audience luôn = ALL members (không có picker — design quyết định).
 * Schedule không có (dùng DRAFT/ACTIVE toggle để mở/đóng đề).
 */
export default function CreateGroupMockTestForm({
  isDarkMode = false,
  // ChatPanel truyền `contextId` + `onCreateMockTest`; giữ alias `workspaceId` + `onCreated` cho backward-compat.
  contextId,
  workspaceId: workspaceIdProp,
  onBack,
  onCreateMockTest,
  onCreated,
  // Material selection props từ ChatPanel pipeline — dùng làm default selected khi mount,
  // sau đó state local quản lý tiếp vì form tự fetch materials.
  sources: _sourcesProp,
  selectedSourceIds = [],
  onToggleMaterialSelection,
}) {
  const resolvedWorkspaceId = contextId ?? workspaceIdProp;
  const handleFinished = onCreateMockTest || onCreated;
  const { t, i18n } = useTranslation();

  const DIFFICULTY_LEVELS = useMemo(() => [
    { value: "easy", label: t("createGroupMockTestForm.difficulty.easy", "Easy") },
    { value: "medium", label: t("createGroupMockTestForm.difficulty.medium", "Medium") },
    { value: "hard", label: t("createGroupMockTestForm.difficulty.hard", "Hard") },
  ], [t]);

  const [step, setStep] = useState("BASIC"); // BASIC | STRUCTURE | GENERATING
  const [examName, setExamName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [totalQuestions, setTotalQuestions] = useState(30);
  const [duration, setDuration] = useState(60);

  const [sections, setSections] = useState([]);
  const [topNotice, setTopNotice] = useState("");
  const [examLanguage, setExamLanguage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState("");
  const [selectedMaterialIds, setSelectedMaterialIds] = useState(() => normalizeMaterialIds(selectedSourceIds));

  const [bloomMap, setBloomMap] = useState({});

  const {
    suggestion,
    isLoading: isSuggesting,
    error: suggestError,
    requestSuggestion,
    regenerate,
  } = useMockTestStructureSuggestion();

  const inputCls = [
    "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all",
    isDarkMode
      ? "bg-slate-800 border-slate-700 text-white focus:border-blue-400 placeholder:text-slate-500"
      : "bg-white border-[#BFDBFE] text-gray-900 focus:border-[#0455BF] placeholder:text-gray-400",
  ].join(" ");

  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`;

  // Fetch materials của workspace group
  useEffect(() => {
    const wsId = Number(resolvedWorkspaceId);
    if (!Number.isFinite(wsId) || wsId <= 0) {
      setMaterials([]);
      return undefined;
    }
    let cancelled = false;
    setMaterialsLoading(true);
    setMaterialsError("");
    (async () => {
      try {
        const res = await getMaterialsByWorkspace(wsId);
        if (cancelled) return;
        const list = unwrapMaterialList(res)
          .map((item, idx) => normalizeMaterialItem(item, idx, t))
          .filter(Boolean);
        setMaterials(list);
      } catch (e) {
        if (cancelled) return;
        setMaterials([]);
        setMaterialsError(e?.message || t("createGroupMockTestForm.errors.materialsLoadFailed", "Failed to load materials."));
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resolvedWorkspaceId, t]);

  const toggleMaterial = useCallback((materialId, checked) => {
    const id = Number(materialId);
    if (!Number.isFinite(id) || id <= 0) return;
    setSelectedMaterialIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
    if (typeof onToggleMaterialSelection === "function") {
      onToggleMaterialSelection(id, Boolean(checked));
    }
  }, [onToggleMaterialSelection]);

  const validMaterialIdSet = useMemo(
    () => new Set(materials.map((material) => material.id)),
    [materials],
  );

  const effectiveSelectedMaterialIds = useMemo(
    () => selectedMaterialIds.filter((id) => validMaterialIdSet.has(id)),
    [selectedMaterialIds, validMaterialIdSet],
  );

  const effectiveSelectedMaterialIdSet = useMemo(
    () => new Set(effectiveSelectedMaterialIds),
    [effectiveSelectedMaterialIds],
  );

  const selectAllMaterials = useCallback(() => {
    const ids = materials.map((m) => m.id);
    setSelectedMaterialIds(ids);
    if (typeof onToggleMaterialSelection === "function") {
      ids.forEach((id) => onToggleMaterialSelection(id, true));
    }
  }, [materials, onToggleMaterialSelection]);

  const clearSelectedMaterials = useCallback(() => {
    if (typeof onToggleMaterialSelection === "function") {
      effectiveSelectedMaterialIds.forEach((id) => onToggleMaterialSelection(id, false));
    }
    setSelectedMaterialIds([]);
  }, [effectiveSelectedMaterialIds, onToggleMaterialSelection]);

  const allMaterialsSelected = materials.length > 0
    && materials.every((material) => effectiveSelectedMaterialIdSet.has(material.id));

  // Fetch bloom dictionary 1 lần. Question type của mock-test do backend tự set SINGLE_CHOICE.
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
      setSections(suggestion.sections || []);
      setTopNotice(suggestion.description || "");
      setExamLanguage(normalizeExamLanguage(suggestion.examLanguage, uiLanguage));
      setStep("STRUCTURE");
    }
  }, [suggestion, i18n.language]);

  const handleRequestSuggestion = useCallback(async () => {
    setError("");
    if (!examName.trim()) {
      setError(t("createGroupMockTestForm.errors.missingExamName", "Please enter the exam name."));
      return;
    }
    const wsId = Number(resolvedWorkspaceId);
    if (!Number.isFinite(wsId) || wsId <= 0) {
      setError(t("createGroupMockTestForm.errors.workspaceIdMissing", "Could not determine the workspace."));
      return;
    }
    try {
      const uiLanguage = getUiLanguage(i18n.language);
      setExamLanguage("");
      await requestSuggestion({
        examName: examName.trim(),
        description: customPrompt?.trim() || undefined,
        totalQuestion: Number(totalQuestions) || 1,
        durationInMinute: Number(duration) || 60,
        overallDifficulty: uppercaseDifficulty(difficulty),
        outputLanguage: uiLanguage,
        workspaceId: wsId,
      });
    } catch (e) {
      setError(e?.message || t("createGroupMockTestForm.errors.generateFailed", "Failed to generate template. Please try again."));
    }
  }, [examName, customPrompt, totalQuestions, duration, difficulty, i18n.language, requestSuggestion, t, resolvedWorkspaceId]);

  const handleSubmit = useCallback(async () => {
    setError("");
    const validation = validateMockTestStructure(sections, Number(totalQuestions) || undefined, t);
    if (!validation.isValid) {
      setError(validation.errors.join(" | "));
      return;
    }
    setSubmitting(true);
    setStep("GENERATING");
    try {
      const sectionConfigs = sectionsToServerDTOs(sections, bloomMap);
      const uiLanguage = getUiLanguage(i18n.language);
      const payload = {
        title: examName.trim(),
        overallDifficulty: uppercaseDifficulty(difficulty),
        totalQuestion: Number(totalQuestions) || 1,
        durationInMinute: Number(duration) || 60,
        durationInSecond: 0,
        prompt: customPrompt?.trim() || "",
        outputLanguage: uiLanguage,
        examLanguage: normalizeExamLanguage(examLanguage, uiLanguage),
        materialIds: effectiveSelectedMaterialIds,
        workspaceId: Number(resolvedWorkspaceId),
        sectionConfigs,
      };
      const result = await generateMockTest(payload);
      handleFinished?.({
        quizId: result?.quizId,
        taskId: result?.taskId,
        websocketTaskId: result?.websocketTaskId,
        status: result?.status,
        ...result,
      });
    } catch (e) {
      console.error("Apply mock test template error:", e);
      setError(e?.message || t("createGroupMockTestForm.errors.createMockTestFailed", "Failed to create mock test. Please try again."));
      setStep("STRUCTURE");
    } finally {
      setSubmitting(false);
    }
  }, [sections, totalQuestions, bloomMap, examName, difficulty, duration, customPrompt, i18n.language, examLanguage, resolvedWorkspaceId, handleFinished, t, effectiveSelectedMaterialIds]);

  const handleBackToBasic = useCallback(() => {
    setStep("BASIC");
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors ${isDarkMode ? "border-slate-800" : "border-[#BFDBFE]"}`}>
        <button
          type="button"
          onClick={onBack}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-[#EFF6FF] text-gray-600"}`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <ClipboardList className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-[#0455BF]"}`} />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
            {t("createGroupMockTestForm.header.title", "Create Mock Test with AI")}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
          {t(
            "createGroupMockTestForm.description",
            "AI sẽ gợi ý cấu trúc đề. Leader có thể edit, sau đó tạo DRAFT cho cả nhóm. Tất cả thành viên sẽ làm cùng một đề."
          )}
        </p>

        {/* Step indicator */}
        <div className={`flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
          <span className={step === "BASIC" ? "font-semibold text-[#0455BF]" : ""}>{t("createGroupMockTestForm.steps.basic", "1. Configuration")}</span>
          <span>›</span>
          <span className={step === "STRUCTURE" ? "font-semibold text-[#0455BF]" : ""}>{t("createGroupMockTestForm.steps.structure", "2. Structure")}</span>
          <span>›</span>
          <span className={step === "GENERATING" ? "font-semibold text-[#0455BF]" : ""}>{t("createGroupMockTestForm.steps.generating", "3. Generate Questions")}</span>
        </div>

        {step === "BASIC" && (
          <>
            <div className={`rounded-lg border p-3 text-xs ${isDarkMode ? "border-blue-800/50 bg-blue-950/20 text-blue-200" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
              {t(
                "createGroupMockTestForm.scopeNotice",
                "Mock tests only generate single-answer multiple-choice questions. Listening, Writing, and Speaking are not supported, so AI will skip those parts. The generated test is saved as DRAFT so the leader can publish it later."
              )}
            </div>

            <div>
              <label className={labelCls}>
                {t("createGroupMockTestForm.examName.label", "Tên đề / mục tiêu")}
              </label>
              <input
                className={inputCls}
                placeholder={t(
                  "createGroupMockTestForm.examName.placeholder",
                  "Vd: TOEIC 900 (Reading), Đề thi Toán 12 cuối kỳ, AWS SAA-C03..."
                )}
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                disabled={isSuggesting}
              />
              <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                {t(
                  "createGroupMockTestForm.examName.hint",
                  "AI sẽ gợi ý cấu trúc bám sát đề thi này (chỉ phần trắc nghiệm)."
                )}
              </p>
            </div>

            <div>
              <label className={labelCls}>
                {t("createGroupMockTestForm.custom.label", "Hướng dẫn bổ sung (optional)")}
              </label>
              <textarea
                className={`${inputCls} min-h-[70px] resize-none`}
                placeholder={t(
                  "createGroupMockTestForm.custom.placeholder",
                  "Vd: Tập trung vào đạo hàm và tích phân, độ khó tăng dần..."
                )}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={isSuggesting}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>
                  {t("createGroupMockTestForm.fields.difficulty", "Độ khó")}
                </label>
                <select
                  className={inputCls}
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  disabled={isSuggesting}
                >
                  {DIFFICULTY_LEVELS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  {t("createGroupMockTestForm.fields.totalQuestions", "Số câu")}
                </label>
                <input
                  type="number"
                  className={inputCls}
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  min={5}
                  max={200}
                  disabled={isSuggesting}
                />
              </div>
              <div>
                <label className={labelCls}>
                  {t("createGroupMockTestForm.fields.duration", "Thời lượng (phút)")}
                </label>
                <input
                  type="number"
                  className={inputCls}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={5}
                  disabled={isSuggesting}
                />
              </div>
            </div>

            {/* Material picker */}
            <div className={`rounded-xl border p-3 space-y-3 ${isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-[#BFDBFE] bg-white"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className={`text-xs font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                  {t("createGroupMockTestForm.materials.title", "Tài liệu tham khảo")}
                </p>
                {materials.length > 0 && (
                  <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    {effectiveSelectedMaterialIds.length}/{materials.length}
                  </span>
                )}
              </div>
              {materialsLoading && (
                <div className={`flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t("createGroupMockTestForm.materials.loading", "Loading materials...")}
                </div>
              )}
              {materialsError && !materialsLoading && (
                <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-red-950/20 text-red-400 border border-red-900/30" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {materialsError}
                </div>
              )}
              {materials.length > 0 && !materialsLoading && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" variant="outline"
                      className={`h-7 px-3 text-[11px] ${isDarkMode ? "border-slate-700 text-slate-300" : "border-gray-200 text-gray-700"}`}
                      onClick={selectAllMaterials} disabled={allMaterialsSelected}>
                      {t("createGroupMockTestForm.materials.selectAll", "Select all")}
                    </Button>
                    <Button type="button" size="sm" variant="outline"
                      className={`h-7 px-3 text-[11px] ${isDarkMode ? "border-slate-700 text-slate-300" : "border-gray-200 text-gray-700"}`}
                      onClick={clearSelectedMaterials} disabled={effectiveSelectedMaterialIds.length === 0}>
                      {t("createGroupMockTestForm.materials.deselectAll", "Deselect all")}
                    </Button>
                  </div>
                  <div className={`max-h-36 overflow-y-auto rounded-lg border ${isDarkMode ? "border-slate-700 divide-y divide-slate-700" : "border-gray-200 divide-y divide-gray-100"}`}>
                    {materials.map((item) => (
                      <label key={item.id} className={`flex items-start gap-3 px-3 py-2 text-xs cursor-pointer ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-gray-50"}`}>
                        <Checkbox
                          checked={effectiveSelectedMaterialIdSet.has(item.id)}
                          onCheckedChange={(checked) => toggleMaterial(item.id, checked === true)}
                          className="mt-0.5 border-gray-300 data-[state=checked]:bg-[#0455BF] data-[state=checked]:border-[#0455BF]"
                        />
                        <span className={`min-w-0 flex-1 break-words ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                          {item.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              {materials.length === 0 && !materialsLoading && !materialsError && (
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  {t("createGroupMockTestForm.materials.empty", "No materials in this workspace yet. AI will generate questions from the exam name.")}
                </p>
              )}
            </div>

            {(error || suggestError) && (
              <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
                {error || suggestError?.message || t("createGroupMockTestForm.errors.genericGenerate", "An error occurred while generating the template.")}
              </div>
            )}
          </>
        )}

        {step === "STRUCTURE" && (
          <>
            <div className="flex items-center justify-between">
              <button type="button" onClick={handleBackToBasic} className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"}`}>
                <ChevronLeft className="w-3.5 h-3.5" /> {t("createGroupMockTestForm.structure.backToConfig", "Back to configuration")}
              </button>
              <Button type="button" size="sm" variant="outline" onClick={() => regenerate()} disabled={isSuggesting}>
                {isSuggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                {t("createGroupMockTestForm.structure.regenerate", "Regenerate")}
              </Button>
            </div>
            <MockTestStructureEditor
              sections={sections}
              onChange={setSections}
              targetTotalQuestions={Number(totalQuestions) || undefined}
              topNotice={topNotice}
            />
            {error && (
              <div className={`text-xs px-3 py-2 rounded-lg ${isDarkMode ? "bg-red-950/30 text-red-400" : "bg-red-50 text-red-600"}`}>
                {error}
              </div>
            )}
          </>
        )}

        {step === "GENERATING" && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Sparkles className={`w-10 h-10 animate-pulse ${isDarkMode ? "text-blue-400" : "text-[#0455BF]"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
              {t("createGroupMockTestForm.generating.title", "Generating questions for the mock test...")}
            </p>
            <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
              {t("createGroupMockTestForm.generating.hint", "This may take from 30 seconds to a few minutes depending on the number of questions. The test will be saved as DRAFT so you can publish it later.")}
            </p>
          </div>
        )}
      </div>

      <div className={`px-4 py-3 border-t flex justify-end gap-2 shrink-0 transition-colors ${isDarkMode ? "border-slate-800" : "border-[#BFDBFE]"}`}>
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSuggesting || submitting}
          className={isDarkMode ? "border-slate-700 text-slate-300" : "border-[#BFDBFE] text-gray-700"}
        >
          {t("createGroupMockTestForm.buttons.cancel", "Cancel")}
        </Button>

        {step === "BASIC" && (
          <Button
            onClick={handleRequestSuggestion}
            disabled={isSuggesting}
            className="bg-[#0455BF] hover:bg-blue-700 text-white"
          >
            {isSuggesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t("createGroupMockTestForm.buttons.requestingSuggestion", "Generating suggestion...")}
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 mr-2" />
                {t("createGroupMockTestForm.buttons.requestSuggestion", "Get structure suggestion")}
              </>
            )}
          </Button>
        )}

        {step === "STRUCTURE" && (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#0455BF] hover:bg-blue-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t("createGroupMockTestForm.buttons.creatingDraft", "Creating draft...")}
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                {t("createGroupMockTestForm.buttons.createDraft", "Create draft")}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
