export function logSwallowed(context) {
  return (err) => {
    if (import.meta.env.DEV) {
      console.warn(`[swallowed:${context}]`, err);
    }
  };
}
