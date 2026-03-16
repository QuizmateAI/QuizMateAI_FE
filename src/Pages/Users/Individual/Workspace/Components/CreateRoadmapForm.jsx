import React, { useState } from "react";
import { Button } from "@/Components/ui/button";
import { ArrowLeft, Eye, GitBranch, Loader2, Rows3, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

function CreateRoadmapForm({ isDarkMode = false, onCreateRoadmap, onBack, hasPrelearning = true }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [canvasView, setCanvasView] = useState("view1");

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onCreateRoadmap?.({
        mode: "ai",
        name: name.trim(),
        goal: goal.trim(),
        canvasView,
      });
    } catch {
      // Error handling stays in parent flow.
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500" : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"}`;
  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;
  const panelCls = isDarkMode ? "border-slate-800 bg-slate-900/40" : "border-sky-100 bg-sky-50/70";
  const viewOptions = [
    {
      key: "view1",
      icon: Eye,
      title: t("workspace.roadmap.canvasView1Title"),
      description: t("workspace.roadmap.canvasView1Description"),
    },
    {
      key: "view2",
      icon: Rows3,
      title: t("workspace.roadmap.canvasView2Title"),
      description: t("workspace.roadmap.canvasView2Description"),
    },
  ];

  return (
    <div className={`flex flex-col h-full ${fontClass}`}>
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button
          type="button"
          onClick={onBack}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-emerald-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
            {t("workspace.roadmap.createTitle")}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
          {t("workspace.roadmap.createDesc")}
        </p>

        <div className={`rounded-2xl border p-4 space-y-4 ${panelCls}`}>
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isDarkMode ? "bg-slate-800 text-sky-300" : "bg-white text-sky-600"}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}>
                {t("workspace.roadmap.aiOnlyTitle")}
              </p>
              <p className={`text-xs leading-5 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                {t("workspace.roadmap.aiOnlyDescription")}
              </p>
            </div>
          </div>

          {!hasPrelearning ? (
            <div className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${isDarkMode ? "border-amber-900/60 bg-amber-950/30 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              {t("workspace.roadmap.prelearningRequired")}
            </div>
          ) : null}

          <div className="space-y-4">
            <div>
              <label className={labelCls}>{t("workspace.roadmap.name")}</label>
              <input
                className={inputCls}
                placeholder={t("workspace.roadmap.namePlaceholder")}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>{t("workspace.roadmap.goal")}</label>
              <textarea
                className={`${inputCls} min-h-[88px] resize-none`}
                placeholder={t("workspace.roadmap.goalPlaceholder")}
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
              />
            </div>

            <div className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${isDarkMode ? "border-slate-700 bg-slate-800/70 text-slate-300" : "border-sky-200 bg-white text-gray-600"}`}>
              {t("workspace.roadmap.aiGenerateHint")}
            </div>

            <div>
              <label className={labelCls}>{t("workspace.roadmap.canvasViewLabel")}</label>
              <p className={`mb-2 text-xs ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                {t("workspace.roadmap.canvasViewHint")}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {viewOptions.map((option) => {
                  const isSelected = canvasView === option.key;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setCanvasView(option.key)}
                      className={`rounded-2xl border p-4 text-left transition-all ${isSelected
                        ? isDarkMode
                          ? "border-sky-400 bg-sky-500/10"
                          : "border-sky-500 bg-sky-50"
                        : isDarkMode
                          ? "border-slate-700 bg-slate-900/60 hover:border-slate-600"
                          : "border-gray-200 bg-white hover:border-gray-300"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isSelected
                          ? isDarkMode
                            ? "bg-sky-500/20 text-sky-300"
                            : "bg-sky-100 text-sky-700"
                          : isDarkMode
                            ? "bg-slate-800 text-slate-300"
                            : "bg-gray-100 text-gray-600"}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className={`mt-1 h-4 w-4 rounded-full border ${isSelected
                          ? "border-sky-500 bg-sky-500"
                          : isDarkMode
                            ? "border-slate-600"
                            : "border-gray-300"}`}
                        >
                          <span className="block h-full w-full scale-50 rounded-full bg-white" />
                        </div>
                      </div>
                      <p className={`mt-3 text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}>
                        {option.title}
                      </p>
                      <p className={`mt-1 text-xs leading-5 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`p-4 border-t shrink-0 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <Button
          onClick={handleSubmit}
          disabled={submitting || !name.trim() || !goal.trim()}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {submitting ? t("workspace.roadmap.generating") : t("workspace.roadmap.generateButton")}
        </Button>
      </div>
    </div>
  );
}

export default CreateRoadmapForm;
