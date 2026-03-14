import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Search, X, Plus, ChevronRight, GitBranch, Folder, FileText,
  BadgeCheck, CreditCard, FolderOpen, Clock, Loader2, Trash2,
  Pencil, GraduationCap, ClipboardList, Check,
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import ListSpinner from "@/Components/ui/ListSpinner";
import { useToast } from "@/context/ToastContext";
import {
  getRoadmapsByGroup,
  getRoadmapsByWorkspace,
  getPhasesByRoadmap,
  getKnowledgesByPhase,
  deleteRoadmap,
  deletePhase,
  deleteKnowledge,
  createPhase,
  createKnowledge,
  updateRoadmap,
  updatePhase,
  updateKnowledge,
} from "@/api/RoadmapAPI";
import { getQuizzesByScope, deleteQuiz as deleteQuizAPI } from "@/api/QuizAPI";
import { getFlashcardsByScope, deleteFlashcardSet } from "@/api/FlashcardAPI";

/* ==================== Helpers ==================== */
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

// Cấu hình style cho breadcrumb & icon theo cấp
const LEVEL_STYLES = [
  { dot: "bg-emerald-500", activeLight: "bg-emerald-100 text-emerald-700", activeDark: "bg-emerald-950/50 text-emerald-400", iconBgL: "bg-emerald-100", iconBgD: "bg-emerald-950/40", iconColor: "text-emerald-500" },
  { dot: "bg-blue-500", activeLight: "bg-blue-100 text-blue-700", activeDark: "bg-blue-950/50 text-blue-400", iconBgL: "bg-blue-100", iconBgD: "bg-blue-950/40", iconColor: "text-blue-500" },
  { dot: "bg-amber-500", activeLight: "bg-amber-100 text-amber-700", activeDark: "bg-amber-950/50 text-amber-400", iconBgL: "bg-amber-100", iconBgD: "bg-amber-950/40", iconColor: "text-amber-500" },
  { dot: "bg-purple-500", activeLight: "bg-purple-100 text-purple-700", activeDark: "bg-purple-950/50 text-purple-400", iconBgL: "bg-purple-100", iconBgD: "bg-purple-950/40", iconColor: "text-purple-500" },
];
const LEVEL_ICONS = [GitBranch, Folder, FileText, BadgeCheck];

