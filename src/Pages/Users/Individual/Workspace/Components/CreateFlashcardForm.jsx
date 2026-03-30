import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/Components/ui/button";
import { ArrowLeft, CheckSquare, CreditCard, Loader2, Lock, Sparkles, Unlock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { generateAIFlashcardSet } from "@/api/FlashcardAPI";

const DEFAULT_DISTRIBUTION = {
  termPercent: 30,
  qaPercent: 30,
  clozePercent: 20,
  imagePercent: 20,
};

const DISTRIBUTION_FIELDS = [
  { key: "termPercent", labelKey: "workspace.flashcard.cardTypes.termDefinition", fallback: "Term - Definition" },
  { key: "qaPercent", labelKey: "workspace.flashcard.cardTypes.questionAnswer", fallback: "Question - Answer" },
  { key: "clozePercent", labelKey: "workspace.flashcard.cardTypes.cloze", fallback: "Cloze" },
  { key: "imagePercent", labelKey: "workspace.flashcard.cardTypes.imageDescription", fallback: "Image - Description" },
];

const roundDistributionValue = (value, unitByCount) => (
  unitByCount ? Math.round(value) : Math.round(value * 100) / 100
);

const normalizeDistributionValue = (value, unitByCount) => {
  const raw = Math.max(0, Number(value) || 0);
  return roundDistributionValue(raw, unitByCount);
};

const createUniqueKeyOrder = (...groups) => [...new Set(groups.flat().filter(Boolean))];

const getDistributionTarget = (totalCards, unitByCount) => (
  unitByCount ? Math.max(0, Math.round(Number(totalCards) || 0)) : 100
);

const applyDistributionDelta = (values, delta, unitByCount, candidateKeys) => {
  let remaining = unitByCount ? Math.trunc(delta) : Math.round(delta * 100) / 100;
  if (remaining === 0) return values;

  for (const key of candidateKeys) {
    if (!key) continue;

    if (remaining > 0) {
      values[key] = normalizeDistributionValue(values[key] + remaining, unitByCount);
      remaining = 0;
      break;
    }

    const removable = Math.max(0, Number(values[key]) || 0);
    if (removable <= 0) continue;

    const appliedDelta = Math.max(remaining, -removable);
    values[key] = normalizeDistributionValue(values[key] + appliedDelta, unitByCount);
    remaining = unitByCount
      ? remaining - appliedDelta
      : Math.round((remaining - appliedDelta) * 100) / 100;

    if (remaining === 0) break;
  }

  return values;
};

const convertDistributionValuesByUnit = (values, fromUnitByCount, toUnitByCount, totalCards) => {
  if (fromUnitByCount === toUnitByCount) return values;

  const total = Math.max(1, Math.round(Number(totalCards) || 0));
  return DISTRIBUTION_FIELDS.reduce((acc, field) => {
    const raw = Math.max(0, Number(values?.[field.key]) || 0);
    acc[field.key] = toUnitByCount
      ? Math.round((raw / 100) * total)
      : Math.round(((raw / total) * 100) * 100) / 100;
    return acc;
  }, {});
};

const balanceDistributionValues = (values, targetTotal, unitByCount, lockedKeys = [], changedKey = null) => {
  const keys = DISTRIBUTION_FIELDS.map((field) => field.key);
  const validLockedKeys = keys.filter((key) => lockedKeys.includes(key));
  const next = keys.reduce((acc, key) => {
    acc[key] = normalizeDistributionValue(values?.[key], unitByCount);
    return acc;
  }, {});

  const target = getDistributionTarget(targetTotal, unitByCount);
  const preservedKeys = createUniqueKeyOrder(validLockedKeys, changedKey ? [changedKey] : []);

  if (changedKey && preservedKeys.includes(changedKey)) {
    const otherPreservedTotal = preservedKeys
      .filter((key) => key !== changedKey)
      .reduce((sum, key) => sum + next[key], 0);
    next[changedKey] = Math.min(next[changedKey], Math.max(0, target - otherPreservedTotal));
  }

  const adjustableKeys = keys.filter((key) => !preservedKeys.includes(key));
  const preservedTotal = preservedKeys.reduce((sum, key) => sum + next[key], 0);
  const remaining = Math.max(0, target - preservedTotal);

  if (adjustableKeys.length > 0) {
    const adjustableTotal = adjustableKeys.reduce((sum, key) => sum + next[key], 0);

    if (unitByCount) {
      const rawShares = adjustableKeys.map((key) => (
        adjustableTotal > 0
          ? (next[key] / adjustableTotal) * remaining
          : remaining / adjustableKeys.length
      ));
      const flooredShares = rawShares.map((value) => Math.floor(value));
      let leftover = Math.max(0, remaining - flooredShares.reduce((sum, value) => sum + value, 0));

      adjustableKeys.forEach((key, index) => {
        next[key] = flooredShares[index];
      });

      const order = rawShares
        .map((value, index) => ({ index, fraction: value - flooredShares[index] }))
        .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

      for (let index = 0; index < leftover; index += 1) {
        const targetKey = adjustableKeys[order[index % order.length].index];
        next[targetKey] += 1;
      }
    } else {
      const rawShares = adjustableKeys.map((key) => (
        adjustableTotal > 0
          ? (next[key] / adjustableTotal) * remaining
          : remaining / adjustableKeys.length
      ));
      const flooredShares = rawShares.map((value) => Math.floor(value * 100) / 100);
      const distributedTotal = flooredShares.reduce((sum, value) => sum + value, 0);
      const delta = Math.round((remaining - distributedTotal) * 100) / 100;

      adjustableKeys.forEach((key, index) => {
        next[key] = flooredShares[index];
      });

      if (adjustableKeys.length > 0 && delta !== 0) {
        const lastAdjustableKey = adjustableKeys[adjustableKeys.length - 1];
        next[lastAdjustableKey] = normalizeDistributionValue(next[lastAdjustableKey] + delta, unitByCount);
      }
    }
  }

  const getCurrentTotal = () => keys.reduce((sum, key) => sum + next[key], 0);
  let delta = unitByCount
    ? target - getCurrentTotal()
    : Math.round((target - getCurrentTotal()) * 100) / 100;

  if (delta !== 0) {
    const positiveCandidates = createUniqueKeyOrder(
      [...adjustableKeys].reverse(),
      changedKey ? [changedKey] : [],
      [...validLockedKeys].reverse(),
      [...keys].reverse(),
    );
    const negativeCandidates = createUniqueKeyOrder(
      changedKey ? [changedKey] : [],
      [...adjustableKeys].reverse(),
      [...validLockedKeys].reverse(),
      [...keys].reverse(),
    );

    applyDistributionDelta(next, delta, unitByCount, delta > 0 ? positiveCandidates : negativeCandidates);
  }

  delta = unitByCount
    ? target - getCurrentTotal()
    : Math.round((target - getCurrentTotal()) * 100) / 100;

  if (delta !== 0) {
    applyDistributionDelta(next, delta, unitByCount, [...keys].reverse());
  }

  return next;
};

const formatDistributionDisplay = (value, unitByCount) => {
  const rounded = roundDistributionValue(Number(value) || 0, unitByCount);
  return Number(rounded.toFixed(unitByCount ? 0 : 2)).toString();
};

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
  const [distributionUnitByCount, setDistributionUnitByCount] = useState(false);
  const [lockedDistributionFields, setLockedDistributionFields] = useState([]);
  const prevDistributionUnitRef = useRef(distributionUnitByCount);

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

  const distributionTarget = useMemo(
    () => getDistributionTarget(aiTotalCards, distributionUnitByCount),
    [aiTotalCards, distributionUnitByCount]
  );

  const distributionSum = useMemo(
    () => DISTRIBUTION_FIELDS.reduce((sum, field) => sum + (Number(distribution[field.key]) || 0), 0),
    [distribution]
  );

  const isDistributionValid = Math.abs(distributionSum - distributionTarget) <= 0.01;

  const canSubmit = Number(defaultContextId) > 0
    && selectedMaterialIds.length > 0
    && Number(aiTotalCards) > 0
    && Number(aiTotalCards) <= 200
    && isDistributionValid;

  useEffect(() => {
    const target = getDistributionTarget(aiTotalCards, distributionUnitByCount);

    if (prevDistributionUnitRef.current !== distributionUnitByCount) {
      setDistribution((prev) => balanceDistributionValues(
        convertDistributionValuesByUnit(prev, prevDistributionUnitRef.current, distributionUnitByCount, aiTotalCards),
        target,
        distributionUnitByCount,
        lockedDistributionFields,
      ));
      prevDistributionUnitRef.current = distributionUnitByCount;
      return;
    }

    setDistribution((prev) => balanceDistributionValues(
      prev,
      target,
      distributionUnitByCount,
      lockedDistributionFields,
    ));
  }, [aiTotalCards, distributionUnitByCount, lockedDistributionFields]);

  const onDistributionChange = (field, value) => {
    const parsed = normalizeDistributionValue(value, distributionUnitByCount);
    const safeValue = distributionUnitByCount
      ? Math.min(distributionTarget, parsed)
      : Math.min(100, parsed);

    setDistribution((prev) => balanceDistributionValues(
      { ...prev, [field]: safeValue },
      distributionTarget,
      distributionUnitByCount,
      lockedDistributionFields,
      field,
    ));
  };

  const toggleDistributionLock = (field) => {
    setLockedDistributionFields((prev) => {
      if (prev.includes(field)) return prev.filter((item) => item !== field);
      if (prev.length >= 2) return prev;
      return [...prev, field];
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const payloadDistribution = distributionUnitByCount
        ? balanceDistributionValues(
            convertDistributionValuesByUnit(distribution, true, false, aiTotalCards),
            100,
            false,
          )
        : balanceDistributionValues(distribution, 100, false);

      const payload = {
        materialId: Number(selectedMaterialIds[0]),
        workspaceId: Number(defaultContextId),
        quantity: Number(aiTotalCards),
        ...payloadDistribution,
      };

      const prompt = aiPrompt.trim();
      if (prompt) payload.additionalPrompt = prompt;

      const res = await generateAIFlashcardSet(payload);
      await onCreateFlashcard?.(res?.data || res);
    } catch (err) {
      console.error("Loi tao the ghi nho AI:", err);
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
                    defaultValue: `${selectedNotReadySourceItems.length} tai lieu chua ACTIVE nen chua the dung tao the ghi nho AI.`,
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className={`text-xs px-3 py-2.5 rounded-lg ${isDarkMode ? "bg-amber-950/20 text-amber-400 border border-amber-900/30" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
              {selectedSourceItems.length > 0
                ? t("workspace.flashcard.aiConfig.noActiveSelectedMaterials", "Chua co tai lieu ACTIVE trong danh sach da chon. Vui long doi xu ly tai lieu hoan tat.")
                : t("workspace.quiz.aiConfig.noSelectedMaterials")}
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>{t("workspace.flashcard.aiConfig.totalCards", "Tong so the")}</label>
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
            {t("workspace.flashcard.aiConfig.distributionTitle", "Phan bo loai the ghi nho")}
          </h3>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDistributionUnitByCount(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !distributionUnitByCount
                  ? isDarkMode ? "bg-blue-600/20 text-blue-300 border border-blue-500/40" : "bg-blue-50 text-blue-700 border border-blue-200"
                  : isDarkMode ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-gray-50 text-gray-600 border border-gray-200"
              }`}
            >
              {t("workspace.flashcard.aiConfig.byPercent", "By percentage")}
            </button>
            <button
              type="button"
              onClick={() => setDistributionUnitByCount(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                distributionUnitByCount
                  ? isDarkMode ? "bg-blue-600/20 text-blue-300 border border-blue-500/40" : "bg-blue-50 text-blue-700 border border-blue-200"
                  : isDarkMode ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-gray-50 text-gray-600 border border-gray-200"
              }`}
            >
              {t("workspace.flashcard.aiConfig.byCount", "By count")}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {DISTRIBUTION_FIELDS.map((field) => {
              const isLocked = lockedDistributionFields.includes(field.key);
              const lockDisabled = !isLocked && lockedDistributionFields.length >= 2;

              return (
                <div key={field.key}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className={labelCls}>
                      {t(field.labelKey, field.fallback)} ({distributionUnitByCount ? t("workspace.flashcard.cards") : "%"})
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleDistributionLock(field.key)}
                      disabled={lockDisabled}
                      className={`p-1 rounded transition-colors ${
                        lockDisabled
                          ? "opacity-40 cursor-not-allowed"
                          : isLocked
                            ? "text-blue-500"
                            : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700")
                      }`}
                      title={isLocked ? t("workspace.quiz.aiConfig.unlock") : t("workspace.quiz.aiConfig.lock")}
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <input
                    type="number"
                    className={inputCls}
                    min={0}
                    max={distributionUnitByCount ? distributionTarget : 100}
                    value={distribution[field.key]}
                    onChange={(e) => onDistributionChange(field.key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>

          <p className={`mt-2 text-xs ${isDistributionValid
            ? (isDarkMode ? "text-emerald-400" : "text-emerald-700")
            : (isDarkMode ? "text-amber-400" : "text-amber-700")
          } ${fontClass}`}>
            {distributionUnitByCount
              ? `${formatDistributionDisplay(distributionSum, true)}/${distributionTarget} ${t("workspace.flashcard.cards")}`
              : `${formatDistributionDisplay(distributionSum, false)}%`}
          </p>

          <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {t("workspace.flashcard.aiConfig.lockLimitHint", {
              count: 2,
              defaultValue: "Lock up to 2 card types. The remaining types will auto-balance.",
            })}
          </p>
        </div>

        <div>
          <label className={labelCls}>{t("workspace.flashcard.aiConfig.additionalPrompt", "Yeu cau bo sung")}</label>
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
