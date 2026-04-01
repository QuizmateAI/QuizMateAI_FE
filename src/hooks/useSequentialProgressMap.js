import { useCallback, useEffect, useRef, useState } from 'react';

function clampPercent(percent) {
  return Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
}

export function useSequentialProgressMap(options = {}) {
  const stepDelayMs = Number.isFinite(options?.stepDelayMs) ? Math.max(8, options.stepDelayMs) : 24;
  const [progressMap, setProgressMap] = useState({});
  const progressRef = useRef({});
  const targetRef = useRef({});
  const timerRef = useRef({});

  useEffect(() => {
    progressRef.current = progressMap;
  }, [progressMap]);

  const clearTimer = useCallback((key) => {
    if (!key || !timerRef.current[key]) return;
    globalThis.clearTimeout(timerRef.current[key]);
    delete timerRef.current[key];
  }, []);

  const setProgressInstant = useCallback((key, percent) => {
    if (!key) return;
    const normalizedKey = String(key);
    const normalizedPercent = clampPercent(percent);
    targetRef.current[normalizedKey] = normalizedPercent;
    clearTimer(normalizedKey);
    setProgressMap((current) => {
      if ((current[normalizedKey] ?? 0) === normalizedPercent) return current;
      return {
        ...current,
        [normalizedKey]: normalizedPercent,
      };
    });
  }, [clearTimer]);

  const clearProgress = useCallback((key) => {
    if (!key) return;
    const normalizedKey = String(key);
    clearTimer(normalizedKey);
    delete targetRef.current[normalizedKey];
    setProgressMap((current) => {
      if (!(normalizedKey in current)) return current;
      const next = { ...current };
      delete next[normalizedKey];
      return next;
    });
  }, [clearTimer]);

  const retainProgress = useCallback((allowedKeys = []) => {
    const allowed = new Set((allowedKeys || []).map((key) => String(key)));

    Object.keys(timerRef.current).forEach((key) => {
      if (!allowed.has(key)) {
        clearTimer(key);
        delete targetRef.current[key];
      }
    });

    setProgressMap((current) => Object.entries(current).reduce((next, [key, value]) => {
      if (allowed.has(String(key))) {
        next[key] = value;
      }
      return next;
    }, {}));
  }, [clearTimer]);

  const setProgress = useCallback((key, percent, optionsArg = {}) => {
    if (!key) return;

    const normalizedKey = String(key);
    const normalizedPercent = clampPercent(percent);
    const currentPercent = clampPercent(progressRef.current[normalizedKey] ?? 0);
    const allowLower = Boolean(optionsArg?.allowLower);
    const instant = Boolean(optionsArg?.instant);

    if (!allowLower && normalizedPercent <= currentPercent) {
      if (instant && normalizedPercent < currentPercent) {
        setProgressInstant(normalizedKey, normalizedPercent);
      }
      return;
    }

    targetRef.current[normalizedKey] = allowLower
      ? normalizedPercent
      : Math.max(clampPercent(targetRef.current[normalizedKey] ?? 0), normalizedPercent);

    if (instant) {
      setProgressInstant(normalizedKey, targetRef.current[normalizedKey]);
      return;
    }

    if (timerRef.current[normalizedKey]) return;

    const tick = () => {
      const nextTarget = clampPercent(targetRef.current[normalizedKey] ?? 0);
      const nextCurrent = clampPercent(progressRef.current[normalizedKey] ?? 0);

      if (nextCurrent >= nextTarget) {
        clearTimer(normalizedKey);
        return;
      }

      const nextValue = Math.min(nextTarget, nextCurrent + 1);
      setProgressMap((current) => ({
        ...current,
        [normalizedKey]: nextValue,
      }));

      timerRef.current[normalizedKey] = globalThis.setTimeout(
        tick,
        nextTarget >= 100 ? Math.max(10, Math.floor(stepDelayMs * 0.65)) : stepDelayMs,
      );
    };

    timerRef.current[normalizedKey] = globalThis.setTimeout(tick, stepDelayMs);
  }, [clearTimer, setProgressInstant, stepDelayMs]);

  useEffect(() => () => {
    Object.keys(timerRef.current).forEach((key) => {
      globalThis.clearTimeout(timerRef.current[key]);
    });
    timerRef.current = {};
    targetRef.current = {};
  }, []);

  const getProgress = useCallback((key) => {
    if (!key) return 0;
    return clampPercent(progressMap[String(key)] ?? 0);
  }, [progressMap]);

  return {
    progressMap,
    getProgress,
    setProgress,
    setProgressInstant,
    clearProgress,
    retainProgress,
  };
}

export default useSequentialProgressMap;
