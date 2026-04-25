import React, { useState } from "react";
import { Loader2, Copy, FileEdit } from "lucide-react";
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

/**
 * Dialog cho REQUIRES_DUPLICATE manual quiz — 2 lựa chọn:
 * 1. Chỉ cập nhật metadata (title, description, timerMode, duration)
 * 2. Tạo bản sao để chỉnh sửa toàn bộ
 *
 * Props:
 *  - open, onClose
 *  - onEditMetadata(): chỉnh metadata — dialog tự đóng
 *  - onDuplicate(): duplicate + edit toàn bộ — async, hiển thị loading
 *  - quiz
 *  - isDarkMode
 */
function EditChoiceDialog({ open, onClose, onEditMetadata, onDuplicate, quiz, isDarkMode = false }) {
  const [duplicating, setDuplicating] = useState(false);
  const quizTitle = quiz?.title || "Quiz";

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
    <Dialog open={open} onOpenChange={(v) => !duplicating && !v && onClose?.()}>
      <DialogContent
        className={cn(
          "max-w-md rounded-2xl",
          isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900",
        )}
      >
        <DialogHeader>
          <DialogTitle className={isDarkMode ? "text-slate-100" : "text-slate-900"}>
            Chỉnh sửa quiz
          </DialogTitle>
          <DialogDescription className={cn("text-sm leading-relaxed mt-1", isDarkMode ? "text-slate-400" : "text-slate-600")}>
            <span className={cn("font-semibold", isDarkMode ? "text-slate-200" : "text-slate-800")}>
              &quot;{quizTitle}&quot;
            </span>{" "}
            đã có lượt làm hoàn tất. Chọn cách chỉnh sửa:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Option 1: metadata-only */}
          <button type="button" onClick={handleMetadata} disabled={duplicating} className={cardBase}>
            <div className="flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-blue-500 shrink-0" />
              <span className={cn("text-sm font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                Cập nhật thông tin cơ bản
              </span>
            </div>
            <p className={cn("text-xs pl-6", isDarkMode ? "text-slate-400" : "text-slate-500")}>
              Chỉnh tên, mô tả, chế độ tính giờ và thời gian. Lịch sử làm bài giữ nguyên.
            </p>
          </button>

          {/* Option 2: duplicate + edit */}
          <button type="button" onClick={handleDuplicate} disabled={duplicating} className={cardBase}>
            <div className="flex items-center gap-2">
              {duplicating
                ? <Loader2 className="w-4 h-4 text-amber-500 shrink-0 animate-spin" />
                : <Copy className="w-4 h-4 text-amber-500 shrink-0" />
              }
              <span className={cn("text-sm font-semibold", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                Tạo bản sao để chỉnh sửa toàn bộ
              </span>
            </div>
            <p className={cn("text-xs pl-6", isDarkMode ? "text-slate-400" : "text-slate-500")}>
              Tạo quiz mới từ quiz này, có thể chỉnh câu hỏi. Quiz gốc và lịch sử giữ nguyên.
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
            Hủy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditChoiceDialog;
