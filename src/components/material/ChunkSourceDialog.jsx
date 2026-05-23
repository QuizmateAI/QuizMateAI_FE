import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, RefreshCw } from "lucide-react";

import { getChunkById } from "@/api/MaterialAPI";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedContent({ content, span }) {
  const segments = useMemo(() => {
    const safeContent = String(content || "");
    const trimmedSpan = String(span || "").trim();
    if (!trimmedSpan) {
      return [{ text: safeContent, highlight: false }];
    }
    const pattern = new RegExp(escapeRegExp(trimmedSpan), "gi");
    const result = [];
    let cursor = 0;
    let match;
    while ((match = pattern.exec(safeContent)) !== null) {
      if (match.index > cursor) {
        result.push({ text: safeContent.slice(cursor, match.index), highlight: false });
      }
      result.push({ text: match[0], highlight: true });
      cursor = match.index + match[0].length;
      if (match[0].length === 0) pattern.lastIndex += 1;
    }
    if (cursor < safeContent.length) {
      result.push({ text: safeContent.slice(cursor), highlight: false });
    }
    return result;
  }, [content, span]);

  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800 dark:text-slate-200">
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark
            key={index}
            className="rounded bg-amber-200/80 px-0.5 text-slate-900 dark:bg-amber-500/40 dark:text-amber-50"
            tabIndex={0}
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

export default function ChunkSourceDialog({
  open,
  onOpenChange,
  chunkId,
  sourceSpan = "",
  title = "Nguồn trích dẫn",
}) {
  const [chunk, setChunk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open || !chunkId) {
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setErrorState(null);
    setChunk(null);
    (async () => {
      try {
        const response = await getChunkById(chunkId);
        if (cancelled) return;
        const data = response?.data ?? response ?? null;
        setChunk(data);
      } catch (error) {
        if (cancelled) return;
        const status = error?.response?.status;
        setErrorState({
          status,
          message:
            status === 404
              ? "Không có nguồn cho câu hỏi này."
              : error?.response?.data?.message
                || error?.message
                || "Không tải được nội dung nguồn.",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, chunkId, reloadKey]);

  const sectionTitle = chunk?.chunk_section_title || chunk?.chunkSectionTitle;
  const topic = chunk?.chunk_topic || chunk?.chunkTopic;
  const sequence = chunk?.chunk_sequence ?? chunk?.chunkSequence;
  const content = chunk?.content || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-2xl gap-0 overflow-hidden p-0",
          "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100",
        )}
      >
        <DialogHeader className="flex flex-row items-start gap-3 border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            <FileText className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold leading-tight text-slate-900 dark:text-slate-100">
              {title}
            </DialogTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {sectionTitle && <span className="truncate max-w-[260px]">{sectionTitle}</span>}
              {topic && (
                <>
                  <span>·</span>
                  <span className="truncate max-w-[200px]">{topic}</span>
                </>
              )}
              {Number.isFinite(Number(sequence)) && (
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  #{sequence}
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang tải nguồn...</span>
            </div>
          )}

          {!loading && errorState && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
              <p className="font-semibold">{errorState.message}</p>
              {errorState.status !== 404 && (
                <button
                  type="button"
                  onClick={() => setReloadKey((value) => value + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Thử lại
                </button>
              )}
            </div>
          )}

          {!loading && !errorState && chunk && content && (
            <HighlightedContent content={content} span={sourceSpan} />
          )}

          {!loading && !errorState && chunk && !content && (
            <p className="py-12 text-center text-sm italic text-slate-500 dark:text-slate-400">
              Chunk không có nội dung văn bản.
            </p>
          )}
        </div>

        {!loading && !errorState && sourceSpan && (
          <div className="border-t border-slate-200 bg-amber-50 px-5 py-3 text-[11px] font-semibold text-amber-800 dark:border-slate-800 dark:bg-amber-950/30 dark:text-amber-200">
            Đoạn trích được tô vàng là phần AI sử dụng làm bằng chứng.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
