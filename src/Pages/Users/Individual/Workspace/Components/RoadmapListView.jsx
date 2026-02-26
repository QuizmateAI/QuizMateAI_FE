import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, Plus, ChevronRight, GitBranch, Folder, FileText, BadgeCheck, CreditCard, FolderOpen, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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

// Mock data — sẽ thay bằng API sau
const MOCK_ROADMAPS = [
  { id: "rm-1", name: "React Advanced Patterns", phasesCount: 2, status: "ACTIVE",
    createdAt: "2026-02-20T08:30:00", updatedAt: "2026-02-25T14:20:00",
    phases: [
      { id: "ph-1", name: "Fundamentals", createdAt: "2026-02-20T08:30:00", updatedAt: "2026-02-24T10:00:00", knowledges: [
        { id: "kn-1", name: "JSX & Components", quizCount: 2, flashcardCount: 3, createdAt: "2026-02-20T09:00:00", updatedAt: "2026-02-23T11:30:00" },
        { id: "kn-2", name: "Props & State", quizCount: 1, flashcardCount: 2, createdAt: "2026-02-20T09:30:00", updatedAt: "2026-02-22T16:45:00" },
      ]},
      { id: "ph-2", name: "Advanced Hooks", createdAt: "2026-02-21T10:00:00", updatedAt: "2026-02-25T14:20:00", knowledges: [
        { id: "kn-3", name: "useReducer & useContext", quizCount: 1, flashcardCount: 1, createdAt: "2026-02-21T10:30:00", updatedAt: "2026-02-25T14:20:00" },
      ]},
    ]
  },
  { id: "rm-2", name: "Data Structures & Algorithms", phasesCount: 1, status: "ACTIVE",
    createdAt: "2026-02-22T10:00:00", updatedAt: "2026-02-24T09:15:00",
    phases: [{ id: "ph-3", name: "Linear Structures", createdAt: "2026-02-22T10:00:00", updatedAt: "2026-02-24T09:15:00", knowledges: [
      { id: "kn-4", name: "Arrays & Linked Lists", quizCount: 3, flashcardCount: 4, createdAt: "2026-02-22T10:30:00", updatedAt: "2026-02-24T09:15:00" },
    ]}]
  },
];

function RoadmapListView({ isDarkMode, onCreateRoadmap, createdItems = [] }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [searchQuery, setSearchQuery] = useState("");
  const [path, setPath] = useState([]);
  const depth = path.length;

  // Gộp mock data với các item đã tạo từ form
  const allRoadmaps = useMemo(() => [...MOCK_ROADMAPS, ...createdItems], [createdItems]);

  // Lấy items theo cấp hiện tại
  const currentItems = useMemo(() => {
    if (depth === 0) return allRoadmaps;
    if (depth === 1) return path[0].data?.phases || [];
    if (depth === 2) return path[1].data?.knowledges || [];
    if (depth === 3) {
      const kn = path[2].data;
      return [
        ...Array(kn?.quizCount || 0).fill(0).map((_, i) => ({ id: `q-${i}`, name: `Quiz ${i + 1}`, itemType: "quiz" })),
        ...Array(kn?.flashcardCount || 0).fill(0).map((_, i) => ({ id: `f-${i}`, name: `Flashcard ${i + 1}`, itemType: "flashcard" })),
      ];
    }
    return [];
  }, [path, depth]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return currentItems;
    return currentItems.filter(it => it.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [currentItems, searchQuery]);

  const drillDown = (item) => { if (depth < 3) { setPath(p => [...p, { id: item.id, name: item.name, data: item }]); setSearchQuery(""); } };
  const goTo = (idx) => { setPath(p => p.slice(0, idx)); setSearchQuery(""); };

  const levelKeys = ["roadmap", "phase", "knowledge", "items"];

  const getItemIcon = (item) => {
    if (item.itemType === "quiz") return { Icon: BadgeCheck, color: "text-blue-500", bg: isDarkMode ? "bg-blue-950/40" : "bg-blue-100" };
    if (item.itemType === "flashcard") return { Icon: CreditCard, color: "text-amber-500", bg: isDarkMode ? "bg-amber-950/40" : "bg-amber-100" };
    const s = LEVEL_STYLES[depth];
    return { Icon: LEVEL_ICONS[depth] || FileText, color: s?.iconColor || "text-gray-500", bg: isDarkMode ? s?.iconBgD : s?.iconBgL };
  };

  const getSubtitle = (item) => {
    if (item.itemType) return item.itemType;
    if (depth === 0) return `${item.phasesCount || item.phases?.length || 0} ${t("workspace.roadmap.phases")}`;
    if (depth === 1) return `${item.knowledges?.length || 0} ${t("workspace.roadmap.knowledge")}`;
    if (depth === 2) return `${item.quizCount || 0} quiz · ${item.flashcardCount || 0} flashcard`;
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
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderOpen className={`w-10 h-10 mb-2 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{searchQuery ? t("workspace.listView.noResults") : t("workspace.listView.noItems")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const { Icon, color, bg } = getItemIcon(item);
              const canDrill = depth < 3 && !item.itemType;
              return (
                <div key={item.id} onClick={canDrill ? () => drillDown(item) : undefined}
                  className={`rounded-xl px-4 py-3 flex items-center gap-3 transition-all ${canDrill ? "cursor-pointer" : ""} ${isDarkMode ? "bg-slate-800/50 hover:bg-slate-800 border border-slate-800" : "bg-gray-50 hover:bg-gray-100 border border-gray-100"}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}><Icon className={`w-4 h-4 ${color}`} /></div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>{item.name}</p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>{getSubtitle(item)}</p>
                    {item.createdAt && (
                      <div className={`flex items-center gap-3 mt-1 text-[11px] ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t("workspace.listView.createdAt")}: {formatShortDate(item.createdAt)}</span>
                        {item.updatedAt && <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" />{t("workspace.listView.updatedAt")}: {formatShortDate(item.updatedAt)}</span>}
                      </div>
                    )}
                  </div>
                  {canDrill && <ChevronRight className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />}
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
