/**
 * Log an error in dev-only mode when a background promise is allowed to fail
 * without surfacing to the user (e.g. optimistic refreshes, soft hydration).
 *
 * Use ONLY when a user-visible toast would be noisy and unhelpful.
 * For anything the user acted on, use showError() from useToast instead.
 */
export function logSwallowed(context) {
  return (err) => {
    if (import.meta.env.DEV) {
      console.warn(`[swallowed:${context}]`, err);
    }
  };
}
