import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";
import switchViewsIllustration from "@/assets/roadmap-guide/switch-views.svg";
import editRefreshIllustration from "@/assets/roadmap-guide/edit-refresh.svg";
import focusPhaseIllustration from "@/assets/roadmap-guide/focus-phase.svg";
import journeyPanelIllustration from "@/assets/roadmap-guide/journey-panel.svg";
import workspaceHeaderSummaryIllustration from "@/assets/roadmap-guide/workspace-header-summary.svg";
import workspaceOverviewPhasesIllustration from "@/assets/roadmap-guide/workspace-overview-phases.svg";
import workspacePhaseDrawerIllustration from "@/assets/roadmap-guide/workspace-phase-drawer.svg";
import workspaceKnowledgeDetailIllustration from "@/assets/roadmap-guide/workspace-knowledge-detail.svg";

export const ROADMAP_GUIDE_SEEN_STORAGE_KEY = "quizmate_roadmap_guide_seen_v2";

const COMMON_COPY = {
  en: {
    button: "Roadmap guide",
    title: "How to use roadmap",
    back: "Back",
    next: "Next",
    done: "Got it",
    stepLabel: "Step {{current}} / {{total}}",
    footer: "This guide opens automatically only once. You can always reopen it from the guide button in the roadmap header.",
  },
  vi: {
    button: "Hướng dẫn",
    title: "Hướng dẫn sử dụng lộ trình",
    back: "Quay lại",
    next: "Tiếp theo",
    done: "Đã hiểu",
    stepLabel: "Bước {{current}} / {{total}}",
    footer: "Guide này chỉ tự mở một lần. Bạn luôn có thể mở lại bằng nút Hướng dẫn ở header của roadmap.",
  },
};

