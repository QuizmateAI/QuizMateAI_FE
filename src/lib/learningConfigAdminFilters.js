const REMOVED_LEARNING_CONFIG_TOKENS = new Set(['domain', 'knowledge', 'scheme', 'level']);

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function isRemovedLearningConfigItem(value) {
  return tokenize(value).some((token) => REMOVED_LEARNING_CONFIG_TOKENS.has(token));
}

export function filterRemovedLearningConfigPermissions(items = []) {
  return items.filter((item) => !isRemovedLearningConfigItem(item?.code));
}

export function filterRemovedLearningConfigPermissionCodes(codes = []) {
  return codes
    .map((code) => String(code).toLowerCase())
    .filter((code) => !isRemovedLearningConfigItem(code));
}

export function filterRemovedLearningConfigAuditLogs(logs = []) {
  return logs.filter((log) => {
    const action = log?.action || '';
    const targetType = log?.targetType || '';
    return !isRemovedLearningConfigItem(action) && !isRemovedLearningConfigItem(targetType);
  });
}
