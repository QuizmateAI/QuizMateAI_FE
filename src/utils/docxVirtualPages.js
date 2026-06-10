const DEFAULT_PAGE_HEIGHT_PX = 1056;
const PAGE_GAP_PX = 24;

function cloneNodeShallow(node) {
  return node.cloneNode(true);
}

function appendClonedBlock(targetPage, node) {
  if (!targetPage || !node) return;
  targetPage.appendChild(cloneNodeShallow(node));
}

function estimateBlockHeight(node) {
  if (!node) return 24;
  const rect = node.getBoundingClientRect?.();
  if (rect && rect.height > 4) return rect.height;

  const tag = String(node.tagName || "").toLowerCase();
  if (tag === "h1") return 52;
  if (tag === "h2") return 44;
  if (tag === "h3") return 38;
  if (tag === "table") return 180;
  if (tag === "ul" || tag === "ol") {
    const items = node.querySelectorAll("li").length || 1;
    return Math.max(48, items * 24);
  }

  const textLength = String(node.textContent || "").trim().length;
  if (!textLength) return 20;
  return Math.max(28, Math.ceil(textLength / 88) * 22);
}

/**
 * When docx-preview renders the whole document as one section, split visible
 * blocks into page-sized containers so navigation matches reader expectations.
 */
export function splitSectionIntoVirtualPages(section, pageHeightPx = DEFAULT_PAGE_HEIGHT_PX) {
  if (!section) return [];

  const blocks = Array.from(section.children).filter((child) => child.nodeType === Node.ELEMENT_NODE);
  if (blocks.length === 0) {
    return [section];
  }

  const pages = [];
  let currentPage = document.createElement("section");
  currentPage.className = section.className || "docx docx-virtual-page";
  currentPage.style.cssText = section.style.cssText || "";
  let usedHeight = 0;

  const pushPage = () => {
    if (currentPage.childNodes.length === 0) return;
    pages.push(currentPage);
    currentPage = document.createElement("section");
    currentPage.className = section.className || "docx docx-virtual-page";
    currentPage.style.cssText = section.style.cssText || "";
    usedHeight = 0;
  };

  blocks.forEach((block) => {
    const blockHeight = estimateBlockHeight(block);
    if (usedHeight > 0 && usedHeight + blockHeight > pageHeightPx) {
      pushPage();
    }
    appendClonedBlock(currentPage, block);
    usedHeight += blockHeight + 8;
  });

  if (currentPage.childNodes.length > 0) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [section];
}

export function mountVirtualPages(wrapper, pages) {
  if (!wrapper || !Array.isArray(pages) || pages.length === 0) return;
  wrapper.innerHTML = "";
  pages.forEach((page, index) => {
    page.dataset.docxPage = String(index + 1);
    wrapper.appendChild(page);
  });
}

export function collectDocxPageElements(root) {
  if (!root) return [];

  const sections = Array.from(root.querySelectorAll("section.docx"));
  if (sections.length > 1) {
    return sections;
  }

  const singleSection = sections[0] || root.querySelector(".docx-wrapper") || root;
  if (!singleSection) return [];

  const virtualPages = splitSectionIntoVirtualPages(singleSection);
  const wrapper = singleSection.closest(".docx-wrapper") || singleSection.parentElement;
  if (wrapper && virtualPages.length > 1) {
    mountVirtualPages(wrapper, virtualPages);
    return Array.from(wrapper.querySelectorAll("section.docx, section.docx-virtual-page"));
  }

  return sections.length > 0 ? sections : [singleSection];
}

export const DOCX_PAGE_GAP_PX = PAGE_GAP_PX;
