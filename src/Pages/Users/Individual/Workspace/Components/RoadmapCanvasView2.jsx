import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

function RoadmapCanvasView2({ roadmap, isDarkMode = false, fontClass = "font-sans", selectedPhaseId = null }) {
  const { t } = useTranslation();
  const [openPhaseId, setOpenPhaseId] = useState(null);
  const [openKnowledgeMap, setOpenKnowledgeMap] = useState({});

  const phases = useMemo(() => {
    const rawPhases = roadmap?.phases ?? [];
    return [...rawPhases].sort((a, b) => Number(a?.phaseIndex ?? 0) - Number(b?.phaseIndex ?? 0));
  }, [roadmap?.phases]);

  const fallbackPhaseId = phases[0]?.phaseId ?? null;
  const hasSelectedPhaseFromSidebar = phases.some((phase) => phase.phaseId === selectedPhaseId);
  const effectiveOpenPhaseId = hasSelectedPhaseFromSidebar
    ? selectedPhaseId
    : phases.some((phase) => phase.phaseId === openPhaseId)
    ? openPhaseId
    : fallbackPhaseId;
  const activePhase = phases.find((phase) => phase.phaseId === effectiveOpenPhaseId) || null;

  const togglePhase = (phaseId) => {
    setOpenPhaseId((current) => (current === phaseId ? null : phaseId));
  };

  const toggleKnowledge = (phaseId, knowledgeId) => {
    const key = `${phaseId}:${knowledgeId}`;
    setOpenKnowledgeMap((current) => ({ ...current, [key]: !current[key] }));
  };

  const renderQuizItem = (quiz) => {
    const status = String(quiz?.status || "DRAFT").toUpperCase();
    const questionCount = Number(quiz?.questionCount ?? 0);
    const isCompleted = status === "COMPLETED";

    return (
      <div
        key={quiz?.quizId || quiz?.id || `${quiz?.title}-quiz`}
        className={`flex items-start gap-3 py-2.5 ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}
      >
        {isCompleted ? (
          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkMode ? "text-green-500" : "text-green-600"}`} />
        ) : (
          <div className={`w-4 h-4 mt-0.5 shrink-0 rounded border-2 ${isDarkMode ? "border-slate-500" : "border-slate-300"}`} />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>{quiz?.title}</p>
          <div className={`flex items-center gap-2 mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            <span className="flex items-center gap-1"><BookOpenCheck className="w-3 h-3" />{questionCount} {t("workspace.roadmap.canvas.questions")}</span>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 shrink-0 font-medium ${
          isCompleted 
            ? isDarkMode 
              ? "bg-green-950/50 text-green-300 border border-green-500/30" 
              : "bg-green-100 text-green-800 border border-green-200" 
            : isDarkMode 
              ? "bg-slate-800/50 text-slate-300 border border-slate-700/50" 
              : "bg-slate-100 text-slate-700 border border-slate-200"
        }`}>
          {status}
        </div>
      </div>
    );
  };

  const renderFlashcardItem = (flashcard) => {
    const status = String(flashcard?.status || "DRAFT").toUpperCase();
    const count = Number(flashcard?.cardCount ?? flashcard?.itemCount ?? 0);
    const isCompleted = status === "COMPLETED";

    return (
      <div
        key={flashcard?.flashcardSetId || flashcard?.id || `${flashcard?.title}-flashcard`}
        className={`flex items-start gap-3 py-2.5 ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}
      >
        {isCompleted ? (
          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkMode ? "text-green-500" : "text-green-600"}`} />
        ) : (
          <div className={`w-4 h-4 mt-0.5 shrink-0 rounded border-2 ${isDarkMode ? "border-slate-500" : "border-slate-300"}`} />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
            {flashcard?.title || flashcard?.flashcardSetName}
          </p>
          <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {count} {t("workspace.roadmap.canvas.cards")}
          </p>
        </div>
        <div className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 shrink-0 font-medium ${
          isCompleted 
            ? isDarkMode 
              ? "bg-green-950/50 text-green-300 border border-green-500/30" 
              : "bg-green-100 text-green-800 border border-green-200" 
            : isDarkMode 
              ? "bg-slate-800/50 text-slate-300 border border-slate-700/50" 
              : "bg-slate-100 text-slate-700 border border-slate-200"
        }`}>
          {status}
        </div>
      </div>
    );
  };

  const renderQuizSection = (label, quizzes = []) => {
    const safeQuizzes = quizzes || [];
    if (!safeQuizzes.length) return null;
    
    return (
      <div>
        <h4 className={`text-sm font-semibold px-4 py-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
          {label}
        </h4>
        <div className={`px-4 space-y-0.5`}>
          {safeQuizzes.map(renderQuizItem)}
        </div>
      </div>
    );
  };

  const renderKnowledgeContent = (knowledge) => {
    const quizzes = knowledge?.quizzes || [];
    const flashcards = knowledge?.flashcards || [];
    const hasQuizzes = quizzes.length > 0;
    const hasFlashcards = flashcards.length > 0;

    if (!hasQuizzes && !hasFlashcards) return null;

    return (
      <div className={`border-t pt-2 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
        {hasQuizzes && (
          <div>
            <h5 className={`text-xs font-semibold px-4 py-2 uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {t("workspace.roadmap.canvas.quiz", "Quiz")}
            </h5>
            <div className={`px-4 space-y-0.5`}>
              {quizzes.map(renderQuizItem)}
            </div>
          </div>
        )}
        {hasFlashcards && (
          <div className={`${hasQuizzes ? "mt-3 border-t pt-3" : ""} ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
            <h5 className={`text-xs font-semibold px-4 py-2 uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {t("workspace.roadmap.canvas.flashcard", "Flashcard")}
            </h5>
            <div className={`px-4 space-y-0.5`}>
              {flashcards.map(renderFlashcardItem)}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!roadmap) {
    return (
      <div className={`h-full flex items-center justify-center ${isDarkMode ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-600"}`}>
        <p className={fontClass}>{t("workspace.roadmap.noRoadmapYet", "Chưa có roadmap")}</p>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto p-4 ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
      <div className="space-y-3">
        {activePhase ? [activePhase].map((phase) => {
          const isOpen = effectiveOpenPhaseId === phase.phaseId;
          return (
            <div key={phase.phaseId} className={`rounded-lg border ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white"}`}>
              <button
                type="button"
                onClick={() => togglePhase(phase.phaseId)}
                className={`w-full px-4 py-4 flex items-start justify-between gap-4 text-left hover:bg-slate-50`}
              >
                <div className="min-w-0">
                  <p className={`text-xs uppercase tracking-[0.15em] ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
                    {t("workspace.roadmap.canvas.phase", "Phase")} {Number(phase?.phaseIndex ?? 0) + 1}
                  </p>
                  <h3 className={`mt-1 text-lg font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>{phase.title}</h3>
                  <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>{phase.description}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 ${isDarkMode ? "bg-emerald-950/60 text-emerald-300" : "bg-green-100 text-green-800"}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t("workspace.quiz.statusLabels.COMPLETED", "Completed")}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : "rotate-0"} ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                </div>
              </button>

              {isOpen ? (
                <div className={`border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                  {/* Pre-learning Section */}
                  {renderQuizSection(t("workspace.roadmap.canvas.preLearning", "Pre-learning"), phase.preLearningQuizzes || [])}
                  
                  {/* Post-learning Section */}
                  {(phase.preLearningQuizzes?.length ?? 0) > 0 && (phase.postLearningQuizzes?.length ?? 0) > 0 && (
                    <div className={`border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`} />
                  )}
                  {renderQuizSection(t("workspace.roadmap.canvas.postLearning", "Post-learning"), phase.postLearningQuizzes || [])}

                  {/* Knowledge Items */}
                  {(phase.knowledges || []).length > 0 && (
                    <div className={`border-t mt-2 pt-2 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <div className="space-y-1">
                        {(phase.knowledges || []).map((knowledge) => {
                          const knowledgeKey = `${phase.phaseId}:${knowledge.knowledgeId}`;
                          const isKnowledgeOpen = Boolean(openKnowledgeMap[knowledgeKey]);
                          return (
                            <div key={knowledge.knowledgeId} className={`rounded-lg border ${isDarkMode ? "border-slate-800 bg-slate-950/30 hover:bg-slate-900/40" : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition-colors"}`}>
                              <button
                                type="button"
                                onClick={() => toggleKnowledge(phase.phaseId, knowledge.knowledgeId)}
                                className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>{knowledge.title}</p>
                                </div>
                                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isKnowledgeOpen ? "rotate-180" : "rotate-0"} ${isDarkMode ? "text-slate-400" : "text-slate-600"}`} />
                              </button>

                              {isKnowledgeOpen ? (
                                <div className="px-4 pb-2">
                                  {renderKnowledgeContent(knowledge)}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        }) : null}
      </div>
    </div>
  );
}

export default RoadmapCanvasView2;