/* ==================== Component chính ==================== */
function RoadmapListView({
  isDarkMode,
  onCreateRoadmap,
  createdItems = [],
  groupId = null,
  workspaceId = null,
  onNavigateToCreateMockTest,
  onNavigateToCreatePostLearning,
  onNavigateToCreateQuiz,
  onNavigateToCreateFlashcard,
  onViewMockTest,
  onViewPostLearning,
  onViewQuiz,
  onViewFlashcard,
}) {
  const { t, i18n } = useTranslation();
  const { showError } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const [searchQuery, setSearchQuery] = useState("");
  // path: mỗi phần tử { id, name, data } — dùng để drill-down breadcrumb
  const [path, setPath] = useState([]);
  const depth = path.length; // 0=roadmaps, 1=phases, 2=knowledges, 3=quiz+flashcard

  // Dữ liệu API — roadmap hierarchy
  const [roadmaps, setRoadmaps] = useState([]);
  const [phases, setPhases] = useState([]);
  const [knowledges, setKnowledges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Dữ liệu API — quiz, flashcard, post-learning, mock test (dùng API thật)
  const [quizzes, setQuizzes] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [postLearnings, setPostLearnings] = useState([]);
  const [mockTests, setMockTests] = useState([]);

  // Inline add (thêm phase / knowledge / quiz / flashcard)
  const [addingType, setAddingType] = useState(null);
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Inline edit (title + description)
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  /* ==================== FETCH DATA (chỉ roadmap/phase/knowledge dùng API thật) ==================== */
  const fetchRoadmaps = useCallback(async () => {
    if (!groupId && !workspaceId) { setRoadmaps([]); return; }
    setLoading(true);
    try {
      const res = groupId
        ? await getRoadmapsByGroup(groupId, 0, 50)
        : await getRoadmapsByWorkspace(workspaceId, 0, 50);
      const content = res?.data?.data?.content || res?.data?.content || [];
      setRoadmaps(content.map((rm) => ({
        id: rm.roadmapId, name: rm.title, description: rm.description,
        status: rm.status, createdAt: rm.createdAt,
        roadmapType: rm.roadmapType, createVia: rm.createVia,
      })));
    } catch { /* giữ state cũ */ }
    finally { setLoading(false); }
  }, [groupId, workspaceId]);

  useEffect(() => { fetchRoadmaps(); }, [fetchRoadmaps, createdItems.length]);

  const fetchPhases = useCallback(async (roadmapId) => {
    setLoading(true);
    try {
      const res = await getPhasesByRoadmap(roadmapId, 0, 50);
      const content = res?.data?.data?.content || res?.data?.content || [];
      setPhases(content.map((ph) => ({
        id: ph.phaseId, name: ph.title, description: ph.description,
        status: ph.status, phaseIndex: ph.phaseIndex,
        studyDurationInDay: ph.studyDurationInDay, roadmapId: ph.roadmapId,
      })));
    } catch { setPhases([]); }
    finally { setLoading(false); }
  }, []);

  const fetchKnowledges = useCallback(async (phaseId) => {
    setLoading(true);
    try {
      const res = await getKnowledgesByPhase(phaseId, 0, 50);
      const content = res?.data?.data?.content || res?.data?.content || [];
      setKnowledges(content.map((kn) => ({
        id: kn.knowledgeId, name: kn.title, description: kn.description,
        status: kn.status, phaseId: kn.phaseId,
      })));
    } catch { setKnowledges([]); }
    finally { setLoading(false); }
  }, []);

  /* ==================== FETCH đặc biệt (MockTest, PostLearning, Quiz, Flashcard) — API thật ==================== */
  const fetchMockTests = useCallback(async (roadmapId) => {
    try {
      const res = await getQuizzesByScope("ROADMAP", roadmapId);
      const data = res.data || [];
      setMockTests(data.map((q) => ({
        id: q.quizId, name: q.title, status: q.status, createdAt: q.createdAt,
        duration: q.duration, quizId: q.quizId, itemType: "mockTest",
      })));
    } catch { setMockTests([]); }
  }, []);

  const fetchPostLearnings = useCallback(async (phaseId) => {
    try {
      const res = await getQuizzesByScope("PHASE", phaseId);
      const data = res.data || [];
      setPostLearnings(data.map((q) => ({
        id: q.quizId, name: q.title, status: q.status, createdAt: q.createdAt,
        duration: q.duration, quizId: q.quizId, itemType: "postLearning",
      })));
    } catch { setPostLearnings([]); }
  }, []);

  const fetchQuizzesAndFlashcards = useCallback(async (knowledgeId) => {
    try {
      const [qRes, fRes] = await Promise.all([
        getQuizzesByScope("KNOWLEDGE", knowledgeId),
        getFlashcardsByScope("KNOWLEDGE", knowledgeId),
      ]);
      const qData = qRes.data || [];
      const fData = fRes.data || [];
      setQuizzes(qData.map((q) => ({
        id: q.quizId, name: q.title, status: q.status, createdAt: q.createdAt,
        duration: q.duration, quizId: q.quizId, itemType: "quiz",
      })));
      setFlashcards(fData.map((f) => ({
        id: f.flashcardSetId, name: f.flashcardSetName, status: f.status, createdAt: f.createdAt,
        flashcardSetId: f.flashcardSetId, itemType: "flashcard",
      })));
    } catch {
      setQuizzes([]); setFlashcards([]);
    }
  }, []);

  /* ==================== NAVIGATION (drill-down / breadcrumb) ==================== */
  const allRoadmaps = useMemo(() => {
    const fromCreated = createdItems.map((rm) => ({
      id: rm.id || rm.roadmapId, name: rm.name || rm.title,
      description: rm.description, status: rm.status || "INACTIVE",
      createdAt: rm.createdAt,
    }));
    const apiIds = new Set(roadmaps.map((r) => r.id));
    const unique = fromCreated.filter((r) => !apiIds.has(r.id));
    return [...roadmaps, ...unique];
  }, [roadmaps, createdItems]);

  const currentItems = useMemo(() => {
    if (depth === 0) return allRoadmaps;
    if (depth === 1) return phases;
    if (depth === 2) return knowledges;
    // depth 3: hiển thị theo section riêng bên dưới
    return [...quizzes, ...flashcards];
  }, [depth, allRoadmaps, phases, knowledges, quizzes, flashcards]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return currentItems;
    return currentItems.filter((it) =>
      it.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentItems, searchQuery]);

  const resolveQuizId = (item) => item?.quizId ?? item?.id ?? null;

  const drillDown = async (item) => {
    if (depth === 0) {
      setPath((p) => [...p, { id: item.id, name: item.name, data: item }]);
      setSearchQuery("");
      await fetchPhases(item.id);
      // Mock test — tải từ API khi vào roadmap
      await fetchMockTests(item.id);
    } else if (depth === 1) {
      setPath((p) => [...p, { id: item.id, name: item.name, data: item }]);
      setSearchQuery("");
      await fetchKnowledges(item.id);
      // Post-learning — tải từ API khi vào phase
      await fetchPostLearnings(item.id);
    } else if (depth === 2) {
      // Drill vào knowledge → tải quiz + flashcard từ API
      setPath((p) => [...p, { id: item.id, name: item.name, data: item }]);
      setSearchQuery("");
      await fetchQuizzesAndFlashcards(item.id);
    }
  };

  const goTo = async (idx) => {
    if (idx === 0) {
      setPath([]); setSearchQuery(""); setPhases([]); setKnowledges([]);
      setQuizzes([]); setFlashcards([]); setPostLearnings([]); setMockTests([]);
    } else if (idx === 1) {
      setPath((p) => p.slice(0, 1)); setSearchQuery(""); setKnowledges([]);
      setQuizzes([]); setFlashcards([]); setPostLearnings([]);
      if (path[0]) {
        await fetchPhases(path[0].id);
        await fetchMockTests(path[0].id);
      }
    } else if (idx === 2) {
      setPath((p) => p.slice(0, 2)); setSearchQuery("");
      setQuizzes([]); setFlashcards([]);
      if (path[1]) {
        await fetchKnowledges(path[1].id);
        await fetchPostLearnings(path[1].id);
      }
    } else {
      setPath((p) => p.slice(0, idx)); setSearchQuery("");
    }
    setAddingType(null);
    setEditingId(null);
  };

  /* ==================== DELETE ==================== */
  const handleDelete = async (e, item) => {
    e.stopPropagation();
    setDeletingId(item.id);
    try {
      if (depth === 0) {
        await deleteRoadmap(item.id);
        await fetchRoadmaps();
      } else if (depth === 1) {
        await deletePhase(item.id, path[0]?.id);
        await fetchPhases(path[0]?.id);
      } else if (depth === 2) {
        await deleteKnowledge(item.id, path[1]?.id);
        await fetchKnowledges(path[1]?.id);
      } else if (depth === 3) {
        // Xóa quiz hoặc flashcard — gọi API thật
        if (item.itemType === "quiz") {
          const quizId = resolveQuizId(item);
          if (!quizId) {
            showError(t("workspace.quiz.deleteFail", "Không thể xác định quiz để xóa"));
            return;
          }
          await deleteQuizAPI(quizId);
          setQuizzes((prev) => prev.filter((q) => (q.quizId ?? q.id) !== quizId));
        } else if (item.itemType === "flashcard") {
          await deleteFlashcardSet(item.id);
          setFlashcards((prev) => prev.filter((f) => f.id !== item.id));
        }
      }
    } catch (err) {
      showError(err?.message || t("workspace.quiz.deleteFail", "Xóa quiz thất bại"));
    }
    finally { setDeletingId(null); }
  };

  /* ==================== INLINE ADD ==================== */
  const handleInlineAdd = async () => {
    if (!addName.trim()) { setAddingType(null); return; }
    setAddLoading(true);
    try {
      if (addingType === "phase" && depth === 1) {
        await createPhase(path[0].id, { name: addName.trim(), description: addDescription.trim() });
        await fetchPhases(path[0].id);
      } else if (addingType === "knowledge" && depth === 2) {
        await createKnowledge(path[1].id, { name: addName.trim(), description: addDescription.trim() });
        await fetchKnowledges(path[1].id);
      }
    } catch { /* bỏ qua */ }
    finally { setAddLoading(false); setAddingType(null); setAddName(""); setAddDescription(""); }
  };

  /* ==================== EDIT (gọi API update title + description) ==================== */
  const handleSaveEdit = useCallback(async (item) => {
    const newTitle = editTitle.trim();
    const newDesc = editDesc.trim();
    // Nếu không thay đổi gì → đóng
    if (newTitle === (item.name || "") && newDesc === (item.description || "")) {
      setEditingId(null);
      return;
    }
    if (!newTitle) { setEditingId(null); return; }
    setEditLoading(true);
    try {
      if (depth === 0) {
        await updateRoadmap(item.id, { title: newTitle, description: newDesc, status: item.status });
        await fetchRoadmaps();
      } else if (depth === 1) {
        await updatePhase(item.id, { title: newTitle, description: newDesc, status: item.status, studyDurationInDay: item.studyDurationInDay, phaseIndex: item.phaseIndex });
        await fetchPhases(path[0]?.id);
      } else if (depth === 2) {
        await updateKnowledge(item.id, { title: newTitle, description: newDesc, status: item.status });
        await fetchKnowledges(path[1]?.id);
      }
    } catch { /* bỏ qua */ }
    finally { setEditLoading(false); setEditingId(null); }
  }, [depth, editTitle, editDesc, path, fetchRoadmaps, fetchPhases, fetchKnowledges]);

  /* ==================== RENDER HELPERS ==================== */
  const levelKeys = ["roadmap", "phase", "knowledge", "items"];

  const getItemIcon = (item) => {
    if (item.itemType === "quiz") return { Icon: BadgeCheck, color: "text-blue-500", bg: isDarkMode ? "bg-blue-950/40" : "bg-blue-100" };
    if (item.itemType === "flashcard") return { Icon: CreditCard, color: "text-amber-500", bg: isDarkMode ? "bg-amber-950/40" : "bg-amber-100" };
    const s = LEVEL_STYLES[Math.min(depth, 3)];
    return {
      Icon: LEVEL_ICONS[Math.min(depth, 3)] || FileText,
      color: s?.iconColor || "text-gray-500",
      bg: isDarkMode ? s?.iconBgD : s?.iconBgL,
    };
  };

  const getSubtitle = (item) => {
    if (item.itemType === "quiz") return `Quiz · ${item.status || "ACTIVE"}`;
    if (item.itemType === "flashcard") return `Flashcard · ${item.status || "ACTIVE"}`;
    if (depth === 0) return item.description || "";
    if (depth === 1) return item.description || "";
    if (depth === 2) return item.description || "";
    return "";
  };

  /* ---------- Special Card (MockTest / PostLearning) với API thật ---------- */
  const renderSpecialCard = (type) => {
    const isMock = type === "mockTest";
    const entities = isMock ? mockTests : postLearnings;
    const Icon = isMock ? ClipboardList : GraduationCap;
    const title = isMock ? t("workspace.mockTest.title") : t("workspace.roadmap.postLearning");
    const noItemsKey = isMock ? "workspace.roadmap.noMockTestYet" : "workspace.roadmap.noPostLearningYet";

    // Đã có entities — hiện danh sách + actions
    if (entities.length > 0) {
      return (
        <div className="mb-3 space-y-2">
          {entities.map((entity) => (
            <div key={entity.id} className={`rounded-xl border-2 p-4 transition-all ${
              isMock
                ? isDarkMode ? "border-purple-700/50 bg-purple-950/20" : "border-purple-300 bg-purple-50"
                : isDarkMode ? "border-orange-700/50 bg-orange-950/20" : "border-orange-300 bg-orange-50"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isMock
                    ? isDarkMode ? "bg-purple-950/50" : "bg-purple-100"
                    : isDarkMode ? "bg-orange-950/50" : "bg-orange-100"
                }`}>
                  <Icon className={`w-5 h-5 ${isMock ? "text-purple-500" : "text-orange-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>
                    {entity.name || title}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    {entity.status || "ACTIVE"}
                    {entity.createdAt && ` · ${formatShortDate(entity.createdAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm"
                    onClick={() => isMock ? onViewMockTest?.(entity) : onViewPostLearning?.(entity)}
                    className={`rounded-full text-xs h-8 px-4 transition-all active:scale-95 ${
                      isMock
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "bg-orange-500 hover:bg-orange-600 text-white"
                    }`}>
                    {t("workspace.listView.start")}
                  </Button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const quizId = resolveQuizId(entity);
                      setDeletingId(quizId ?? entity.id);
                      try {
                        if (!quizId) {
                          showError(t("workspace.quiz.deleteFail", "Không thể xác định quiz để xóa"));
                          return;
                        }
                        await deleteQuizAPI(quizId);
                        if (isMock) {
                          setMockTests((prev) => prev.filter((m) => (m.quizId ?? m.id) !== quizId));
                        } else {
                          setPostLearnings((prev) => prev.filter((p) => (p.quizId ?? p.id) !== quizId));
                        }
                      } catch (err) {
                        showError(err?.message || t("workspace.quiz.deleteFail", "Xóa quiz thất bại"));
                      }
                      finally { setDeletingId(null); }
                    }}
                    className={`p-1.5 rounded-lg transition-all ${
                      isDarkMode ? "hover:bg-red-950/50 text-red-400" : "hover:bg-red-50 text-red-500"
                    }`}
                  >
                    {deletingId === (resolveQuizId(entity) ?? entity.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Chưa có entity — hiện nút tạo mới
    return (
      <div className={`rounded-xl border-2 border-dashed p-4 mb-3 transition-all ${
        isMock
          ? isDarkMode ? "border-purple-700/30 bg-purple-950/10" : "border-purple-200 bg-purple-50/50"
          : isDarkMode ? "border-orange-700/30 bg-orange-950/10" : "border-orange-200 bg-orange-50/50"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isMock
              ? isDarkMode ? "bg-purple-950/30" : "bg-purple-100/70"
              : isDarkMode ? "bg-orange-950/30" : "bg-orange-100/70"
          }`}>
            <Icon className={`w-5 h-5 ${isMock ? "text-purple-400" : "text-orange-400"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>{title}</p>
            <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              {t(noItemsKey)}
            </p>
          </div>
          <Button size="sm" onClick={() => isMock ? onNavigateToCreateMockTest?.() : onNavigateToCreatePostLearning?.()}
            className={`rounded-full text-xs h-8 px-4 transition-all active:scale-95 ${
              isMock
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            }`}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            {t("workspace.listView.create")}
          </Button>
        </div>
      </div>
    );
  };

  /* ---------- Inline add row ---------- */
  const renderAddRow = () => {
    if (!addingType) return null;
    const placeholderMap = {
      phase: t("workspace.roadmap.phaseNamePlaceholder"),
      knowledge: t("workspace.roadmap.knowledgeNamePlaceholder"),
      quiz: t("workspace.roadmap.quizNamePlaceholder"),
      flashcard: t("workspace.roadmap.flashcardNamePlaceholder"),
    };
    const descriptionPlaceholderMap = {
      phase: t("workspace.roadmap.phaseDescPlaceholder"),
      knowledge: t("workspace.roadmap.knowledgeDescPlaceholder"),
    };
    const canInputDescription = addingType === "phase" || addingType === "knowledge";
    return (
      <div className={`rounded-xl px-4 py-3 flex items-start gap-3 border ${
        isDarkMode ? "bg-slate-800 border-blue-500/50" : "bg-blue-50/50 border-blue-300"
      }`}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-blue-950/40" : "bg-blue-100"}`}>
          <Plus className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex-1 space-y-2">
          <input
            autoFocus
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleInlineAdd();
              if (e.key === "Escape") { setAddingType(null); setAddName(""); setAddDescription(""); }
            }}
            placeholder={placeholderMap[addingType] || ""}
            className={`w-full bg-transparent outline-none text-sm ${
              isDarkMode ? "text-white placeholder:text-slate-500" : "text-gray-900 placeholder:text-gray-400"
            }`}
          />
          {canInputDescription && (
            <textarea
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setAddingType(null); setAddName(""); setAddDescription(""); }
              }}
              placeholder={descriptionPlaceholderMap[addingType] || ""}
              rows={2}
              className={`w-full rounded-lg border px-3 py-2 text-xs outline-none resize-none ${
                isDarkMode
                  ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                  : "bg-white border-blue-200 text-gray-900 placeholder:text-gray-400"
              }`}
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          {addLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          ) : (
            <>
              <Button size="sm" onClick={handleInlineAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-7 px-3 text-xs transition-all active:scale-95">
                {t("workspace.listView.create")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingType(null); setAddName(""); setAddDescription(""); }}
                className={`rounded-lg h-7 px-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  /* ---------- Nút thêm ở cuối danh sách ---------- */
  const renderAddButton = () => {
    if (depth === 0 || depth === 3 || addingType) return null;
    const label = depth === 1
      ? t("workspace.roadmap.addPhase")
      : depth === 2
        ? t("workspace.roadmap.addKnowledge")
        : null;
    if (!label) return null;
    return (
      <div className="mt-3">
        <Button variant="outline"
          onClick={() => { setAddingType(depth === 1 ? "phase" : "knowledge"); setAddName(""); setAddDescription(""); }}
          className={`rounded-xl h-10 w-full border-dashed border-2 flex items-center gap-2 transition-all active:scale-[0.98] ${
            isDarkMode
              ? "border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-400 hover:bg-slate-800/40"
              : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50"
          }`}>
          <Plus className="w-4 h-4" /> {label}
        </Button>
      </div>
    );
  };

  /* ---------- Render một item (quiz/flashcard) trong depth 3 ---------- */
  const renderDepth3Item = (item, index) => {
    const isQuiz = item.itemType === "quiz";
    return (
      <div
        key={`${item.itemType}-${item.id}-${index}`}
        onClick={() => isQuiz ? onViewQuiz?.(item) : onViewFlashcard?.(item)}
        className={`rounded-xl px-4 py-3 flex items-center gap-3 transition-all group cursor-pointer ${
          isDarkMode ? "bg-slate-800/50 hover:bg-slate-800 border border-slate-800" : "bg-gray-50 hover:bg-gray-100 border border-gray-100"
        }`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isQuiz
            ? isDarkMode ? "bg-blue-950/40" : "bg-blue-100"
            : isDarkMode ? "bg-amber-950/40" : "bg-amber-100"
        }`}>
          {isQuiz
            ? <BadgeCheck className="w-4 h-4 text-blue-500" />
            : <CreditCard className="w-4 h-4 text-amber-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {item.name}
          </p>
          <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            {getSubtitle(item)}
          </p>
          {item.createdAt && (
            <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatShortDate(item.createdAt)}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => handleDelete(e, item)}
            disabled={deletingId === item.id}
            className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
              isDarkMode ? "hover:bg-red-950/50 text-red-400" : "hover:bg-red-50 text-red-500"
            }`}
          >
            {deletingId === item.id
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    );
  };

  /* ==================== MAIN RENDER ==================== */
  return (
    <div className={`h-full flex flex-col ${fontClass}`}>
      {/* ===== Breadcrumbs ===== */}
      <div className={`px-4 py-3 border-b flex items-center gap-1.5 flex-wrap min-h-[48px] ${
        isDarkMode ? "border-slate-800" : "border-gray-200"
      }`}>
        <button onClick={() => goTo(0)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 ${
            depth === 0
              ? (isDarkMode ? LEVEL_STYLES[0].activeDark : LEVEL_STYLES[0].activeLight)
              : (isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600")
          }`}>
          <span className={`w-3 h-3 rounded-sm shrink-0 ${LEVEL_STYLES[0].dot}`} />
          {t(`workspace.listView.levels.${levelKeys[0]}`)}
        </button>
        {path.map((crumb, i) => {
          const ls = LEVEL_STYLES[Math.min(i + 1, 3)];
          const isLast = i === path.length - 1;
          return (
            <React.Fragment key={`${crumb.id}-${i}`}>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isDarkMode ? "text-slate-600" : "text-gray-400"}`} />
              <button onClick={() => goTo(i + 1)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 max-w-[180px] ${
                  isLast
                    ? (isDarkMode ? ls.activeDark : ls.activeLight)
                    : (isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600")
                }`}>
                <span className={`w-3 h-3 rounded-sm shrink-0 ${ls.dot}`} />
                <span className="truncate">{crumb.name}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* ===== Search bar + Create button ===== */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          <input
            type="text" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("workspace.listView.searchPlaceholder")}
            className={`w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-colors ${
              isDarkMode
                ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
            }`}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {depth === 0 && (
          <Button onClick={onCreateRoadmap}
            className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full h-9 px-4 flex items-center gap-2 shrink-0 transition-all active:scale-95">
            <Plus className="w-4 h-4" />
            <span className="text-sm">{t("workspace.listView.create")}</span>
          </Button>
        )}
      </div>

      {/* ===== Content list ===== */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Special card: MockTest (depth 1 = bên trong 1 roadmap) */}
        {depth === 1 && renderSpecialCard("mockTest")}
        {/* Special card: PostLearning (depth 2 = bên trong 1 phase) */}
        {depth === 2 && renderSpecialCard("postLearning")}

        {loading ? (
          <ListSpinner variant="section" />
        ) : depth === 3 ? (
          /* ===== Depth 3: Quiz & Flashcard sections — API thật ===== */
          <div className="space-y-5">
            {/* --- Quiz section --- */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-blue-500" />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    Quiz ({quizzes.length})
                  </span>
                </div>
                <button onClick={() => onNavigateToCreateQuiz?.()}
                  className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all active:scale-95 ${
                    isDarkMode ? "text-blue-400 hover:bg-blue-950/30" : "text-blue-600 hover:bg-blue-50"
                  }`}>
                  <Plus className="w-3.5 h-3.5" /> {t("workspace.roadmap.addQuiz")}
                </button>
              </div>
              <div className="space-y-2">
                {quizzes.map((quiz, index) => renderDepth3Item(quiz, index))}
                {quizzes.length === 0 && (
                  <p className={`text-xs text-center py-3 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                    {t("workspace.roadmap.noQuizYet")}
                  </p>
                )}
              </div>
            </div>

            {/* Đường phân cách */}
            <hr className={isDarkMode ? "border-slate-800" : "border-gray-200"} />

            {/* --- Flashcard section --- */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    Flashcard ({flashcards.length})
                  </span>
                </div>
                <button onClick={() => onNavigateToCreateFlashcard?.()}
                  className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all active:scale-95 ${
                    isDarkMode ? "text-amber-400 hover:bg-amber-950/30" : "text-amber-600 hover:bg-amber-50"
                  }`}>
                  <Plus className="w-3.5 h-3.5" /> {t("workspace.roadmap.addFlashcard")}
                </button>
              </div>
              <div className="space-y-2">
                {flashcards.map((fc, index) => renderDepth3Item(fc, index))}
                {flashcards.length === 0 && (
                  <p className={`text-xs text-center py-3 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                    {t("workspace.roadmap.noFlashcardYet")}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : filtered.length === 0 && !addingType ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderOpen className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
              {searchQuery ? t("workspace.listView.noResults") : t("workspace.listView.noItems")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Danh sách item chính (roadmaps / phases / knowledges) */}
            {filtered.map((item, index) => {
              const { Icon, color, bg } = getItemIcon(item);
              const canDrill = depth < 3;
              const isEditing = editingId === item.id;

              /* --- Chế độ chỉnh sửa (title + description) --- */
              if (isEditing) {
                return (
                  <div
                    key={`${item.id}-${index}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`rounded-xl px-4 py-3 border-2 transition-all ${
                      isDarkMode ? "bg-slate-800 border-blue-500/50" : "bg-blue-50/30 border-blue-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Tiêu đề */}
                        <div>
                          <label className={`block text-[11px] font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                            {t("workspace.roadmap.name")}
                          </label>
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(item); }
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            disabled={editLoading}
                            placeholder={t("workspace.roadmap.namePlaceholder")}
                            className={`w-full text-sm font-medium rounded-lg border px-3 py-1.5 outline-none transition-all ${
                              isDarkMode
                                ? "bg-slate-900 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500"
                                : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"
                            }`}
                          />
                        </div>
                        {/* Mô tả */}
                        <div>
                          <label className={`block text-[11px] font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                            {t("workspace.roadmap.descriptionLabel")}
                          </label>
                          <textarea
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); handleSaveEdit(item); }
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            disabled={editLoading}
                            placeholder={t("workspace.roadmap.goalPlaceholder")}
                            rows={2}
                            className={`w-full text-sm rounded-lg border px-3 py-1.5 outline-none transition-all resize-none ${
                              isDarkMode
                                ? "bg-slate-900 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500"
                                : "bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400"
                            }`}
                          />
                        </div>
                        {/* Nút lưu / hủy */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <Button size="sm" onClick={() => handleSaveEdit(item)} disabled={editLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-7 px-3 text-xs transition-all active:scale-95">
                            {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                            {t("workspace.roadmap.save") || "Save"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={editLoading}
                            className={`rounded-lg h-7 px-3 text-xs ${isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"}`}>
                            <X className="w-3.5 h-3.5 mr-1" />
                            {t("workspace.roadmap.cancel")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              /* --- Chế độ xem bình thường --- */
              return (
                <div
                  key={`${item.id}-${index}`}
                  onClick={canDrill ? () => drillDown(item) : undefined}
                  className={`rounded-xl px-4 py-3 flex items-center gap-3 transition-all group ${
                    canDrill ? "cursor-pointer" : ""
                  } ${isDarkMode ? "bg-slate-800/50 hover:bg-slate-800 border border-slate-800" : "bg-gray-50 hover:bg-gray-100 border border-gray-100"}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {item.name}
                    </p>
                    {getSubtitle(item) && (
                      <p className={`text-xs mt-0.5 line-clamp-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                        {getSubtitle(item)}
                      </p>
                    )}
                    {item.createdAt && (
                      <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {t("workspace.listView.createdAt")}: {formatShortDate(item.createdAt)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Nút chỉnh sửa */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditTitle(item.name || ""); setEditDesc(item.description || ""); }}
                      className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                        isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-200 text-gray-500"
                      }`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {/* Nút xóa */}
                    <button
                      onClick={(e) => handleDelete(e, item)}
                      disabled={deletingId === item.id}
                      className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                        isDarkMode ? "hover:bg-red-950/50 text-red-400" : "hover:bg-red-50 text-red-500"
                      }`}
                    >
                      {deletingId === item.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                    {canDrill && (
                      <ChevronRight className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Inline add row */}
            {renderAddRow()}
          </div>
        )}

        {/* Nút thêm ở cuối danh sách */}
        {!loading && renderAddButton()}
      </div>
    </div>
  );
}

export default RoadmapListView;
