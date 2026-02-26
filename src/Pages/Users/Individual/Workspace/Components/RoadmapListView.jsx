import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, Plus, ChevronRight, GitBranch, Folder, FileText, BadgeCheck, CreditCard, FolderOpen, Clock, RefreshCw, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getRoadmapsByGroup,
  getRoadmapsByWorkspace,
  getPhasesByRoadmap,
  getKnowledgesByPhase,
  deleteRoadmap,
  deletePhase,
  deleteKnowledge,
} from "@/api/RoadmapAPI";

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

// Cấu hình style cho breadcrumb theo cấp
const LEVEL_STYLES = [
  { dot: "bg-emerald-500", activeLight: "bg-emerald-100 text-emerald-700", activeDark: "bg-emerald-950/50 text-emerald-400", iconBgL: "bg-emerald-100", iconBgD: "bg-emerald-950/40", iconColor: "text-emerald-500" },
  { dot: "bg-blue-500", activeLight: "bg-blue-100 text-blue-700", activeDark: "bg-blue-950/50 text-blue-400", iconBgL: "bg-blue-100", iconBgD: "bg-blue-950/40", iconColor: "text-blue-500" },
  { dot: "bg-amber-500", activeLight: "bg-amber-100 text-amber-700", activeDark: "bg-amber-950/50 text-amber-400", iconBgL: "bg-amber-100", iconBgD: "bg-amber-950/40", iconColor: "text-amber-500" },
  { dot: "bg-purple-500", activeLight: "bg-purple-100 text-purple-700", activeDark: "bg-purple-950/50 text-purple-400" },
];
const LEVEL_ICONS = [GitBranch, Folder, FileText];

