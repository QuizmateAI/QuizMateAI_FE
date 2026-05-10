import React, { useState } from "react";
import { Loader2, Copy, FileEdit } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function EditChoiceDialog({ open, onClose, onEditMetadata, onDuplicate, quiz, isDarkMode = false }) {
  const { t } = useTranslation();
  const [duplicating, setDuplicating] = useState(false);
  const quizTitle = quiz?.title || t("editChoiceDialog.fallbackTitle");

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      await onDuplicate?.();
    } finally {
      setDuplicating(false);
    }
  };

  const handleMetadata = () => {
    onClose?.();
    onEditMetadata?.();
  };

  const cardBase = cn(
    "w-full text-left rounded-xl border-2 p-4 transition-all hover:border-blue-400 space-y-1",
    isDarkMode ? "border-slate-700 bg-slate-800/60 hover:bg-slate-700/60" : "border-slate-200 bg-slate-50 hover:bg-blue-50/60",
  );

  return (
    <Dialog open={open} onOpenChange={(value) => !duplicating && !value && onClose?.()}>
      <DialogContent
        className={cn(
          "max-w-md rounded-2xl",
          isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900",
        )}
      >
        <DialogHeader>
          <DialogTitle className={isDarkMode ? "text-slate-100" : "text-slate-900"}>
            {t("editChoiceDialog.title")}
          </DialogTitle>
          <DialogDescription className={cn("text-sm leading-relaxed mt-1", isDarkMode ? "text-slate-400" : "text-slate-600")}>
            {t("editChoiceDialog.description", { title: quizTitle })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <button type="button" onClick={handleMetadata} disabled={duplicating} className={cardBase}>
            <div className="flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-blue-500 shrink-0" />
              <span className={cn("text-sm font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                {t("editChoiceDialog.metadataTitle")}
              </span>
            </div>
            <p className={cn("text-xs pl-6", isDarkMode ? "text-slate-400" : "text-slate-500")}>
              {t("editChoiceDialog.metadataDescription")}
            </p>
          </button>

          <button type="button" onClick={handleDuplicate} disabled={duplicating} className={cardBase}>
            <div className="flex items-center gap-2">
              {duplicating
                ? <Loader2 className="w-4 h-4 text-amber-500 shrink-0 animate-spin" />
                : <Copy className="w-4 h-4 text-amber-500 shrink-0" />}
              <span className={cn("text-sm font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                {t("editChoiceDialog.duplicateTitle")}
              </span>
            </div>
            <p className={cn("text-xs pl-6", isDarkMode ? "text-slate-400" : "text-slate-500")}>
              {t("editChoiceDialog.duplicateDescription")}
            </p>
          </button>
        </div>

        <DialogFooter className="pt-1">
          <Button
            variant="outline"
            disabled={duplicating}
            onClick={() => onClose?.()}
            className={cn("rounded-full", isDarkMode && "border-slate-600 text-slate-200 hover:bg-slate-800")}
          >
            {t("editChoiceDialog.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditChoiceDialog;
