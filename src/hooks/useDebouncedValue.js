import { useEffect, useState } from "react";

/**
 * Trả về phiên bản debounce của value (mặc định ~400ms) — dùng cho query search gọi BE.
 *
 * @template T
 * @param {T} value
 * @param {number} [delayMs=400]
 * @returns {T}
 */
export function useDebouncedValue(value, delayMs = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
