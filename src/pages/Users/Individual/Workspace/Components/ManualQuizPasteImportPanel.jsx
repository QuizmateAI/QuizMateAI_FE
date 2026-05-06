import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Check,
  ClipboardPaste,
  Copy,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/context/ToastContext";
import { unwrapApiData } from "@/utils/apiResponse";
import {
  createQuizFromPaste,
  getPasteImportPromptTemplate,
} from "@/api/QuizAPI";
import { cn } from "@/lib/utils";

/**
 * Paste-import quiz flow:
 *   1. Hiển thị prompt template (BE trả về theo gói: basic vs advance).
 *   2. User copy → dán sang ChatGPT/NotebookLM/... → AI sinh JSON.
 *   3. User dán JSON vào textarea, FE pre-validate cú pháp + key bắt buộc.
 *   4. Nhấn "Tạo quiz" → modal disclaimer (nội dung do bên thứ 3 tạo) → confirm → POST.
 *
 * BE đã làm full plan-gating + shape validation; FE chỉ chặn lỗi cú pháp JSON sớm
 * để user khỏi mất round-trip. Mọi error kỹ thuật đến từ BE đều surface qua toast.
 */
function ManualQuizPasteImportPanel({
  workspaceId,
  onCreateQuiz,
  isDarkMode = false,
}) {
  const { t } = useTranslation();
  const { showSuccess, showError, showWarning } = useToast();

  const [template, setTemplate] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateError, setTemplateError] = useState(null);

  const [jsonText, setJsonText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const copyTimerRef = useRef(null);

  // Local pre-validate — chỉ cú pháp + bắt buộc cấp 1. Phần còn lại để BE.
  const localValidation = useMemo(() => {
    const trimmed = (jsonText || "").trim();
    if (!trimmed) return { ok: false, parsed: null, error: null };
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      return {
        ok: false,
        parsed: null,
        error: t(
          "workspace.quiz.pasteImport.errors.jsonSyntax",
          { message: err?.message || "không xác định", defaultValue: `JSON sai cú pháp: ${err?.message || "không xác định"}` },
        ),
      };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        parsed: null,
        error: t("workspace.quiz.pasteImport.errors.notObject", { defaultValue: "JSON phải là một object." }),
      };
    }
    if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      return {
        ok: false,
        parsed,
        error: t("workspace.quiz.pasteImport.errors.missingSections", { defaultValue: "JSON thiếu trường \"sections\" hoặc rỗng." }),
      };
    }
    if (typeof parsed.title !== "string" || !parsed.title.trim()) {
      return {
        ok: false,
        parsed,
        error: t("workspace.quiz.pasteImport.errors.missingTitle", { defaultValue: "JSON thiếu trường \"title\"." }),
      };
    }
    return { ok: true, parsed, error: null };
  }, [jsonText, t]);

  useEffect(() => {
    let cancelled = false;
    setTemplateLoading(true);
    setTemplateError(null);
    getPasteImportPromptTemplate()
      .then((res) => {
        if (cancelled) return;
        const data = unwrapApiData(res);
        setTemplate(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setTemplateError(
          err?.message
            || err?.data?.message
            || t("workspace.quiz.pasteImport.errors.loadTemplate", { defaultValue: "Không tải được prompt template." }),
        );
      })
      .finally(() => {
        if (cancelled) return;
        setTemplateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!template?.content) return;
    try {
      await navigator.clipboard.writeText(template.content);
      setCopyDone(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyDone(false), 2000);
    } catch {
      showWarning(
        t("workspace.quiz.pasteImport.errors.copyFailed", { defaultValue: "Không sao chép được. Hãy chọn và copy thủ công." }),
      );
    }
  }, [template, showWarning, t]);

  const handleAskSave = useCallback(() => {
    if (!localValidation.ok) return;
    setDisclaimerOpen(true);
  }, [localValidation.ok]);

  const handleConfirmSave = useCallback(async () => {
    if (!localValidation.ok || !workspaceId || submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...localValidation.parsed, workspaceId };
      const res = await createQuizFromPaste(payload);
      const created = unwrapApiData(res);
      const title = created?.title || localValidation.parsed?.title || "";
      showSuccess(
        t("workspace.quiz.pasteImport.toasts.success", {
          title,
          defaultValue: `Đã tạo quiz "${title}" ở trạng thái bản nháp!`,
        }),
      );
      setDisclaimerOpen(false);
      setJsonText("");
      onCreateQuiz?.(created);
    } catch (err) {
      const msg = err?.message
        || err?.data?.message
        || t("workspace.quiz.pasteImport.toasts.error", { defaultValue: "Có lỗi khi tạo quiz từ JSON đã dán." });
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [localValidation, workspaceId, submitting, onCreateQuiz, showSuccess, showError, t]);

  const cardClass = cn(
    "rounded-xl border p-4",
    isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-gray-200 bg-white",
  );
  const subtleText = isDarkMode ? "text-slate-400" : "text-gray-500";
  const headingText = isDarkMode ? "text-slate-100" : "text-gray-900";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-6 pt-4">
        {/* Step 1 — copy prompt */}
        <section className={cardClass}>
          <div className="mb-3 flex items-start gap-2">
            <Sparkles className={cn("mt-0.5 h-5 w-5", isDarkMode ? "text-blue-400" : "text-blue-600")} />
            <div className="flex-1">
              <h3 className={cn("text-sm font-semibold", headingText)}>
                {t("workspace.quiz.pasteImport.step1.title", { defaultValue: "Bước 1 — Lấy prompt và dán sang công cụ AI" })}
              </h3>
              <p className={cn("mt-0.5 text-xs", subtleText)}>
                {t("workspace.quiz.pasteImport.step1.description", {
                  defaultValue: "Copy prompt dưới đây, dán vào ChatGPT / NotebookLM / công cụ AI khác. Sau khi AI sinh JSON, copy lại JSON đó và dán vào ô ở Bước 2.",
                })}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={copyDone ? "secondary" : "default"}
              onClick={handleCopy}
              disabled={templateLoading || !template?.content}
              className="shrink-0"
            >
              {copyDone ? (
                <>
                  <Check className="h-4 w-4" />
                  {t("workspace.quiz.pasteImport.step1.copied", { defaultValue: "Đã copy" })}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {t("workspace.quiz.pasteImport.step1.copy", { defaultValue: "Copy prompt" })}
                </>
              )}
            </Button>
          </div>

          {templateLoading ? (
            <div className={cn("flex items-center justify-center rounded-md py-8", isDarkMode ? "bg-slate-800/40" : "bg-gray-50")}>
              <Loader2 className={cn("h-5 w-5 animate-spin", isDarkMode ? "text-slate-400" : "text-gray-500")} />
            </div>
          ) : templateError ? (
            <div className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-xs", isDarkMode ? "border-red-900/60 bg-red-950/30 text-red-300" : "border-red-200 bg-red-50 text-red-700")}>
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{templateError}</span>
            </div>
          ) : (
            <pre
              className={cn(
                "max-h-72 overflow-auto rounded-md border p-3 text-[11px] leading-relaxed whitespace-pre-wrap",
                isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200" : "border-gray-200 bg-gray-50 text-gray-800",
              )}
            >
              {template?.content || ""}
            </pre>
          )}
        </section>

        {/* Step 2 — paste JSON */}
        <section className={cardClass}>
          <div className="mb-3 flex items-start gap-2">
            <ClipboardPaste className={cn("mt-0.5 h-5 w-5", isDarkMode ? "text-blue-400" : "text-blue-600")} />
            <div className="flex-1">
              <h3 className={cn("text-sm font-semibold", headingText)}>
                {t("workspace.quiz.pasteImport.step2.title", { defaultValue: "Bước 2 — Dán JSON vào đây" })}
              </h3>
              <p className={cn("mt-0.5 text-xs", subtleText)}>
                {t("workspace.quiz.pasteImport.step2.description", {
                  defaultValue: "Dán nguyên JSON do AI bên thứ 3 sinh. Hệ thống chỉ chấp nhận đúng schema trong prompt; sai sẽ bị reject.",
                })}
              </p>
            </div>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={t("workspace.quiz.pasteImport.step2.placeholder", { defaultValue: '{ "title": "...", "sections": [ ... ] }' })}
            rows={12}
            spellCheck={false}
            className={cn(
              "w-full resize-y rounded-md border px-3 py-2 font-mono text-[12px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500",
              isDarkMode ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500" : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
            )}
          />

          {jsonText.trim() && !localValidation.ok && localValidation.error && (
            <div
              className={cn(
                "mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                isDarkMode ? "border-amber-900/60 bg-amber-950/30 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-800",
              )}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{localValidation.error}</span>
            </div>
          )}

          {localValidation.ok && (
            <div
              className={cn(
                "mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                isDarkMode ? "border-emerald-900/60 bg-emerald-950/30 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-800",
              )}
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {t("workspace.quiz.pasteImport.step2.parsedOk", {
                  title: localValidation.parsed?.title,
                  count: Array.isArray(localValidation.parsed?.sections)
                    ? localValidation.parsed.sections.reduce(
                      (acc, s) => acc + (Array.isArray(s?.questions) ? s.questions.length : 0),
                      0,
                    )
                    : 0,
                  defaultValue: `JSON OK — "${localValidation.parsed?.title}", tổng số câu: {{count}}.`,
                })}
              </span>
            </div>
          )}
        </section>

        {/* Disclaimer banner — luôn hiển thị, modal confirm xuất hiện khi save */}
        <section
          className={cn(
            "rounded-xl border p-3 text-xs",
            isDarkMode ? "border-amber-900/60 bg-amber-950/30 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800",
          )}
        >
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong className="font-semibold">
                {t("workspace.quiz.pasteImport.disclaimer.heading", { defaultValue: "Lưu ý: nội dung do bên thứ 3 sinh ra." })}
              </strong>{" "}
              {t("workspace.quiz.pasteImport.disclaimer.body", {
                defaultValue: "QuizMateAI KHÔNG kiểm duyệt và KHÔNG dùng AI để xác minh chất lượng câu hỏi/đáp án/giải thích trong JSON này. Bạn chịu trách nhiệm về tính chính xác và bản quyền của nội dung.",
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom action bar */}
      <div className={cn("flex items-center justify-end gap-2 border-t px-4 py-3", isDarkMode ? "border-slate-800 bg-slate-900" : "border-gray-200 bg-white")}>
        <Button
          type="button"
          onClick={handleAskSave}
          disabled={!localValidation.ok || submitting || !workspaceId}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("workspace.quiz.pasteImport.actions.saving", { defaultValue: "Đang lưu..." })}
            </>
          ) : (
            t("workspace.quiz.pasteImport.actions.create", { defaultValue: "Tạo quiz từ JSON" })
          )}
        </Button>
      </div>

      {/* Disclaimer confirm dialog */}
      <Dialog open={disclaimerOpen} onOpenChange={(open) => !submitting && setDisclaimerOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("workspace.quiz.pasteImport.confirmDialog.title", { defaultValue: "Xác nhận tạo quiz từ JSON" })}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm">
              {t("workspace.quiz.pasteImport.confirmDialog.body", {
                defaultValue: "Bạn xác nhận đã đọc và đồng ý: nội dung quiz này do công cụ AI bên thứ 3 (ChatGPT / NotebookLM / ...) sinh ra. QuizMateAI KHÔNG xác minh tính chính xác và KHÔNG chịu trách nhiệm về sai sót, vi phạm bản quyền hoặc nội dung không phù hợp.",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDisclaimerOpen(false)}
              disabled={submitting}
            >
              {t("common.cancel", { defaultValue: "Huỷ" })}
            </Button>
            <Button type="button" onClick={handleConfirmSave} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("workspace.quiz.pasteImport.actions.saving", { defaultValue: "Đang lưu..." })}
                </>
              ) : (
                t("workspace.quiz.pasteImport.confirmDialog.confirm", { defaultValue: "Tôi hiểu, tạo quiz" })
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ManualQuizPasteImportPanel;
