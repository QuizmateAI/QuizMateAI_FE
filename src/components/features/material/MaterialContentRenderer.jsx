import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const IMAGE_URL_REGEX = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;
const VIDEO_URL_REGEX = /\.(mp4|webm|ogg|mov|avi|mkv|m4v)(\?.*)?$/i;
const AUDIO_URL_REGEX = /\.(mp3|wav|ogg|m4a|flac|aac|opus|oga)(\?.*)?$/i;
const TAB_LINE_REGEX = /\t/;
// Markdown table separator: `|---|---|` or `|:---|:---:|---:|`
const MD_TABLE_SEPARATOR_REGEX = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/m;
// Sheet header pattern (BE Python emits this when extracting multi-sheet XLSX)
const SHEET_HEADER_REGEX = /^#{1,3}\s*Sheet\s*:/im;

function looksLikeUrl(text) {
  return typeof text === 'string' && /^https?:\/\/\S+$/.test(text.trim());
}

function isImageHttpUrl(url) {
  return looksLikeUrl(url) && IMAGE_URL_REGEX.test(url.trim());
}

function isVideoHttpUrl(url) {
  return looksLikeUrl(url) && VIDEO_URL_REGEX.test(url.trim());
}

function isAudioHttpUrl(url) {
  return looksLikeUrl(url) && AUDIO_URL_REGEX.test(url.trim());
}

/** Extract YouTube video ID from common URL shapes. Returns null if not a YouTube URL. */
function extractYouTubeId(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  // youtu.be/<id>
  let match = trimmed.match(/^https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{6,})/i);
  if (match) return match[1];
  // youtube.com/watch?v=<id>, m.youtube.com, music.youtube.com
  match = trimmed.match(/^https?:\/\/(?:[a-z]+\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([a-zA-Z0-9_-]{6,})/i);
  if (match) return match[1];
  // youtube.com/embed/<id> or /v/<id> or /shorts/<id>
  match = trimmed.match(/^https?:\/\/(?:www\.)?youtube\.com\/(?:embed|v|shorts|live)\/([a-zA-Z0-9_-]{6,})/i);
  if (match) return match[1];
  return null;
}

/** Extract Vimeo video ID. */
function extractVimeoId(url) {
  if (typeof url !== 'string') return null;
  const match = url.trim().match(/^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{5,})/i);
  return match ? match[1] : null;
}


/** True khi text co `## Sheet:` hoac markdown table separator -> delegate ve ReactMarkdown
 * vi format chuan markdown da xu ly day du multi-sheet + pipe table + heading. */
function hasMarkdownTableStructure(text) {
  if (typeof text !== 'string') return false;
  return MD_TABLE_SEPARATOR_REGEX.test(text) || SHEET_HEADER_REGEX.test(text);
}

/** Detect a PURE tab-separated tabular body (CSV/TSV exports without markdown).
 * Phai co da so dong chua TAB. KHONG match markdown pipe tables — markdown se duoc
 * delegate xuong ReactMarkdown qua hasMarkdownTableStructure. */
function isPlainTabularBody(text) {
  if (typeof text !== 'string' || text.length < 30) return false;
  if (hasMarkdownTableStructure(text)) return false;
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return false;
  const tabbed = lines.filter((line) => TAB_LINE_REGEX.test(line)).length;
  return tabbed / lines.length >= 0.6;
}

/** Build an HTML table from pure TAB-separated rows. */
function buildTableRows(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('\t').map((cell) => cell.trim()));
}

/**
 * Normalize extracted text from PDF/DOCX so it renders nicely as markdown.
 *
 * PDF extractors (PyMuPDF, pdfminer) thuong tra text bi:
 *   - Toan bo TOC nam tren 1 dong dai vo tan: "1.1 Cai dat .... 3 1.2 Viet ... 6 ..."
 *   - Chapter heading "Chuong 1 Tieu de" la paragraph thuong, khong phai heading
 *   - Leaders ". . . . . . . NUM" (page numbers)
 *   - Roman numeral page indicators "iv", "v" treo lo lung
 *
 * Bien doi:
 *   1. Thay leaders ` . . . . . NUM ` thanh ` ... NUM\n` (bre line sau page num)
 *   2. Tach TOC entries inline: "...3 1.2 X" -> tach line truoc moi 1.X / 2.X
 *   3. Promote "Phan I", "Chuong X", "Muc luc", "Bai N" -> markdown h2
 *   4. Roman numeral don le (i, ii, iii, iv, v) tren dong rieng -> em italic small
 */