const GUIDE_VARIANTS = {
  workspace: {
    images: [
      workspaceHeaderSummaryIllustration,
      workspaceOverviewPhasesIllustration,
      workspacePhaseDrawerIllustration,
      workspaceKnowledgeDetailIllustration,
    ],
    en: {
      description: "This walkthrough follows the new roadmap flow in the workspace: read the header, choose a phase from overview, open the phase drawer, then move through knowledge detail.",
      sections: [
        {
          title: "Start from the roadmap header",
          description: "Open the roadmap summary dropdown under the title to see the current roadmap content and counts. The actions on the right let you refresh, edit, or reopen this guide.",
          imageAlt: "Workspace roadmap header with summary dropdown and actions",
        },
        {
          title: "Choose a phase from overview",
          description: "The main roadmap now opens in Overview. Click any phase card to inspect that phase instead of switching layouts from the header.",
          imageAlt: "Workspace roadmap overview with phase cards",
        },
        {
          title: "Use the phase drawer to pick knowledge",
          description: "After selecting a phase, the right drawer shows the phase description, status, and the list of knowledge items. Pick the exact knowledge you want to study next from here.",
          imageAlt: "Workspace roadmap phase drawer with knowledge list",
        },
        {
          title: "Read knowledge detail and continue",
          description: "Inside knowledge detail, use Back to return to the phase, and Continue to move to the next knowledge. If the phase is locked, unlock it before continuing.",
          imageAlt: "Workspace roadmap knowledge detail with back and continue actions",
        },
      ],
    },
    vi: {
      description: "Guide này đi đúng theo flow roadmap mới trong workspace: xem header, chọn phase từ Tổng quan, mở drawer phase, rồi đi tiếp qua màn chi tiết knowledge.",
      sections: [
        {
          title: "Bắt đầu từ header roadmap",
          description: "Bấm menu Nội dung roadmap ngay dưới tiêu đề để xem tóm tắt roadmap hiện tại và các chỉ số chính. Cụm nút bên phải dùng để làm mới, chỉnh sửa hoặc mở lại guide này.",
          imageAlt: "Header roadmap của workspace với menu nội dung và các nút thao tác",
        },
        {
          title: "Chọn phase từ màn Tổng quan",
          description: "Roadmap giờ mặc định mở ở màn Tổng quan. Bạn chỉ cần bấm trực tiếp vào phase muốn xem, không cần đổi layout từ header như trước.",
          imageAlt: "Màn tổng quan roadmap trong workspace với các phase card",
        },
        {
          title: "Dùng drawer phase để chọn knowledge",
          description: "Sau khi chọn phase, drawer bên phải sẽ hiện mô tả, trạng thái và danh sách knowledge của phase đó. Hãy chọn đúng knowledge bạn muốn học tiếp ngay tại đây.",
          imageAlt: "Drawer phase của roadmap với danh sách knowledge",
        },
        {
          title: "Đọc chi tiết knowledge rồi bấm Tiếp tục",
          description: "Ở màn chi tiết knowledge, dùng Quay lại để trở về phase và dùng Tiếp tục để sang knowledge kế tiếp. Nếu phase đang khóa thì cần mở khóa trước khi đi tiếp.",
          imageAlt: "Màn chi tiết knowledge với nút quay lại và tiếp tục",
        },
      ],
    },
  },
  group: {
    images: [
      switchViewsIllustration,
      editRefreshIllustration,
      focusPhaseIllustration,
      journeyPanelIllustration,
    ],
    en: {
      description: "This walkthrough follows the roadmap layout used in group workspaces: switch between detail and overview, refresh or edit the roadmap, then move through phases and the journey panel.",
      sections: [
        {
          title: "Switch between Detail and Overview",
          description: "Use the two roadmap view buttons in the header to move between the detailed learning flow and the overview map of the roadmap.",
          imageAlt: "Group roadmap header with detail and overview buttons",
        },
        {
          title: "Refresh or edit from the header",
          description: "Choose Refresh after roadmap phases change, and choose Edit when you need to update roadmap configuration for the current group.",
          imageAlt: "Group roadmap header refresh and edit actions",
        },
        {
          title: "Open the phase you want to study",
          description: "Click a phase or knowledge node on the roadmap to open the matching learning content and quiz context for that part of the roadmap.",
          imageAlt: "Group roadmap phase focus and linked content",
        },
        {
          title: "Follow the journey panel on the right",
          description: "The journey panel helps everyone in the group jump between roadmap phases quickly and keep the current study position visible.",
          imageAlt: "Group roadmap journey panel on the right side",
        },
      ],
    },
    vi: {
      description: "Guide này đi theo layout roadmap hiện có trong group workspace: đổi giữa Chi tiết và Tổng quan, làm mới hoặc chỉnh sửa roadmap, rồi theo dõi phase và cột hành trình.",
      sections: [
        {
          title: "Đổi giữa Chi tiết và Tổng quan",
          description: "Dùng hai nút chế độ xem trên header để chuyển giữa luồng học chi tiết và màn tổng quan của toàn bộ roadmap.",
          imageAlt: "Header roadmap của group với nút Chi tiết và Tổng quan",
        },
        {
          title: "Làm mới hoặc chỉnh sửa ngay trên header",
          description: "Chọn Làm mới sau khi phase của roadmap thay đổi, và chọn Chỉnh sửa khi cần cập nhật cấu hình roadmap cho nhóm hiện tại.",
          imageAlt: "Các nút làm mới và chỉnh sửa trên header roadmap của group",
        },
        {
          title: "Mở đúng phase đang muốn học",
          description: "Bấm vào phase hoặc knowledge trên roadmap để mở đúng nội dung học và quiz liên quan tới phần đó của lộ trình.",
          imageAlt: "Roadmap của group với phase được chọn và nội dung liên quan",
        },
        {
          title: "Theo dõi cột hành trình bên phải",
          description: "Cột hành trình giúp cả nhóm nhảy nhanh giữa các phase và luôn nhìn rõ vị trí học hiện tại trên roadmap.",
          imageAlt: "Cột hành trình của roadmap ở group workspace",
        },
      ],
    },
  },
};

