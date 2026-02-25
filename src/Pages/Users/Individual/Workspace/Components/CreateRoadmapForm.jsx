import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, GitBranch, GraduationCap, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

// Form tạo Roadmap — hiển thị inline trong ChatPanel thay vì popup
function CreateRoadmapForm({ isDarkMode = false, onCreateRoadmap, onBack, hasPrelearning = false }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [tab, setTab] = useState("manual");
  const [submitting, setSubmitting] = useState(false);

  // State tab Manual
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [phases, setPhases] = useState([]);

  // Thêm phase
  const addPhase = () => {
    setPhases((prev) => [...prev, { name: "", knowledges: [] }]);
  };

  // Xóa phase
  const removePhase = (idx) => {
    setPhases((prev) => prev.filter((_, i) => i !== idx));
  };

  // Cập nhật tên phase
  const updatePhaseName = (idx, value) => {
    setPhases((prev) => prev.map((p, i) => i === idx ? { ...p, name: value } : p));
  };

  // Thêm knowledge vào phase
  const addKnowledge = (phaseIdx) => {
    setPhases((prev) => prev.map((p, i) =>
      i === phaseIdx ? { ...p, knowledges: [...p.knowledges, { name: "" }] } : p
    ));
  };

  // Xóa knowledge
  const removeKnowledge = (phaseIdx, kIdx) => {
    setPhases((prev) => prev.map((p, i) =>
      i === phaseIdx ? { ...p, knowledges: p.knowledges.filter((_, ki) => ki !== kIdx) } : p
    ));
  };

  // Cập nhật knowledge
  const updateKnowledge = (phaseIdx, kIdx, value) => {
    setPhases((prev) => prev.map((p, i) =>
      i === phaseIdx ? {
        ...p, knowledges: p.knowledges.map((k, ki) => ki === kIdx ? { ...k, name: value } : k),
      } : p
    ));
  };

  // Xử lý submit
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const data = tab === "manual"
        ? { mode: "manual", name, goal, phases }
        : { mode: "ai", name, goal };
      await onCreateRoadmap?.(data);
    } catch {
      // Lỗi xử lý bởi component cha
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500"
              : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"
  }`;

  const tabCls = (key) => `flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
    tab === key
      ? isDarkMode ? "bg-slate-800 text-blue-300" : "bg-white text-blue-700 shadow-sm"
      : isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
  }`;

  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header với nút quay lại */}
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button type="button" onClick={onBack} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-emerald-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
            {t("workspace.roadmap.createTitle")}
          </p>
        </div>
      </div>

      {/* Nội dung form cuộn được */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t("workspace.roadmap.createDesc")}
        </p>

        {/* Tab chọn chế độ */}
        <div className={`flex gap-1 rounded-lg p-1 ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
          <button type="button" onClick={() => setTab("manual")} className={tabCls("manual")}>{t("workspace.roadmap.tabManual")}</button>
          <button type="button" onClick={() => setTab("ai")} className={tabCls("ai")}>{t("workspace.roadmap.tabAI")}</button>
        </div>

        {tab === "manual" ? (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>{t("workspace.roadmap.name")}</label>
              <input className={inputCls} placeholder={t("workspace.roadmap.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t("workspace.roadmap.goal")}</label>
              <textarea className={`${inputCls} min-h-[60px] resize-none`} placeholder={t("workspace.roadmap.goalPlaceholder")} value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>

            {/* Danh sách phases */}
            <div className="space-y-3">
              {phases.map((phase, pIdx) => (
                <div key={pIdx} className={`rounded-lg border p-3 space-y-2 ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-gray-200 bg-gray-50"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      Phase {pIdx + 1}
                    </span>
                    <button onClick={() => removePhase(pIdx)} className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                  <input className={inputCls} placeholder={t("workspace.roadmap.phaseNamePlaceholder")} value={phase.name} onChange={(e) => updatePhaseName(pIdx, e.target.value)} />

                  {/* Danh sách knowledge trong phase */}
                  <div className="pl-3 space-y-1.5">
                    {phase.knowledges.map((k, kIdx) => (
                      <div key={kIdx} className="flex items-center gap-2">
                        <input className={`${inputCls} flex-1`} placeholder={t("workspace.roadmap.knowledgeNamePlaceholder")} value={k.name} onChange={(e) => updateKnowledge(pIdx, kIdx, e.target.value)} />
                        <button onClick={() => removeKnowledge(pIdx, kIdx)} className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded shrink-0">
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addKnowledge(pIdx)} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> {t("workspace.roadmap.addKnowledge")}
                    </button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addPhase} className={`w-full ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
                <Plus className="w-4 h-4 mr-2" /> {t("workspace.roadmap.addPhase")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tab AI — yêu cầu làm pre-learning trước */}
            {!hasPrelearning ? (
              <div className={`rounded-xl p-6 text-center space-y-3 border ${
                isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-amber-200 bg-amber-50"
              }`}>
                <GraduationCap className={`w-10 h-10 mx-auto ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
                <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
                  {t("workspace.roadmap.prelearningRequired")}
                </p>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                  {t("workspace.chat.prelearningDesc")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>{t("workspace.roadmap.name")}</label>
                  <input className={inputCls} placeholder={t("workspace.roadmap.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>{t("workspace.roadmap.goal")}</label>
                  <textarea className={`${inputCls} min-h-[60px] resize-none`} placeholder={t("workspace.roadmap.goalPlaceholder")} value={goal} onChange={(e) => setGoal(e.target.value)} />
                </div>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                  {t("workspace.roadmap.editBeforeConfirm")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nút hành động cố định dưới cùng */}
      <div className={`px-4 py-3 border-t flex justify-end gap-2 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <Button variant="outline" onClick={onBack} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
          {t("workspace.roadmap.cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || (tab === "ai" && !hasPrelearning)} className="bg-[#2563EB] hover:bg-blue-700 text-white">
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {tab === "manual"
            ? (submitting ? t("workspace.roadmap.creating") : t("workspace.roadmap.create"))
            : (submitting ? t("workspace.roadmap.generating") : t("workspace.roadmap.generateAI"))
          }
        </Button>
      </div>
    </div>
  );
}

export default CreateRoadmapForm;