function normalizePdfExtractedText(text) {
  if (typeof text !== 'string' || !text) return text;
  let normalized = text;

  // 1. Collapse TOC leaders (≥2 dots separated by spaces) + capture trailing page number.
  //    Replace " . . . . . . . . 3" with " … 3"
  normalized = normalized.replace(/\s*(?:[.·][.·\s]{2,}|\.{3,})\s*(\d+)/g, ' … $1');

  // 2. Insert newline AFTER a TOC entry (page num) when followed by another section number
  //    " … 3 1.2 Viet" -> " … 3\n1.2 Viet"
  normalized = normalized.replace(/(…\s\d+)\s+(\d+\.\d+\s)/g, '$1\n$2');
  //    Same trick when leader was different shape
  normalized = normalized.replace(/(\.\s\d+)\s+(\d+\.\d+\s)/g, '$1\n$2');
  // 2b. Break after the LAST TOC entry "… NUM" before regular prose (capital letter or
  //     Vietnamese capitalised diacritic). This separates TOC list from the intro paragraph.
  normalized = normalized.replace(
    /(…\s\d+)\s+([A-ZĐÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ])/g,
    '$1\n\n$2',
  );

  // 3. Insert newline before chapter / section markers when they appear mid-line.
  //    Vietnamese: "Chương 1", "Phần I/II/III", "Bài N", "Mục lục", "Mục lục chương"
  normalized = normalized.replace(/([^\n])\s+(Chương\s+\d+|Phần\s+[IVXLCDM]+|Mục\s+lục\s+chương|Mục\s+lục|Bài\s+\d+)\b/g, '$1\n\n$2');

  // 4. Promote leading "Chương N", "Phần X", "Mục lục", "Bài N" lines to markdown h2.
  normalized = normalized
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (/^(Chương|Phần|Mục\s+lục|Bài|Chapter|Part|Section)\s+([IVXLCDM]+|\d+|lục)\b/i.test(trimmed)
          && trimmed.length < 200) {
        return `## ${trimmed}`;
      }
      return line;
    })
    .join('\n');

  // 5. Collapse 3+ blank lines.
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  return normalized;
}

function classifyType(rawType) {
  const lower = String(rawType || '').toLowerCase();
  if (lower.includes('pdf')) return 'pdf';
  if (lower.includes('wordprocessingml') || lower.includes('msword') || lower.includes('docx') || lower === 'doc') return 'docx';
  if (lower.includes('spreadsheetml') || lower.includes('excel') || lower.includes('xlsx') || lower === 'xls') return 'xlsx';
  if (lower.includes('presentationml') || lower.includes('powerpoint') || lower.includes('pptx') || lower === 'ppt') return 'pptx';
  if (lower.includes('image')) return 'image';
  if (lower.includes('audio')) return 'audio';
  if (lower.includes('youtube') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('vimeo')) return 'vimeo';
  if (lower.includes('video')) return 'video';
  if (lower === 'url') return 'url';
  if (lower.includes('text') || lower.includes('markdown') || lower === 'md') return 'text';
  return 'unknown';
}

/**
 * Render extracted material content with shape appropriate to file type:
 *   - PDF/DOCX/PPTX/text: Markdown (headings, bold, lists, tables, code, links)
 *   - XLSX/CSV: HTML table when content is tab/pipe-separated rows
 *   - YouTube/Vimeo: iframe embed + optional script panel below
 *   - Audio (mp3/wav/...): native audio player + optional script panel
 *   - Direct video file: native video player + optional script panel
 *   - URL: clickable card
 *   - Image: img tag
 *
 * Props:
 *   value: string — raw extracted text or URL
 *   type: optional file type hint (mime or short)
 *   script: optional transcript / script text shown below media player
 *   scriptLabel: optional label (default "Script / Transcript")
 *   isDarkMode: bool
 *   fontClass: optional className for body text
 */
