import React, { useState } from "react";
import { Loader2, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Dialog reconfirm trước khi duplicate quiz để chỉnh sửa.
 * Hiển thị khi editRule === "REQUIRES_DUPLICATE".
 */
function ConfirmDuplicateDialog({
  open,
  onClose,
  onConfirm,
  quiz,
  completedAttemptCount = 0,
  isDarkMode = false,
}) {
  const [loading, setLoading] = useState(false);

  const isAiQuiz = String(quiz?.createVia || "").toUpperCase() === "AI";
  const quizTitle = quiz?.title || "Quiz";

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
              Tạo bản sao để chỉnh sửa
            </DialogTitle>
          </div>
          <DialogDescription className={cn(
            "text-sm leading-relaxed mt-2",
            isDarkMode ? "text-slate-400" : "text-slate-600",
          )}>
            Quiz{" "}
            <span className={cn("font-semibold", isDarkMode ? "text-slate-200" : "text-slate-800")}>
              &quot;{quizTitle}&quot;
            </span>{" "}
            {completedAttemptCount > 0
              ? `đã có ${completedAttemptCount} lần làm hoàn tất.`
              : "đã có lượt làm hoàn tất."
            }
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          "rounded-xl border p-4 text-sm leading-relaxed space-y-2",
          isDarkMode ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-slate-50",
        )}>
          <p className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
            Để bảo toàn lịch sử kết quả, hệ thống sẽ tạo{" "}
            <strong>1 bản sao mới</strong> và bạn sẽ chỉnh sửa trên bản sao đó.
            Quiz gốc giữ nguyên.
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
                Vì gốc là quiz AI, bản sao sẽ là{" "}
                <strong>quiz thủ công</strong> và không có đánh giá AI.
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
            Hủy
          </Button>
          <Button
            disabled={loading}
            onClick={handleConfirm}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Đang tạo..." : "Tạo bản sao"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDuplicateDialog;
