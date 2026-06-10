const IFRAME_BASE_STYLES = `
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: auto;
    background: #dbe4f0;
    color: #111827;
    font-family: "Times New Roman", Times, serif;
  }
  body {
    padding: 24px 0 48px;
    min-height: 100%;
  }
  .docx-stage {
    margin: 0 auto;
    width: fit-content;
    max-width: 100%;
  }
  .docx-wrapper {
    margin: 0 auto !important;
    background: transparent !important;
    padding: 0 !important;
  }
  .docx-wrapper > section.docx,
  .docx-wrapper > section.docx-virtual-page {
    display: block;
    margin: 0 auto 24px !important;
    background: #ffffff !important;
    box-shadow: 0 12px 32px -20px rgba(15, 23, 42, 0.55);
    box-sizing: border-box;
    overflow: hidden;
  }
  .docx-wrapper > section.docx:last-child,
  .docx-wrapper > section.docx-virtual-page:last-child {
    margin-bottom: 0 !important;
  }
  .docx-wrapper p,
  .docx-wrapper span,
  .docx-wrapper li,
  .docx-wrapper td,
  .docx-wrapper th {
    line-height: inherit;
  }
  mark.docx-source-highlight {
    border-radius: 0.2rem;
    background: rgba(251, 191, 36, 0.78);
    color: #111827;
    padding: 0 0.1rem;
  }
`;

export async function renderDocxInIframe(iframe, arrayBuffer, options = {}) {
  const doc = iframe.contentDocument;
  if (!doc) {
    throw new Error("Iframe document is not available");
  }

  doc.open();
  doc.write("<!DOCTYPE html><html><head></head><body></body></html>");
  doc.close();

  const styleTag = doc.createElement("style");
  styleTag.textContent = IFRAME_BASE_STYLES;
  doc.head.appendChild(styleTag);

  const stage = doc.createElement("div");
  stage.className = "docx-stage";
  const styleContainer = doc.createElement("div");
  const bodyContainer = doc.createElement("div");
  stage.appendChild(styleContainer);
  stage.appendChild(bodyContainer);
  doc.body.appendChild(stage);

  const { renderAsync } = await import("docx-preview");
  await renderAsync(arrayBuffer, bodyContainer, styleContainer, {
    className: "docx",
    inWrapper: true,
    ignoreWidth: false,
    ignoreHeight: false,
    ignoreFonts: false,
    breakPages: true,
    ignoreLastRenderedPageBreak: false,
    experimental: true,
    useBase64URL: true,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    renderEndnotes: true,
    ...options,
  });

  return {
    document: doc,
    bodyContainer,
    styleContainer,
  };
}

export function buildOfficeViewerUrl(fileUrl) {
  const encoded = encodeURIComponent(String(fileUrl || "").trim());
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`;
}
