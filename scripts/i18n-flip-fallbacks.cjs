// Codemod: flip Vietnamese fallbacks in t(key, 'fallback') to their English locale value.
// Run from QuizMateAI_FE root: node scripts/i18n-flip-fallbacks.cjs
const fs = require('fs');
const path = require('path');

const VI_RE = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

function loadAllLocales(lang) {
  const merged = {};
  for (const ns of ['common','auth','home','workspace','group','admin']) {
    const obj = require(`../src/i18n/locales/${lang}/${ns}.json`);
    function merge(tgt, src) {
      for (const k of Object.keys(src)) {
        if (typeof src[k] === 'object' && src[k] !== null && !Array.isArray(src[k])) {
          tgt[k] = tgt[k] || {};
          merge(tgt[k], src[k]);
        } else tgt[k] = src[k];
      }
    }
    merge(merged, obj);
  }
  return merged;
}

function getByPath(obj, keyPath) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

const en = loadAllLocales('en');

function walk(dir, out=[]){
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const s = fs.statSync(p);
    if (s.isDirectory()) {
      if (['node_modules','dist','.git','i18n','test','__tests__','scripts','.storybook','public'].includes(name)) continue;
      walk(p, out);
    } else if (/\.(jsx?|tsx?)$/.test(name) && !/\.(test|spec)\./.test(name)) out.push(p);
  }
  return out;
}

// Match: t('key', 'fallback' ...)  or  t("key", "fallback" ...)
// Captures key and fallback. Handles escaped quotes inside the fallback.
const T_RE_SINGLE = /\bt\(\s*'([A-Za-z0-9_.]+)'\s*,\s*'((?:\\.|[^'\\])*)'(\s*[,)])/g;
const T_RE_DOUBLE = /\bt\(\s*"([A-Za-z0-9_.]+)"\s*,\s*"((?:\\.|[^"\\])*)"(\s*[,)])/g;

function escapeForQuote(s, quote) {
  // Escape backslash first, then the quote character
  let out = s.replace(/\\/g, '\\\\');
  if (quote === "'") out = out.replace(/'/g, "\\'");
  else out = out.replace(/"/g, '\\"');
  return out;
}

let totalFiles = 0, totalReplacements = 0, keyNotFound = 0;
const files = walk('src');
for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  let changed = 0;

  const replacer = (quote) => (match, key, fallback, tail) => {
    if (!VI_RE.test(fallback)) return match;
    const enValue = getByPath(en, key);
    if (typeof enValue !== 'string') { keyNotFound++; return match; }
    const escaped = escapeForQuote(enValue, quote);
    changed++;
    return `t(${quote}${key}${quote}, ${quote}${escaped}${quote}${tail}`;
  };

  src = src.replace(T_RE_SINGLE, replacer("'"));
  src = src.replace(T_RE_DOUBLE, replacer('"'));

  if (changed > 0) {
    fs.writeFileSync(f, src);
    totalFiles++;
    totalReplacements += changed;
  }
}

console.log('Files modified:', totalFiles);
console.log('Fallbacks replaced:', totalReplacements);
console.log('VN fallbacks whose key is not in EN locale (left unchanged):', keyNotFound);
