import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ClipboardList, Clock, FolderOpen, Loader2, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { deleteQuiz, getQuizzesByScope } from "@/api/QuizAPI";
import { getRoadmapsByGroup, getRoadmapsByWorkspace } from "@/api/RoadmapAPI";
import { useToast } from "@/context/ToastContext";

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

const STATUS_STYLE = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
};

function MockTestListView({ isDarkMode, onCreateMockTest, onViewMockTest, contextType = "WORKSPACE", contextId }) {
  const { t, i18n } = useTranslation();
  const { showError } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");
  const [mockTests, setMockTests] = useState([]);
  const [roadmapIds, setRoadmapIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchMockTests = useCallback(async () => {
    if (!contextId) return;
    setLoading(true);

    try {
      if (contextType === "WORKSPACE") {
        const quizRes = await getQuizzesByScope("WORKSPACE", contextId);
        const quizzes = quizRes.data || [];
        setMockTests(
          quizzes.map((item) => ({
            ...item,
            roadmapName:
              item.roadmapName
              || item.roadmap?.title
              || item.roadmap?.name
              || "Workspace",
          }))
        );
        setRoadmapIds([]);
        return;
      }

      const loadRoadmaps = contextType === "GROUP" ? getRoadmapsByGroup : getRoadmapsByWorkspace;
      const roadmapRes = await loadRoadmaps(contextId, 0, 100);
      const roadmaps = roadmapRes.data?.content || roadmapRes.data || [];
      const allRoadmapIds = roadmaps.map((roadmap) => roadmap.roadmapId || roadmap.id);
      setRoadmapIds(allRoadmapIds);

      const allMockTests = [];
      for (const roadmap of roadmaps) {
        const roadmapId = roadmap.roadmapId || roadmap.id;
        try {
          const quizRes = await getQuizzesByScope("ROADMAP", roadmapId);
          const quizzes = quizRes.data || [];
          quizzes.forEach((quiz) => {
            allMockTests.push({
              ...quiz,
              roadmapName: roadmap.title || roadmap.name || `Roadmap #${roadmapId}`,
              roadmapId,
            });
          });
        } catch {
          // Ignore roadmaps without quizzes.
        }
      }

      setMockTests(allMockTests);
    } catch (error) {
      console.error("Failed to fetch mock tests:", error);
      setMockTests([]);
    } finally {
      setLoading(false);
    }
  }, [contextId, contextType, t]);

  useEffect(() => {
    fetchMockTests();
  }, [fetchMockTests]);

  const handleDelete = useCallback(async (event, quizId) => {
    event.stopPropagation();
    if (deletingId) return;

    setDeletingId(quizId);
    try {
      await deleteQuiz(quizId);
      setMockTests((current) => current.filter((item) => item.quizId !== quizId));
    } catch (error) {
      console.error("Failed to delete mock test:", error);
      showError(error?.message || t("workspace.quiz.deleteFail", "Xóa quiz thất bại"));
    } finally {
      setDeletingId(null);
    }
  }, [deletingId, showError, t]);

  const filteredMockTests = useMemo(() => {
    if (!searchQuery.trim()) return mockTests;
    const query = searchQuery.toLowerCase();

    return mockTests.filter((item) => (
      item.title?.toLowerCase().includes(query)
      || item.roadmapName?.toLowerCase().includes(query)
    ));
  }, [mockTests, searchQuery]);

  const allRoadmapsCovered = useMemo(() => {
    if (contextType === "WORKSPACE") return false;
    if (roadmapIds.length === 0) return false;
    const coveredIds = new Set(mockTests.map((item) => item.roadmapId));
    return roadmapIds.every((id) => coveredIds.has(id));
  }, [contextType, mockTests, roadmapIds]);

  return (
    <div className={`h-full flex flex-col ${fontClass}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-purple-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>Mock Test</p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
            {mockTests.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchMockTests}
            disabled={loading}
            className={`rounded-full h-9 w-9 p-0 ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {onCreateMockTest ? (
            <Button
              onClick={onCreateMockTest}
              disabled={allRoadmapsCovered}
              className={`rounded-full h-9 px-4 flex items-center gap-2 transition-all active:scale-95 ${
                allRoadmapsCovered ? "bg-purple-400 cursor-not-allowed opacity-60" : "bg-purple-600 hover:bg-purple-700"
              } text-white`}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">{t("workspace.listView.create")}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {allRoadmapsCovered && !loading ? (
        <div className={`mx-4 mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${isDarkMode ? "bg-amber-950/40 text-amber-400 border border-amber-900/50" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t("workspace.mockTest.allRoadmapsCovered")}</span>
        </div>
      ) : null}

      <div className="px-4 py-3">
        <div className="relative max-w-sm">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("workspace.listView.searchPlaceholder")}
            className={`w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-colors ${
              isDarkMode
                ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
            }`}
          />
          {searchQuery ? (
            <button onClick={() => setSearchQuery("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={`w-6 h-6 animate-spin ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          </div>
        ) : filteredMockTests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderOpen className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {searchQuery ? t("workspace.listView.noResults") : t("workspace.mockTest.noItems")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMockTests.map((mockTest) => {
              const statusStyle = STATUS_STYLE[mockTest.status] || STATUS_STYLE.DRAFT;

              return (
                <div
                  key={mockTest.quizId}
                  onClick={() => onViewMockTest?.(mockTest)}
                  className={`rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-all ${
                    isDarkMode ? "bg-slate-800/50 hover:bg-slate-800 border border-slate-800" : "bg-gray-50 hover:bg-gray-100 border border-gray-100"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? "bg-purple-950/40" : "bg-purple-100"}`}>
                    <ClipboardList className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{mockTest.title}</p>
                    <p className={`text-xs mt-0.5 flex items-center gap-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      {mockTest.duration > 0 ? <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mockTest.duration} {t("workspace.quiz.minutes")}</span> : null}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isDarkMode ? statusStyle.dark : statusStyle.light}`}>
                        {t(`workspace.quiz.statusLabels.${mockTest.status}`)}
                      </span>
                    </p>
                    <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t("workspace.listView.createdAt")}: {formatShortDate(mockTest.createdAt)}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${isDarkMode ? "bg-emerald-950/50 text-emerald-400" : "bg-emerald-100 text-emerald-700"}`}>
                    {mockTest.roadmapName}
                  </span>
                  <button
                    onClick={(event) => handleDelete(event, mockTest.quizId ?? mockTest.id)}
                    className={`p-1.5 rounded-lg transition-all active:scale-95 ${isDarkMode ? "hover:bg-red-950/30" : "hover:bg-red-50"}`}
                  >
                    {deletingId === (mockTest.quizId ?? mockTest.id)
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                      : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MockTestListView;