function hasSeenRoadmapGuide() {
  try {
    return window.localStorage.getItem(ROADMAP_GUIDE_SEEN_STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

function markRoadmapGuideSeen() {
  try {
    window.localStorage.setItem(ROADMAP_GUIDE_SEEN_STORAGE_KEY, "true");
  } catch {
    // Ignore storage errors and keep the guide accessible manually.
  }
}

function resolveGuideVariant(variant = "workspace") {
  return GUIDE_VARIANTS[variant] ? variant : "workspace";
}

function buildGuideCopy(variant, language) {
  const resolvedVariant = resolveGuideVariant(variant);
  const resolvedLanguage = language === "en" ? "en" : "vi";

  return {
    ...COMMON_COPY[resolvedLanguage],
    ...GUIDE_VARIANTS[resolvedVariant][resolvedLanguage],
    images: GUIDE_VARIANTS[resolvedVariant].images,
  };
}

function RoadmapGuideDialog({
  open,
  onOpenChange,
  isDarkMode = false,
  variant = "workspace",
}) {
  const { i18n } = useTranslation();
  const copy = buildGuideCopy(variant, i18n.language);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const totalSteps = copy.sections.length;
  const activeSection = copy.sections[activeIndex];
  const activeImage = copy.images[activeIndex];
  const isLastStep = activeIndex === totalSteps - 1;

  React.useEffect(() => {
    if (!open) {
      setActiveIndex(0);
    }
  }, [open]);

  const handlePrev = React.useCallback(() => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleNext = React.useCallback(() => {
    if (isLastStep) {
      onOpenChange(false);
      return;
    }
    setActiveIndex((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [isLastStep, onOpenChange, totalSteps]);

  const stepLabel = copy.stepLabel
    .replace("{{current}}", String(activeIndex + 1))
    .replace("{{total}}", String(totalSteps));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-4xl border p-0 overflow-hidden ${isDarkMode ? "border-slate-800 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}
      >
        <div className="grid min-h-[680px] grid-rows-[auto_1fr_auto]">
          <DialogHeader className="px-6 pb-0 pt-6">
            <div className="flex items-center gap-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                {stepLabel}
              </span>
            </div>
            <DialogTitle className="pt-3 text-left text-2xl">
              {copy.title}
            </DialogTitle>
            <DialogDescription className={`text-left text-base leading-7 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              {copy.description}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.25fr_0.95fr] lg:items-center">
            <div
              className={`overflow-hidden rounded-xl border ${isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50"}`}
            >
              <img
                src={activeImage}
                alt={activeSection.imageAlt}
                className="block h-full w-full object-cover"
              />
            </div>

            <div className="flex flex-col justify-center">
              <h3 className="text-2xl font-semibold leading-tight">
                {activeSection.title}
              </h3>
              <p className={`mt-4 text-base leading-8 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {activeSection.description}
              </p>

              <div className="mt-8 flex items-center gap-2">
                {copy.sections.map((section, index) => (
                  <button
                    key={section.title}
                    type="button"
                    aria-label={`${copy.title} ${index + 1}`}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2.5 rounded-full transition-all ${index === activeIndex
                      ? "w-10 bg-blue-600"
                      : isDarkMode
                        ? "w-2.5 bg-slate-700 hover:bg-slate-600"
                        : "w-2.5 bg-slate-300 hover:bg-slate-400"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className={`border-t px-6 py-5 ${isDarkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50/80"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className={`max-w-2xl text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {copy.footer}
              </p>

              <div className="flex items-center gap-2 self-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={activeIndex === 0}
                  className={`h-10 rounded-full px-4 ${isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                >
                  <ChevronLeft className="mr-1.5 h-4 w-4" />
                  <span>{copy.back}</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleNext}
                  className="h-10 rounded-full bg-blue-600 px-4 text-white hover:bg-blue-700"
                >
                  <span>{isLastStep ? copy.done : copy.next}</span>
                  {!isLastStep ? <ChevronRight className="ml-1.5 h-4 w-4" /> : null}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoadmapGuideButton({
  isDarkMode = false,
  autoOpen = false,
  className = "",
  variant = "workspace",
}) {
  const { i18n } = useTranslation();
  const copy = buildGuideCopy(variant, i18n.language);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!autoOpen || hasSeenRoadmapGuide()) return;
    markRoadmapGuideSeen();
    setOpen(true);
  }, [autoOpen]);

  const handleOpenGuide = React.useCallback(() => {
    markRoadmapGuideSeen();
    setOpen(true);
  }, []);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleOpenGuide}
        aria-label={copy.button}
        className={`h-8 min-w-[110px] rounded-full px-3 whitespace-nowrap ${className}`}
      >
        <Info className="mr-1.5 h-4 w-4" />
        <span>{copy.button}</span>
      </Button>

      <RoadmapGuideDialog
        open={open}
        onOpenChange={setOpen}
        isDarkMode={isDarkMode}
        variant={variant}
      />
    </>
  );
}

export default RoadmapGuideButton;
