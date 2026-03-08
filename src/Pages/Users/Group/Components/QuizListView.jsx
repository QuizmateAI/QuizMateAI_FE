import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search, X, Plus, BadgeCheck, FolderOpen, Clock, RefreshCw, Play, ClipboardCheck } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/Components/ui/dialog";

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

// Cấu hình màu badge belong-to
const BELONG_STYLES = {
  knowledge: { light: "bg-amber-100 text-amber-700", dark: "bg-amber-950/50 text-amber-400" },
  phase: { light: "bg-blue-100 text-blue-700", dark: "bg-blue-950/50 text-blue-400" },
  roadmap: { light: "bg-emerald-100 text-emerald-700", dark: "bg-emerald-950/50 text-emerald-400" },
  workspace: { light: "bg-slate-100 text-slate-700", dark: "bg-slate-800 text-slate-300" },
  group: { light: "bg-purple-100 text-purple-700", dark: "bg-purple-950/50 text-purple-400" },
};

// Mock data — sẽ thay bằng API sau
const MOCK_QUIZZES = [
  { id: "q1", name: "JS Fundamentals Quiz", belongTo: "workspace", belongToName: "React Workspace", questionsCount: 20, status: "COMPLETED", createdAt: "2026-02-18T09:00:00", updatedAt: "2026-02-24T15:30:00" },
  { id: "q2", name: "JSX Components Quiz", belongTo: "knowledge", belongToName: "JSX & Components", questionsCount: 10, status: "ACTIVE", createdAt: "2026-02-20T10:15:00", updatedAt: "2026-02-25T11:00:00" },
  { id: "q3", name: "Hooks Post-learning Test", belongTo: "phase", belongToName: "Advanced Hooks", questionsCount: 15, status: "PENDING", createdAt: "2026-02-21T14:00:00", updatedAt: "2026-02-23T08:45:00" },
  { id: "q4", name: "React Mastery Mock", belongTo: "roadmap", belongToName: "React Advanced", questionsCount: 50, status: "ACTIVE", createdAt: "2026-02-22T16:30:00", updatedAt: "2026-02-26T09:00:00" },
  { id: "q5", name: "Team Practice Quiz", belongTo: "group", belongToName: "Study Group A", questionsCount: 25, status: "ACTIVE", createdAt: "2026-02-23T11:00:00", updatedAt: "2026-02-25T17:20:00" },
];

const FILTER_OPTIONS = ["all", "knowledge", "phase", "roadmap", "workspace", "group"];

function QuizListView({ isDarkMode, onCreateQuiz, createdItems = [] }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [confirmDialog, setConfirmDialog] = useState({ open: false, quizId: null, mode: null });

  // Gộp mock data với các item đã tạo từ form
  const allQuizzes = useMemo(() => [...MOCK_QUIZZES, ...createdItems], [createdItems]);

  const filtered = useMemo(() => {
    let items = allQuizzes;
    if (filterType !== "all") items = items.filter(q => q.belongTo === filterType);
    if (searchQuery.trim()) items = items.filter(q =>
      q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.belongToName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return items;
  }, [searchQuery, filterType, allQuizzes]);

  return (
    <div className={`h-full flex flex-col ${fontClass}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-blue-500" />
          <p className={`text-base font-medium ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>Quiz</p>
        </div>
        <Button onClick={onCreateQuiz} className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full h-9 px-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /><span className="text-sm">{t("workspace.listView.create")}</span>
        </Button>
      </div>

      {/* Tìm kiếm + Lọc */}
      <div className="px-4 py-3 flex flex-col gap-3">
        <div className="relative max-w-sm">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("workspace.listView.searchPlaceholder")}
            className={`w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-colors ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"}`} />
          {searchQuery && <button onClick={() => setSearchQuery("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}><X className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <button key={opt} onClick={() => setFilterType(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterType === opt
                ? isDarkMode ? "bg-blue-950/50 text-blue-400" : "bg-blue-100 text-blue-700"
                : isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100"
              }`}>
              {t(`workspace.listView.filter.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderOpen className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{t("workspace.listView.noResults")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(quiz => {
              const bs = BELONG_STYLES[quiz.belongTo] || BELONG_STYLES.workspace;
              return (
                <div key={quiz.id} className={`rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer transition-all group ${isDarkMode ? "bg-slate-800/50 hover:bg-slate-800 border border-slate-800" : "bg-gray-50 hover:bg-gray-100 border border-gray-100"}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? "bg-blue-950/40" : "bg-blue-100"}`}>
                    <BadgeCheck className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{quiz.name}</p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{quiz.questionsCount} {t("workspace.quiz.questions")}</p>
                    <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t("workspace.listView.createdAt")}: {formatShortDate(quiz.createdAt)}</span>
                      {quiz.updatedAt && <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />{t("workspace.listView.updatedAt")}: {formatShortDate(quiz.updatedAt)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {quiz.status === "ACTIVE" && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDialog({ open: true, quizId: quiz.id, mode: 'practice' }); }}
                          className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? "hover:bg-blue-950/30 text-blue-400" : "hover:bg-blue-50 text-blue-600"}`}
                          title={t("workspace.quiz.practice", "Practice")}
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDialog({ open: true, quizId: quiz.id, mode: 'exam' }); }}
                          className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? "hover:bg-emerald-950/30 text-emerald-400" : "hover:bg-emerald-50 text-emerald-600"}`}
                          title={t("workspace.quiz.exam", "Exam")}
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${isDarkMode ? bs.dark : bs.light}`}>{quiz.belongToName}</span>
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
