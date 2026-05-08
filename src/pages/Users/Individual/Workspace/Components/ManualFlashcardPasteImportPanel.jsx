import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, ClipboardPaste, Copy, Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/context/ToastContext";
import { getFlashcardPasteImportPromptTemplate } from "@/api/FlashcardAPI";
import { unwrapApiData } from "@/utils/apiResponse";
import { cn } from "@/lib/utils";

const MAX_ITEMS_PREVIEW = 200;

function validateFlashcardJson(parsed, t) {
  if (parsed == null || typeof parsed !== "object") {
    return {
      ok: false,
      error: t("workspace.flashcard.pasteImport.errors.notObject"),
    };
  }

  const name = String(parsed.flashcardSetName || parsed.title || "").trim();
  const rawItems = parsed.items ?? parsed.cards;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      ok: false,
      error: t("workspace.flashcard.pasteImport.errors.missingItems"),
    };
  }

  const normalized = [];
  for (let i = 0; i < rawItems.length; i += 1) {
    const row = rawItems[i];
    if (!row || typeof row !== "object") continue;
    const frontContent = String(row.frontContent ?? row.front ?? "").trim();
    const backContent = String(row.backContent ?? row.back ?? "").trim();
    if (!frontContent || !backContent) continue;
    normalized.push({ frontContent, backContent });
  }

  if (normalized.length === 0) {
    return {
      ok: false,
      error: t("workspace.flashcard.pasteImport.errors.noValidPairs"),
    };
  }

  return {
    ok: true,
    name: name || t("workspace.flashcard.pasteImport.defaultName"),
    items: normalized,
  };
}

/**
 * Luồng dán JSON flashcard — giống quiz: (1) prompt template từ BE / fallback, (2) dán JSON → áp dụng nháp.
 */
