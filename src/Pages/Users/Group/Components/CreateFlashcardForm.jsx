import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, CreditCard, ArrowLeft, MapPin, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createFlashcardSet, addFlashcardItem } from "@/api/FlashcardAPI";
import { getRoadmapsByGroup, getPhasesByRoadmap, getKnowledgesByPhase } from "@/api/RoadmapAPI";

// Danh sách dạng thẻ flashcard
const CARD_TYPES = ["termDefinition", "questionAnswer", "imageDescription", "cloze"];
// Flashcard luôn tạo ở context KNOWLEDGE
const FIXED_CONTEXT_TYPE = "KNOWLEDGE";

// Form tạo Flashcard — gọi API tạo set rồi thêm items
function CreateFlashcardForm({ isDarkMode = false, onCreateFlashcard, onBack, contextType: defaultContextType = "GROUP", contextId: defaultContextId }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [tab, setTab] = useState("manual");
  const [submitting, setSubmitting] = useState(false);

  // Flashcard luôn ở context KNOWLEDGE — không cần chọn
  const selectedContextType = FIXED_CONTEXT_TYPE;
  const [selectedContextId, setSelectedContextId] = useState("");
  const [contextLoading, setContextLoading] = useState(false);

  // Dữ liệu cascade dropdown: roadmap → phase → knowledge (từ group hiện tại)
  const [roadmaps, setRoadmaps] = useState([]);
  const [phases, setPhases] = useState([]);
  const [knowledges, setKnowledges] = useState([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");

  // Tải danh sách roadmap từ group hiện tại
  const loadRoadmaps = useCallback(async () => {
    if (!defaultContextId) return;
    setContextLoading(true);
    try {
      const res = await getRoadmapsByGroup(defaultContextId, 0, 100);
      setRoadmaps(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải roadmaps:", e);
    } finally {
      setContextLoading(false);
    }
  }, [defaultContextId]);

  // Tự động tải roadmaps khi mount
  useEffect(() => {
    loadRoadmaps();
  }, [loadRoadmaps]);

  // Khi chọn roadmap — tải phases
  const handleRoadmapSelect = useCallback(async (roadmapId) => {
    setSelectedRoadmapId(roadmapId);
    setPhases([]);
    setKnowledges([]);
    setSelectedPhaseId("");
    setSelectedContextId("");
    if (!roadmapId) return;
    setContextLoading(true);
    try {
      const res = await getPhasesByRoadmap(roadmapId, 0, 100);
      setPhases(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải phases:", e);
    } finally {
      setContextLoading(false);
    }
  }, []);

  // Khi chọn phase — tải knowledges
  const handlePhaseSelect = useCallback(async (phaseId) => {
    setSelectedPhaseId(phaseId);
    setKnowledges([]);
    setSelectedContextId("");
    if (!phaseId) return;
    setContextLoading(true);
    try {
      const res = await getKnowledgesByPhase(phaseId, 0, 100);
      setKnowledges(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải knowledges:", e);
    } finally {
      setContextLoading(false);
    }
  }, []);

  // Khi chọn knowledge — set contextId
  const handleKnowledgeSelect = (knowledgeId) => {
    setSelectedContextId(knowledgeId);
  };

  // Hàm reload cho từng cấp dropdown
  const reloadRoadmaps = () => {
    setSelectedRoadmapId("");
    setPhases([]);
    setKnowledges([]);
    setSelectedPhaseId("");
    setSelectedContextId("");
    loadRoadmaps();
  };

  const reloadPhases = async () => {
    if (!selectedRoadmapId) return;
    setSelectedPhaseId("");
    setKnowledges([]);
    setSelectedContextId("");
    setContextLoading(true);
    try {
      const res = await getPhasesByRoadmap(selectedRoadmapId, 0, 100);
      setPhases(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải phases:", e);
    } finally {
      setContextLoading(false);
    }
  };

  const reloadKnowledges = async () => {
    if (!selectedPhaseId) return;
    setSelectedContextId("");
    setContextLoading(true);
    try {
      const res = await getKnowledgesByPhase(selectedPhaseId, 0, 100);
      setKnowledges(res.data?.content || res.data || []);
    } catch (e) {
      console.error("Lỗi tải knowledges:", e);
    } finally {
      setContextLoading(false);
    }
  };

  // State tab Manual
  const [deckName, setDeckName] = useState("");
  const [cards, setCards] = useState([]);

  // State tab AI
  const [aiDeckName, setAiDeckName] = useState("");
  const [aiTotalCards, setAiTotalCards] = useState(20);
  const [aiPrompt, setAiPrompt] = useState("");

  // Thêm thẻ mới
  const addCard = () => {
    setCards((prev) => [...prev, { front: "", back: "", type: "termDefinition" }]);
  };

  // Xóa thẻ
  const removeCard = (idx) => {
    setCards((prev) => prev.filter((_, i) => i !== idx));
  };

  // Cập nhật thẻ
  const updateCard = (idx, field, value) => {
    setCards((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  // Xử lý submit — tạo flashcard set qua API rồi thêm items
  const handleSubmit = async () => {
    const name = tab === "manual" ? deckName : aiDeckName;
    if (!name.trim() || !selectedContextId) return;
    setSubmitting(true);
    try {
      // Bước 1: Tạo flashcard set (DRAFT)
      const setRes = await createFlashcardSet({
        contextId: Number(selectedContextId),
        contextType: selectedContextType,
        flashcardSetName: name.trim(),
      });
      const createdSet = setRes.data || {};
      const setId = createdSet.flashcardSetId;

      if (tab === "manual" && cards.length > 0 && setId) {
        // Bước 2: Thêm từng item vào set
        for (const card of cards) {
          if (card.front.trim() || card.back.trim()) {
            await addFlashcardItem(setId, {
              frontContent: card.front.trim(),
              backContent: card.back.trim(),
            });
          }
        }
      }

      // Thông báo component cha để chuyển view
      await onCreateFlashcard?.(createdSet);
    } catch (err) {
      console.error("Lỗi tạo flashcard:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all ${
    isDarkMode ? "bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500"
              : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"
  }`;

  const selectCls = `${inputCls} appearance-none cursor-pointer`;

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
          <CreditCard className="w-5 h-5 text-amber-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
            {t("workspace.flashcard.createTitle")}
          </p>
        </div>
      </div>

      {/* Nội dung form cuộn được */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
          {t("workspace.flashcard.createDesc")}
        </p>

        {/* Chọn vị trí tạo flashcard — luôn là KNOWLEDGE (cascade: roadmap → phase → knowledge) */}
        <div className={`rounded-lg border p-3 space-y-3 ${isDarkMode ? "border-slate-700 bg-slate-800/30" : "border-blue-200 bg-blue-50/30"}`}>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
            <span className={`text-xs font-semibold ${isDarkMode ? "text-blue-300" : "text-blue-700"} ${fontClass}`}>
              {t("workspace.quiz.contextSelector.title")}
            </span>
            <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${isDarkMode ? "bg-amber-950/40 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
              {t("workspace.quiz.contextSelector.types.KNOWLEDGE")}
            </span>
          </div>

          {/* Chọn roadmap */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>{t("workspace.quiz.contextSelector.selectRoadmap")}</span>
              <button type="button" onClick={reloadRoadmaps} className={`p-1 rounded transition-all active:scale-95 ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`} title={t("workspace.quiz.contextSelector.reload")}>
                <RefreshCw className={`w-3 h-3 ${contextLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <select className={selectCls} value={selectedRoadmapId} onChange={(e) => handleRoadmapSelect(e.target.value)} disabled={contextLoading}>
              <option value="">{contextLoading ? t("workspace.quiz.contextSelector.loading") : t("workspace.quiz.contextSelector.placeholder")}</option>
              {roadmaps.map((rm) => (
                <option key={rm.roadmapId || rm.id} value={rm.roadmapId || rm.id}>
                  {rm.title || rm.name || `Roadmap #${rm.roadmapId || rm.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Chọn phase */}
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
                {phases.map((ph) => (
                  <option key={ph.phaseId || ph.id} value={ph.phaseId || ph.id}>
                    {ph.title || ph.name || `Phase #${ph.phaseId || ph.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chọn knowledge */}
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
                {knowledges.map((kn) => (
                  <option key={kn.knowledgeId || kn.id} value={kn.knowledgeId || kn.id}>
                    {kn.title || kn.name || `Knowledge #${kn.knowledgeId || kn.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tab chọn chế độ */}
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

            {/* Danh sách thẻ */}
            <div className="space-y-3">
              {cards.map((card, idx) => (
                <div key={idx} className={`rounded-lg border p-3 space-y-2 ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-gray-200 bg-gray-50"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>#{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <select className={`${selectCls} !w-auto text-xs !py-1`} value={card.type} onChange={(e) => updateCard(idx, "type", e.target.value)}>
                        {CARD_TYPES.map((ct) => <option key={ct} value={ct}>{t(`workspace.flashcard.cardTypes.${ct}`)}</option>)}
                      </select>
                      <button onClick={() => removeCard(idx)} className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <input className={inputCls} placeholder={t("workspace.flashcard.frontPlaceholder")} value={card.front} onChange={(e) => updateCard(idx, "front", e.target.value)} />
                  <input className={inputCls} placeholder={t("workspace.flashcard.backPlaceholder")} value={card.back} onChange={(e) => updateCard(idx, "back", e.target.value)} />
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

      {/* Nút hành động cố định dưới cùng */}
      <div className={`px-4 py-3 border-t flex justify-end gap-2 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <Button variant="outline" onClick={onBack} className={isDarkMode ? "border-slate-700 text-slate-300" : ""}>
          {t("workspace.flashcard.cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={submitting} className="bg-[#2563EB] hover:bg-blue-700 text-white">
          {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {tab === "manual"
            ? (submitting ? t("workspace.flashcard.creating") : t("workspace.flashcard.create"))
            : (submitting ? t("workspace.flashcard.generating") : t("workspace.flashcard.generateAI"))
          }
        </Button>
      </div>
    </div>
  );
}

export default CreateFlashcardForm;