import React, { useState } from "react";
import { Button } from "@/Components/ui/button";
import { ArrowLeft, Loader2, ScrollText, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

function CreateRoadmapForm({
  isDarkMode = false,
  onCreateRoadmap,
  onBack,
  hasPrelearning = true,
  selectedMaterialCount = 0,
  selectedMaterialIds = [],
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  const inputClass = `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${
    isDarkMode
      ? "border-white/10 bg-slate-950/60 text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
  }`;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onCreateRoadmap?.({
        mode: "ai",
        name: name.trim(),
        goal: goal.trim(),
        materialIds: selectedMaterialIds,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {typeof onBack === "function" ? (
          <button
            type="button"
            onClick={onBack}
            className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
              isDarkMode
                ? "border-white/10 bg-white/5 text-slate-200"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}

        <div className="min-w-0">
          <p className={`text-base font-semibold ${fontClass}`}>
            {t("workspace.shell.roadmapSetupTitle", "Thiết lập roadmap mới")}
          </p>
          <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            {t("workspace.shell.roadmapSetupHint", "Nhập tên và mục tiêu học tập. Hệ thống sẽ dựng roadmap xương cá từ cấu hình này.")}
          </p>
          <p className={`mt-2 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
            {selectedMaterialCount > 0
              ? t("workspace.shell.selectedMaterialCountHint", "{{count}} selected sources will be used for roadmap context.", {
                  count: selectedMaterialCount,
                  defaultValue: `${selectedMaterialCount} selected sources will be used for roadmap context.`,
                })
              : t("workspace.shell.noSelectedMaterialHint", "No sources selected yet. The roadmap can still be created from your workspace profile.")}
          </p>
        </div>
      </div>

      <div className={`flex items-start gap-3 border-b pb-4 ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            isDarkMode
              ? "bg-cyan-400/10 text-cyan-200"
              : "bg-emerald-50 text-emerald-600"
          }`}
        >
          <ScrollText className="h-5 w-5" />
        </span>
        <div className="space-y-1.5">
          <p className={`text-sm font-semibold ${fontClass}`}>
            {t("workspace.roadmap.aiOnlyTitle", "Roadmap được tạo bằng AI")}
          </p>
          <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            {t("workspace.roadmap.aiOnlyDescription", "AI sẽ dùng mục tiêu học và nguồn đã chọn để dựng phase, knowledge và checkpoint cho roadmap này.")}
          </p>
        </div>
      </div>

      {!hasPrelearning ? (
        <p className={`text-sm ${isDarkMode ? "text-amber-200" : "text-amber-700"}`}>
          {t("workspace.roadmap.prelearningRequired", "Cần bật pre-learning trong hồ sơ workspace trước khi tạo roadmap này.")}
        </p>
      ) : null}

      <div className="space-y-4">
        <div>
          <label className={`mb-2 block text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
            {t("workspace.roadmap.name")}
          </label>
          <input
            className={inputClass}
            placeholder={t("workspace.roadmap.namePlaceholder")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div>
          <label className={`mb-2 block text-xs font-semibold uppercase tracking-[0.18em] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
            {t("workspace.roadmap.goal")}
          </label>
          <textarea
            className={`${inputClass} min-h-[120px] resize-none`}
            placeholder={t("workspace.roadmap.goalPlaceholder")}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
          />
        </div>
      </div>

      <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
        {t("workspace.roadmap.aiGenerateHint", "Roadmap sẽ được tạo theo mục tiêu hiện tại và các nguồn đang chọn trong workspace.")}
      </p>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !name.trim() || !goal.trim()}
          className="rounded-2xl px-5"
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {submitting
            ? t("workspace.roadmap.generating", "Đang tạo roadmap")
            : t("workspace.roadmap.generateButton", "Tạo roadmap")}
        </Button>
      </div>
    </div>
  );
}

export default CreateRoadmapForm;
