import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText, Loader2, Send, Trash2,
} from "lucide-react";

import { askMaterial } from "@/api/MaterialAPI";

function extractCitationNumbers(children) {
  const nums = [];
  function walk(node) {
    if (node == null) return;
    if (typeof node === "string") {
      const re = /\[([\d,\s]+)\]/g;
      let m;
      while ((m = re.exec(node)) !== null) {
        m[1].split(/[,\s]+/).filter(Boolean).forEach((n) => {
          const parsed = parseInt(n, 10);
          if (!Number.isNaN(parsed)) nums.push(parsed);
        });
      }
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (typeof node === "object" && node.props) {
      walk(node.props.children);
    }
  }
  walk(children);
  // unique + preserve order
  return [...new Set(nums)];
}

function pickJumpTarget(citationNums, sources) {
  for (const n of citationNums) {
    const src = sources[n - 1];
    if (src?.page) return { num: n, page: src.page, source: src };
  }
  return null;
}

function CitationBadge({ num, source, isDarkMode, onJumpToPage }) {
  const page = source?.page;
  const clickable = Boolean(page && onJumpToPage);
  return (
    <button
      type="button"
      data-citation-badge
      disabled={!clickable}
      onClick={(e) => {
        e.stopPropagation();
        if (clickable) onJumpToPage(page);
      }}
      title={clickable
        ? `Đối soát: mở trang ${page} trong PDF`
        : (source?.text?.slice(0, 100) || `Nguồn ${num}`)}
      className={`inline-flex items-center justify-center align-baseline w-5 h-[18px] mx-[1px] rounded-md text-[10px] font-extrabold leading-none transition ${
        clickable
          ? isDarkMode
            ? "bg-cyan-900/60 text-cyan-200 hover:bg-cyan-800 hover:text-cyan-100 hover:scale-110 cursor-pointer"
            : "bg-blue-100 text-blue-700 hover:bg-blue-500 hover:text-white hover:scale-110 hover:shadow-md cursor-pointer border border-blue-200"
          : isDarkMode
            ? "bg-slate-700 text-slate-400"
            : "bg-slate-100 text-slate-500 border border-slate-200"
      }`}
    >
      {num}
    </button>
  );
}

function renderWithCitations(children, sources, isDarkMode, onJumpToPage) {
  if (children == null) return children;

  if (Array.isArray(children)) {
    return children.map((c, i) => (
      <span key={i}>{renderWithCitations(c, sources, isDarkMode, onJumpToPage)}</span>
    ));
  }

  if (typeof children !== "string") {
    // React element — preserve, recurse into props.children if exists
    return children;
  }

  // Pattern: [1], [1, 2], [1][2], [10] etc.
  // Match toàn bộ block [...] thì split thành các số
  const regex = /\[([\d,\s]+)\](?:\[([\d,\s]+)\])*/g;
  const parts = [];
  let lastIdx = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(children)) !== null) {
    // Plain text trước match
    if (match.index > lastIdx) {
      parts.push(children.slice(lastIdx, match.index));
    }

    // Parse full matched block, có thể là "[1, 2][3]" → numbers = [1, 2, 3]
    const fullMatch = match[0];
    const numbers = fullMatch.match(/\d+/g)?.map(Number) || [];

    numbers.forEach((num) => {
      const source = sources[num - 1]; // 1-indexed → 0-indexed
      parts.push(
        <CitationBadge
          key={`cite-${key++}`}
          num={num}
          source={source}
          isDarkMode={isDarkMode}
          onJumpToPage={onJumpToPage}
        />
      );
    });

    lastIdx = match.index + fullMatch.length;
  }

  // Tail text
  if (lastIdx < children.length) {
    parts.push(children.slice(lastIdx));
  }

  return parts.length > 0 ? parts : children;
}

