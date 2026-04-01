import fs from 'node:fs';
import path from 'node:path';

const DIST_ASSETS_DIR = path.resolve('dist/assets');

const budgets = [
  { label: 'root app chunk', prefix: 'index-', maxBytes: 275 * 1024 },
  { label: 'workspace route chunk', prefix: 'WorkspacePage-', maxBytes: 265 * 1024 },
  { label: 'group workspace route chunk', prefix: 'GroupWorkspacePage-', maxBytes: 225 * 1024 },
  { label: 'shared UI vendor chunk', prefix: 'vendor-ui-', maxBytes: 125 * 1024 },
  { label: 'vi locale chunk', prefix: 'vi-', maxBytes: 130 * 1024 },
  { label: 'en locale chunk', prefix: 'en-', maxBytes: 130 * 1024 },
];

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

if (!fs.existsSync(DIST_ASSETS_DIR)) {
  console.error(`Missing build output: ${DIST_ASSETS_DIR}`);
  process.exit(1);
}

const assetFiles = fs.readdirSync(DIST_ASSETS_DIR);
const failures = [];

budgets.forEach((budget) => {
  const matchingFiles = assetFiles
    .filter((file) => file.startsWith(budget.prefix) && file.endsWith('.js'))
    .map((file) => ({
      file,
      size: fs.statSync(path.join(DIST_ASSETS_DIR, file)).size,
    }))
    .sort((left, right) => right.size - left.size);

  const fileName = matchingFiles[0]?.file;

  if (!fileName) {
    failures.push(`Missing expected bundle for ${budget.label} (${budget.prefix}*.js)`);
    return;
  }

  const filePath = path.join(DIST_ASSETS_DIR, fileName);
  const fileSize = fs.statSync(filePath).size;

  console.log(`${budget.label}: ${fileName} -> ${formatKb(fileSize)} / ${formatKb(budget.maxBytes)}`);

  if (fileSize > budget.maxBytes) {
    failures.push(`${budget.label} exceeded budget: ${formatKb(fileSize)} > ${formatKb(budget.maxBytes)}`);
  }
});

if (failures.length > 0) {
  console.error('\nBundle budget check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('\nBundle budget check passed.');
