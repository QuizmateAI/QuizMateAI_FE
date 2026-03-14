import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/Components/ui/button";
import { Plus, Trash2, Loader2, CreditCard, ArrowLeft, MapPin, RefreshCw, AlertCircle, FileSpreadsheet, ArrowUp, Hash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createFlashcardSet, addFlashcardItem } from "@/api/FlashcardAPI";
import { getRoadmapsByWorkspace, getPhasesByRoadmap, getKnowledgesByPhase, createRoadmapForWorkspace, createPhase, createKnowledge } from "@/api/RoadmapAPI";
import QuickCreateDialog from "./QuickCreateDialog";

// Danh sách dạng thẻ flashcard
const CARD_TYPES = ["termDefinition", "questionAnswer", "imageDescription", "cloze"];
// Flashcard chỉ tạo ở KNOWLEDGE (roadmap → phase → knowledge)
const FIXED_CONTEXT_TYPE = "KNOWLEDGE";

// Form tạo Flashcard — gọi API tạo set rồi thêm items
function CreateFlashcardForm({ isDarkMode = false, onCreateFlashcard, onBack, contextType: defaultContextType = "WORKSPACE", contextId: defaultContextId }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const scrollRef = useRef(null);
  const [tab, setTab] = useState("manual");
  const [submitting, setSubmitting] = useState(false);

  // Context — luôn là KNOWLEDGE
  const selectedContextType = FIXED_CONTEXT_TYPE;
  const [selectedContextId, setSelectedContextId] = useState("");
  const [attachToRoadmap, setAttachToRoadmap] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);

  // Cascade data
  const [roadmaps, setRoadmaps] = useState([]);
  const [phases, setPhases] = useState([]);
  const [knowledges, setKnowledges] = useState([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [roadmapsLoaded, setRoadmapsLoaded] = useState(false);
  const [phasesLoaded, setPhasesLoaded] = useState(false);
  const [knowledgesLoaded, setKnowledgesLoaded] = useState(false);

  // QuickCreate dialog
  const [quickCreateType, setQuickCreateType] = useState(null);

  // Manual tab
  const [deckName, setDeckName] = useState("");
  const [cards, setCards] = useState([]);
  const [totalCards, setTotalCards] = useState(0);

  // AI tab
  const [aiDeckName, setAiDeckName] = useState("");
  const [aiTotalCards, setAiTotalCards] = useState(20);
  const [aiPrompt, setAiPrompt] = useState("");

  // Load roadmaps from workspace
  const loadRoadmaps = useCallback(async () => {
    if (!defaultContextId) return;
    setContextLoading(true);
    setRoadmapsLoaded(false);
    try {
      const res = await getRoadmapsByWorkspace(defaultContextId, 0, 100);
      setRoadmaps(res.data?.content || res.data || []);
    } catch (e) { console.error("Lỗi tải roadmaps:", e); }
    finally { setContextLoading(false); setRoadmapsLoaded(true); }
  }, [defaultContextId]);

  useEffect(() => { loadRoadmaps(); }, [loadRoadmaps]);

  const handleRoadmapSelect = useCallback(async (roadmapId) => {
    setSelectedRoadmapId(roadmapId);
    setPhases([]); setKnowledges([]); setSelectedPhaseId(""); setSelectedContextId("");
    setPhasesLoaded(false); setKnowledgesLoaded(false);
    if (!roadmapId) return;
    setContextLoading(true);
    try {
      const res = await getPhasesByRoadmap(roadmapId, 0, 100);
      setPhases(res.data?.content || res.data || []);
    } catch (e) { console.error("Lỗi tải phases:", e); }
    finally { setContextLoading(false); setPhasesLoaded(true); }
  }, []);

  const handlePhaseSelect = useCallback(async (phaseId) => {
    setSelectedPhaseId(phaseId);
    setKnowledges([]); setSelectedContextId("");
    setKnowledgesLoaded(false);
    if (!phaseId) return;
    setContextLoading(true);
    try {
      const res = await getKnowledgesByPhase(phaseId, 0, 100);
      setKnowledges(res.data?.content || res.data || []);
    } catch (e) { console.error("Lỗi tải knowledges:", e); }
    finally { setContextLoading(false); setKnowledgesLoaded(true); }
  }, []);

  const handleKnowledgeSelect = (knowledgeId) => setSelectedContextId(knowledgeId);

  const reloadRoadmaps = () => {
    setSelectedRoadmapId(""); setPhases([]); setKnowledges([]); setSelectedPhaseId(""); setSelectedContextId("");
    loadRoadmaps();
  };
  const reloadPhases = async () => {
    if (!selectedRoadmapId) return;
    setSelectedPhaseId(""); setKnowledges([]); setSelectedContextId("");
    setContextLoading(true); setPhasesLoaded(false);
    try { const res = await getPhasesByRoadmap(selectedRoadmapId, 0, 100); setPhases(res.data?.content || res.data || []); }
    catch (e) { console.error("Lỗi tải phases:", e); }
    finally { setContextLoading(false); setPhasesLoaded(true); }
  };
  const reloadKnowledges = async () => {
    if (!selectedPhaseId) return;
    setSelectedContextId(""); setContextLoading(true); setKnowledgesLoaded(false);
    try { const res = await getKnowledgesByPhase(selectedPhaseId, 0, 100); setKnowledges(res.data?.content || res.data || []); }
    catch (e) { console.error("Lỗi tải knowledges:", e); }
    finally { setContextLoading(false); setKnowledgesLoaded(true); }
  };

  // QuickCreate helpers
  const getQuickCreateFn = () => {
    if (quickCreateType === "roadmap") return (data) => createRoadmapForWorkspace({ ...data, workspaceId: defaultContextId });
    if (quickCreateType === "phase") return (data) => createPhase(selectedRoadmapId, data);
    if (quickCreateType === "knowledge") return (data) => createKnowledge(selectedPhaseId, data);
    return null;
  };
  const handleQuickCreated = () => {
    if (quickCreateType === "roadmap") reloadRoadmaps();
    else if (quickCreateType === "phase") reloadPhases();
    else if (quickCreateType === "knowledge") reloadKnowledges();
  };

  const EmptyState = ({ messageKey, createType }) => (
    <div className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg mt-1.5 ${isDarkMode ? "bg-amber-950/20 text-amber-400 border border-amber-900/30" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span className={`flex-1 ${fontClass}`}>{t(messageKey)}</span>
      <button type="button" onClick={() => setQuickCreateType(createType)}
        className={`shrink-0 text-[11px] font-medium px-2 py-1 rounded-md transition-all active:scale-95 ${isDarkMode ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}>
        <Plus className="w-3 h-3 inline mr-0.5" />{t("workspace.quiz.quickCreate.createBtn")}
      </button>
    </div>
  );

  // Card management
  const addCard = () => { setCards((prev) => [...prev, { front: "", back: "", type: "termDefinition" }]); setTotalCards((p) => p + 1); };
  const removeCard = (idx) => { setCards((prev) => prev.filter((_, i) => i !== idx)); setTotalCards((p) => Math.max(0, p - 1)); };
  const updateCard = (idx, field, value) => { setCards((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c)); };

  // Auto-generate card slots
  const handleTotalCardsChange = (val) => {
    const count = Math.max(0, Number(val));
    setTotalCards(count);
    if (count === 0) { setCards([]); return; }
    setCards((prev) => count > prev.length
      ? [...prev, ...Array.from({ length: count - prev.length }, () => ({ front: "", back: "", type: "termDefinition" }))]
      : prev.slice(0, count)
    );
  };

  const scrollToCard = (idx) => {
    document.getElementById(`flashcard-item-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const scrollToTop = () => { scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); };

  // Submit
  const handleSubmit = async () => {
    const name = tab === "manual" ? deckName : aiDeckName;
    const contextType = attachToRoadmap ? selectedContextType : defaultContextType;
    const contextId = attachToRoadmap ? Number(selectedContextId) : Number(defaultContextId);
    if (!name.trim() || !contextId) return;
    setSubmitting(true);
    try {
      const setRes = await createFlashcardSet({ contextId, contextType, flashcardSetName: name.trim() });
      const createdSet = setRes.data || {};
      const setId = createdSet.flashcardSetId;
      if (tab === "manual" && cards.length > 0 && setId) {
        for (const card of cards) {
          if (card.front.trim() || card.back.trim()) {
            await addFlashcardItem(setId, { frontContent: card.front.trim(), backContent: card.back.trim() });
          }
        }
      }
      await onCreateFlashcard?.(createdSet);
    } catch (err) { console.error("Lỗi tạo flashcard:", err); }
    finally { setSubmitting(false); }
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500" : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"}`;
  const selectCls = `${inputCls} appearance-none cursor-pointer`;
  const tabCls = (key) => `flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === key ? (isDarkMode ? "bg-slate-800 text-blue-300" : "bg-white text-blue-700 shadow-sm") : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700")}`;
  const labelCls = `block text-xs font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button type="button" onClick={onBack} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-amber-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
            {t("workspace.flashcard.createTitle")}
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t("workspace.flashcard.createDesc")}
        </p>

        <div className={`rounded-lg border p-3 space-y-3 ${isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-gray-200 bg-gray-50"}`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
                {t("workspace.quiz.contextSelector.attachPrompt")}
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                {attachToRoadmap
                  ? t("workspace.quiz.contextSelector.attachHintYes")
                  : t("workspace.quiz.contextSelector.attachHintNo")}
              </p>
            </div>
            <div className={`inline-flex rounded-lg p-1 ${isDarkMode ? "bg-slate-800" : "bg-white border border-gray-200"}`}>
              <button
                type="button"
                onClick={() => setAttachToRoadmap(true)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  attachToRoadmap
                    ? isDarkMode ? "bg-blue-600 text-white" : "bg-blue-600 text-white"
                    : isDarkMode ? "text-slate-300 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-100"
                } ${fontClass}`}
              >
                {t("workspace.quiz.contextSelector.attachYes")}
              </button>
              <button
                type="button"
                onClick={() => setAttachToRoadmap(false)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  !attachToRoadmap
                    ? isDarkMode ? "bg-blue-600 text-white" : "bg-blue-600 text-white"
                    : isDarkMode ? "text-slate-300 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-100"
                } ${fontClass}`}
              >
                {t("workspace.quiz.contextSelector.attachNo")}
              </button>
            </div>
          </div>
        </div>

        {/* Context selector — KNOWLEDGE cascade with QuickCreate */}
        {attachToRoadmap && (
        <div className={`rounded-lg border p-3 space-y-3 ${isDarkMode ? "border-slate-700 bg-slate-800/30" : "border-blue-200 bg-blue-50/30"}`}>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
            <span className={`text-xs font-semibold ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
              {t("workspace.quiz.contextSelector.title")}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDarkMode ? "bg-amber-950/50 text-amber-400" : "bg-amber-100 text-amber-600"}`}>
              {t("workspace.quiz.contextSelector.types.KNOWLEDGE")}
            </span>
          </div>

          {/* Roadmap */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>{t("workspace.quiz.contextSelector.selectRoadmap")}</span>
              <button type="button" onClick={reloadRoadmaps} className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`} title={t("workspace.quiz.contextSelector.reload")}>
                <RefreshCw className={`w-3 h-3 ${contextLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <select className={selectCls} value={selectedRoadmapId} onChange={(e) => handleRoadmapSelect(e.target.value)} disabled={contextLoading}>
              <option value="">{contextLoading ? t("workspace.quiz.contextSelector.loading") : t("workspace.quiz.contextSelector.placeholder")}</option>
              {roadmaps.map((rm) => <option key={rm.roadmapId || rm.id} value={rm.roadmapId || rm.id}>{rm.title || rm.name || `Roadmap #${rm.roadmapId || rm.id}`}</option>)}
            </select>
            {!contextLoading && roadmapsLoaded && roadmaps.length === 0 && (
              <EmptyState messageKey="workspace.flashcard.emptyRoadmap" createType="roadmap" />
            )}
          </div>

          {/* Phase */}
          {selectedRoadmapId && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>{t("workspace.quiz.contextSelector.selectPhase")}</span>
                <button type="button" onClick={reloadPhases} className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`} title={t("workspace.quiz.contextSelector.reload")}>
                  <RefreshCw className={`w-3 h-3 ${contextLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <select className={selectCls} value={selectedPhaseId} onChange={(e) => handlePhaseSelect(e.target.value)} disabled={contextLoading}>
                <option value="">{contextLoading ? t("workspace.quiz.contextSelector.loading") : t("workspace.quiz.contextSelector.placeholder")}</option>
                {phases.map((ph) => <option key={ph.phaseId || ph.id} value={ph.phaseId || ph.id}>{ph.title || ph.name || `Phase #${ph.phaseId || ph.id}`}</option>)}
              </select>
              {!contextLoading && phasesLoaded && phases.length === 0 && (
                <EmptyState messageKey="workspace.flashcard.emptyPhase" createType="phase" />
              )}
            </div>
          )}

          {/* Knowledge */}
          {selectedPhaseId && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>{t("workspace.quiz.contextSelector.selectKnowledge")}</span>
                <button type="button" onClick={reloadKnowledges} className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`} title={t("workspace.quiz.contextSelector.reload")}>
                  <RefreshCw className={`w-3 h-3 ${contextLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <select className={selectCls} value={selectedContextId} onChange={(e) => handleKnowledgeSelect(e.target.value)} disabled={contextLoading}>
                <option value="">{contextLoading ? t("workspace.quiz.contextSelector.loading") : t("workspace.quiz.contextSelector.placeholder")}</option>
                {knowledges.map((kn) => <option key={kn.knowledgeId || kn.id} value={kn.knowledgeId || kn.id}>{kn.title || kn.name || `Knowledge #${kn.knowledgeId || kn.id}`}</option>)}
              </select>
              {!contextLoading && knowledgesLoaded && knowledges.length === 0 && (
                <EmptyState messageKey="workspace.flashcard.emptyKnowledge" createType="knowledge" />
              )}
            </div>
          )}
        </div>
        )}

        {/* Tabs */}
        <div className={`flex gap-1 rounded-lg p-1 ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
          <button type="button" onClick={() => setTab("manual")} className={tabCls("manual")}>{t("workspace.flashcard.tabManual")}</button>
          <button type="button" onClick={() => setTab("ai")} className={tabCls("ai")}>{t("workspace.flashcard.tabAI")}</button>
        </div>

        {tab === "manual" ? (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>{t("workspace.flashcard.deckName")}</label>
              <input className={inputCls} placeholder={t("workspace.flashcard.deckNamePlaceholder")} value={deckName} onChange={(e) => setDeckName(e.target.value)} />
            </div>

            {/* Total cards input — auto generate */}
            <div>
              <label className={labelCls}>{t("workspace.flashcard.totalItemsLabel")}</label>
              <div className="flex gap-2">
                <input type="number" className={inputCls} value={totalCards} onChange={(e) => handleTotalCardsChange(e.target.value)} min={0} max={200} />
                <Button variant="outline" onClick={() => handleTotalCardsChange(totalCards)} className={`shrink-0 ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
                  <Hash className="w-3.5 h-3.5 mr-1" /> {t("workspace.flashcard.generateCards")}
                </Button>
              </div>
            </div>

            {/* Import Excel placeholder */}
            <Button variant="outline" onClick={() => {}} disabled className={`w-full opacity-60 ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> {t("workspace.flashcard.importExcel")}
              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${isDarkMode ? "bg-slate-700 text-slate-400" : "bg-gray-200 text-gray-500"}`}>
                {t("workspace.flashcard.importExcelHint")}
              </span>
            </Button>

            {/* Sticky Navigation Bar */}
            {cards.length > 3 && (
              <div className={`sticky top-0 z-20 flex items-center justify-between px-3 py-2 mb-3 rounded-lg shadow-sm backdrop-blur-md border ${isDarkMode ? "bg-slate-900/90 border-slate-700" : "bg-white/90 border-gray-200"}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                  <MapPin className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                  <input
                    type="number"
                    min={1}
                    max={cards.length}
                    placeholder={t("workspace.flashcard.jumpTo")}
                    className={`text-xs w-full bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isDarkMode ? "text-slate-200 placeholder:text-slate-500" : "text-gray-700 placeholder:text-gray-400"} ${fontClass}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const num = Number(e.target.value);
                        if (num >= 1 && num <= cards.length) {
                          scrollToCard(num - 1);
                          e.target.value = "";
                        }
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  title={t("workspace.flashcard.backToTop")}
                  onClick={scrollToTop}
                  className={`p-1.5 rounded-full transition-all active:scale-95 ${isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Card list */}
            <div className="space-y-3">
              {cards.map((card, idx) => (
                <div key={idx} id={`flashcard-item-${idx}`} className={`rounded-lg border p-3 space-y-2 ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-gray-200 bg-gray-50"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>#{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <label className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>{t("workspace.flashcard.cardType")}</label>
                      <select className={`${selectCls} !w-auto text-xs !py-1`} value={card.type} onChange={(e) => updateCard(idx, "type", e.target.value)}>
                        {CARD_TYPES.map((ct) => <option key={ct} value={ct}>{t(`workspace.flashcard.cardTypes.${ct}`)}</option>)}
                      </select>
                      <button onClick={() => removeCard(idx)} className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>{t("workspace.flashcard.frontContent")}</label>
                    <input className={inputCls} placeholder={t("workspace.flashcard.frontPlaceholder")} value={card.front} onChange={(e) => updateCard(idx, "front", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("workspace.flashcard.backContent")}</label>
                    <input className={inputCls} placeholder={t("workspace.flashcard.backPlaceholder")} value={card.back} onChange={(e) => updateCard(idx, "back", e.target.value)} />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addCard} className={`w-full ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
                <Plus className="w-4 h-4 mr-2" /> {t("workspace.flashcard.addCard")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>{t("workspace.flashcard.deckName")}</label>
              <input className={inputCls} placeholder={t("workspace.flashcard.deckNamePlaceholder")} value={aiDeckName} onChange={(e) => setAiDeckName(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t("workspace.flashcard.aiConfig.totalCards")}</label>
              <input type="number" className={inputCls} value={aiTotalCards} onChange={(e) => setAiTotalCards(Number(e.target.value))} min={1} />
            </div>
            <div>
              <label className={labelCls}>{t("workspace.flashcard.aiConfig.additionalPrompt")}</label>
              <textarea className={`${inputCls} min-h-[80px] resize-none`} placeholder={t("workspace.flashcard.aiConfig.promptPlaceholder")} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className={`px-4 py-3 border-t flex justify-end gap-2 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <Button variant="outline" onClick={onBack} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
          {t("workspace.flashcard.cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || (attachToRoadmap && !selectedContextId)} className="bg-[#2563EB] hover:bg-blue-700 text-white">
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {tab === "manual"
            ? (submitting ? t("workspace.flashcard.creating") : t("workspace.flashcard.create"))
            : (submitting ? t("workspace.flashcard.generating") : t("workspace.flashcard.generateAI"))
          }
        </Button>
      </div>

      {/* QuickCreate dialog */}
      <QuickCreateDialog
        open={!!quickCreateType}
        onOpenChange={(val) => { if (!val) setQuickCreateType(null); }}
        type={quickCreateType || "roadmap"}
        isDarkMode={isDarkMode}
        createFn={getQuickCreateFn()}
        onCreated={handleQuickCreated}
      />
    </div>
  );
}

export default CreateFlashcardForm;
