import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Check,
  ClipboardPaste,
  Code2,
  Copy,
  Eye,
  Info,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
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
import { validateQuizPasteImportJson } from "@/utils/validateQuizPasteImportJson";
import { SYSTEM_SETTING_KEYS, useSystemSettingNumber } from "@/hooks/useSystemSettings";

/**
 * Paste-import quiz flow:
 *   1. Hiển thị prompt template (BE trả về theo gói: basic vs advance).
 *   2. User copy → dán sang ChatGPT/NotebookLM/... → AI sinh JSON.
 *   3. User dán JSON vào textarea, FE kiểm tra schema + hiển thị lỗi kèm số dòng (ước lượng).
 *   4. Nhấn "Tạo quiz" → modal disclaimer (nội dung do bên thứ 3 tạo) → confirm → POST.
 *
 * BE vẫn là chốt cuối; FE giảm round-trip và giúp người dùng tìm vị trí sửa nhanh.
 */

// Tokenize a JSON.stringify output into spans for syntax highlighting.
// Order in the regex matters: try whitespace, then string-with-optional-colon,
// then punctuation, number, boolean, null. Anything left falls into "text".
const JSON_TOKEN_REGEX = /(\s+)|("(?:\\.|[^"\\])*")(\s*:)?|([{}[\],])|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)/g;

function tokenizeJson(source) {
  const tokens = [];
  let lastIndex = 0;
  let match;
  JSON_TOKEN_REGEX.lastIndex = 0;
  while ((match = JSON_TOKEN_REGEX.exec(source)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: source.slice(lastIndex, match.index) });
    }
    const [, ws, str, colon, punct, num, bool, nul] = match;
    if (ws) {
      tokens.push({ type: "ws", value: ws });
    } else if (str) {
      tokens.push({ type: colon ? "key" : "string", value: str });
      if (colon) tokens.push({ type: "punct", value: colon });
    } else if (punct) {
      tokens.push({ type: "punct", value: punct });
    } else if (num) {
      tokens.push({ type: "number", value: num });
    } else if (bool) {
      tokens.push({ type: "bool", value: bool });
    } else if (nul) {
      tokens.push({ type: "null", value: nul });
    }
    lastIndex = JSON_TOKEN_REGEX.lastIndex;
  }
  if (lastIndex < source.length) {
    tokens.push({ type: "text", value: source.slice(lastIndex) });
  }
  return tokens;
}

function tokenColorClass(type, isDarkMode) {
  if (isDarkMode) {
    switch (type) {
      case "key": return "text-sky-300";
      case "string": return "text-emerald-300";
      case "number": return "text-amber-300";
      case "bool": return "text-fuchsia-300";
      case "null": return "text-rose-300";
      case "punct": return "text-slate-400";
      default: return "text-slate-200";
    }
  }
  switch (type) {
    case "key": return "text-blue-700";
    case "string": return "text-emerald-700";
    case "number": return "text-amber-700";
    case "bool": return "text-fuchsia-700";
    case "null": return "text-rose-700";
    case "punct": return "text-gray-500";
    default: return "text-gray-800";
  }
}

function JsonPreview({ source, isDarkMode }) {
  const tokens = useMemo(() => tokenizeJson(source), [source]);
  const lineCount = useMemo(() => Math.max(1, source.split("\n").length), [source]);
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join("\n"),
    [lineCount],
  );

  return (
    <div
      className={cn(
        "flex max-h-[28rem] overflow-auto rounded-md border font-mono text-[12px] leading-relaxed",
        isDarkMode ? "border-slate-700 bg-slate-950" : "border-gray-200 bg-gray-50",
      )}
    >
      <pre
        aria-hidden="true"
        className={cn(
          "select-none border-r px-3 py-2 text-right font-mono text-[12px] leading-relaxed",
          isDarkMode ? "border-slate-800 text-slate-600" : "border-gray-200 text-gray-400",
        )}
      >
        {lineNumbers}
      </pre>
      <pre className="flex-1 px-3 py-2 font-mono text-[12px] leading-relaxed">
        {tokens.map((tok, i) => (
          <span key={i} className={tokenColorClass(tok.type, isDarkMode)}>
            {tok.value}
          </span>
        ))}
      </pre>
    </div>
  );
}