function RoadmapListView({ isDarkMode, onCreateRoadmap, createdItems = [], groupId = null, workspaceId = null }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");
  const [path, setPath] = useState([]);
  const depth = path.length;

  // State cho dữ liệu API
  const [roadmaps, setRoadmaps] = useState([]);
  const [phases, setPhases] = useState([]);
  const [knowledges, setKnowledges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch danh sách roadmap khi mount hoặc khi createdItems thay đổi
  const fetchRoadmaps = useCallback(async () => {
    if (!groupId && !workspaceId) {
      // Không có groupId hay workspaceId — không fetch
      setRoadmaps([]);
      return;
    }
    setLoading(true);
    try {
      let res;
      if (groupId) {
        res = await getRoadmapsByGroup(groupId, 0, 50);
      } else {
        res = await getRoadmapsByWorkspace(workspaceId, 0, 50);
      }
      const content = res?.data?.data?.content || res?.data?.content || [];
      const items = content.map((rm) => ({
        id: rm.roadmapId,
        name: rm.title,
        description: rm.description,
        status: rm.status,
        createdAt: rm.createdAt,
        roadmapType: rm.roadmapType,
        createVia: rm.createVia,
      }));
      setRoadmaps(items);
    } catch {
      // Lỗi khi fetch — giữ nguyên state cũ
    } finally {
      setLoading(false);
    }
  }, [groupId, workspaceId]);

  useEffect(() => {
    fetchRoadmaps();
  }, [fetchRoadmaps, createdItems.length]);

  // Fetch phases khi drill vào roadmap
  const fetchPhases = useCallback(async (roadmapId) => {
    setLoading(true);
    try {
      const res = await getPhasesByRoadmap(roadmapId, 0, 50);
      const content = res?.data?.data?.content || res?.data?.content || [];
      const items = content.map((ph) => ({
        id: ph.phaseId,
        name: ph.title,
        description: ph.description,
        status: ph.status,
        phaseIndex: ph.phaseIndex,
        studyDurationInDay: ph.studyDurationInDay,
        roadmapId: ph.roadmapId,
      }));
      setPhases(items);
    } catch {
      setPhases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch knowledges khi drill vào phase
  const fetchKnowledges = useCallback(async (phaseId) => {
    setLoading(true);
    try {
      const res = await getKnowledgesByPhase(phaseId, 0, 50);
      const content = res?.data?.data?.content || res?.data?.content || [];
      const items = content.map((kn) => ({
        id: kn.knowledgeId,
        name: kn.title,
        description: kn.description,
        status: kn.status,
        phaseId: kn.phaseId,
      }));
      setKnowledges(items);
    } catch {
      setKnowledges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Gộp API data với các item mới tạo từ form (chưa có trên server)
  const allRoadmaps = useMemo(() => {
    const fromCreated = createdItems.map((rm) => ({
      id: rm.id || rm.roadmapId,
      name: rm.name || rm.title,
      description: rm.description,
      status: rm.status || "INACTIVE",
      createdAt: rm.createdAt,
    }));
    // Loại bỏ trùng ID
    const apiIds = new Set(roadmaps.map((r) => r.id));
    const unique = fromCreated.filter((r) => !apiIds.has(r.id));
    return [...roadmaps, ...unique];
  }, [roadmaps, createdItems]);

  // Lấy items theo cấp hiện tại
  const currentItems = useMemo(() => {
    if (depth === 0) return allRoadmaps;
    if (depth === 1) return phases;
    if (depth === 2) return knowledges;
    return [];
  }, [depth, allRoadmaps, phases, knowledges]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return currentItems;
    return currentItems.filter(it => it.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [currentItems, searchQuery]);

  const drillDown = async (item) => {
    if (depth === 0) {
      // Drill vào roadmap → fetch phases
      setPath(p => [...p, { id: item.id, name: item.name, data: item }]);
      setSearchQuery("");
      await fetchPhases(item.id);
    } else if (depth === 1) {
      // Drill vào phase → fetch knowledges
      setPath(p => [...p, { id: item.id, name: item.name, data: item }]);
      setSearchQuery("");
      await fetchKnowledges(item.id);
    }
  };

  const goTo = async (idx) => {
    if (idx === 0) {
      setPath([]);
      setSearchQuery("");
      setPhases([]);
      setKnowledges([]);
    } else if (idx === 1) {
      setPath(p => p.slice(0, 1));
      setSearchQuery("");
      setKnowledges([]);
      // Re-fetch phases cho roadmap đầu tiên trong path
      if (path[0]) await fetchPhases(path[0].id);
    } else {
      setPath(p => p.slice(0, idx));
      setSearchQuery("");
    }
  };

  // Xử lý xóa item
  const handleDelete = async (e, item) => {
    e.stopPropagation();
    setDeletingId(item.id);
    try {
      if (depth === 0) {
        await deleteRoadmap(item.id);
        await fetchRoadmaps();
      } else if (depth === 1) {
        const roadmapId = path[0]?.id;
        await deletePhase(item.id, roadmapId);
        await fetchPhases(roadmapId);
      } else if (depth === 2) {
        const phaseId = path[1]?.id;
        await deleteKnowledge(item.id, phaseId);
        await fetchKnowledges(phaseId);
      }
    } catch {
      // Lỗi xóa — bỏ qua
    } finally {
      setDeletingId(null);
    }
  };

  const levelKeys = ["roadmap", "phase", "knowledge"];

  const getItemIcon = (item) => {
    if (item.itemType === "quiz") return { Icon: BadgeCheck, color: "text-blue-500", bg: isDarkMode ? "bg-blue-950/40" : "bg-blue-100" };
    if (item.itemType === "flashcard") return { Icon: CreditCard, color: "text-amber-500", bg: isDarkMode ? "bg-amber-950/40" : "bg-amber-100" };
    const s = LEVEL_STYLES[depth];
    return { Icon: LEVEL_ICONS[depth] || FileText, color: s?.iconColor || "text-gray-500", bg: isDarkMode ? s?.iconBgD : s?.iconBgL };
  };

  const getSubtitle = (item) => {
    if (item.itemType) return item.itemType;
    if (depth === 0) return `${item.status || "INACTIVE"} · ${item.createVia || "MANUAL"}`;
    if (depth === 1) return `${item.status || "INACTIVE"}${item.studyDurationInDay ? ` · ${item.studyDurationInDay}d` : ""}`;
    if (depth === 2) return `${item.status || "INACTIVE"}`;
    return "";
  };

  return (
    <div className={`h-full flex flex-col ${fontClass}`}>
      {/* Breadcrumbs — ô vuông màu cho mỗi cấp */}
      <div className={`px-4 py-3 border-b flex items-center gap-1.5 flex-wrap min-h-[48px] ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button onClick={() => goTo(0)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 ${depth === 0 ? isDarkMode ? LEVEL_STYLES[0].activeDark : LEVEL_STYLES[0].activeLight : isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
          <span className={`w-3 h-3 rounded-sm shrink-0 ${LEVEL_STYLES[0].dot}`} />
          {t(`workspace.listView.levels.${levelKeys[0]}`)}
        </button>
        {path.map((crumb, i) => {
          const ls = LEVEL_STYLES[i + 1] || LEVEL_STYLES[3];
          const isLast = i === path.length - 1;
          return (
            <React.Fragment key={crumb.id}>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isDarkMode ? "text-slate-600" : "text-gray-400"}`} />
              <button onClick={() => goTo(i + 1)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 max-w-[180px] ${isLast ? isDarkMode ? ls.activeDark : ls.activeLight : isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
                <span className={`w-3 h-3 rounded-sm shrink-0 ${ls.dot}`} />
                <span className="truncate">{crumb.name}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Tìm kiếm + Nút tạo */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("workspace.listView.searchPlaceholder")}
            className={`w-full pl-9 pr-9 py-2 rounded-xl text-sm border outline-none transition-colors ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500" : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"}`} />
          {searchQuery && <button onClick={() => setSearchQuery("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}><X className="w-4 h-4" /></button>}
        </div>
        {depth === 0 && (
          <Button onClick={onCreateRoadmap} className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-full h-9 px-4 flex items-center gap-2 shrink-0">
            <Plus className="w-4 h-4" /><span className="text-sm">{t("workspace.listView.create")}</span>
          </Button>
        )}
      </div>

      {/* Danh sách */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className={`w-8 h-8 animate-spin mb-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderOpen className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{searchQuery ? t("workspace.listView.noResults") : t("workspace.listView.noItems")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item, index) => {
              const { Icon, color, bg } = getItemIcon(item);
              const canDrill = depth < 2 && !item.itemType;
              return (
                <div key={`${item.id}-${index}`} onClick={canDrill ? () => drillDown(item) : undefined}
                  className={`rounded-xl px-4 py-3 flex items-center gap-3 transition-all group ${canDrill ? "cursor-pointer" : ""} ${isDarkMode ? "bg-slate-800/50 hover:bg-slate-800 border border-slate-800" : "bg-gray-50 hover:bg-gray-100 border border-gray-100"}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}><Icon className={`w-4 h-4 ${color}`} /></div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{item.name}</p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{getSubtitle(item)}</p>
                    {item.createdAt && (
                      <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t("workspace.listView.createdAt")}: {formatShortDate(item.createdAt)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Nút xóa — chỉ hiện khi hover */}
                    <button
                      onClick={(e) => handleDelete(e, item)}
                      disabled={deletingId === item.id}
                      className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? "hover:bg-red-950/50 text-red-400" : "hover:bg-red-50 text-red-500"}`}
                    >
                      {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                    {canDrill && <ChevronRight className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default RoadmapListView;