function ManualFlashcardPasteImportPanel({ isDarkMode = false, onApply, disabled = false }) {
  const { t } = useTranslation();
  const { showSuccess, showError, showWarning } = useToast();

  const [template, setTemplate] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateError, setTemplateError] = useState(null);
  const [copyDone, setCopyDone] = useState(false);
  const copyTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [raw, setRaw] = useState("");

  const displayPrompt = useMemo(() => {
    const fromApi = String(template?.content || "").trim();
    if (fromApi) return fromApi;
    return t("workspace.flashcard.pasteImport.fallbackPromptBody");
  }, [template, t]);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      setTemplateLoading(true);
      setTemplateError(null);
    });
    getFlashcardPasteImportPromptTemplate()
      .then((res) => {
        if (cancelled) return;
        const data = unwrapApiData(res);
        setTemplate(data && typeof data === "object" ? data : null);
      })
      .catch((err) => {
        if (cancelled) return;
        setTemplateError(
          err?.message
            || err?.response?.data?.message
            || err?.data?.message
            || t("workspace.flashcard.pasteImport.errors.loadTemplate"),
        );
        setTemplate(null);
      })
      .finally(() => {
        if (!cancelled) setTemplateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const validation = useMemo(() => {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return { parsed: null, error: "" };
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch (err) {
      return {
        parsed: null,
        error: t("workspace.flashcard.pasteImport.errors.syntax", {
          message: err?.message || "",
        }),
      };
    }
    const res = validateFlashcardJson(obj, t);
    if (!res.ok) {
      return { parsed: null, error: res.error };
    }
    return { parsed: res, error: "" };
  }, [raw, t]);

  const parsed = validation.parsed;
  const parseError = validation.error;
  const previewCount = parsed?.items?.length ?? 0;

  const handleCopyPrompt = useCallback(async () => {
    const text = String(displayPrompt || "").trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyDone(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyDone(false), 2000);
    } catch {
      showWarning(t("workspace.flashcard.pasteImport.errors.copyFailed"));
    }
  }, [displayPrompt, showWarning, t]);

  const handlePickJsonFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleJsonFileChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        setRaw(text);
        showSuccess(
          t("workspace.flashcard.pasteImport.step2.fileLoaded", { name: file.name }),
        );
      };
      reader.onerror = () => {
        showError(t("workspace.flashcard.pasteImport.step2.fileReadError"));
      };
      reader.readAsText(file, "UTF-8");
    },
    [showError, showSuccess, t],
  );

  const handleApply = () => {
    if (!parsed || disabled) return;
    onApply?.({ flashcardSetName: parsed.name, items: parsed.items });
    setRaw("");
  };

  const cardClass = cn(
    "rounded-2xl border p-4",
    isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-slate-200 bg-white",
  );
  const subtleText = isDarkMode ? "text-slate-400" : "text-slate-600";
  const headingText = isDarkMode ? "text-slate-100" : "text-slate-900";

  return (
    <div className="flex flex-col gap-4">
      <section className={cardClass}>
        <div className="mb-3 flex items-start gap-2">
          <Sparkles className={cn("mt-0.5 h-5 w-5 shrink-0", isDarkMode ? "text-violet-400" : "text-violet-600")} />
          <div className="min-w-0 flex-1">
            <h3 className={cn("text-sm font-semibold", headingText)}>
              {t("workspace.flashcard.pasteImport.step1.title")}
            </h3>
            <p className={cn("mt-0.5 text-xs", subtleText)}>
              {t("workspace.flashcard.pasteImport.step1.description")}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={copyDone ? "secondary" : "default"}
            onClick={handleCopyPrompt}
            disabled={templateLoading || !displayPrompt.trim()}
            className="shrink-0"
          >
            {copyDone ? (
              <>
                <Check className="mr-1 h-4 w-4" />
                {t("workspace.flashcard.pasteImport.step1.copied")}
              </>
            ) : (
              <>
                <Copy className="mr-1 h-4 w-4" />
                {t("workspace.flashcard.pasteImport.step1.copy")}
              </>
            )}
          </Button>
        </div>

        <div
          className={cn(
            "mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
            isDarkMode ? "border-sky-900/50 bg-sky-950/25 text-sky-200" : "border-sky-200 bg-sky-50 text-sky-950",
          )}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("workspace.flashcard.pasteImport.step1.doNotEditPrompt")}</span>
        </div>

        {!templateLoading && templateError ? (
          <div
            className={cn(
              "mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
              isDarkMode ? "border-amber-900/50 bg-amber-950/20 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-950",
            )}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("workspace.flashcard.pasteImport.step1.offlineHint")}</span>
          </div>
        ) : null}

        {templateLoading ? (
          <div className={cn("flex items-center justify-center rounded-md py-8", isDarkMode ? "bg-slate-800/40" : "bg-slate-50")}>
            <Loader2 className={cn("h-6 w-6 animate-spin", isDarkMode ? "text-slate-400" : "text-slate-500")} />
          </div>
        ) : (
          <pre
            className={cn(
              "max-h-72 overflow-auto rounded-xl border p-3 text-[11px] leading-relaxed whitespace-pre-wrap font-mono",
              isDarkMode ? "border-slate-700 bg-slate-950 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-800",
            )}
          >
            {displayPrompt}
          </pre>
        )}
      </section>

      <section className={cardClass}>
        <div className="mb-2 flex items-center gap-2">
          <ClipboardPaste className="h-4 w-4 text-violet-500" />
          <p className={cn("text-sm font-semibold", headingText)}>
            {t("workspace.flashcard.pasteImport.step2.title")}
          </p>
        </div>
        <p className={cn("mb-3 text-xs", subtleText)}>
          {t("workspace.flashcard.pasteImport.step2.description")}
        </p>

        <div className="mb-2 flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleJsonFileChange}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handlePickJsonFile}
            disabled={disabled}
            className={cn("rounded-full", isDarkMode ? "border-slate-600" : "")}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {t("workspace.flashcard.pasteImport.step2.uploadButton")}
          </Button>
        </div>

        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          disabled={disabled}
          placeholder={t("workspace.flashcard.pasteImport.placeholder")}
          rows={8}
          className={cn(
            "mb-2 w-full rounded-xl border px-3 py-2 font-mono text-xs outline-none",
            isDarkMode
              ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-600"
              : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400",
          )}
        />
        {(parseError && raw.trim()) ? (
          <p className="mb-2 text-xs font-medium text-rose-500">{parseError}</p>
        ) : null}
        {parsed && previewCount ? (
          <p className={cn("mb-3 text-xs", isDarkMode ? "text-emerald-300/90" : "text-emerald-800")}>
            {t("workspace.flashcard.pasteImport.ready", {
              name: parsed.name,
              count: Math.min(previewCount, MAX_ITEMS_PREVIEW),
            })}
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !parsed || previewCount === 0}
          className="w-full rounded-xl"
          onClick={handleApply}
        >
          {t("workspace.flashcard.pasteImport.apply")}
        </Button>
      </section>
    </div>
  );
}

export default ManualFlashcardPasteImportPanel;
