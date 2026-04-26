import fs from 'node:fs';
import path from 'node:path';

const DIST_ASSETS_DIR = path.resolve('dist/assets');

const budgets = [
  { label: 'root app chunk', prefix: 'index-', maxBytes: 275 * 1024 },
  { label: 'landing route chunk', prefix: 'LandingPage-', maxBytes: 35 * 1024 },
  { label: 'login route chunk', prefix: 'LoginPage-', maxBytes: 35 * 1024 },
  { label: 'home route chunk', prefix: 'HomePage-', maxBytes: 50 * 1024 },
  { label: 'workspace route chunk', prefix: 'WorkspacePage-', maxBytes: 265 * 1024 },
  { label: 'group workspace route chunk', prefix: 'GroupWorkspacePage-', maxBytes: 225 * 1024 },
  { label: 'shared UI vendor chunk', prefix: 'vendor-ui-', maxBytes: 125 * 1024 },
  { label: 'vi public locale payload', prefixes: ['i18n-vi-common-', 'i18n-vi-landing-', 'i18n-vi-plan-', 'i18n-vi-wallet-'], maxBytes: 24 * 1024 },
  { label: 'en public locale payload', prefixes: ['i18n-en-common-', 'i18n-en-landing-', 'i18n-en-plan-', 'i18n-en-wallet-'], maxBytes: 24 * 1024 },
  { label: 'vi auth locale payload', prefixes: ['i18n-vi-common-', 'i18n-vi-auth-'], maxBytes: 27 * 1024 },
  { label: 'en auth locale payload', prefixes: ['i18n-en-common-', 'i18n-en-auth-'], maxBytes: 27 * 1024 },
  { label: 'vi home locale payload', prefixes: ['i18n-vi-common-', 'i18n-vi-home-', 'i18n-vi-grouphome-'], maxBytes: 52 * 1024 },
  { label: 'en home locale payload', prefixes: ['i18n-en-common-', 'i18n-en-home-', 'i18n-en-grouphome-'], maxBytes: 44 * 1024 },
  { label: 'vi workspace locale payload', prefixes: ['i18n-vi-common-', 'i18n-vi-workspace-'], maxBytes: 160 * 1024 },
  { label: 'en workspace locale payload', prefixes: ['i18n-en-common-', 'i18n-en-workspace-'], maxBytes: 140 * 1024 },
  { label: 'vi group locale payload', prefixes: ['i18n-vi-common-', 'i18n-vi-workspace-', 'i18n-vi-group-', 'i18n-vi-grouphome-', 'i18n-vi-wallet-'], maxBytes: 270 * 1024 },
  { label: 'en group locale payload', prefixes: ['i18n-en-common-', 'i18n-en-workspace-', 'i18n-en-group-', 'i18n-en-grouphome-', 'i18n-en-wallet-'], maxBytes: 240 * 1024 },
  { label: 'vi admin locale payload', prefixes: ['i18n-vi-common-', 'i18n-vi-admin-', 'i18n-vi-wallet-'], maxBytes: 95 * 1024 },
  { label: 'en admin locale payload', prefixes: ['i18n-en-common-', 'i18n-en-admin-', 'i18n-en-wallet-'], maxBytes: 82 * 1024 },
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
  const prefixes = budget.prefixes ?? [budget.prefix];
  const resolvedFiles = [];

  for (const prefix of prefixes) {
    const matchingFiles = assetFiles
      .filter((file) => file.startsWith(prefix) && file.endsWith('.js'))
      .map((file) => ({
        file,
        size: fs.statSync(path.join(DIST_ASSETS_DIR, file)).size,
      }))
      .sort((left, right) => right.size - left.size);

    const matchingFile = matchingFiles[0];

    if (!matchingFile) {
      failures.push(`Missing expected bundle for ${budget.label} (${prefix}*.js)`);
      return;
    }

    resolvedFiles.push(matchingFile);
  }

  const totalBytes = resolvedFiles.reduce((sum, file) => sum + file.size, 0);
  const fileSummary = resolvedFiles
    .map((file) => `${file.file} (${formatKb(file.size)})`)
    .join(' + ');

  console.log(`${budget.label}: ${fileSummary} -> ${formatKb(totalBytes)} / ${formatKb(budget.maxBytes)}`);

  if (totalBytes > budget.maxBytes) {
    failures.push(`${budget.label} exceeded budget: ${formatKb(totalBytes)} > ${formatKb(budget.maxBytes)}`);
  }
});

if (failures.length > 0) {
  console.error('\nBundle budget check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('\nBundle budget check passed.');