export function MaterialContentRenderer({
  value,
  type,
  script,
  scriptLabel = 'Script / Transcript',
  isDarkMode = false,
  fontClass = '',
}) {
  const text = typeof value === 'string' ? value : String(value ?? '');
  const detected = useMemo(() => classifyType(type), [type]);
  const trimmed = text.trim();

  // --- Image leaf ---
  if (isImageHttpUrl(trimmed)) {
    return (
      <div className={`overflow-hidden rounded-xl border ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        <img src={trimmed} alt="material" className="h-auto w-full object-contain" loading="lazy" />
      </div>
    );
  }

  // --- YouTube ---
  const ytId = extractYouTubeId(trimmed);
  if (ytId || detected === 'youtube') {
    const embedId = ytId || extractYouTubeId(trimmed);
    if (embedId) {
      return (
        <YouTubePlayer
          videoId={embedId}
          url={trimmed}
          isDarkMode={isDarkMode}
          script={script}
          scriptLabel={scriptLabel}
        />
      );
    }
  }

  // --- Vimeo ---
  const vimeoId = extractVimeoId(trimmed);
  if (vimeoId || detected === 'vimeo') {
    const embedId = vimeoId || extractVimeoId(trimmed);
    if (embedId) {
      return (
        <VimeoPlayer
          videoId={embedId}
          url={trimmed}
          isDarkMode={isDarkMode}
          script={script}
          scriptLabel={scriptLabel}
        />
      );
    }
  }

  // --- Audio (mp3, wav, m4a, ...) ---
  if (isAudioHttpUrl(trimmed) || detected === 'audio') {
    return (
      <AudioPlayer src={trimmed} isDarkMode={isDarkMode} script={script} scriptLabel={scriptLabel} />
    );
  }

  // --- Direct video file (mp4, webm, ...) ---
  if (isVideoHttpUrl(trimmed) || detected === 'video') {
    return (
      <VideoPlayer src={trimmed} isDarkMode={isDarkMode} script={script} scriptLabel={scriptLabel} />
    );
  }

  // --- URL leaf (single link extracted body) ---
  if (detected === 'url' && looksLikeUrl(trimmed)) {
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className={`block rounded-xl border p-4 text-sm transition-colors ${isDarkMode
          ? 'border-slate-700 bg-slate-900/40 text-blue-300 hover:border-blue-500'
          : 'border-gray-200 bg-white text-blue-600 hover:border-blue-300'}`}
      >
        {trimmed}
      </a>
    );
  }

  // --- Pure TSV/CSV body (no markdown structure) — render as static table ---
  // Khi text la XLSX da co `## Sheet:` heading hoac markdown pipe table separator,
  // ta bo qua nhanh nay va delegate xuong ReactMarkdown ben duoi (xu ly multi-sheet
  // + GFM tables + headings dung).
  if (isPlainTabularBody(trimmed)) {
    const rows = buildTableRows(trimmed);
    if (rows.length > 0) {
      const [header, ...body] = rows;
      const hasMultiCellHeader = header.length > 1;
      return (
        <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <table className={`min-w-full text-sm ${fontClass}`}>
            {hasMultiCellHeader && (
              <thead className={isDarkMode ? 'bg-slate-800/70 text-slate-200' : 'bg-slate-100 text-slate-700'}>
                <tr>
                  {header.map((cell, idx) => (
                    <th key={idx} className="border-b border-r last:border-r-0 px-3 py-2 text-left font-semibold">
                      {cell || ' '}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {(hasMultiCellHeader ? body : rows).map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={`${isDarkMode ? 'odd:bg-slate-900/40 even:bg-slate-900/10 text-slate-200' : 'odd:bg-white even:bg-slate-50 text-slate-700'} border-b last:border-b-0`}
                >
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="border-r last:border-r-0 px-3 py-2 align-top">
                      {cell || ' '}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  // --- Markdown / structured text default (PDF/DOCX/PPTX/text/unknown) ---
  // Apply PDF/DOC normalizer when text doesn't already look like proper markdown
  // (no md table separator, no Sheet header from XLSX). This breaks long
  // single-line PDF extracts into multiple paragraphs + headings.
  const shouldNormalize = (detected === 'pdf' || detected === 'docx' || detected === 'unknown' || detected === 'text')
    && !hasMarkdownTableStructure(trimmed);
  const renderable = shouldNormalize ? normalizePdfExtractedText(trimmed) : trimmed;

  return (
    <div className={`material-md text-sm leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-700'} ${fontClass}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h1 className="mb-3 mt-4 text-xl font-bold tracking-tight first:mt-0" {...props} />,
          h2: ({ children, ...props }) => {
            const flat = String(Array.isArray(children) ? children.join('') : children || '');
            const isSheet = /^\s*Sheet\s*:/i.test(flat);
            if (isSheet) {
              const sheetName = flat.replace(/^\s*Sheet\s*:\s*/i, '').trim() || flat.trim();
              return (
                <div
                  className={`mb-3 mt-5 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold first:mt-0 ${isDarkMode ? 'border-blue-800/40 bg-blue-950/40 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-800'}`}
                  {...props}
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 3v18" />
                  </svg>
                  <span>Sheet</span>
                  <span className={`mx-1 ${isDarkMode ? 'text-blue-400/60' : 'text-blue-400'}`}>·</span>
                  <span>{sheetName}</span>
                </div>
              );
            }
            return <h2 className="mb-2 mt-4 text-lg font-bold tracking-tight first:mt-0" {...props}>{children}</h2>;
          },
          h3: (props) => <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0" {...props} />,
          h4: (props) => <h4 className="mb-1 mt-2 text-sm font-semibold first:mt-0" {...props} />,
          p: (props) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
          ul: (props) => <ul className="mb-3 ml-5 list-disc space-y-1" {...props} />,
          ol: (props) => <ol className="mb-3 ml-5 list-decimal space-y-1" {...props} />,
          li: (props) => <li className="leading-relaxed" {...props} />,
          a: (props) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline ${isDarkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
            />
          ),
          strong: (props) => <strong className="font-semibold" {...props} />,
          em: (props) => <em className="italic" {...props} />,
          blockquote: (props) => (
            <blockquote
              className={`mb-3 border-l-4 pl-3 italic ${isDarkMode ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-600'}`}
              {...props}
            />
          ),
          code: ({ inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code
                  className={`rounded px-1 py-0.5 text-[0.85em] ${isDarkMode ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-rose-600'}`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: (props) => (
            <pre
              className={`mb-3 overflow-x-auto rounded-lg p-3 text-[0.85em] ${isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-900 text-slate-100'}`}
              {...props}
            />
          ),
          table: (props) => (
            <div className={`mb-3 overflow-x-auto rounded-lg border ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <table className="min-w-full text-sm" {...props} />
            </div>
          ),
          thead: (props) => (
            <thead className={isDarkMode ? 'bg-slate-800/70 text-slate-200' : 'bg-slate-100 text-slate-700'} {...props} />
          ),
          th: (props) => <th className="border-b border-r last:border-r-0 px-3 py-2 text-left font-semibold" {...props} />,
          td: (props) => <td className="border-b border-r last:border-r-0 px-3 py-2 align-top last:border-b-0" {...props} />,
          hr: (props) => <hr className={`my-4 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`} {...props} />,
          img: (props) => (
            <img {...props} className="my-3 h-auto max-w-full rounded-lg border border-slate-200" loading="lazy" alt={props.alt || ''} />
          ),
        }}
      >
        {renderable}
      </ReactMarkdown>
    </div>
  );
}

/* -------------------- Media players -------------------- */

function PlayerFrame({ children, header, footer, isDarkMode, compact = false }) {
  // compact = true: responsive caps so video doesn't stretch full width on large monitors
  // but stays generous on desktop. Mobile = full width, sm = 672px, lg = 768px, xl = 896px.
  const widthClass = compact
    ? 'w-full sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto'
    : '';
  return (
    <div className={`overflow-hidden rounded-xl border ${widthClass} ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
      {header}
      {children}
      {footer}
    </div>
  );
}

/** Render a "Script / Transcript" panel below a media player.
 * Receives raw transcript text and renders via ReactMarkdown so that
 * timestamped lines, headings, and bullets format correctly. */
function ScriptPanel({ text, isDarkMode, label }) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const trimmed = text.trim();
  return (
    <div className={`border-t ${isDarkMode ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-slate-50/60'}`}>
      <div className={`flex items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
        {label}
      </div>
      <div className={`max-h-72 overflow-y-auto px-4 py-3 text-sm leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
      </div>
    </div>
  );
}

function YouTubePlayer({ videoId, url, isDarkMode, script, scriptLabel }) {
  const thumbUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  return (
    <PlayerFrame
      isDarkMode={isDarkMode}
      compact
      footer={<ScriptPanel text={script} isDarkMode={isDarkMode} label={scriptLabel} />}
      header={(
        <div className={`flex items-center justify-between gap-2 px-3 py-2 text-xs ${isDarkMode ? 'border-b border-slate-700 bg-slate-800/40 text-slate-200' : 'border-b border-gray-200 bg-slate-50 text-slate-700'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <svg className="h-4 w-4 shrink-0 text-rose-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19.6 6.2a2.5 2.5 0 00-1.8-1.8C16.2 4 12 4 12 4s-4.2 0-5.8.4A2.5 2.5 0 004.4 6.2C4 7.8 4 12 4 12s0 4.2.4 5.8a2.5 2.5 0 001.8 1.8c1.6.4 5.8.4 5.8.4s4.2 0 5.8-.4a2.5 2.5 0 001.8-1.8c.4-1.6.4-5.8.4-5.8s0-4.2-.4-5.8zM10 15.5v-7l6 3.5-6 3.5z" />
            </svg>
            <span className="font-semibold">YouTube</span>
            <span className={`mx-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>·</span>
            <code className={`truncate font-mono text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{videoId}</code>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
          >
            Mở YouTube
          </a>
        </div>
      )}
    >
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={`YouTube video ${videoId}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
          referrerPolicy="strict-origin-when-cross-origin"
          data-thumb={thumbUrl}
        />
      </div>
    </PlayerFrame>
  );
}

function VimeoPlayer({ videoId, url, isDarkMode, script, scriptLabel }) {
  return (
    <PlayerFrame
      isDarkMode={isDarkMode}
      compact
      footer={<ScriptPanel text={script} isDarkMode={isDarkMode} label={scriptLabel} />}
      header={(
        <div className={`flex items-center justify-between gap-2 px-3 py-2 text-xs ${isDarkMode ? 'border-b border-slate-700 bg-slate-800/40 text-slate-200' : 'border-b border-gray-200 bg-slate-50 text-slate-700'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <svg className="h-4 w-4 shrink-0 text-sky-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M22 6.4c-.1 2.2-1.6 5.2-4.5 9.1-3 4-5.5 6-7.5 6-1.3 0-2.4-1.1-3.2-3.4l-1.7-6.4c-.6-2.3-1.3-3.4-2-3.4-.2 0-.7.3-1.6.9L0 7.7c1-.9 2-1.8 3-2.7 1.3-1.2 2.4-1.8 3-1.9 1.6-.2 2.6.9 3 3.3l1 5.3c.6 2.5 1.2 3.8 1.9 3.8.5 0 1.4-.8 2.5-2.4 1.1-1.6 1.7-2.8 1.8-3.7.2-1.6-.5-2.4-1.8-2.4-.7 0-1.3.1-2 .4 1.4-4.4 4-6.6 7.7-6.5 2.7.1 4 1.9 3.9 5.4z" />
            </svg>
            <span className="font-semibold">Vimeo</span>
            <span className={`mx-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>·</span>
            <code className={`truncate font-mono text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{videoId}</code>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
          >
            Mở Vimeo
          </a>
        </div>
      )}
    >
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${videoId}?byline=0&title=0`}
          title={`Vimeo video ${videoId}`}
          loading="lazy"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </PlayerFrame>
  );
}

function VideoPlayer({ src, isDarkMode, script, scriptLabel }) {
  return (
    <PlayerFrame
      isDarkMode={isDarkMode}
      compact
      footer={<ScriptPanel text={script} isDarkMode={isDarkMode} label={scriptLabel} />}
      header={(
        <div className={`flex items-center gap-2 px-3 py-2 text-xs ${isDarkMode ? 'border-b border-slate-700 bg-slate-800/40 text-slate-200' : 'border-b border-gray-200 bg-slate-50 text-slate-700'}`}>
          <svg className="h-4 w-4 shrink-0 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="6" width="14" height="12" rx="2" />
            <path d="m17 10 4-2v8l-4-2" />
          </svg>
          <span className="font-semibold">Video</span>
        </div>
      )}
    >
      <video
        src={src}
        controls
        preload="metadata"
        className="h-auto w-full bg-black"
      >
        <track kind="captions" />
      </video>
    </PlayerFrame>
  );
}

function AudioPlayer({ src, isDarkMode, script, scriptLabel }) {
  return (
    <div className={`overflow-hidden rounded-xl border w-full sm:max-w-2xl lg:max-w-3xl mx-auto ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
      <div className={`flex items-center gap-3 px-4 py-3 ${isDarkMode ? 'bg-slate-800/40' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-white text-blue-600 shadow-sm'}`}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            Audio
          </p>
          <p className={`truncate text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {(() => {
              try { return decodeURIComponent(new URL(src).pathname.split('/').pop() || src); }
              catch { return src; }
            })()}
          </p>
        </div>
      </div>
      <audio
        src={src}
        controls
        preload="metadata"
        className="block w-full px-3 py-2"
      >
        <track kind="captions" />
      </audio>
      <ScriptPanel text={script} isDarkMode={isDarkMode} label={scriptLabel} />
    </div>
  );
}
