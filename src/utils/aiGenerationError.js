const MATERIAL_NO_ACTIVE_SECTION_CODE = 1400;
const CONTEXT_CONFLICT_CODE = 1055;

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function collectErrorText(error) {
  return [
    error?.message,
    error?.detail,
    error?.data?.message,
    error?.data?.detail,
  ]
    .filter(Boolean)
    .join(" ");
}

export function isAiGenerationContextError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = Number(error.code ?? error.data?.code);
  if (code === MATERIAL_NO_ACTIVE_SECTION_CODE) {
    return true;
  }

  const text = normalizeText(collectErrorText(error));
  if (!text) {
    return false;
  }

  const mentionsDocument = text.includes("tai lieu")
    || text.includes("material")
    || text.includes("document");
  const noActiveSection = text.includes("section active")
    || text.includes("active section")
    || text.includes("tat ca phan bi tat")
    || text.includes("all sections");
  if (mentionsDocument && noActiveSection) {
    return true;
  }

  const insufficientContext = text.includes("chua du noi dung")
    || text.includes("chua du ngu canh")
    || text.includes("chi du ngu canh")
    || text.includes("khong du ngu canh")
    || text.includes("not enough context")
    || text.includes("insufficient context")
    || text.includes("insufficient content");

  return code === CONTEXT_CONFLICT_CODE && mentionsDocument && insufficientContext;
}

export function getAiGenerationContextErrorMessage(error, t) {
  if (!isAiGenerationContextError(error)) {
    return "";
  }

  const text = normalizeText(collectErrorText(error));
  const noActiveSection = Number(error?.code ?? error?.data?.code) === MATERIAL_NO_ACTIVE_SECTION_CODE
    || text.includes("section active")
    || text.includes("active section")
    || text.includes("tat ca phan bi tat")
    || text.includes("all sections");

  return noActiveSection
    ? t(
      "workspace.aiGeneration.contextError.noActiveSections",
      "No enabled document section is available for AI. Please enable at least one section with content, then try again.",
    )
    : t(
      "workspace.aiGeneration.contextError.notEnoughContext",
      "The selected material does not have enough context for AI generation. Enable more sections, reduce the amount to generate, or add more material.",
    );
}
