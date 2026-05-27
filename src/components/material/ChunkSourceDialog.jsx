import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ExternalLink, FileText, Loader2, RefreshCw } from "lucide-react";

import { getChunkById, getRAGChunks } from "@/api/MaterialAPI";
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

function normalizeSourceToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildSourceTokens(value) {
  const text = String(value || "");
  const tokens = [];
  const pattern = /[\p{L}\p{N}]+/gu;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    tokens.push({
      value: normalizeSourceToken(match[0]),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return tokens;
}

function findFlexibleSourceRange(content, span) {
  const contentTokens = buildSourceTokens(content);
  const spanTokens = buildSourceTokens(span).map((token) => token.value);
  if (contentTokens.length === 0 || spanTokens.length < 3) return null;

  const candidateLengths = [
    spanTokens.length,
    120,
    80,
    40,
    20,
    12,
    6,
    3,
  ]
    .map((length) => Math.min(length, spanTokens.length))
    .filter((length, index, list) => length >= 3 && list.indexOf(length) === index);

  for (const length of candidateLengths) {
    const needle = spanTokens.slice(0, length);
    for (let index = 0; index <= contentTokens.length - length; index += 1) {
      let matched = true;
      for (let offset = 0; offset < length; offset += 1) {
        if (contentTokens[index + offset].value !== needle[offset]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        return {
          start: contentTokens[index].start,
          end: contentTokens[index + length - 1].end,
          partial: length < spanTokens.length,
        };
      }
    }
  }

  return null;
}

function splitContentByRanges(content, ranges) {
  const result = [];
  let cursor = 0;

  ranges.forEach((range) => {
    const start = Math.max(0, Math.min(content.length, range.start));
    const end = Math.max(start, Math.min(content.length, range.end));
    if (start > cursor) {
      result.push({ text: content.slice(cursor, start), highlight: false });
    }
    if (end > start) {
      result.push({
        text: content.slice(start, end),
        highlight: true,
        partial: Boolean(range.partial),
      });
    }
    cursor = end;
  });

  if (cursor < content.length) {
    result.push({ text: content.slice(cursor), highlight: false });
  }

  return result.length > 0 ? result : [{ text: content, highlight: false }];
}

function HighlightedContent({ content, span }) {
  const segments = useMemo(() => {
    const safeContent = String(content || "");
    const trimmedSpan = String(span || "").trim();
    if (!trimmedSpan) {
      return [{ text: safeContent, highlight: false }];
    }

    const pattern = new RegExp(escapeRegExp(trimmedSpan), "gi");
    const exactRanges = [];
    let match;
    while ((match = pattern.exec(safeContent)) !== null) {
      exactRanges.push({
        start: match.index,
        end: match.index + match[0].length,
        partial: false,
      });
      if (match[0].length === 0) pattern.lastIndex += 1;
    }

    if (exactRanges.length > 0) {
      return splitContentByRanges(safeContent, exactRanges);
    }

    const flexibleRange = findFlexibleSourceRange(safeContent, trimmedSpan);
    if (flexibleRange) {
      return splitContentByRanges(safeContent, [flexibleRange]);
    }

    return [{ text: safeContent, highlight: false }];
  }, [content, span]);

  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800 dark:text-slate-200">
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark
            key={index}
            className="rounded bg-amber-200/80 px-0.5 text-slate-900 dark:bg-amber-500/40 dark:text-amber-50"
            tabIndex={0}
            title={segment.partial ? "Tìm thấy một phần đoạn bằng chứng do nội dung nguồn khác định dạng." : undefined}
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

function toPositiveInteger(value) {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
}

function pickFirstPage(value) {
  if (Array.isArray(value)) {
    return value.map(toPositiveInteger).find(Boolean) || null;
  }
  return toPositiveInteger(value);
}

function resolveChunkPage(chunk) {
  if (!chunk || typeof chunk !== "object") return null;
  return pickFirstPage(chunk.pages)
    || pickFirstPage(chunk.page)
    || pickFirstPage(chunk.page_number)
    || pickFirstPage(chunk.pageNumber)
    || pickFirstPage(chunk.page_start)
    || pickFirstPage(chunk.pageStart)
    || pickFirstPage(chunk.start_page)
    || pickFirstPage(chunk.startPage)
    || pickFirstPage(chunk.metadata?.page_start)
    || pickFirstPage(chunk.metadata?.pageStart)
    || null;
}

function normalizeChunkId(value) {
  return String(value || "").trim();
}

function extractChunks(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.chunks)) return data.chunks;
  return [];
}

export default function ChunkSourceDialog({
  open,
  onOpenChange,
  chunkId,
  sourceSpan = "",
  title = "Nguồn trích dẫn",
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [chunk, setChunk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [openingDocument, setOpeningDocument] = useState(false);

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
  const materialId = toPositiveInteger(chunk?.material_id ?? chunk?.materialId);
  const content = chunk?.content || "";
  const workspaceRouteMatch = String(location.pathname || "").match(/^\/workspaces\/(\d+)/);
  const groupRouteMatch = String(location.pathname || "").match(/^\/group-workspaces\/(\d+)/);
  const canOpenDocument = Boolean(materialId && (workspaceRouteMatch || groupRouteMatch));

  const handleOpenDocument = async () => {
    if (!materialId || openingDocument) return;
    setOpeningDocument(true);
    try {
      let targetPage = resolveChunkPage(chunk);
      if (!targetPage) {
        try {
          const response = await getRAGChunks(materialId, 500);
          const chunks = extractChunks(response);
          const normalizedChunkId = normalizeChunkId(chunkId);
          const matchedChunk = chunks.find((item) => {
            const itemChunkId = normalizeChunkId(item?.chunk_id ?? item?.chunkId);
            if (normalizedChunkId && itemChunkId === normalizedChunkId) return true;
            const itemSequence = Number(item?.chunk_sequence ?? item?.chunkSequence ?? item?.chunk_index ?? item?.chunkIndex);
            return Number.isFinite(itemSequence) && Number.isFinite(Number(sequence)) && itemSequence === Number(sequence);
          });
          targetPage = resolveChunkPage(matchedChunk);
        } catch {
          targetPage = null;
        }
      }

      const searchParams = new URLSearchParams();
      searchParams.set("sourceChunkId", normalizeChunkId(chunkId));
      if (targetPage) searchParams.set("sourcePage", String(targetPage));
      try {
        window.sessionStorage.setItem(
          `quizmateai:source-jump:${normalizeChunkId(chunkId)}`,
          JSON.stringify({
            materialId,
            sourceSpan: String(sourceSpan || "").trim(),
            targetPage,
            savedAt: Date.now(),
          }),
        );
      } catch {
        // Ignore storage failures; the PDF viewer can still use page metadata.
      }

      if (groupRouteMatch) {
        searchParams.set("section", "documents");
        searchParams.set("materialId", String(materialId));
        onOpenChange?.(false);
        navigate(`/group-workspaces/${groupRouteMatch[1]}?${searchParams.toString()}`);
        return;
      }

      if (workspaceRouteMatch) {
        onOpenChange?.(false);
        navigate(`/workspaces/${workspaceRouteMatch[1]}/sources/${materialId}?${searchParams.toString()}`);
      }
    } finally {
      setOpeningDocument(false);
    }
  };

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

        {!loading && !errorState && chunk && (
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-amber-50 px-5 py-3 text-[11px] font-semibold text-amber-800 dark:border-slate-800 dark:bg-amber-950/30 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {sourceSpan
                ? "Đoạn trích được tô vàng là phần AI sử dụng làm bằng chứng."
                : "Mở tài liệu gốc để đối chiếu nội dung chunk này."}
            </span>
            <button
              type="button"
              onClick={handleOpenDocument}
              disabled={!canOpenDocument || openingDocument}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                canOpenDocument && !openingDocument
                  ? "bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
                  : "cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
              )}
            >
              {openingDocument ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              Mở tài liệu
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
