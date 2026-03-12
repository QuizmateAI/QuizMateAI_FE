import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import { Search, X, ClipboardList, FolderOpen, Clock, RefreshCw, Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { getQuizzesByScope, deleteQuiz } from "@/api/QuizAPI";
import { getRoadmapsByWorkspace, getRoadmapsByGroup } from "@/api/RoadmapAPI";

// Hàm format ngày giờ ngắn gọn
function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

// Bảng màu trạng thái
const STATUS_STYLE = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
};

/**
 * MockTestListView — hiển thị danh sách Mock Test (quiz với contextType=ROADMAP)
 * Tải roadmaps → cho mỗi roadmap gọi getQuizzesByScope("ROADMAP", roadmapId)
 */
function MockTestListView({ isDarkMode, onCreateMockTest, onViewMockTest, contextType = "WORKSPACE", contextId }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");
  const [mockTests, setMockTests] = useState([]);
  const [roadmapIds, setRoadmapIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Tải danh sách mock test: roadmaps → quizzes theo ROADMAP context
  const fetchMockTests = useCallback(async () => {
    if (!contextId) return;
    setLoading(true);
    try {
      // Tải roadmaps theo context (workspace hoặc group)
      const loadRoadmaps = contextType === "GROUP" ? getRoadmapsByGroup : getRoadmapsByWorkspace;
      const roadmapRes = await loadRoadmaps(contextId, 0, 100);
      const roadmaps = roadmapRes.data?.content || roadmapRes.data || [];
      const allRmIds = roadmaps.map(rm => rm.roadmapId || rm.id);
      setRoadmapIds(allRmIds);

      // Tải quiz cho từng roadmap (contextType=ROADMAP)
      const allMockTests = [];
      for (const rm of roadmaps) {
        const rmId = rm.roadmapId || rm.id;
        try {
          const quizRes = await getQuizzesByScope("ROADMAP", rmId);
          const quizzes = quizRes.data || [];
          // Gắn tên roadmap vào mỗi mock test
          quizzes.forEach(q => {
            allMockTests.push({
              ...q,
              roadmapName: rm.title || rm.name || `Roadmap #${rmId}`,
              roadmapId: rmId,
            });
          });
        } catch (e) {
          // Bỏ qua roadmap không có quiz
        }
      }
      setMockTests(allMockTests);
    } catch (err) {
      console.error("Lỗi tải danh sách mock test:", err);
      setMockTests([]);
    } finally {
      setLoading(false);
    }
  }, [contextType, contextId]);

  useEffect(() => {
    fetchMockTests();
  }, [fetchMockTests]);

  // Xóa mock test
  const handleDelete = useCallback(async (e, quizId) => {
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(quizId);
    try {
      await deleteQuiz(quizId);
      setMockTests(prev => prev.filter(q => q.quizId !== quizId));
    } catch (err) {
      console.error("Lỗi xóa mock test:", err);
    } finally {
      setDeletingId(null);
    }
  }, [deletingId]);

  // Lọc theo tìm kiếm
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return mockTests;
    const query = searchQuery.toLowerCase();
    return mockTests.filter(mt =>
      mt.title?.toLowerCase().includes(query) ||
      mt.roadmapName?.toLowerCase().includes(query)
    );
  }, [mockTests, searchQuery]);

  // Kiểm tra đã phủ hết roadmap chưa
  const allRoadmapsCovered = useMemo(() => {
    if (roadmapIds.length === 0) return false;
    const coveredIds = new Set(mockTests.map(mt => mt.roadmapId));
    return roadmapIds.every(id => coveredIds.has(id));
  }, [roadmapIds, mockTests]);

  return (
    <div className={`h-full flex flex-col ${fontClass}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-purple-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>Mock Test</p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
            {mockTests.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchMockTests} disabled={loading}
            className={`rounded-full h-9 w-9 p-0 ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {onCreateMockTest && (
            <Button onClick={onCreateMockTest} disabled={allRoadmapsCovered}
              className={`rounded-full h-9 px-4 flex items-center gap-2 transition-all active:scale-95 ${allRoadmapsCovered ? "bg-purple-400 cursor-not-allowed opacity-60" : "bg-purple-600 hover:bg-purple-700"} text-white`}>
              <Plus className="w-4 h-4" /><span className="text-sm">{t("workspace.listView.create")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Cảnh báo khi tất cả roadmap đã có mock test */}
      {allRoadmapsCovered && !loading && (
        <div className={`mx-4 mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${isDarkMode ? "bg-amber-950/40 text-amber-400 border border-amber-900/50" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t("workspace.mockTest.allRoadmapsCovered")}</span>
        </div>
      )}

      {/* Tìm kiếm */}
      <div className="px-4 py-3">
        <div className="relative max-w-sm">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("workspace.listView.searchPlaceholder")}
            className={`w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-colors ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"}`} />
          {searchQuery && <button onClick={() => setSearchQuery("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}><X className="w-4 h-4" /></button>}
        </div>
      </div>

      {/* Danh sách */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className={`w-6 h-6 animate-spin ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderOpen className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {searchQuery ? t("workspace.listView.noResults") : t("workspace.mockTest.noItems")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(mt => {
              const statusStyle = STATUS_STYLE[mt.status] || STATUS_STYLE.DRAFT;
              return (
                <div key={mt.quizId} onClick={() => onViewMockTest?.(mt)}
                  className={`rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-all ${isDarkMode ? "bg-slate-800/50 hover:bg-slate-800 border border-slate-800" : "bg-gray-50 hover:bg-gray-100 border border-gray-100"}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? "bg-purple-950/40" : "bg-purple-100"}`}>
                    <ClipboardList className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{mt.title}</p>
                    <p className={`text-xs mt-0.5 flex items-center gap-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      {mt.duration > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mt.duration} {t("workspace.quiz.minutes")}</span>}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isDarkMode ? statusStyle.dark : statusStyle.light}`}>
                        {t(`workspace.quiz.statusLabels.${mt.status}`)}
                      </span>
                    </p>
                    <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t("workspace.listView.createdAt")}: {formatShortDate(mt.createdAt)}</span>
                    </div>
                  </div>
                  {/* Badge tên roadmap */}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${isDarkMode ? "bg-emerald-950/50 text-emerald-400" : "bg-emerald-100 text-emerald-700"}`}>
                    {mt.roadmapName}
                  </span>
                  {/* Nút xóa */}
                  <button onClick={(e) => handleDelete(e, mt.quizId)}
                    className={`p-1.5 rounded-lg transition-all active:scale-95 ${isDarkMode ? "hover:bg-red-950/30" : "hover:bg-red-50"}`}>
                    {deletingId === mt.quizId ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
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
