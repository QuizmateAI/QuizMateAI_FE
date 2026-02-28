import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus, Trash2, Loader2, GitBranch, GraduationCap, ArrowLeft,
  FolderOpen, FileText, MoreVertical, Pencil, ChevronRight, Folder,
} from "lucide-react";
import { useTranslation } from "react-i18next";

// Form tạo Roadmap — layout kiểu Google Drive file view
function CreateRoadmapForm({ isDarkMode = false, onCreateRoadmap, onBack, hasPrelearning = false }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [tab, setTab] = useState("manual");
  const [submitting, setSubmitting] = useState(false);
  const [activePhaseIdx, setActivePhaseIdx] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(null);
  const editRef = useRef(null);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [phases, setPhases] = useState([]);

  // === Phase CRUD ===
  const addPhase = () => setPhases((prev) => [...prev, { name: `Phase ${prev.length + 1}`, knowledges: [] }]);
  const removePhase = (idx) => {
    if (activePhaseIdx === idx) setActivePhaseIdx(null);
    else if (activePhaseIdx !== null && idx < activePhaseIdx) setActivePhaseIdx((p) => p - 1);
    setPhases((prev) => prev.filter((_, i) => i !== idx));
    setMenuOpen(null);
  };
  const renamePhase = (idx, val) => setPhases((prev) => prev.map((p, i) => (i === idx ? { ...p, name: val } : p)));

  // === Knowledge CRUD ===
  const addKnowledge = (pIdx) =>
    setPhases((prev) => prev.map((p, i) => (i === pIdx ? { ...p, knowledges: [...p.knowledges, { name: `Knowledge ${p.knowledges.length + 1}` }] } : p)));
  const removeKnowledge = (pIdx, kIdx) => {
    setPhases((prev) => prev.map((p, i) => (i === pIdx ? { ...p, knowledges: p.knowledges.filter((_, ki) => ki !== kIdx) } : p)));
    setMenuOpen(null);
  };
  const renameKnowledge = (pIdx, kIdx, val) =>
    setPhases((prev) => prev.map((p, i) => (i === pIdx ? { ...p, knowledges: p.knowledges.map((k, ki) => (ki === kIdx ? { ...k, name: val } : k)) } : p)));

  // === Inline edit ===
  const startEdit = (type, idx) => {
    const cur = type === "phase" ? phases[idx]?.name : phases[activePhaseIdx]?.knowledges?.[idx]?.name;
    setEditingItem({ type, idx });
    setEditValue(cur || "");
    setMenuOpen(null);
  };
  const confirmEdit = () => {
    if (!editingItem || !editValue.trim()) { setEditingItem(null); return; }
    if (editingItem.type === "phase") renamePhase(editingItem.idx, editValue.trim());
    else renameKnowledge(activePhaseIdx, editingItem.idx, editValue.trim());
    setEditingItem(null);
  };
  useEffect(() => { if (editingItem && editRef.current) { editRef.current.focus(); editRef.current.select(); } }, [editingItem]);
  useEffect(() => { const h = () => setMenuOpen(null); if (menuOpen) document.addEventListener("click", h); return () => document.removeEventListener("click", h); }, [menuOpen]);
  // Nếu activePhaseIdx vượt mảng thì reset
  useEffect(() => { if (activePhaseIdx !== null && activePhaseIdx >= phases.length) setActivePhaseIdx(null); }, [phases.length, activePhaseIdx]);

  // === Submit ===
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const data = tab === "manual" ? { mode: "manual", name, goal, phases } : { mode: "ai", name, goal };
      await onCreateRoadmap?.(data);
    } catch { /* Lỗi xử lý bởi component cha */ } finally { setSubmitting(false); }
  };

  // === Style helpers ===
  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500" : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"}`;
  const tabCls = (key) => `flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === key ? (isDarkMode ? "bg-slate-800 text-blue-300" : "bg-white text-blue-700 shadow-sm") : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700")}`;
  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;
  const cardCls = `group relative rounded-xl border transition-all hover:shadow-md ${isDarkMode ? "border-slate-700 bg-slate-800/60 hover:border-slate-600 hover:shadow-blue-900/20" : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-slate-200/60"}`;
  const thumbCls = `flex items-center justify-center h-24 rounded-t-xl ${isDarkMode ? "bg-slate-800" : "bg-slate-50"}`;

  // === Context menu cho Rename / Delete ===
  const renderMenu = (type, idx) => (
    <div className={`absolute right-0 top-7 z-50 rounded-lg border shadow-lg py-1 min-w-[120px] ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`} onClick={(e) => e.stopPropagation()}>
      <button className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${isDarkMode ? "hover:bg-slate-700 text-slate-300" : "hover:bg-gray-50 text-gray-700"}`} onClick={() => startEdit(type, idx)}>
        <Pencil className="w-3 h-3" /> {t("workspace.roadmap.rename")}
      </button>
      <button className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 transition-colors ${isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-50"}`}
        onClick={() => (type === "phase" ? removePhase(idx) : removeKnowledge(activePhaseIdx, idx))}>
        <Trash2 className="w-3 h-3" /> {t("workspace.roadmap.delete")}
      </button>
    </div>
  );

  // === Card footer — dùng chung cho cả Phase & Knowledge ===
  const renderFooter = (itemName, fallback, type, idx) => {
    const isEditing = editingItem?.type === type && editingItem.idx === idx;
    const isMenu = menuOpen?.type === type && menuOpen.idx === idx;
    const Icon = type === "phase" ? Folder : FileText;
    return (
      <div className={`px-3 py-2.5 border-t flex items-center gap-2 ${isDarkMode ? "border-slate-700" : "border-gray-100"}`}>
        <Icon className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
        {isEditing ? (
          <input ref={editRef} className={`flex-1 text-xs bg-transparent outline-none border-b ${isDarkMode ? "border-blue-400 text-white" : "border-blue-500 text-gray-900"}`}
            value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={confirmEdit}
            onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") setEditingItem(null); }}
            onClick={(e) => e.stopPropagation()} />
        ) : (
          <span className={`flex-1 text-xs font-medium truncate ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>{itemName || fallback}</span>
        )}
        <div className="relative">
          <button className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-100"}`}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(isMenu ? null : { type, idx }); }}>
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {isMenu && renderMenu(type, idx)}
        </div>
      </div>
    );
  };

  // === Add card dạng border dashed ===
  const AddCard = ({ onClick, label }) => (
    <div onClick={onClick} className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95
      ${isDarkMode ? "border-slate-700 hover:border-blue-500 hover:bg-slate-800/40 text-slate-500 hover:text-blue-400" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 text-gray-400 hover:text-blue-500"}`}
      style={{ minHeight: 134 }}>
      <Plus className="w-8 h-8 mb-1" />
      <span className={`text-xs font-medium ${fontClass}`}>{label}</span>
    </div>
  );

  return (
    <div className={`flex flex-col h-full ${fontClass}`}>
      {/* Header với nút quay lại */}
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button type="button" onClick={tab === "manual" && activePhaseIdx !== null ? () => setActivePhaseIdx(null) : onBack}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-emerald-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>{t("workspace.roadmap.createTitle")}</p>
        </div>
      </div>

      {/* Nội dung form cuộn được */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.roadmap.createDesc")}</p>

        {/* Tab chọn chế độ */}
        <div className={`flex gap-1 rounded-lg p-1 ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
          <button type="button" onClick={() => { setTab("manual"); setActivePhaseIdx(null); }} className={tabCls("manual")}>{t("workspace.roadmap.tabManual")}</button>
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

            {/* Breadcrumb kiểu Google Drive */}
            <div className={`flex items-center gap-1 py-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              <button type="button" onClick={() => setActivePhaseIdx(null)}
                className={`text-xs font-medium px-1.5 py-0.5 rounded transition-colors ${activePhaseIdx === null ? (isDarkMode ? "text-blue-400 bg-blue-500/10" : "text-blue-600 bg-blue-50") : (isDarkMode ? "hover:text-slate-200 hover:bg-slate-800" : "hover:text-gray-700 hover:bg-gray-100")}`}>
                {t("workspace.roadmap.allPhases")}
              </button>
              {activePhaseIdx !== null && (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isDarkMode ? "text-blue-400 bg-blue-500/10" : "text-blue-600 bg-blue-50"}`}>
                    {phases[activePhaseIdx]?.name || `Phase ${activePhaseIdx + 1}`}
                  </span>
                </>
              )}
            </div>

            {/* Grid dạng Google Drive */}
            {activePhaseIdx === null ? (
              <div className="grid grid-cols-2 gap-3">
                {phases.map((phase, pIdx) => (
                  <div key={pIdx} className={`${cardCls} cursor-pointer`}
                    onClick={() => !(editingItem?.type === "phase" && editingItem.idx === pIdx) && setActivePhaseIdx(pIdx)}>
                    <div className={thumbCls}>
                      <FolderOpen className={`w-12 h-12 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} />
                    </div>
                    {renderFooter(phase.name, `Phase ${pIdx + 1}`, "phase", pIdx)}
                    <div className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDarkMode ? "bg-slate-700 text-slate-300" : "bg-gray-200 text-gray-600"}`}>
                      {phase.knowledges.length}
                    </div>
                  </div>
                ))}
                <AddCard onClick={addPhase} label={t("workspace.roadmap.addPhase")} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {phases[activePhaseIdx]?.knowledges.map((k, kIdx) => (
                  <div key={kIdx} className={cardCls}>
                    <div className={thumbCls}>
                      <FileText className={`w-10 h-10 ${isDarkMode ? "text-emerald-400" : "text-emerald-500"}`} />
                    </div>
                    {renderFooter(k.name, `Knowledge ${kIdx + 1}`, "knowledge", kIdx)}
                  </div>
                ))}
                <AddCard onClick={() => addKnowledge(activePhaseIdx)} label={t("workspace.roadmap.addKnowledge")} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {!hasPrelearning ? (
              <div className={`rounded-xl p-6 text-center space-y-3 border ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-amber-200 bg-amber-50"}`}>
                <GraduationCap className={`w-10 h-10 mx-auto ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
                <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>{t("workspace.roadmap.prelearningRequired")}</p>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.chat.prelearningDesc")}</p>
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
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.roadmap.editBeforeConfirm")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nút hành động cố định dưới cùng */}
      <div className={`px-4 py-3 border-t flex justify-end gap-2 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <Button variant="outline" onClick={onBack} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>{t("workspace.roadmap.cancel")}</Button>
        <Button onClick={handleSubmit} disabled={submitting || (tab === "ai" && !hasPrelearning)} className="bg-[#2563EB] hover:bg-blue-700 text-white">
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {tab === "manual" ? (submitting ? t("workspace.roadmap.creating") : t("workspace.roadmap.create")) : (submitting ? t("workspace.roadmap.generating") : t("workspace.roadmap.generateAI"))}
        </Button>
      </div>
    </div>
  );
}

export default CreateRoadmapForm;