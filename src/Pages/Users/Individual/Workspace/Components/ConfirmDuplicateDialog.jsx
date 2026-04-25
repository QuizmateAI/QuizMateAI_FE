import React, { useState } from "react";
import { Loader2, Copy, AlertTriangle } from "lucide-react";
import i18n from "@/i18n";
import { Button } from "@/Components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/Components/ui/dialog";
import { cn } from "@/lib/utils";

function ConfirmDuplicateDialog({
  open,
  onClose,
  onConfirm,
  quiz,
  completedAttemptCount = 0,
  isDarkMode = false,
}) {
  const [loading, setLoading] = useState(false);
  const t = i18n.getFixedT(i18n.language?.startsWith("en") ? "en" : "vi");
  const isAiQuiz = String(quiz?.createVia || "").toUpperCase() === "AI";
  const quizTitle = quiz?.title || t("confirmDuplicateDialog.fallbackTitle", {
    defaultValue: "Quiz",
  });

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onClose?.(!v ? false : true)}>
      <DialogContent
        className={cn(
          "max-w-md rounded-2xl",
          isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900",
        )}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className={cn(
              "p-2 rounded-xl",
              isDarkMode ? "bg-amber-500/15" : "bg-amber-100",
            )}>
              <Copy className="w-5 h-5 text-amber-500" />
            </div>
            <DialogTitle className={isDarkMode ? "text-slate-100" : "text-slate-900"}>
              {t("confirmDuplicateDialog.title", {
                defaultValue: "Create a copy to edit",
              })}
            </DialogTitle>
          </div>
          <DialogDescription className={cn(
            "text-sm leading-relaxed mt-2",
            isDarkMode ? "text-slate-400" : "text-slate-600",
          )}>
            {completedAttemptCount > 0
              ? t("confirmDuplicateDialog.descriptionWithCount", {
                defaultValue: 'Quiz "{{title}}" already has {{count}} completed attempts.',
                title: quizTitle,
                count: completedAttemptCount,
              })
              : t("confirmDuplicateDialog.descriptionWithoutCount", {
                defaultValue: 'Quiz "{{title}}" already has learner attempt history.',
                title: quizTitle,
              })}
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          "rounded-xl border p-4 text-sm leading-relaxed space-y-2",
          isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-slate-50",
        )}>
          <p className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
            {t("confirmDuplicateDialog.body", {
              defaultValue: "To preserve the result history, the system will create a new copy and you will edit that copy instead. The original quiz stays unchanged.",
            })}
          </p>
          {isAiQuiz && (
            <div className={cn(
              "flex items-start gap-2 rounded-lg border px-3 py-2",
              isDarkMode
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-amber-200 bg-amber-50 text-amber-700",
            )}>
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {t("confirmDuplicateDialog.aiWarning", {
                  defaultValue: "Because the original is an AI quiz, the copied version will become a manual quiz and AI grading will no longer be available.",
                })}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => onClose?.()}
            className={cn(
              "rounded-full",
              isDarkMode && "border-slate-600 text-slate-200 hover:bg-slate-800",
            )}
          >
            {t("confirmDuplicateDialog.cancel", {
              defaultValue: "Cancel",
            })}
          </Button>
          <Button
            disabled={loading}
            onClick={handleConfirm}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading
              ? t("confirmDuplicateDialog.creating", {
                defaultValue: "Creating...",
              })
              : t("confirmDuplicateDialog.confirm", {
                defaultValue: "Create copy",
              })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDuplicateDialog;
