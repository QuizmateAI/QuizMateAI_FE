const MOCK_TEST_COMPLETED_STATUSES = new Set([
  "MOCKTEST_COMPLETED",
  "MOCK_TEST_COMPLETED",
]);

const MOCK_TEST_FAILED_STATUSES = new Set([
  "MOCKTEST_FAILED",
  "MOCK_TEST_FAILED",
]);

const MOCK_TEST_TASK_TYPES = new Set([
  "MOCKTEST",
  "MOCK_TEST",
]);

const MOCK_TEST_INTENTS = new Set([
  "MOCKTEST",
  "MOCK_TEST",
]);

function normalizeToken(value) {
  return String(value || "").trim().toUpperCase();
}

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function getCandidateObjects(signal, rawPayload) {
  const normalizedSignal = asObject(signal);
  const normalizedRaw = asObject(rawPayload);

  return [
    normalizedSignal,
    asObject(normalizedSignal.data),
    asObject(normalizedSignal.processingObject),
    normalizedRaw,
    asObject(normalizedRaw.data),
    asObject(normalizedRaw.processingObject),
  ];
}

function readNormalizedToken(signal, rawPayload, keys) {
  for (const source of getCandidateObjects(signal, rawPayload)) {
    for (const key of keys) {
      const value = normalizeToken(source?.[key]);
      if (value) return value;
    }
  }

  return "";
}

export function isMockTestRealtimeSignal(signal, rawPayload = null) {
  const status = readNormalizedToken(signal, rawPayload, ["status", "final_status"]);
  const taskType = readNormalizedToken(signal, rawPayload, ["taskType", "task_type", "type"]);
  const quizIntent = readNormalizedToken(signal, rawPayload, ["quizIntent", "quiz_intent", "intent"]);

  return (
    MOCK_TEST_COMPLETED_STATUSES.has(status)
    || MOCK_TEST_FAILED_STATUSES.has(status)
    || MOCK_TEST_TASK_TYPES.has(taskType)
    || MOCK_TEST_INTENTS.has(quizIntent)
  );
}

export function isMockTestCompletedSignal(signal, rawPayload = null) {
  const status = readNormalizedToken(signal, rawPayload, ["status", "final_status"]);

  return (
    MOCK_TEST_COMPLETED_STATUSES.has(status)
    || (status === "COMPLETED" && isMockTestRealtimeSignal(signal, rawPayload))
  );
}

export function isMockTestErrorSignal(signal, rawPayload = null) {
  const status = readNormalizedToken(signal, rawPayload, ["status", "final_status"]);

  return (
    MOCK_TEST_FAILED_STATUSES.has(status)
    || ((status === "ERROR" || status === "FAILED") && isMockTestRealtimeSignal(signal, rawPayload))
  );
}

export function getMockTestRealtimeMessage(signal, rawPayload = null) {
  for (const source of getCandidateObjects(signal, rawPayload)) {
    const message = String(source?.message || "").trim();
    if (message) return message;
  }

  return "";
}
