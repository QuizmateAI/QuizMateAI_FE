import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Custom confirm dialog cho nut "Quay lai" cua ManualQuizWizard.
 * Thay the window.confirm() de UI dong bo theme app, ho tro dark mode + surface.
 *
 * Props:
 *  - open: bool
 *  - title: string
 *  - description: string
 *  - confirmLabel?: string — mac dinh "Roi khoi"
 *  - cancelLabel?: string — mac dinh "Tiep tuc chinh sua"
 *  - onCancel: () => void
 *  - onConfirm: () => void
 *  - surface?: "quiz" | "challenge"
 */
export function ExitConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
  surface = "quiz",
}) {
  const { t } = useTranslation();
  const isChallenge = surface === "challenge";

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onCancel?.(); }}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="px-6 pb-4 pt-6">
          <DialogHeader className="space-y-3">
            <span
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                isChallenge ? "bg-orange-100 text-orange-600" : "bg-amber-100 text-amber-600",
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="space-y-1.5">
              <DialogTitle className="text-[15px] font-semibold text-slate-900">
                {title}
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-relaxed text-slate-500">
                {description}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <div className="flex flex-col-reverse gap-2 px-6 pb-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onCancel?.()}
            className="h-10 sm:w-auto"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {cancelLabel || t("workspace.quiz.manualWizard.exitDialog.keepEditing", "Tiếp tục chỉnh sửa")}
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm?.()}
            className="h-10 bg-rose-500 text-white shadow-sm shadow-rose-500/20 hover:bg-rose-600 focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 sm:w-auto"
          >
            <LogOut className="mr-1.5 h-4 w-4" />
            {confirmLabel || t("workspace.quiz.manualWizard.exitDialog.confirmExit", "Rời khỏi")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExitConfirmDialog;