// Markdown renderers — compact + theme-aware. Mỗi text-bearing element wrap
// trong renderWithCitations để inline [N] hiển thị thành citation badges.
// li/p: nếu có citation → toàn bộ dòng clickable → jump PDF page.
const makeMarkdownComponents = (isDarkMode, sources, onJumpToPage) => {
  const cite = (children) => renderWithCitations(children, sources, isDarkMode, onJumpToPage);

  // Helper: render block (li/p) với hỗ trợ click toàn dòng nếu có citation
  const renderClickableBlock = (children, BlockTag, baseClass) => {
    const nums = extractCitationNumbers(children);
    const target = pickJumpTarget(nums, sources);
    const clickable = Boolean(target && onJumpToPage);

    const handleClick = clickable
      ? (e) => {
          // Đừng trigger nếu user đang click vào badge nhỏ (badge có handler riêng)
          if (e.target.closest("button[data-citation-badge]")) return;
          onJumpToPage(target.page);
        }
      : undefined;

    return (
      <BlockTag
        onClick={handleClick}
        className={`${baseClass} ${
          clickable
            ? `cursor-pointer rounded-md -mx-1.5 px-1.5 py-0.5 transition group/cite ${
                isDarkMode
                  ? "hover:bg-cyan-900/30 hover:ring-1 hover:ring-cyan-700"
                  : "hover:bg-blue-50 hover:ring-1 hover:ring-blue-200"
              }`
            : ""
        }`}
        title={clickable ? `Click để mở trang ${target.page} trong PDF` : undefined}
      >
        {cite(children)}
        {clickable && (
          <span
            className={`inline-flex items-center gap-0.5 ml-1 text-[10px] font-extrabold opacity-0 group-hover/cite:opacity-100 transition ${
              isDarkMode ? "text-cyan-400" : "text-blue-600"
            }`}
            aria-hidden
          >
            →trang {target.page}
          </span>
        )}
      </BlockTag>
    );
  };

  return {
    p: ({ children }) => renderClickableBlock(
      children,
      "p",
      "text-xs leading-relaxed mb-2 last:mb-0",
    ),
    strong: ({ children }) => (
      <strong className={`font-extrabold ${isDarkMode ? "text-cyan-300" : "text-blue-700"}`}>
        {cite(children)}
      </strong>
    ),
    em: ({ children }) => <em className="italic">{cite(children)}</em>,
    ul: ({ children }) => (
      <ul className="text-xs space-y-1 my-2 ml-1 list-none">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="text-xs space-y-1 my-2 ml-4 list-decimal">{children}</ol>
    ),
    li: ({ children }) => {
      const nums = extractCitationNumbers(children);
      const target = pickJumpTarget(nums, sources);
      const clickable = Boolean(target && onJumpToPage);

      return (
        <li
          onClick={clickable
            ? (e) => {
                if (e.target.closest("button[data-citation-badge]")) return;
                onJumpToPage(target.page);
              }
            : undefined}
          className={`leading-relaxed flex gap-2 items-start transition ${
            clickable
              ? `cursor-pointer rounded-md -mx-1.5 px-1.5 py-1 group/cite ${
                  isDarkMode
                    ? "hover:bg-cyan-900/30 hover:ring-1 hover:ring-cyan-700"
                    : "hover:bg-blue-50 hover:ring-1 hover:ring-blue-200"
                }`
              : ""
          }`}
          title={clickable ? `Click để mở trang ${target.page} trong PDF` : undefined}
        >
          <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${
            isDarkMode ? "bg-cyan-400" : "bg-blue-500"
          }`} />
          <span className="flex-1">{cite(children)}</span>
          {clickable && (
            <span
              className={`inline-flex items-center text-[10px] font-extrabold opacity-0 group-hover/cite:opacity-100 transition shrink-0 ${
                isDarkMode ? "text-cyan-400" : "text-blue-600"
              }`}
              aria-hidden
            >
              →trang {target.page}
            </span>
          )}
        </li>
      );
    },
    code: ({ children }) => (
      <code className={`px-1 py-0.5 rounded text-[11px] font-mono ${
        isDarkMode ? "bg-slate-700 text-amber-200" : "bg-slate-100 text-rose-600"
      }`}>{children}</code>
    ),
    h1: ({ children }) => (
      <h3 className={`text-sm font-extrabold mt-2 mb-1 ${
        isDarkMode ? "text-slate-100" : "text-slate-900"
      }`}>{cite(children)}</h3>
    ),
    h2: ({ children }) => (
      <h4 className={`text-[13px] font-extrabold mt-2 mb-1 ${
        isDarkMode ? "text-slate-100" : "text-slate-900"
      }`}>{cite(children)}</h4>
    ),
    h3: ({ children }) => (
      <h5 className={`text-xs font-bold mt-1.5 mb-0.5 ${
        isDarkMode ? "text-slate-200" : "text-slate-800"
      }`}>{cite(children)}</h5>
    ),
    blockquote: ({ children }) => (
      <blockquote className={`border-l-2 pl-2 my-1 italic text-[11px] ${
        isDarkMode ? "border-cyan-500 text-slate-300" : "border-blue-400 text-slate-600"
      }`}>{cite(children)}</blockquote>
    ),
  };
};

function MessageBubble({ message, isDarkMode, onJumpToPage }) {
  if (message.role === "system") {
    return (
      <div className={`text-center text-[11px] italic px-3 ${
        isDarkMode ? "text-slate-500" : "text-slate-400"
      }`}>
        {message.content}
      </div>
    );
  }

  const isUser = message.role === "user";

  // Tách sources có page (clickable cho đối soát) khỏi sources không có page.
  // Sources không page = chunk metadata bị thiếu, không có ý nghĩa với user → hide details.
  const clickableSources = (message.sources || []).filter((s) => {
    const page = s.page || s.page_start || s.metadata?.page_start;
    return Boolean(page);
  });
  const hiddenSourceCount = (message.sources?.length || 0) - clickableSources.length;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[92%] px-3 py-2 rounded-2xl ${
        isUser
          ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm shadow-[0_4px_12px_-4px_rgba(37,99,235,0.45)]"
          : message.error
            ? isDarkMode ? "bg-rose-950/40 text-rose-200 border border-rose-900" : "bg-rose-50 text-rose-700 border border-rose-200"
            : isDarkMode ? "bg-slate-800 text-slate-100 rounded-bl-sm" : "bg-white text-slate-800 rounded-bl-sm border border-blue-100 shadow-sm"
      }`}>
        {/* User message = plain text. AI/error = markdown + inline citations [N]. */}
        {isUser || message.error ? (
          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={makeMarkdownComponents(
                isDarkMode,
                message.sources || [],
                onJumpToPage,
              )}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Footer: chỉ hiển thị sources có page (đối soát được). Sources không page → gộp số. */}
        {(clickableSources.length > 0 || hiddenSourceCount > 0) && !isUser && (
          <div className={`mt-2.5 pt-2 border-t ${
            isDarkMode ? "border-slate-700" : "border-slate-200"
          }`}>
            {clickableSources.length > 0 && (
              <>
                <div className={`text-[9.5px] font-extrabold uppercase tracking-wider mb-1.5 ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}>
                  📍 Mở trang trong PDF để đối soát
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {clickableSources.map((s, i) => {
                    const page = s.page || s.page_start || s.metadata?.page_start;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onJumpToPage?.(page)}
                        title={`Mở trang ${page} trong PDF`}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                          isDarkMode
                            ? "bg-slate-700 text-cyan-200 hover:bg-slate-600 hover:text-cyan-100"
                            : "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:shadow-sm border border-blue-200"
                        }`}
                      >
                        <FileText size={9} />
                        Trang {page}
                        <span className={`text-[9px] font-extrabold ${
                          isDarkMode ? "text-cyan-400" : "text-blue-500"
                        }`}>→</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {hiddenSourceCount > 0 && (
              <p className={`text-[9.5px] italic ${
                isDarkMode ? "text-slate-500" : "text-slate-400"
              }`}>
                Tham khảo từ {hiddenSourceCount} đoạn khác trong tài liệu
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AskAIPanel({
  materialId,
  materialTitle = "tài liệu này",
  workspaceId,
  currentPage = 0,
  isDarkMode = false,
  onJumpToPage,
}) {
  const [messages, setMessages] = useState([
    {
      role: "system",
      content: workspaceId
        ? "Hỏi AI bất kỳ điều gì về tài liệu này. AI trả lời kèm nguồn → click để mở trang tương ứng trên PDF."
        : "Thiếu workspaceId — không thể gọi API. Vui lòng tải lại trang.",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const askMutation = useMutation({
    mutationFn: (question) => askMaterial({ question, workspaceId, materialId }),
    onSuccess: (response) => {
      // BE forward Python /rag/ask: { question, answer, chunks_used, sources, chunk_contexts }
      const raw = response?.data ?? response;
      let answer = "";
      let sources = [];

      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          answer = parsed?.answer || raw;
          sources = parsed?.sources || parsed?.chunk_contexts || [];
        } catch {
          answer = raw;
        }
      } else if (raw && typeof raw === "object") {
        answer = raw.answer || raw.message || "(AI không trả về nội dung)";
        // Chunk_contexts có metadata.page_start, dùng để jump PDF.
        // Sources cấp cao hơn — material-level. Prefer chunk_contexts cho click.
        sources = raw.chunk_contexts?.length > 0
          ? raw.chunk_contexts.map((c) => ({
              chunk_id: c.chunk_id,
              text: c.text,
              page: c.metadata?.page_start || c.page_start,
              title: c.metadata?.document_title || c.metadata?.filename,
              score: c.score,
            }))
          : (raw.sources || []);
      } else {
        answer = "(AI không trả về nội dung)";
      }

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: answer,
        sources,
      }]);
    },
    onError: (error) => {
      const errMsg = error?.response?.data?.message
        || error?.response?.data
        || error?.message
        || "Có lỗi xảy ra khi gọi AI";
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg),
        error: true,
      }]);
    },
  });

  // Auto-scroll khi có message mới
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, askMutation.isPending]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = (questionOverride) => {
    const q = (questionOverride || input).trim();
    if (!q || askMutation.isPending || !workspaceId) return;
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    if (!questionOverride) setInput("");
    askMutation.mutate(q);
  };

  const handleClear = () => {
    setMessages([{
      role: "system",
      content: "Đã xoá lịch sử. Hỏi AI bất kỳ điều gì về tài liệu này.",
    }]);
  };

  const suggestedQuestions = currentPage > 0
    ? [
        `Tóm tắt nội dung trang ${currentPage}`,
        `Giải thích khái niệm chính trang ${currentPage}`,
        "Tạo 3 câu hỏi trắc nghiệm từ phần này",
      ]
    : [
        "Tóm tắt tài liệu này",
        "Các chương quan trọng nhất là gì?",
        "Tạo dàn ý ôn tập",
      ];

  // Hiển thị suggestion chỉ khi chưa có user message
  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const showSuggestions = userMessageCount === 0 && !askMutation.isPending;

  return (
    <div className={`flex flex-col h-full w-full ${
      isDarkMode ? "bg-slate-900" : ""
    }`}>
      {/* Context card — gọn, padding lớn cho dễ đọc */}
      <div className="px-4 pb-2">
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${
          isDarkMode
            ? "bg-slate-800/60 border border-slate-800"
            : "bg-white/70 backdrop-blur border border-blue-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-blue-100 to-cyan-100 shrink-0">
            <FileText size={11} className="text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-[11px] font-bold truncate ${
              isDarkMode ? "text-slate-200" : "text-slate-700"
            }`}>
              {materialTitle}
            </div>
            {currentPage > 0 && (
              <div className={`text-[9.5px] font-bold mt-0.5 ${
                isDarkMode ? "text-cyan-400" : "text-blue-600"
              }`}>
                📍 Đang ở trang {currentPage}
              </div>
            )}
          </div>
          {userMessageCount > 0 && (
            <button
              type="button"
              onClick={handleClear}
              title="Xoá lịch sử chat"
              className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition shrink-0 ${
                isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-rose-300" : "text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              }`}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Messages list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            message={msg}
            isDarkMode={isDarkMode}
            onJumpToPage={onJumpToPage}
          />
        ))}

        {askMutation.isPending && (
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl rounded-bl-sm ${
            isDarkMode ? "bg-slate-800 text-slate-300" : "bg-white text-blue-700 border border-blue-100"
          }`}>
            <Loader2 size={13} className="animate-spin" />
            <span className="text-xs font-bold">AI đang tìm câu trả lời…</span>
            <span className="flex gap-0.5 ml-0.5">
              <span className="w-1 h-1 rounded-full bg-current opacity-50 animate-pulse" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 rounded-full bg-current opacity-50 animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 rounded-full bg-current opacity-50 animate-pulse" style={{ animationDelay: "300ms" }} />
            </span>
          </div>
        )}

        {showSuggestions && (
          <div className="space-y-1.5 pt-1">
            <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-1 ${
              isDarkMode ? "text-slate-500" : "text-slate-500"
            }`}>
              💡 Gợi ý
            </p>
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(q)}
                className={`block w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition ${
                  isDarkMode
                    ? "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-blue-300 border border-slate-800"
                    : "bg-white/70 text-blue-700 hover:bg-white border border-blue-100 hover:border-blue-300 hover:shadow-sm"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`p-3 border-t shrink-0 ${
        isDarkMode ? "border-slate-800 bg-slate-900" : "border-blue-100 bg-white"
      }`}>
        <div className={`flex gap-2 items-end p-2 rounded-xl transition focus-within:ring-2 ${
          isDarkMode
            ? "bg-slate-800 focus-within:ring-blue-500/50"
            : "bg-slate-100 focus-within:ring-blue-400/50 focus-within:bg-white"
        }`}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={workspaceId ? "Hỏi về nội dung tài liệu…" : "Thiếu workspaceId"}
            rows={1}
            disabled={askMutation.isPending || !workspaceId}
            className={`flex-1 bg-transparent outline-none resize-none text-xs font-medium leading-relaxed max-h-32 ${
              isDarkMode
                ? "text-slate-100 placeholder:text-slate-500"
                : "text-slate-900 placeholder:text-slate-400"
            } disabled:opacity-50`}
            style={{ minHeight: "20px" }}
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || askMutation.isPending || !workspaceId}
            title="Gửi (Enter)"
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition hover:from-blue-500 hover:to-blue-600 hover:-translate-y-0.5 shrink-0"
          >
            {askMutation.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <Send size={14} />}
          </button>
        </div>
        <p className={`text-[9.5px] mt-1.5 px-1 ${
          isDarkMode ? "text-slate-600" : "text-slate-400"
        }`}>
          Enter để gửi · Shift+Enter xuống dòng · Click source pill để mở PDF
        </p>
      </div>
    </div>
  );
}
