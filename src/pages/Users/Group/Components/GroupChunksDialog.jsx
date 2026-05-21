import React, { useEffect, useMemo, useState } from 'react';
import { Braces, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, FileText, Layers, Loader2, RefreshCw, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getRAGChunks } from '@/api/MaterialAPI';

// Metadata keys we already surface as badges/chips in the header — exclude
// them from the "full metadata" panel to avoid double-rendering.
const FEATURED_META_KEYS = new Set([
  'chunk_id',
  'chunk_index',
  'chunk_length',
  'chunk_section_title',
  'section_title',
  'chunk_topic',
  'topic',
  'pages',
  'start_page',
  'end_page',
]);

function formatMetaValue(value) {
  if (value == null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((v) => typeof v !== 'object')) return `[${value.join(', ')}]`;
    return JSON.stringify(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getMaterialTitle(material, t) {
  return material?.title || material?.name || t?.('groupDocumentsTab.confirmDeleteFallbackTitle', 'this material') || 'this material';
}

function formatPages(pages, startPage, endPage) {
  if (Array.isArray(pages) && pages.length > 0) {
    if (pages.length === 1) return `Trang ${pages[0]}`;
    return `Trang ${pages[0]}–${pages[pages.length - 1]}`;
  }
  if (startPage != null && endPage != null) {
    return startPage === endPage ? `Trang ${startPage}` : `Trang ${startPage}–${endPage}`;
  }
  return null;
}

function ChunkCard({ chunk, isDarkMode, query, expandAllSignal }) {
  const [expanded, setExpanded] = useState(false);
  const [metaExpanded, setMetaExpanded] = useState(false);
  // `expandAllSignal` is bumped by the parent every time the user hits
  // "Mở rộng tất cả" / "Thu gọn tất cả". Compare during render (React's
  // recommended "derive state from props" pattern) so all cards sync without
  // a cascading useEffect render, and users can still toggle individual cards
  // afterwards without losing the global toggle.
  const [lastSignal, setLastSignal] = useState(null);
  if (expandAllSignal !== lastSignal) {
    setLastSignal(expandAllSignal);
    if (expandAllSignal != null) {
      setExpanded(Boolean(expandAllSignal.expanded));
    }
  }

  const content = chunk?.content || '';
  const showFull = expanded || content.length <= 480;
  const preview = showFull ? content : `${content.slice(0, 480)}…`;
  const pagesLabel = formatPages(chunk?.pages, chunk?.start_page, chunk?.end_page);
  const section = chunk?.section_title || '';
  const topic = chunk?.topic || '';

  // Raw cmetadata blob from PGVector — display every key not already shown as
  // a header badge so we can spot indexer regressions (missing chunk_id,
  // wrong embedding_model, stale base_metadata, ...) without re-running SQL.
  const rawMeta = chunk?.metadata && typeof chunk.metadata === 'object' ? chunk.metadata : {};
  const extraMetaEntries = useMemo(() => {
    return Object.entries(rawMeta)
      .filter(([key]) => !FEATURED_META_KEYS.has(key))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [rawMeta]);

  // Highlight search term hits.
  const renderedContent = useMemo(() => {
    if (!query || !preview) return preview;
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const parts = preview.split(new RegExp(`(${safe})`, 'gi'));
      return parts.map((part, idx) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={idx} className={isDarkMode ? 'bg-yellow-400/30 text-yellow-50' : 'bg-yellow-200 text-slate-900'}>{part}</mark>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        )
      );
    } catch {
      return preview;
    }
  }, [preview, query, isDarkMode]);

  return (
    <article
      className={cn(
        'rounded-2xl border p-4 transition',
        isDarkMode ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]' : 'border-slate-200 bg-white hover:bg-slate-50/80'
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
          isDarkMode ? 'bg-cyan-500/10 text-cyan-200' : 'bg-cyan-50 text-cyan-700'
        )}>
          <Layers className="h-3 w-3" />
          #{chunk?.chunk_index ?? '?'}
        </span>
        <span className={cn('text-[11px] font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
          {chunk?.chunk_length ?? content.length} chars
        </span>
        {pagesLabel ? (
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-medium',
            isDarkMode ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700'
          )}>
            {pagesLabel}
          </span>
        ) : null}
        {section ? (
          <span className={cn(
            'truncate max-w-[60%] rounded-full px-2 py-0.5 text-[11px] font-medium',
            isDarkMode ? 'bg-white/[0.06] text-slate-200' : 'bg-slate-100 text-slate-700'
          )} title={section}>
            § {section}
          </span>
        ) : null}
      </header>

      {topic && topic !== section ? (
        <p className={cn('mt-2 text-[11px] italic', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
          Topic: {topic}
        </p>
      ) : null}

      <pre className={cn(
        'mt-3 whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed',
        isDarkMode ? 'text-slate-100' : 'text-slate-800'
      )}>
        {renderedContent}
      </pre>

      {content.length > 480 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
            isDarkMode ? 'text-cyan-300 hover:text-cyan-200' : 'text-cyan-700 hover:text-cyan-900'
          )}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {expanded ? 'Thu gọn' : `Xem đầy đủ (${content.length - 480} ký tự còn lại)`}
        </button>
      ) : null}

      {extraMetaEntries.length > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setMetaExpanded((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold',
              isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {metaExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <Braces className="h-3.5 w-3.5" />
            {metaExpanded ? 'Ẩn metadata' : `Xem ${extraMetaEntries.length} metadata khác`}
          </button>
          {metaExpanded ? (
            <div className={cn(
              'mt-2 grid gap-x-3 gap-y-1 rounded-lg border p-3 text-[11px] font-mono sm:grid-cols-[max-content_1fr]',
              isDarkMode ? 'border-white/10 bg-black/30 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'
            )}>
              {extraMetaEntries.map(([key, value]) => (
                <React.Fragment key={key}>
                  <span className={cn('whitespace-nowrap font-semibold', isDarkMode ? 'text-cyan-300' : 'text-cyan-700')}>
                    {key}
                  </span>
                  <span className="break-all">{formatMetaValue(value)}</span>
                </React.Fragment>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function GroupChunksDialog({
  open = false,
  material = null,
  isDarkMode = false,
  onOpenChange,
  t,
}) {
  const materialId = material?.id ?? material?.materialId ?? null;
  const materialTitle = getMaterialTitle(material, t);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  // Bumping the signal forces every ChunkCard to mirror the global expanded
  // state via useEffect — we use an object so each click is a new reference
  // (so consecutive "Mở rộng tất cả" presses re-trigger even with same value).
  const [expandAllSignal, setExpandAllSignal] = useState(null);
  const [allExpanded, setAllExpanded] = useState(false);

  const loadChunks = async () => {
    if (!materialId) return;
    setLoading(true);
    setError('');
    try {
      const response = await getRAGChunks(materialId, 500);
      const payload = response?.data ?? response;
      setData(payload);
    } catch (err) {
      const message = err?.response?.data?.message
        || err?.response?.data
        || err?.message
        || 'Không lấy được chunks';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load on open.
  useEffect(() => {
    if (open && materialId) {
      loadChunks();
    } else if (!open) {
      // Reset when closed so reopening triggers a fresh load.
      setData(null);
      setError('');
      setQuery('');
      setExpandAllSignal(null);
      setAllExpanded(false);
    }
  }, [open, materialId]);

  const handleToggleExpandAll = () => {
    const next = !allExpanded;
    setAllExpanded(next);
    // New object reference each click so the useEffect in every ChunkCard
    // sees a change even if the boolean repeats (eg. user clicks twice fast).
    setExpandAllSignal({ expanded: next, at: Date.now() });
  };

  const chunks = data?.chunks || [];
  const filteredChunks = useMemo(() => {
    if (!query.trim()) return chunks;
    const q = query.toLowerCase();
    return chunks.filter((c) =>
      (c?.content || '').toLowerCase().includes(q)
      || (c?.section_title || '').toLowerCase().includes(q)
      || (c?.topic || '').toLowerCase().includes(q)
    );
  }, [chunks, query]);

  const stats = useMemo(() => {
    if (!chunks.length) return null;
    const lengths = chunks.map((c) => Number(c?.chunk_length) || (c?.content?.length ?? 0));
    const totalChars = lengths.reduce((a, b) => a + b, 0);
    const sections = new Set(chunks.map((c) => c?.section_title).filter(Boolean));
    const withPages = chunks.filter((c) => Array.isArray(c?.pages) && c.pages.length > 0).length;
    return {
      count: chunks.length,
      avg: Math.round(totalChars / chunks.length),
      max: Math.max(...lengths),
      min: Math.min(...lengths),
      sections: sections.size,
      withPages,
    };
  }, [chunks]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border p-0 shadow-2xl',
          isDarkMode ? 'border-white/10 bg-slate-950 text-slate-50' : 'border-slate-200 bg-white text-slate-950'
        )}
      >
        <DialogHeader className="gap-0 border-b p-5 pb-4 text-left">
          <div className="flex items-start gap-3">
            <span className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
              isDarkMode ? 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-700'
            )}>
              <Layers className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className={cn('text-lg font-bold leading-6', isDarkMode ? 'text-white' : 'text-slate-950')}>
                Chunks đã index
              </DialogTitle>
              <DialogDescription className={cn('mt-1 flex items-center gap-1.5 text-sm leading-5', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
                <FileText className="h-3.5 w-3.5" />
                <span className="truncate" title={materialTitle}>{materialTitle}</span>
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || !chunks.length}
                onClick={handleToggleExpandAll}
                className={cn('rounded-full', isDarkMode ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]' : '')}
                title={allExpanded ? 'Thu gọn nội dung tất cả chunk' : 'Mở rộng nội dung tất cả chunk'}
              >
                {allExpanded ? (
                  <ChevronsDownUp className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <ChevronsUpDown className="mr-1 h-3.5 w-3.5" />
                )}
                {allExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={loadChunks}
                className={cn('rounded-full', isDarkMode ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]' : '')}
              >
                <RefreshCw className={cn('mr-1 h-3.5 w-3.5', loading ? 'animate-spin' : '')} />
                Tải lại
              </Button>
            </div>
          </div>

          {stats ? (
            <div className={cn(
              'mt-4 grid grid-cols-2 gap-2 rounded-xl border p-3 text-xs sm:grid-cols-5',
              isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50'
            )}>
              <StatPill label="Tổng chunk" value={stats.count} isDarkMode={isDarkMode} />
              <StatPill label="TB ký tự" value={stats.avg} isDarkMode={isDarkMode} />
              <StatPill label="Max" value={stats.max} isDarkMode={isDarkMode} />
              <StatPill label="Section" value={stats.sections} isDarkMode={isDarkMode} />
              <StatPill label="Có pages" value={`${stats.withPages}/${stats.count}`} isDarkMode={isDarkMode} />
            </div>
          ) : null}

          <div className={cn(
            'mt-3 flex items-center gap-2 rounded-full border px-3 py-1.5',
            isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
          )}>
            <Search className={cn('h-3.5 w-3.5', isDarkMode ? 'text-slate-400' : 'text-slate-500')} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm trong chunk content, section, topic..."
              className={cn(
                'flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400',
                isDarkMode ? 'text-white' : 'text-slate-900'
              )}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className={cn('text-xs font-medium', isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}
              >
                Xoá
              </button>
            ) : null}
            {query && filteredChunks.length !== chunks.length ? (
              <span className={cn('text-[11px]', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                {filteredChunks.length}/{chunks.length}
              </span>
            ) : null}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && !data ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>Đang tải chunks...</span>
            </div>
          ) : error ? (
            <div className={cn(
              'rounded-xl border p-4 text-sm',
              isDarkMode ? 'border-rose-300/20 bg-rose-400/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700'
            )}>
              <p className="font-semibold">Lỗi</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
          ) : !chunks.length ? (
            <div className={cn('rounded-xl border p-8 text-center text-sm', isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600')}>
              Tài liệu này chưa có chunk nào trong vector DB. Có thể tài liệu chưa được index, hoặc bị xoá khỏi index.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChunks.map((c, idx) => (
                <ChunkCard
                  key={c.chunk_id || `${c.chunk_index}-${idx}`}
                  chunk={c}
                  isDarkMode={isDarkMode}
                  query={query}
                  expandAllSignal={expandAllSignal}
                />
              ))}
              {filteredChunks.length === 0 ? (
                <div className={cn('rounded-xl border p-6 text-center text-xs', isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600')}>
                  Không có chunk nào khớp với từ khoá "{query}".
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatPill({ label, value, isDarkMode }) {
  return (
    <div className="flex flex-col">
      <span className={cn('text-[10px] uppercase tracking-wider', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>{label}</span>
      <span className={cn('text-sm font-bold', isDarkMode ? 'text-white' : 'text-slate-900')}>{value}</span>
    </div>
  );
}
