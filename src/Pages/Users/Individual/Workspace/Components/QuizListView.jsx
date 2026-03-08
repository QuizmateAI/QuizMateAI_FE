import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search, X, Plus, BadgeCheck, FolderOpen, Clock, RefreshCw, Trash2, Loader2, Timer, BarChart3, Play, ClipboardCheck } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/Components/ui/dialog";
import { getQuizzesByUser, deleteQuiz } from "@/api/QuizAPI";

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

// Cấu hình màu badge trạng thái quiz
const STATUS_STYLES = {
  ACTIVE: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  DRAFT: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
  COMPLETED: { light: "bg-blue-100 text-blue-700", dark: "bg-blue-950/50 text-blue-400" },
  INACTIVE: { light: "bg-slate-100 text-slate-500", dark: "bg-slate-800 text-slate-400" },
};

// Cấu hình màu badge intent
const INTENT_STYLES = {
  PRE_LEARNING: { light: "bg-purple-100 text-purple-700", dark: "bg-purple-950/50 text-purple-400" },
  POST_LEARNING: { light: "bg-cyan-100 text-cyan-700", dark: "bg-cyan-950/50 text-cyan-400" },
  PRACTICE: { light: "bg-orange-100 text-orange-700", dark: "bg-orange-950/50 text-orange-400" },
};

// Bộ lọc theo trạng thái
const STATUS_FILTER_OPTIONS = ["all", "ACTIVE", "DRAFT", "COMPLETED"];

function QuizListView({ isDarkMode, onCreateQuiz, onViewQuiz, contextType: _contextType = "WORKSPACE", contextId: _contextId }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, quizId: null, mode: null });

  // Lấy danh sách quiz từ API (theo user hiện tại)
  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getQuizzesByUser();
      setQuizzes(res.data || []);
    } catch (err) {
      console.error("Lỗi khi lấy danh sách quiz:", err);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Gọi API khi component mount hoặc context thay đổi
  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // Xử lý xóa quiz
  const handleDeleteQuiz = useCallback(async (e, quizId) => {
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(quizId);
    try {
      await deleteQuiz(quizId);
      // Cập nhật danh sách sau khi xóa thành công
      setQuizzes((prev) => prev.filter((q) => q.quizId !== quizId));
    } catch (err) {
      console.error("Lỗi khi xóa quiz:", err);
    } finally {
      setDeletingId(null);
    }
  }, [deletingId]);

  // Lọc quiz theo trạng thái và tìm kiếm
  const filtered = useMemo(() => {
    let items = quizzes;
    if (filterStatus !== "all") items = items.filter((q) => q.status === filterStatus);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((q) => q.title?.toLowerCase().includes(query));
    }
    return items;
  }, [quizzes, searchQuery, filterStatus]);

  return (
    <div className={`h-full flex flex-col ${fontClass}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-blue-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>Quiz</p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
            {quizzes.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchQuizzes} disabled={loading}
            className={`rounded-full h-9 w-9 p-0 ${isDarkMode ? "border-slate-700 text-slate-300" : ""}`}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={onCreateQuiz} className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full h-9 px-4 flex items-center gap-2 transition-all active:scale-95">
            <Plus className="w-4 h-4" /><span className="text-sm">{t("workspace.listView.create")}</span>
          </Button>
        </div>
      </div>

      {/* Tìm kiếm + Lọc theo trạng thái */}
      <div className="px-4 py-3 flex flex-col gap-3">
        <div className="relative max-w-sm">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("workspace.listView.searchPlaceholder")}
            className={`w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-colors ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"}`} />
          {searchQuery && <button onClick={() => setSearchQuery("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => setFilterStatus(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterStatus === opt
                ? isDarkMode ? "bg-blue-950/50 text-blue-400" : "bg-blue-100 text-blue-700"
                : isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100"
              }`}>
              {t(`workspace.quiz.statusFilter.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách quiz */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.quiz.loading")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderOpen className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.listView.noResults")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((quiz) => {
              const ss = STATUS_STYLES[quiz.status] || STATUS_STYLES.DRAFT;
              const is = INTENT_STYLES[quiz.quizIntent] || {};
              return (
                <div key={quiz.quizId} onClick={() => onViewQuiz?.(quiz)} className={`rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-all group ${isDarkMode ? "bg-slate-800/50 hover:bg-slate-800 border border-slate-800" : "bg-gray-50 hover:bg-gray-100 border border-gray-100"}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? "bg-blue-950/40" : "bg-blue-100"}`}>
                    <BadgeCheck className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{quiz.title}</p>
                    <div className={`flex items-center gap-2 mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                      {quiz.duration && (
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />{quiz.duration} {t("workspace.quiz.minutes")}
                        </span>
                      )}
                      {quiz.overallDifficulty && (
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />{t(`workspace.quiz.difficultyLevels.${quiz.overallDifficulty.toLowerCase()}`)}
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatShortDate(quiz.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {quiz.quizIntent && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isDarkMode ? is.dark || "bg-slate-800 text-slate-400" : is.light || "bg-gray-100 text-gray-500"}`}>
                        {t(`workspace.quiz.intentLabels.${quiz.quizIntent}`)}
                      </span>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDarkMode ? ss.dark : ss.light}`}>
                      {t(`workspace.quiz.statusLabels.${quiz.status}`)}
                    </span>
                    {quiz.status === "ACTIVE" && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDialog({ open: true, quizId: quiz.quizId, mode: 'practice' }); }}
                          className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? "hover:bg-blue-950/30 text-blue-400" : "hover:bg-blue-50 text-blue-600"}`}
                          title={t("workspace.quiz.practice", "Practice")}
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDialog({ open: true, quizId: quiz.quizId, mode: 'exam' }); }}
                          className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? "hover:bg-emerald-950/30 text-emerald-400" : "hover:bg-emerald-50 text-emerald-600"}`}
                          title={t("workspace.quiz.exam", "Exam")}
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => handleDeleteQuiz(e, quiz.quizId)}
                      disabled={deletingId === quiz.quizId}
                      className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? "hover:bg-red-950/30 text-red-400" : "hover:bg-red-50 text-red-500"}`}
                      title={t("workspace.quiz.deleteQuiz")}
                    >
                      {deletingId === quiz.quizId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, quizId: null, mode: null })}>
        <DialogContent className={isDarkMode ? "bg-slate-800 border-slate-700 text-white" : ""}>
          <DialogHeader>
            <DialogTitle>{confirmDialog.mode === 'practice' ? t("workspace.quiz.practice", "Practice") : t("workspace.quiz.exam", "Exam")}</DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-400" : ""}>
              {confirmDialog.mode === 'practice'
                ? t("workspace.quiz.confirmPractice", "Are you sure you want to start this quiz in Practice mode? You can review answers as you go.")
                : t("workspace.quiz.confirmExam", "Are you sure you want to start this quiz in Exam mode? Timer will begin immediately.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, quizId: null, mode: null })}>{t("common.cancel", "Cancel")}</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { navigate(`/quiz/${confirmDialog.mode}/${confirmDialog.quizId}`); setConfirmDialog({ open: false, quizId: null, mode: null }); }}>
              {t("common.confirm", "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QuizListView;
