import React from 'react';

// Lightweight, XSS-safe markdown renderer tailored for QuizMateAI policy documents.
// Supports: headings (#/##/###), paragraphs, bullet lists, numbered lists,
// bold (**), italic (*), inline code (`), tables (| ... |), block quotes (>),
// horizontal rule (---), and links ([text](url) — URL is hard-restricted to http(s)/mailto).
// HTML is always escaped before rendering — no dangerouslySetInnerHTML.

const HEADING_RE = /^(#{1,3})\s+(.+)$/;
const HR_RE = /^-{3,}$/;
const TABLE_ROW_RE = /^\|(.+)\|$/;
const NUMBERED_RE = /^\s*\d+\.\s+/;
const BULLET_RE = /^\s*[-*]\s+/;
const QUOTE_RE = /^>\s?/;
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;
const ITALIC_RE = /(?<!\*)\*([^*\n]+)\*(?!\*)/g;
const CODE_RE = /`([^`]+)`/g;

export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

export function extractHeadings(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const headings = [];
  for (const line of lines) {
    const match = HEADING_RE.exec(line.trim());
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].trim();
    headings.push({ level, text, id: slugify(text) });
  }
  return headings;
}

function escape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isSafeUrl(url) {
  if (!url) return false;
  if (url.startsWith('#')) return true;
  if (url.startsWith('/')) return true;
  return /^(https?:|mailto:)/i.test(url);
}

// Render inline tokens: produce array of React nodes from a plain text line.
function renderInline(text) {
  const escaped = escape(text);
  const tokens = [];
  let cursor = 0;
  const consumed = [];

  function consume(re, render) {
    while (true) {
      const match = re.exec(escaped);
      if (!match) break;
      const captured = match;
      consumed.push({
        start: captured.index,
        end: captured.index + captured[0].length,
        render: () => render(captured),
      });
    }
    re.lastIndex = 0;
  }

  consume(new RegExp(LINK_RE.source, 'g'), (m) => {
    const label = m[1];
    const url = m[2];
    if (!isSafeUrl(url)) return label;
    const isExternal = /^https?:/i.test(url);
    return (
      <a
        key={`a-${m.index}`}
        href={url}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {label}
      </a>
    );
  });
  consume(new RegExp(BOLD_RE.source, 'g'), (m) => (
    <strong key={`b-${m.index}`} className="font-semibold">{m[1]}</strong>
  ));
  consume(new RegExp(CODE_RE.source, 'g'), (m) => (
    <code key={`c-${m.index}`} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-300 text-[0.9em]">
      {m[1]}
    </code>
  ));
  consume(new RegExp(ITALIC_RE.source, 'g'), (m) => (
    <em key={`i-${m.index}`} className="italic">{m[1]}</em>
  ));

  consumed.sort((a, b) => a.start - b.start);
  const filtered = [];
  let lastEnd = 0;
  for (const t of consumed) {
    if (t.start < lastEnd) continue;
    filtered.push(t);
    lastEnd = t.end;
  }

  filtered.forEach((t) => {
    if (t.start > cursor) {
      tokens.push(escaped.slice(cursor, t.start));
    }
    tokens.push(t.render());
    cursor = t.end;
  });
  if (cursor < escaped.length) {
    tokens.push(escaped.slice(cursor));
  }
  return tokens;
}

function parseTableRow(line) {
  const inner = line.trim().replace(/^\||\|$/g, '');
  return inner.split('|').map((cell) => cell.trim());
}

function isTableSeparator(line) {
  if (!TABLE_ROW_RE.test(line.trim())) return false;
  const cells = parseTableRow(line);
  return cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function flushList(items, ordered, blocks, key) {
  if (items.length === 0) return;
  const Tag = ordered ? 'ol' : 'ul';
  const listClass = ordered
    ? 'list-decimal pl-6 space-y-1.5 my-3 marker:text-slate-400'
    : 'list-disc pl-6 space-y-1.5 my-3 marker:text-slate-400';
  blocks.push(
    <Tag key={`l-${key}`} className={listClass}>
      {items.map((it, idx) => (
        <li key={idx} className="leading-relaxed">{renderInline(it)}</li>
      ))}
    </Tag>
  );
  items.length = 0;
}

function flushParagraph(buffer, blocks, key) {
  if (buffer.length === 0) return;
  const text = buffer.join(' ').trim();
  if (text) {
    blocks.push(
      <p key={`p-${key}`} className="text-slate-700 dark:text-slate-300 leading-relaxed my-3">
        {renderInline(text)}
      </p>
    );
  }
  buffer.length = 0;
}

function flushQuote(items, blocks, key) {
  if (items.length === 0) return;
  blocks.push(
    <blockquote
      key={`q-${key}`}
      className="border-l-4 border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 px-4 py-3 my-4 text-slate-700 dark:text-slate-300 italic rounded-r"
    >
      {items.map((it, idx) => (
        <p key={idx} className="leading-relaxed">{renderInline(it)}</p>
      ))}
    </blockquote>
  );
  items.length = 0;
}

function flushTable(headerCells, rows, blocks, key) {
  if (!headerCells || rows.length === 0) return;
  blocks.push(
    <div key={`t-${key}`} className="my-5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/60">
          <tr>
            {headerCells.map((c, i) => (
              <th key={i} className="px-4 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                {renderInline(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-slate-100 dark:border-slate-800">
              {row.map((c, ci) => (
                <td key={ci} className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                  {renderInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PolicyMarkdown({ content }) {
  const lines = String(content || '').split(/\r?\n/);
  const blocks = [];
  const paragraphBuf = [];
  const bulletItems = [];
  const numberItems = [];
  const quoteItems = [];

  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw;
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph(paragraphBuf, blocks, key++);
      flushList(bulletItems, false, blocks, key++);
      flushList(numberItems, true, blocks, key++);
      flushQuote(quoteItems, blocks, key++);
      continue;
    }

    if (HR_RE.test(trimmed)) {
      flushParagraph(paragraphBuf, blocks, key++);
      flushList(bulletItems, false, blocks, key++);
      flushList(numberItems, true, blocks, key++);
      blocks.push(<hr key={`hr-${key++}`} className="my-6 border-slate-200 dark:border-slate-700" />);
      continue;
    }

    const headingMatch = HEADING_RE.exec(trimmed);
    if (headingMatch) {
      flushParagraph(paragraphBuf, blocks, key++);
      flushList(bulletItems, false, blocks, key++);
      flushList(numberItems, true, blocks, key++);
      flushQuote(quoteItems, blocks, key++);
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = slugify(text);
      const sharedAnchor = (
        <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 ml-2 text-slate-400 transition-opacity">#</a>
      );
      if (level === 1) {
        blocks.push(
          <h1 key={`h-${key++}`} id={id} className="group scroll-mt-24 text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 mt-8 mb-4 tracking-tight">
            {renderInline(text)}{sharedAnchor}
          </h1>
        );
      } else if (level === 2) {
        blocks.push(
          <h2 key={`h-${key++}`} id={id} className="group scroll-mt-24 text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-50 mt-8 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
            {renderInline(text)}{sharedAnchor}
          </h2>
        );
      } else {
        blocks.push(
          <h3 key={`h-${key++}`} id={id} className="group scroll-mt-24 text-lg font-semibold text-slate-800 dark:text-slate-100 mt-6 mb-2">
            {renderInline(text)}{sharedAnchor}
          </h3>
        );
      }
      continue;
    }

    // Table detection: header row + separator row
    if (TABLE_ROW_RE.test(trimmed) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushParagraph(paragraphBuf, blocks, key++);
      flushList(bulletItems, false, blocks, key++);
      flushList(numberItems, true, blocks, key++);
      flushQuote(quoteItems, blocks, key++);
      const header = parseTableRow(trimmed);
      i += 2;
      const rows = [];
      while (i < lines.length && TABLE_ROW_RE.test(lines[i].trim())) {
        rows.push(parseTableRow(lines[i].trim()));
        i++;
      }
      i--;
      flushTable(header, rows, blocks, key++);
      continue;
    }

    if (BULLET_RE.test(line)) {
      flushParagraph(paragraphBuf, blocks, key++);
      flushList(numberItems, true, blocks, key++);
      flushQuote(quoteItems, blocks, key++);
      bulletItems.push(line.replace(BULLET_RE, ''));
      continue;
    }
    if (NUMBERED_RE.test(line)) {
      flushParagraph(paragraphBuf, blocks, key++);
      flushList(bulletItems, false, blocks, key++);
      flushQuote(quoteItems, blocks, key++);
      numberItems.push(line.replace(NUMBERED_RE, ''));
      continue;
    }
    if (QUOTE_RE.test(trimmed)) {
      flushParagraph(paragraphBuf, blocks, key++);
      flushList(bulletItems, false, blocks, key++);
      flushList(numberItems, true, blocks, key++);
      quoteItems.push(trimmed.replace(QUOTE_RE, ''));
      continue;
    }

    paragraphBuf.push(trimmed);
  }

  flushParagraph(paragraphBuf, blocks, key++);
  flushList(bulletItems, false, blocks, key++);
  flushList(numberItems, true, blocks, key++);
  flushQuote(quoteItems, blocks, key++);

  return <div className="policy-markdown">{blocks}</div>;
}

export default PolicyMarkdown;
