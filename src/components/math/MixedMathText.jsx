import React, { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { tryHeuristicKatexHtml } from "./heuristicMath";

/**
 * Tách chuỗi thành đoạn text và LaTeX theo delimiter chuẩn:
 * - Inline: \( ... \)
 * - Block:  \[ ... \]
 * Nội dung không có delimiter được render như text thường (React escape).
 */
function parseMixedMath(input) {
  const str = input == null ? "" : String(input);
  if (!str) return [{ type: "text", value: "" }];

  const re = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  const parts = [];
  let last = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", value: str.slice(last, m.index) });
    }
    const isBlock = m[1] !== undefined;
    const latex = (isBlock ? m[1] : m[2]).trim();
    parts.push({ type: "math", latex, displayMode: isBlock });
    last = m.index + m[0].length;
  }
  if (last < str.length) {
    parts.push({ type: "text", value: str.slice(last) });
  }
  return parts.length ? parts : [{ type: "text", value: str }];
}

function renderKaTeXHtml(latex, displayMode) {
  if (!latex) return "";
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      strict: "ignore",
      displayMode: Boolean(displayMode),
    });
  } catch {
    return latex;
  }
}

/**
 * @param {object} props
 * @param {React.ReactNode} props.children - Chuỗi hiển thị (có thể chứa \(latex\) hoặc \[latex\])
 * @param {string} [props.className]
 * @param {keyof JSX.IntrinsicElements | React.ElementType} [props.as] - Thẻ bọc (mặc định span)
 */
function MixedMathText({ children, className, as: Component = "span", ...rest }) {
  const text = children == null ? "" : String(children);
  const parts = useMemo(() => parseMixedMath(text), [text]);

  return (
    <Component className={className} {...rest}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          const heuristicHtml = tryHeuristicKatexHtml(part.value);
          if (heuristicHtml) {
            return (
              <span
                key={i}
                className="whitespace-pre-wrap inline [&_.katex]:text-inherit"
                dangerouslySetInnerHTML={{ __html: heuristicHtml }}
              />
            );
          }
          return (
            <span key={i} className="whitespace-pre-wrap">
              {part.value}
            </span>
          );
        }
        return (
          <span
            key={i}
            className={part.displayMode ? "block my-1 [&_.katex]:text-inherit" : "inline [&_.katex]:text-inherit"}
            dangerouslySetInnerHTML={{ __html: renderKaTeXHtml(part.latex, part.displayMode) }}
          />
        );
      })}
    </Component>
  );
}

export default MixedMathText;
export { parseMixedMath, renderKaTeXHtml };
