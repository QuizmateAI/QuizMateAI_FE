import { useEffect, useMemo } from "react";
import { useToast } from "@/context/ToastContext";

function resolveToastMessage(message) {
  if (message == null || message === false) return "";
  if (typeof message === "string") return message.trim();
  if (message instanceof Error) return String(message.message || "").trim();
  if (typeof message === "number") return String(message);
  if (typeof message === "object") {
    return String(message.message || message.detail || "").trim();
  }
  return "";
}

function ToastError({ message, enabled = true, duration = 4000 }) {
  const { showError } = useToast();
  const resolvedMessage = useMemo(() => resolveToastMessage(message), [message]);

  useEffect(() => {
    if (!enabled || !resolvedMessage) return;
    showError(resolvedMessage, { duration });
  }, [duration, enabled, resolvedMessage, showError]);

  return null;
}

export default ToastError;
