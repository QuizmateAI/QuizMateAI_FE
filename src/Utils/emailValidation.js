export const EMAIL_MAX_LENGTH = 100;

// Returns a validation key suffix under `validation.*` when invalid, otherwise empty string.
export function getEmailViolationKey(rawEmail) {
  const email = String(rawEmail ?? "");
  const trimmed = email.trim();

  if (!trimmed) return "emailRequired";
  if (trimmed.length > EMAIL_MAX_LENGTH) return "emailLength";
  if (/\s/.test(email)) return "emailNoSpaces";

  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount !== 1) return "emailAtSymbol";

  const [localPart, domainPart] = trimmed.split("@");
  if (!localPart || !domainPart) return "emailInvalid";
  if (localPart.length > 64) return "emailLocalPartLength";

  if (localPart.startsWith(".") || localPart.endsWith(".")) return "emailDotPosition";
  if (domainPart.startsWith(".") || domainPart.endsWith(".")) return "emailDotPosition";
  if (trimmed.includes("..")) return "emailConsecutiveDots";

  const localPartRegex = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  if (!localPartRegex.test(localPart)) return "emailInvalid";

  if (!domainPart.includes(".")) return "emailDomainFormat";

  const domainLabels = domainPart.split(".");
  const domainLabelRegex = /^[A-Za-z0-9-]+$/;

  for (const label of domainLabels) {
    if (!label) return "emailDomainFormat";
    if (label.length > 63) return "emailDomainFormat";
    if (!domainLabelRegex.test(label)) return "emailDomainFormat";
    if (label.startsWith("-") || label.endsWith("-")) return "emailDomainFormat";
  }

  const tld = domainLabels[domainLabels.length - 1];
  if (!tld || tld.length < 2) return "emailDomainFormat";

  return "";
}

export function isEmailValid(rawEmail) {
  return getEmailViolationKey(rawEmail) === "";
}
