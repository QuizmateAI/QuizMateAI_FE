import React, { useMemo, useState } from "react";
import { Button } from "@/Components/ui/button";
import { ArrowLeft, CheckSquare, CreditCard, Loader2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { generateAIFlashcardSet } from "@/api/FlashcardAPI";

const DEFAULT_DISTRIBUTION = { termPercent: 30, qaPercent: 30, clozePercent: 20, imagePercent: 20 };

function CreateFlashcardForm({
  isDarkMode = false,
  onCreateFlashcard,
  onBack,
  contextId: defaultContextId,
  sources = [],
  selectedSourceIds = [],
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const [submitting, setSubmitting] = useState(false);
  const [aiTotalCards, setAiTotalCards] = useState(20);
  const [aiPrompt, setAiPrompt] = useState("");
  const [distribution, setDistribution] = useState(DEFAULT_DISTRIBUTION);

  const isMaterialReadyForFlashcard = (status) => String(status || "").toUpperCase() === "ACTIVE";

  const selectedSourceIdSet = useMemo(() => new Set(
    Array.isArray(selectedSourceIds) ? selectedSourceIds.map((id) => Number(id)) : []
  ), [selectedSourceIds]);

  const normalizedSources = useMemo(
    () => (Array.isArray(sources) ? sources : []).map((src) => ({
      id: Number(src?.id ?? src?.materialId),
      name: src?.name || src?.title || `Material #${src?.id ?? src?.materialId}`,
      status: String(src?.status || "").toUpperCase(),
    })).filter((src) => src.id > 0),
    [sources]
  );

  const selectedSourceItems = useMemo(
    () => normalizedSources.filter((src) => selectedSourceIdSet.has(src.id)),
    [normalizedSources, selectedSourceIdSet]
  );

  const selectedReadySourceItems = useMemo(
    () => selectedSourceItems.filter((src) => isMaterialReadyForFlashcard(src.status)),
    [selectedSourceItems]
  );

  const selectedNotReadySourceItems = useMemo(
    () => selectedSourceItems.filter((src) => !isMaterialReadyForFlashcard(src.status)),
    [selectedSourceItems]
  );

  const selectedMaterialIds = useMemo(
    () => selectedReadySourceItems.map((item) => item.id),
    [selectedReadySourceItems]
  );

  const distributionSum = useMemo(
    () => (Number(distribution.termPercent) || 0)
      + (Number(distribution.qaPercent) || 0)
      + (Number(distribution.clozePercent) || 0)
      + (Number(distribution.imagePercent) || 0),
    [distribution]
  );

  const canSubmit = Number(defaultContextId) > 0
    && selectedMaterialIds.length > 0
    && Number(aiTotalCards) > 0
    && Number(aiTotalCards) <= 200
    && distributionSum === 100;

  const onDistributionChange = (field, value) => {
    const parsed = Number(value);
    const safeValue = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
    setDistribution((prev) => ({ ...prev, [field]: safeValue }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const payload = {
        materialId: Number(selectedMaterialIds[0]),
        workspaceId: Number(defaultContextId),
        quantity: Number(aiTotalCards),
        ...distribution,
      };

      const prompt = aiPrompt.trim();
      if (prompt) payload.additionalPrompt = prompt;

      const res = await generateAIFlashcardSet(payload);
      await onCreateFlashcard?.(res?.data || res);
    } catch (err) {
      console.error("Lỗi tạo flashcard AI:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${isDarkMode
    ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500"
    : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"}`;
  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;

  return (
    <div className="flex flex-col h-full">
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${
        isDarkMode ? "border-slate-800" : "border-gray-200"
      }`}>
        <button
          type="button"
          onClick={onBack}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-amber-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
            {t("workspace.flashcard.createTitle")}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t("workspace.flashcard.createDesc")}
        </p>

        <div className={`rounded-lg border p-3 space-y-1.5 ${isDarkMode ? "border-slate-700 bg-slate-800/30" : "border-blue-200 bg-blue-50/30"}`}>
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
            <span className={`text-xs font-semibold ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
              {t("workspace.flashcard.generateAI", "Generate by AI")}
            </span>
          </div>
          <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
            {t("workspace.flashcard.aiOnlyHint", "Flashcard will be generated directly in current context.")}
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
            <CheckSquare className="w-4 h-4 text-green-500" /> {t("workspace.quiz.aiConfig.selectedMaterials")}
          </h3>
          {selectedMaterialIds.length > 0 ? (
            <div className="space-y-2">
              <div className={`text-xs px-3 py-2.5 rounded-lg ${isDarkMode ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                {t("workspace.quiz.aiConfig.selectedMaterialsCount", { count: selectedMaterialIds.length })}
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                {selectedReadySourceItems.map((item) => (
                  <div key={item.id} className={`text-xs px-2.5 py-1.5 rounded-md border ${isDarkMode ? "border-slate-700 text-slate-300 bg-slate-800/60" : "border-gray-200 text-gray-700 bg-gray-50"}`}>
                    {item.name || `Material #${item.id}`}
                  </div>
                ))}
              </div>
              {selectedNotReadySourceItems.length > 0 && (
                <div className={`text-xs px-3 py-2.5 rounded-lg ${isDarkMode ? "bg-amber-950/20 text-amber-400 border border-amber-900/30" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                  {t("workspace.flashcard.aiConfig.nonActiveMaterialsWarning", {
                    count: selectedNotReadySourceItems.length,
                    defaultValue: `${selectedNotReadySourceItems.length} tài liệu chưa ACTIVE nên chưa thể dùng tạo flashcard AI.`,
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className={`text-xs px-3 py-2.5 rounded-lg ${isDarkMode ? "bg-amber-950/20 text-amber-400 border border-amber-900/30" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
              {selectedSourceItems.length > 0
                ? t("workspace.flashcard.aiConfig.noActiveSelectedMaterials", "Chưa có tài liệu ACTIVE trong danh sách đã chọn. Vui lòng đợi xử lý tài liệu hoàn tất.")
                : t("workspace.quiz.aiConfig.noSelectedMaterials")}
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>{t("workspace.flashcard.aiConfig.totalCards", "Tổng số thẻ")}</label>
          <input
            type="number"
            className={inputCls}
            value={aiTotalCards}
            onChange={(e) => setAiTotalCards(Number(e.target.value))}
            min={1}
            max={200}
          />
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-gray-100 shadow-sm"}`}>
          <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
            {t("workspace.flashcard.aiConfig.distributionTitle", "Phân bổ loại thẻ (%)")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t("workspace.flashcard.aiConfig.termPercent", "Term")}</label>
              <input type="number" className={inputCls} min={0} max={100} value={distribution.termPercent} onChange={(e) => onDistributionChange("termPercent", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t("workspace.flashcard.aiConfig.qaPercent", "Q&A")}</label>
              <input type="number" className={inputCls} min={0} max={100} value={distribution.qaPercent} onChange={(e) => onDistributionChange("qaPercent", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t("workspace.flashcard.aiConfig.clozePercent", "Cloze")}</label>
              <input type="number" className={inputCls} min={0} max={100} value={distribution.clozePercent} onChange={(e) => onDistributionChange("clozePercent", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t("workspace.flashcard.aiConfig.imagePercent", "Image")}</label>
              <input type="number" className={inputCls} min={0} max={100} value={distribution.imagePercent} onChange={(e) => onDistributionChange("imagePercent", e.target.value)} />
            </div>
          </div>
          <p className={`mt-2 text-xs ${distributionSum === 100
            ? (isDarkMode ? "text-emerald-400" : "text-emerald-700")
            : (isDarkMode ? "text-amber-400" : "text-amber-700")
          } ${fontClass}`}>
            {distributionSum === 100
              ? t("workspace.flashcard.aiConfig.distributionValid", "Tổng tỷ lệ = 100%")
              : t("workspace.flashcard.aiConfig.distributionInvalid", { sum: distributionSum, defaultValue: `Tổng tỷ lệ hiện tại: ${distributionSum}%. Cần bằng 100%.` })}
          </p>
        </div>

        <div>
          <label className={labelCls}>{t("workspace.flashcard.aiConfig.additionalPrompt", "Yêu cầu bổ sung")}</label>
          <textarea
            className={`${inputCls} min-h-[100px] resize-none`}
            placeholder={t("workspace.flashcard.aiConfig.promptPlaceholder")}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
          />
        </div>
      </div>

      <div className={`px-4 py-3 border-t flex justify-end gap-2 shrink-0 transition-colors duration-300 ${
        isDarkMode ? "border-slate-800" : "border-gray-200"
      }`}>
        <Button variant="outline" onClick={onBack} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
          {t("workspace.flashcard.cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || !canSubmit} className="bg-[#2563EB] hover:bg-blue-700 text-white">
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {submitting ? t("workspace.flashcard.generating") : t("workspace.flashcard.generateAI")}
        </Button>
      </div>
    </div>
  );
}

export default CreateFlashcardForm;
