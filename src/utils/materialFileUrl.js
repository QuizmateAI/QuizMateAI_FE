function collectMaterialUrlCandidates(source) {
  if (!source) return [];
  return [
    source.storageURL,
    source.storageUrl,
    source.storage_url,
    source.fileURL,
    source.fileUrl,
    source.file_url,
    source.materialUrl,
    source.material_url,
    source.downloadURL,
    source.downloadUrl,
    source.download_url,
    source.r2Url,
    source.r2_url,
    source.url,
    source.link,
    source.contentURL,
    source.contentUrl,
    source.content_url,
  ].filter((value) => typeof value === "string" && /^https?:\/\//.test(value));
}

export function pickMaterialFileUrl(source) {
  const candidates = collectMaterialUrlCandidates(source);
  return candidates[0] || null;
}

export function pickPdfUrl(source) {
  const candidates = collectMaterialUrlCandidates(source);
  return candidates.find((url) => url.toLowerCase().includes(".pdf")) || candidates[0] || null;
}

export function isWordDocxMaterial(source) {
  if (!source) return false;
  const type = String(
    source.type || source.materialType || source.contentType || "",
  ).toLowerCase();
  const name = String(
    source.name || source.title || source.originalFileName || "",
  ).toLowerCase();
  const combined = `${type} ${name}`;
  if (combined.includes("wordprocessingml") || /\.docx(\?|$)/.test(combined)) {
    return true;
  }
  return type.includes("msword") && /\.docx(\?|$)/.test(name);
}

export function pickDocxPreviewUrl(source) {
  if (!isWordDocxMaterial(source)) return null;
  const candidates = collectMaterialUrlCandidates(source);
  const docxUrl = candidates.find((url) => /\.docx(\?|$)/i.test(url));
  if (docxUrl) return docxUrl;
  const type = String(
    source.type || source.materialType || source.contentType || "",
  ).toLowerCase();
  if (type.includes("wordprocessingml") && candidates[0]) {
    return candidates[0];
  }
  return null;
}
