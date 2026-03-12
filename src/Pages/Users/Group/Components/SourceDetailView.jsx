import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, FileText, Image, Film, Link2, Sparkles, ChevronDown, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getExtractedText, getExtractedSummary, getModerationReportDetail, reviewMaterial } from "@/api/MaterialAPI";

const IMAGE_MARKDOWN_REGEX = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
const IMAGE_URL_REGEX = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;

function isImageUrl(url, allowAnyHttp = false) {
  if (typeof url !== "string") return false;
  if (!/^https?:\/\//i.test(url)) return false;
  return allowAnyHttp || IMAGE_URL_REGEX.test(url);
}

function collectCandidateImageUrls(value, collector, allowAnyHttp = false) {
  if (!value) return;

  if (typeof value === "string") {
    if (isImageUrl(value, allowAnyHttp)) {
      collector.add(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectCandidateImageUrls(item, collector, allowAnyHttp));
    return;
  }

  if (typeof value === "object") {
    Object.values(value).forEach((item) => collectCandidateImageUrls(item, collector, allowAnyHttp));
  }
}

function getSourceImageUrls(source, contentBlocks) {
  if (!source) return [];

  const discoveredUrls = new Set();

  const allowAnyHttp = source.type?.toLowerCase().includes("image") || false;
  const prioritizedFields = [
    source.imageUrl,
    source.thumbnail,
    source.thumbnailUrl,
    source.previewUrl,
    source.fileUrl,
    source.downloadUrl,
    source.materialUrl,
    source.contentUrl,
    source.url,
    source.link,
    source.path,
  ];

  prioritizedFields.forEach((value) => collectCandidateImageUrls(value, discoveredUrls, allowAnyHttp));
  collectCandidateImageUrls(source, discoveredUrls, allowAnyHttp);

  return [...discoveredUrls];
}

function sanitizeExtractedText(text) {
  if (!text) return "";
  return text
    .replace(/\[Phân tích ảnh[\s\S]*?\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildContentBlocks(text) {
  const sanitized = sanitizeExtractedText(text);
  if (!sanitized) return [];

  if (isImageUrl(sanitized)) {
    return [{
      type: "image",
      alt: "Hinh anh tai lieu",
      url: sanitized,
    }];
  }

  const blocks = [];
  let lastIndex = 0;
  let match;

  IMAGE_MARKDOWN_REGEX.lastIndex = 0;
  while ((match = IMAGE_MARKDOWN_REGEX.exec(sanitized)) !== null) {
    const before = sanitized.slice(lastIndex, match.index).trim();
    if (before) {
      blocks.push({ type: "text", value: before });
    }

    blocks.push({
      type: "image",
      alt: match[1] || "Hinh anh tai lieu",
      url: match[2],
    });

    lastIndex = IMAGE_MARKDOWN_REGEX.lastIndex;
  }

  const tail = sanitized.slice(lastIndex).trim();
  if (tail) {
    blocks.push({ type: "text", value: tail });
  }

  return blocks;
}

// Format MIME type thành tên file type ngắn gọn
function formatFileType(type) {
  if (!type) return "FILE";
  const lower = type.toLowerCase();
  if (lower.includes("pdf")) return "PDF";
  if (lower.includes("wordprocessingml") || lower.includes("msword")) return "DOCX";
  if (lower.includes("spreadsheetml") || lower.includes("excel")) return "XLSX";
  if (lower.includes("presentationml") || lower.includes("powerpoint")) return "PPTX";
  if (lower.includes("image")) return "IMAGE";
  if (lower.includes("video")) return "VIDEO";
  if (lower === "url") return "URL";
  return "FILE";
}

// Helper lấy icon theo loại tài liệu
function getDetailIcon(type, className = "w-5 h-5") {
  if (type?.toLowerCase().includes("pdf")) return <FileText className={`${className} text-red-500`} />;
  if (type?.toLowerCase().includes("doc")) return <FileText className={`${className} text-blue-600`} />;
  if (type?.toLowerCase().includes("image")) return <Image className={`${className} text-green-500`} />;
  if (type?.toLowerCase().includes("video")) return <Film className={`${className} text-purple-500`} />;
  if (type?.toLowerCase() === "url") return <Link2 className={`${className} text-blue-500`} />;
  return <FileText className={`${className} text-gray-500`} />;
}

// Trích xuất từ khóa chính từ summary text
function extractKeywords(text, maxKeywords = 5, maxLen = 18) {
  if (!text) return [];
  const sentences = text.split(/[.!?;\n]+/).filter(Boolean);
  const stopWords = new Set(["và", "của", "là", "để", "các", "cho", "với", "trong", "một", "có", "được", "từ", "này", "đó", "khi", "về", "theo", "the", "and", "of", "to", "in", "for", "a", "is", "that", "it", "on", "by"]);
  const freq = {};
  for (const s of sentences) {
    const words = s.trim().split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = words[i] + " " + words[i + 1];
      if (bigram.length <= maxLen && !stopWords.has(words[i].toLowerCase()) && !stopWords.has(words[i + 1].toLowerCase())) {
        freq[bigram] = (freq[bigram] || 0) + 1;
      }
    }
  }
  // Lấy các cụm từ phổ biến và in đậm nhất
  const boldPhrases = [...text.matchAll(/\*\*(.+?)\*\*/g)].map(m => m[1]).slice(0, maxKeywords);
  if (boldPhrases.length >= maxKeywords) return boldPhrases.map(p => p.length > maxLen ? p.slice(0, maxLen - 1) + "…" : p);

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const merged = [...new Set([...boldPhrases, ...sorted])].slice(0, maxKeywords);
  return merged.map(p => p.length > maxLen ? p.slice(0, maxLen - 1) + "…" : p);
}

function resolveModerationInfo(source, report) {
  if (!source || typeof source !== "object") return null;

  const status = String(source.status || source.final_status || "").toUpperCase();

  if (status === "REJECT" || status === "REJECTED") {
    return {
      type: "REJECT",
      reason: report?.reason || null,
      detectedTopic: report?.detected_topic || null,
    };
  }

  if (status === "WARN" || status === "WARNED") {
    return {
      type: "WARN",
      reason: report?.reason || null,
      suggestion: report?.suggestion || null,
      suitablePercent: report?.suitablePrecent ?? null,
      targetLevelRequired: report?.target_level_required || null,
      currentLevelDetected: report?.current_level_detected || null,
    };
  }

  return null;
}

function formatSuitablePercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}

function getModerationNodeFindings(report) {
  if (!report || typeof report !== "object") return [];

  const nodeLabels = {
    legal: "Pháp lý",
    intent: "Ý định",
    harmful: "Độc hại",
    accuracy: "Độ chính xác",
    community: "Cộng đồng",
  };

  return Object.entries(nodeLabels)
    .map(([key, label]) => {
      const node = report?.[key];
      const level = String(node?.level || "").toLowerCase();
      const reason = node?.reason || null;
      if (!reason || !level || level === "none") return null;
      return {
        key,
        label,
        level,
        reason,
      };
    })
    .filter(Boolean);
}

function mergeMaterialSource(previousSource, updatedMaterial) {
  if (!updatedMaterial) return previousSource;
  return {
    ...previousSource,
    ...updatedMaterial,
    id: updatedMaterial.materialId ?? previousSource?.id,
    name: updatedMaterial.title ?? previousSource?.name,
    type: updatedMaterial.materialType ?? previousSource?.type,
    status: updatedMaterial.status ?? previousSource?.status,
    uploadedAt: updatedMaterial.uploadedAt ?? previousSource?.uploadedAt,
  };
}

// Hiển thị chi tiết tài liệu inline trong khu vực học tập — giống NotebookLM
function SourceDetailView({ isDarkMode = false, source, onBack, onSourceUpdated }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [currentSource, setCurrentSource] = useState(source);

  const [extractedText, setExtractedText] = useState(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState(false);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [moderationReport, setModerationReport] = useState(null);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    setCurrentSource(source);
    setReviewError("");
    setReviewMessage("");
  }, [source]);

  const fetchContent = useCallback(async () => {
    if (!currentSource?.id) return;
    setTextLoading(true);
    setTextError(false);
    try {
      const res = await getExtractedText(currentSource.id);
      setExtractedText(typeof res === "string" ? res : res?.data ?? "");
    } catch {
      setTextError(true);
    } finally {
      setTextLoading(false);
    }
  }, [currentSource?.id]);

  const fetchSummary = useCallback(async () => {
    if (!currentSource?.id) return;
    setSummaryLoading(true);
    try {
      const res = await getExtractedSummary(currentSource.id);
      setSummary(typeof res === "string" ? res : res?.data ?? "");
    } catch {
      setSummary("");
    } finally {
      setSummaryLoading(false);
    }
  }, [currentSource?.id]);

  const fetchModerationReport = useCallback(async () => {
    const status = String(currentSource?.status || currentSource?.final_status || "").toUpperCase();
    if (!currentSource?.id || !["WARN", "WARNED", "REJECT", "REJECTED"].includes(status)) {
      setModerationReport(null);
      return;
    }

    setModerationLoading(true);
    try {
      const res = await getModerationReportDetail(currentSource.id);
      setModerationReport(res ?? null);
    } catch {
      setModerationReport(null);
    } finally {
      setModerationLoading(false);
    }
  }, [currentSource?.final_status, currentSource?.id, currentSource?.status]);

  const handleReview = useCallback(async (isApproved) => {
    if (!currentSource?.id || reviewLoading) return;

    setReviewLoading(true);
    setReviewError("");
    setReviewMessage("");
    try {
      const result = await reviewMaterial(currentSource.id, isApproved);
      const updatedSource = mergeMaterialSource(currentSource, result);
      setCurrentSource(updatedSource);
      onSourceUpdated?.(updatedSource);
      setReviewMessage(isApproved ? "Đã duyệt tài liệu này." : "Đã từ chối tài liệu này.");
    } catch (error) {
      setReviewError(error?.message || "Không thể duyệt tài liệu lúc này.");
    } finally {
      setReviewLoading(false);
    }
  }, [currentSource, onSourceUpdated, reviewLoading]);

  useEffect(() => {
    fetchContent();
    fetchSummary();
    fetchModerationReport();
  }, [fetchContent, fetchSummary, fetchModerationReport]);

  const keywords = useMemo(() => extractKeywords(summary), [summary]);
  const contentBlocks = useMemo(() => buildContentBlocks(extractedText), [extractedText]);
  const extractedImageUrls = useMemo(
    () => contentBlocks.filter((block) => block.type === "image" && block.url).map((block) => block.url),
    [contentBlocks]
  );
  const imageUrls = useMemo(() => getSourceImageUrls(currentSource, contentBlocks), [currentSource, contentBlocks]);
  const moderationInfo = useMemo(() => resolveModerationInfo(currentSource, moderationReport), [currentSource, moderationReport]);
  const moderationNodeFindings = useMemo(() => getModerationNodeFindings(moderationReport), [moderationReport]);
  const hasModerationContent = Boolean(
    moderationInfo?.reason ||
    moderationInfo?.suggestion ||
    moderationInfo?.detectedTopic ||
    moderationInfo?.targetLevelRequired ||
    moderationInfo?.currentLevelDetected ||
    moderationNodeFindings.length > 0
  );
  const fallbackImageUrls = useMemo(
    () => imageUrls.filter((url) => !extractedImageUrls.includes(url)),
    [imageUrls, extractedImageUrls]
  );
  const suitablePercentText = useMemo(() => formatSuitablePercent(moderationInfo?.suitablePercent), [moderationInfo?.suitablePercent]);
  const showWarnReviewActions = moderationInfo?.type === "WARN" && ["WARN", "WARNED"].includes(String(currentSource?.status || "").toUpperCase());

  // Render summary with bold markdown **text**
  const renderSummary = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.+?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!currentSource) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header với nút quay lại */}
      <div className={`px-4 h-12 border-b flex items-center gap-3 shrink-0 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <button type="button" onClick={onBack} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        {getDetailIcon(currentSource.type)}
        <p className={`text-base font-medium truncate flex-1 ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
          {currentSource.name}
        </p>
      </div>

      {/* Nội dung chi tiết */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <div className="h-full min-h-0 flex flex-col gap-4">
          {(moderationLoading || hasModerationContent || reviewMessage || reviewError) && (
            <div
              className={`shrink-0 rounded-xl border px-4 py-3 ${
                moderationInfo?.type === "REJECT"
                  ? isDarkMode
                    ? "border-red-800 bg-red-950/30"
                    : "border-red-200 bg-red-50"
                  : isDarkMode
                    ? "border-amber-800 bg-amber-950/25"
                    : "border-amber-200 bg-amber-50"
              }`}
            >
              {moderationLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className={`w-4 h-4 animate-spin ${isDarkMode ? "text-slate-300" : "text-gray-500"}`} />
                  <span className={`text-xs ${isDarkMode ? "text-slate-300" : "text-gray-600"} ${fontClass}`}>
                    Đang tải báo cáo kiểm duyệt...
                  </span>
                </div>
              ) : moderationInfo?.reason ? (
                <p className={`text-xs leading-relaxed ${isDarkMode ? "text-slate-200" : "text-gray-700"} ${fontClass}`}>
                  <span className="font-semibold">Lý do: </span>
                  {moderationInfo.reason}
                </p>
              ) : null}
              {moderationInfo?.type === "WARN" && moderationInfo?.suggestion && (
                <p className={`text-xs leading-relaxed mt-1.5 ${isDarkMode ? "text-slate-300" : "text-gray-600"} ${fontClass}`}>
                  <span className="font-semibold">Gợi ý: </span>
                  {moderationInfo.suggestion}
                </p>
              )}
              {moderationInfo?.type === "REJECT" && moderationInfo?.detectedTopic && (
                <p className={`text-xs leading-relaxed mt-1.5 ${isDarkMode ? "text-slate-300" : "text-gray-600"} ${fontClass}`}>
                  <span className="font-semibold">Chủ đề phát hiện của tài liệu: </span>
                  {moderationInfo.detectedTopic}
                </p>
              )}
              {moderationInfo?.type === "WARN" && suitablePercentText && (
                <p className={`text-xs leading-relaxed mt-1.5 ${isDarkMode ? "text-slate-300" : "text-gray-600"} ${fontClass}`}>
                  <span className="font-semibold">Phần trăm nội dung phù hợp: </span>
                  {suitablePercentText}
                </p>
              )}
              {moderationInfo?.type === "WARN" && moderationInfo?.currentLevelDetected && moderationInfo?.targetLevelRequired && (
                <p className={`text-xs leading-relaxed mt-1.5 ${isDarkMode ? "text-slate-300" : "text-gray-600"} ${fontClass}`}>
                  <span className="font-semibold">Mức hiện tại của tài liệu: </span>
                  {moderationInfo.currentLevelDetected}
                  <span className="font-semibold"> | Mức yêu cầu: </span>
                  {moderationInfo.targetLevelRequired}
                </p>
              )}
              {moderationNodeFindings.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {moderationNodeFindings.map((item) => (
                    <p key={item.key} className={`text-xs leading-relaxed ${isDarkMode ? "text-slate-300" : "text-gray-600"} ${fontClass}`}>
                      <span className="font-semibold">{item.label} ({item.level}): </span>
                      {item.reason}
                    </p>
                  ))}
                </div>
              )}
              {showWarnReviewActions && (
                <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10">
                  <p className={`text-xs font-medium mb-2 ${isDarkMode ? "text-slate-200" : "text-gray-700"} ${fontClass}`}>
                    Có duyệt tài liệu này không?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReview(true)}
                      disabled={reviewLoading}
                      className={`min-w-20 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        reviewLoading
                          ? isDarkMode ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : isDarkMode ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                    >
                      Có
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview(false)}
                      disabled={reviewLoading}
                      className={`min-w-20 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        reviewLoading
                          ? isDarkMode ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-slate-200 text-slate-500 cursor-not-allowed"
                          : isDarkMode ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      Không
                    </button>
                    {reviewLoading && <Loader2 className={`w-4 h-4 animate-spin ${isDarkMode ? "text-slate-300" : "text-gray-500"}`} />}
                  </div>
                </div>
              )}
              {reviewMessage && (
                <p className={`text-xs leading-relaxed mt-2 ${isDarkMode ? "text-emerald-300" : "text-emerald-700"} ${fontClass}`}>
                  {reviewMessage}
                </p>
              )}
              {reviewError && (
                <p className={`text-xs leading-relaxed mt-2 ${isDarkMode ? "text-red-300" : "text-red-700"} ${fontClass}`}>
                  {reviewError}
                </p>
              )}
            </div>
          )}

          {/* Hướng dẫn về nguồn — AI summary cuộn độc lập */}
          <div className={`shrink-0 rounded-xl border overflow-hidden ${isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-gray-200 bg-gray-50/80"}`}>
            <button
              type="button"
              onClick={() => setSummaryOpen((v) => !v)}
              className={`w-full px-4 py-3 flex items-center gap-2.5 text-left transition-colors ${isDarkMode ? "hover:bg-slate-800/60" : "hover:bg-gray-100"}`}
            >
              <Sparkles className={`w-4 h-4 shrink-0 ${isDarkMode ? "text-violet-400" : "text-violet-500"}`} />
              <span className={`text-sm font-semibold flex-1 ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
                {t("workspace.sources.sourceGuide")}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDarkMode ? "text-slate-400" : "text-gray-400"} ${summaryOpen ? "rotate-180" : ""}`} />
            </button>

            {summaryOpen && (
              <div className={`px-4 pb-4 max-h-64 overflow-y-auto`}>
                {summaryLoading ? (
                  <div className="flex items-center gap-2 py-3">
                    <Loader2 className={`w-4 h-4 animate-spin ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
                    <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>{t("workspace.sources.loadingSummary")}</span>
                  </div>
                ) : summary ? (
                  <div className="space-y-3">
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDarkMode ? "text-slate-300" : "text-gray-600"} ${fontClass}`}>
                      {renderSummary(summary)}
                    </p>
                    {/* Topic keyword chips */}
                    {keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {keywords.map((kw, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-default ${
                              isDarkMode
                                ? "border-slate-600 bg-slate-700/50 text-slate-300"
                                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className={`text-xs py-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
                    {t("workspace.sources.noSummary")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className={`shrink-0 border-t ${isDarkMode ? "border-slate-800" : "border-gray-200"}`} />

          {/* Nội dung extracted text — cuộn độc lập */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {textLoading ? (
              <div className="flex items-center justify-center gap-2 py-16">
                <Loader2 className={`w-5 h-5 animate-spin ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
                <span className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>{t("workspace.sources.loadingContent")}</span>
              </div>
            ) : textError ? (
              <p className={`text-sm text-center py-16 ${isDarkMode ? "text-red-400" : "text-red-500"} ${fontClass}`}>
                {t("workspace.sources.loadError")}
              </p>
            ) : (fallbackImageUrls.length > 0 || (extractedText && contentBlocks.length > 0)) ? (
              <div className="space-y-4">
                {fallbackImageUrls.map((imageUrl, index) => (
                  <div
                    key={`source-img-${index}`}
                    className={`rounded-xl overflow-hidden border ${isDarkMode ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"}`}
                  >
                    <img
                      src={imageUrl}
                      alt={currentSource.name || `image-${index + 1}`}
                      loading="lazy"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                ))}
                {contentBlocks.map((block, index) => {
                  if (block.type === "image") {
                    return (
                      <div
                        key={`img-${index}`}
                        className={`rounded-xl overflow-hidden border ${isDarkMode ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"}`}
                      >
                        <img
                          src={block.url}
                          alt={block.alt}
                          loading="lazy"
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`txt-${index}`}
                      className={`text-sm leading-relaxed whitespace-pre-wrap ${isDarkMode ? "text-slate-300" : "text-gray-700"} ${fontClass}`}
                    >
                      {block.value}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={`text-sm text-center py-16 ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
                {t("workspace.sources.noContent")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SourceDetailView;