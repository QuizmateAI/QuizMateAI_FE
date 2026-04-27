const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
const HTTP_URL_REGEX = /https?:\/\/\S+/gi;
const IMAGE_EXT_REGEX = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;

function normalizeComparableText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeSourceText(content) {
  return String(content || '')
    .replace(/\\n/g, '\n')
    .replace(/(^|[\s])\/n(?=[\s]|$)/g, '$1\n');
}

function stripNonTextLines(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return '';

  const comparable = normalizeComparableText(trimmed);
  if (comparable === '[image_occlusion]') return '';
  if (comparable === 'hinh anh cau hoi') return '';

  if (comparable.startsWith('noi dung an:')) {
    return trimmed.replace(/^\s*[^:]+:\s*/u, '').trim();
  }

  if (comparable.startsWith('hinh:') || comparable.startsWith('hinh anh:') || comparable.startsWith('image:')) {
    return '';
  }

  return trimmed;
}

function pushImageCandidate(bucket, seen, url, alt = '') {
  const normalizedUrl = typeof url === 'string' ? url.trim() : '';
  if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl) || seen.has(normalizedUrl)) {
    return;
  }

  seen.add(normalizedUrl);
  bucket.push({
    url: normalizedUrl,
    alt: typeof alt === 'string' ? alt.trim() : '',
  });
}

function extractMarkdownImagesFromText(contentText, bucket, seen) {
  if (!contentText) return;

  let match;
  MARKDOWN_IMAGE_REGEX.lastIndex = 0;
  while ((match = MARKDOWN_IMAGE_REGEX.exec(contentText)) !== null) {
    pushImageCandidate(bucket, seen, match[2], match[1]);
  }

  const urlMatches = contentText.match(HTTP_URL_REGEX) || [];
  urlMatches.forEach((url) => {
    if (IMAGE_EXT_REGEX.test(url)) {
      pushImageCandidate(bucket, seen, url);
    }
  });

  const lines = contentText.split('\n');
  lines.forEach((line) => {
    const comparable = normalizeComparableText(line);
    if (comparable.startsWith('hinh:') || comparable.startsWith('hinh anh:') || comparable.startsWith('image:')) {
      const urlMatch = String(line).match(/https?:\/\/\S+/i);
      if (urlMatch?.[0]) {
        pushImageCandidate(bucket, seen, urlMatch[0]);
      }
    }
  });
}

function parseContentDisplayText(content) {
  const source = normalizeSourceText(content);
  if (!source) return '';

  const withoutMarkdownImages = source.replace(MARKDOWN_IMAGE_REGEX, '');
  const lines = withoutMarkdownImages
    .split('\n')
    .map((line) => stripNonTextLines(line))
    .filter(Boolean);

  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

  return lines.join('\n');
}

export function getContentImageList(content) {
  const imageList = [];
  const seen = new Set();
  extractMarkdownImagesFromText(normalizeSourceText(content), imageList, seen);
  return imageList;
}

export function getContentDisplayText(content) {
  return parseContentDisplayText(content);
}

export function getQuestionImageList(question = {}) {
  const imageList = [];
  const seen = new Set();

  const directFields = [
    question?.imageUrl,
    question?.questionImageUrl,
    question?.thumbnail,
    question?.thumbnailUrl,
    question?.mediaUrl,
    question?.fileUrl,
  ];

  directFields.forEach((url) => pushImageCandidate(imageList, seen, url));

  const imageUrls = Array.isArray(question?.imageUrls)
    ? question.imageUrls
    : Array.isArray(question?.images)
      ? question.images
      : [];
  imageUrls.forEach((item) => {
    if (typeof item === 'string') {
      pushImageCandidate(imageList, seen, item);
      return;
    }
    pushImageCandidate(imageList, seen, item?.url || item?.imageUrl, item?.alt || item?.name || '');
  });

  const contentText = String(question?.content || '');
  extractMarkdownImagesFromText(normalizeSourceText(contentText), imageList, seen);

  return imageList;
}

export function getQuestionDisplayText(content) {
  return parseContentDisplayText(content);
}