function JsonPasteTextarea({
  value,
  onChange,
  placeholder,
  isDarkMode,
  minRows = 12,
}) {
  const taRef = useRef(null);
  const gutterRef = useRef(null);
  const lineCount = useMemo(
    () => Math.max(minRows, String(value).split(/\r?\n/).length),
    [value, minRows],
  );
  const lineNums = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => String(i + 1)).join("\n"),
    [lineCount],
  );

  const syncScroll = useCallback(() => {
    const ta = taRef.current;
    const g = gutterRef.current;
    if (ta && g) {
      g.scrollTop = ta.scrollTop;
    }
  }, []);

  return (
    <div
      className={cn(
        "flex max-h-[28rem] min-h-[12rem] overflow-hidden rounded-md border",
        isDarkMode ? "border-slate-700" : "border-gray-300",
      )}
    >
      <div
        ref={gutterRef}
        className={cn(
          "max-h-[28rem] min-h-[12rem] w-11 shrink-0 overflow-y-auto py-2 pl-2 pr-1 font-mono text-[12px] leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isDarkMode ? "border-r border-slate-700 bg-slate-900/80 text-slate-500" : "border-r border-gray-200 bg-gray-50 text-gray-400",
        )}
        aria-hidden="true"
      >
        <pre className="m-0 text-right tabular-nums">{lineNums}</pre>
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={onChange}
        onScroll={syncScroll}
        placeholder={placeholder}
        spellCheck={false}
        rows={minRows}
        className={cn(
          "max-h-[28rem] min-h-[12rem] flex-1 resize-y overflow-y-auto border-0 py-2 pr-3 pl-2 font-mono text-[12px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500",
          isDarkMode ? "bg-slate-950 text-slate-100 placeholder:text-slate-500" : "bg-white text-gray-900 placeholder:text-gray-400",
        )}
      />
    </div>
  );
}

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
  const [jsonCopyDone, setJsonCopyDone] = useState(false);
  const [viewMode, setViewMode] = useState("edit"); // "edit" | "preview"
  const copyTimerRef = useRef(null);
  const jsonCopyTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const maxQuestionsPerQuiz = useSystemSettingNumber(SYSTEM_SETTING_KEYS.MAX_QUESTIONS_PER_QUIZ);

  const localValidation = useMemo(
    () =>
      validateQuizPasteImportJson(jsonText, {
        t,
        templateKey: template?.key ?? null,
        maxQuestions: maxQuestionsPerQuiz,
      }),
    [jsonText, t, template?.key, maxQuestionsPerQuiz],
  );

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
            || t("workspace.quiz.pasteImport.errors.loadTemplate"),
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
    if (jsonCopyTimerRef.current) clearTimeout(jsonCopyTimerRef.current);
  }, []);

  // Drop preview when JSON parse becomes invalid — nothing safe to render.
  useEffect(() => {
    if (!localValidation.ok || localValidation.empty) {
      if (viewMode === "preview") setViewMode("edit");
    }
  }, [localValidation.ok, localValidation.empty, viewMode]);

  const formattedJson = useMemo(() => {
    if (!localValidation.ok || !localValidation.parsed) return "";
    try {
      return JSON.stringify(localValidation.parsed, null, 2);
    } catch {
      return "";
    }
  }, [localValidation.ok, localValidation.parsed]);

  const handleFormatJson = useCallback(() => {
    if (!formattedJson) return;
    setJsonText(formattedJson);
  }, [formattedJson]);

  const handleCopyFormattedJson = useCallback(async () => {
    if (!formattedJson) return;
    try {
      await navigator.clipboard.writeText(formattedJson);
      setJsonCopyDone(true);
      if (jsonCopyTimerRef.current) clearTimeout(jsonCopyTimerRef.current);
      jsonCopyTimerRef.current = setTimeout(() => setJsonCopyDone(false), 2000);
    } catch {
      showWarning(
        t("workspace.quiz.pasteImport.errors.copyFailed"),
      );
    }
  }, [formattedJson, showWarning, t]);

  const handleCopy = useCallback(async () => {
    if (!template?.content) return;
    try {
      await navigator.clipboard.writeText(template.content);
      setCopyDone(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyDone(false), 2000);
    } catch {
      showWarning(
        t("workspace.quiz.pasteImport.errors.copyFailed"),
      );
    }
  }, [template, showWarning, t]);

  const handleAskSave = useCallback(() => {
    if (!localValidation.ok || localValidation.empty) return;
    setDisclaimerOpen(true);
  }, [localValidation.ok, localValidation.empty]);

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
        setJsonText(text);
        showSuccess(
          t("workspace.quiz.pasteImport.step2.fileLoaded", {
            name: file.name,
          }),
        );
      };
      reader.onerror = () => {
        showError(
          t("workspace.quiz.pasteImport.step2.fileReadError"),
        );
      };
      reader.readAsText(file, "UTF-8");
    },
    [showError, showSuccess, t],
  );

  const handleConfirmSave = useCallback(async () => {
    if (!localValidation.ok || localValidation.empty || !workspaceId || submitting) return;
    setSubmitting(true);
    try {
      const { workspaceId: _ignored, ...rest } = localValidation.parsed || {};
      const payload = { ...rest, workspaceId };
      const res = await createQuizFromPaste(payload);
      const created = unwrapApiData(res);
      const title = created?.title || localValidation.parsed?.title || "";
      showSuccess(
        t("workspace.quiz.pasteImport.toasts.success", {
          title,
        }),
      );
      setDisclaimerOpen(false);
      setJsonText("");
      onCreateQuiz?.(created);
    } catch (err) {
      const msg = err?.message
        || err?.data?.message
        || t("workspace.quiz.pasteImport.toasts.error");
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
                {t("workspace.quiz.pasteImport.step1.title")}
              </h3>
              <p className={cn("mt-0.5 text-xs", subtleText)}>
                {t("workspace.quiz.pasteImport.step1.description")}
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
                  {t("workspace.quiz.pasteImport.step1.copied")}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {t("workspace.quiz.pasteImport.step1.copy")}
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
            <span>
              {t("workspace.quiz.pasteImport.step1.doNotEditPrompt")}
            </span>
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
                {t("workspace.quiz.pasteImport.step2.title")}
              </h3>
              <p className={cn("mt-0.5 text-xs", subtleText)}>
                {t("workspace.quiz.pasteImport.step2.description")}
              </p>
              <p className={cn("mt-1.5 text-xs", subtleText)}>
                {t("workspace.quiz.pasteImport.step2.uploadHint")}
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={handleJsonFileChange}
          />

          <div
            className={cn(
              "mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border p-1",
              isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-gray-200 bg-gray-50",
            )}
          >
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition",
                  viewMode === "edit"
                    ? (isDarkMode ? "bg-slate-700 text-slate-50" : "bg-white text-gray-900 shadow-sm")
                    : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-800"),
                )}
              >
                <Code2 className="h-3.5 w-3.5" />
                {t("workspace.quiz.pasteImport.step2.tabs.edit")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                disabled={!formattedJson}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition",
                  viewMode === "preview"
                    ? (isDarkMode ? "bg-slate-700 text-slate-50" : "bg-white text-gray-900 shadow-sm")
                    : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-800"),
                  !formattedJson && "cursor-not-allowed opacity-50 hover:text-inherit",
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                {t("workspace.quiz.pasteImport.step2.tabs.preview")}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handlePickJsonFile}
                title={t("workspace.quiz.pasteImport.step2.uploadTitle")}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition",
                  isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-200",
                )}
              >
                <Upload className="h-3.5 w-3.5" />
                {t("workspace.quiz.pasteImport.step2.uploadButton")}
              </button>
              <button
                type="button"
                onClick={handleFormatJson}
                disabled={!formattedJson || jsonText === formattedJson}
                title={t("workspace.quiz.pasteImport.step2.formatHint")}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
                  isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-200",
                )}
              >
                <Wand2 className="h-3.5 w-3.5" />
                {t("workspace.quiz.pasteImport.step2.format")}
              </button>
              {viewMode === "preview" && (
                <button
                  type="button"
                  onClick={handleCopyFormattedJson}
                  disabled={!formattedJson}
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
                    isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-200",
                  )}
                >
                  {jsonCopyDone ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {jsonCopyDone
                    ? t("workspace.quiz.pasteImport.step2.copied")
                    : t("workspace.quiz.pasteImport.step2.copy")}
                </button>
              )}
            </div>
          </div>

          {viewMode === "edit" ? (
            <JsonPasteTextarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={t("workspace.quiz.pasteImport.step2.placeholder")}
              isDarkMode={isDarkMode}
              minRows={12}
            />
          ) : (
            <JsonPreview source={formattedJson} isDarkMode={isDarkMode} />
          )}

          {jsonText.trim() && !localValidation.empty && localValidation.errors?.length > 0 && (
            <div
              className={cn(
                "mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                isDarkMode ? "border-amber-900/60 bg-amber-950/30 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-800",
              )}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">
                  {t("workspace.quiz.pasteImport.step2.validationTitleFriendly")}
                </p>
                <ul className="mt-2 space-y-2">
                  {(localValidation.errors || []).slice(0, 14).map((item, i) => {
                    const text = typeof item === "string" ? item : item.text;
                    const line = typeof item === "object" && item && item.line != null ? item.line : null;
                    return (
                      <li key={i} className="break-words border-l-2 border-amber-400/50 pl-2.5">
                        <div className="flex flex-wrap items-start gap-2">
                          {line != null && (
                            <span
                              className={cn(
                                "mt-0.5 inline-flex shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                                isDarkMode ? "bg-amber-900/40 text-amber-200" : "bg-amber-100 text-amber-900",
                              )}
                            >
                              {t("workspace.quiz.pasteImport.step2.lineBadge", {
                                line,
                              })}
                            </span>
                          )}
                          <span className="min-w-0 flex-1 leading-relaxed">{text}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {(localValidation.errors || []).length > 14 && (
                  <p className="mt-1.5 opacity-90">
                    {t("workspace.quiz.pasteImport.step2.validationMore", {
                      count: localValidation.errors.length - 14,
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

          {jsonText.trim() && !localValidation.empty && localValidation.warnings?.length > 0 && (
            <div
              className={cn(
                "mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                isDarkMode ? "border-sky-900/50 bg-sky-950/25 text-sky-200" : "border-sky-200 bg-sky-50 text-sky-950",
              )}
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <ul className="mt-1 space-y-1.5">
                {(localValidation.warnings || []).map((w, i) => (
                  <li key={i} className="break-words border-l-2 border-sky-400/40 pl-2.5">
                    {typeof w === "string" ? w : w.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {localValidation.ok && !localValidation.empty && (
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
                {t("workspace.quiz.pasteImport.disclaimer.heading")}
              </strong>{" "}
              {t("workspace.quiz.pasteImport.disclaimer.body")}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom action bar */}
      <div className={cn("flex items-center justify-end gap-2 border-t px-4 py-3", isDarkMode ? "border-slate-800 bg-slate-900" : "border-gray-200 bg-white")}>
        <Button
          type="button"
          onClick={handleAskSave}
          disabled={!localValidation.ok || localValidation.empty || submitting || !workspaceId}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("workspace.quiz.pasteImport.actions.saving")}
            </>
          ) : (
            t("workspace.quiz.pasteImport.actions.create")
          )}
        </Button>
      </div>

      {/* Disclaimer confirm dialog */}
      <Dialog open={disclaimerOpen} onOpenChange={(open) => !submitting && setDisclaimerOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("workspace.quiz.pasteImport.confirmDialog.title")}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm">
              {t("workspace.quiz.pasteImport.confirmDialog.body")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDisclaimerOpen(false)}
              disabled={submitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={handleConfirmSave} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("workspace.quiz.pasteImport.actions.saving")}
                </>
              ) : (
                t("workspace.quiz.pasteImport.confirmDialog.confirm")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ManualQuizPasteImportPanel;
