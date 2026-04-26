import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function translateOrFallback(t, key, fallback) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function translateOrFallbackWithOptions(t, key, options, fallback) {
  const translated = t(key, options);
  return translated === key ? fallback : translated;
}

function getProfilePurpose(profileData) {
  return profileData?.workspacePurpose || profileData?.learningMode || "";
}

function hasCompletedProfileStepTwo(profileData) {
  return Number(profileData?.currentStep) >= 3 || ["PROFILE_DONE", "DONE"].includes(profileData?.workspaceSetupStatus);
}

function isMockTestGenerationInProgress(profileData) {
  if (getProfilePurpose(profileData) !== "MOCK_TEST") return false;

  if (profileData?.currentStep >= 3 || ["PROFILE_DONE", "DONE"].includes(profileData?.workspaceSetupStatus)) {
    return false;
  }

  return Boolean(
    profileData?.currentLevel
    || profileData?.learningGoal
    || profileData?.mockExamName
    || profileData?.examName
    || profileData?.mockExamName
  );
}

function delay(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export function useWorkspaceMockTestGeneration({
  workspaceId,
  t,
  fetchWorkspaceDetail,
  showSuccess,
  loadProfileData,
  confirmProfileData,
  persistRoadmapConfig,
  onProfileResolved,
  closeProfileDialogs,
  navigateToWorkspaceRoot,
} = {}) {
  const [mockTestGenerationState, setMockTestGenerationState] = useState("idle");
  const [mockTestGenerationMessage, setMockTestGenerationMessage] = useState("");
  const [mockTestGenerationProgress, setMockTestGenerationProgress] = useState(0);
  const [mockTestGenerationStartedAt, setMockTestGenerationStartedAt] = useState(null);
  const [mockTestGenerationElapsedSeconds, setMockTestGenerationElapsedSeconds] = useState(0);

  const mountedRef = useRef(true);
  const pollingActiveRef = useRef(false);
  const pollingRunRef = useRef(0);
  const progressTimerRef = useRef(null);
  const elapsedTimerRef = useRef(null);
  const readyAutoHideTimerRef = useRef(null);
  const autoFinalizePayloadRef = useRef(null);
  const shouldCloseAfterStartRef = useRef(false);

  const mockTestGenerationStorageKey = useMemo(() => (
    workspaceId ? `workspace_${workspaceId}_mockTestGeneration` : null
  ), [workspaceId]);

  const getMockTestGeneratingMessage = useCallback(() => {
    return translateOrFallback(
      t,
      "workspace.profileConfig.messages.mockTemplateGenerating",
      "Template dang duoc tao. He thong se tu chuyen sang buoc tiep theo khi hoan tat."
    );
  }, [t]);

  const getMockTestReadyMessage = useCallback(() => {
    return translateOrFallback(
      t,
      "workspace.profileConfig.messages.mockTemplateReady",
      "Da luu template mock test thanh cong."
    );
  }, [t]);

  const getMockTestStatusErrorMessage = useCallback(() => {
    return translateOrFallback(
      t,
      "workspace.profileConfig.messages.mockTemplateStatusError",
      "Khong the kiem tra trang thai tao template luc nay. Vui long thu lai sau it phut."
    );
  }, [t]);

  const getMockTestAwaitingBackendMessage = useCallback((elapsedSeconds = 0) => {
    const safeSeconds = Math.max(1, Number(elapsedSeconds) || 1);
    return translateOrFallbackWithOptions(
      t,
      "workspace.profileConfig.messages.mockTemplateAwaitingBackend",
      { seconds: safeSeconds },
      `Dang cho backend xac nhan hoan tat template. Da cho ${safeSeconds} giay.`
    );
  }, [t]);

  const getMockTestLongWaitMessage = useCallback((elapsedSeconds = 0) => {
    const safeSeconds = Math.max(1, Number(elapsedSeconds) || 1);
    return translateOrFallbackWithOptions(
      t,
      "workspace.profileConfig.messages.mockTemplateLongWait",
      { seconds: safeSeconds },
      `Backend van dang xu ly template. Da cho ${safeSeconds} giay. Neu qua lau, hay kiem tra lai trang thai.`
    );
  }, [t]);

  const readStoredMockTestGeneration = useCallback(() => {
    if (!mockTestGenerationStorageKey || typeof window === "undefined") return null;

    try {
      const rawValue = window.sessionStorage.getItem(mockTestGenerationStorageKey);
      return rawValue ? JSON.parse(rawValue) : null;
    } catch {
      return null;
    }
  }, [mockTestGenerationStorageKey]);

  const clearReadyAutoHideTimer = useCallback(() => {
    if (!readyAutoHideTimerRef.current) return;
    globalThis.clearTimeout(readyAutoHideTimerRef.current);
    readyAutoHideTimerRef.current = null;
  }, []);

  const clearProgressTimer = useCallback(() => {
    if (!progressTimerRef.current) return;
    globalThis.clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
  }, []);

  const clearElapsedTimer = useCallback(() => {
    if (!elapsedTimerRef.current) return;
    globalThis.clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = null;
  }, []);

  const resetMockTestGenerationStatus = useCallback(() => {
    pollingRunRef.current += 1;
    pollingActiveRef.current = false;
    shouldCloseAfterStartRef.current = false;
    autoFinalizePayloadRef.current = null;
    clearProgressTimer();
    clearElapsedTimer();
    clearReadyAutoHideTimer();
    setMockTestGenerationState("idle");
    setMockTestGenerationMessage("");
    setMockTestGenerationProgress(0);
    setMockTestGenerationStartedAt(null);
    setMockTestGenerationElapsedSeconds(0);

    if (mockTestGenerationStorageKey && typeof window !== "undefined") {
      window.sessionStorage.removeItem(mockTestGenerationStorageKey);
    }
  }, [
    clearElapsedTimer,
    clearProgressTimer,
    clearReadyAutoHideTimer,
    mockTestGenerationStorageKey,
  ]);

  const finalizeBackgroundMockTestProfile = useCallback(async () => {
    if (!workspaceId || !autoFinalizePayloadRef.current) return null;

    try {
      await persistRoadmapConfig?.(autoFinalizePayloadRef.current);
    } catch (error) {
      console.warn("persistRoadmapConfig during background finalization skipped or failed:", error);
    }

    const confirmedProfile = await confirmProfileData?.();
    if (confirmedProfile) {
      onProfileResolved?.(confirmedProfile);
    }

    shouldCloseAfterStartRef.current = false;
    autoFinalizePayloadRef.current = null;
    setMockTestGenerationProgress(100);
    closeProfileDialogs?.();
    fetchWorkspaceDetail?.(workspaceId)?.catch?.(() => {});
    showSuccess?.(
      translateOrFallback(
        t,
        "workspace.profileConfig.messages.backgroundMockTestReady",
        "Mock test da duoc tao xong o nen. Ban co the mo muc Mock test de xem ngay."
      )
    );
    navigateToWorkspaceRoot?.();
    return confirmedProfile;
  }, [
    closeProfileDialogs,
    confirmProfileData,
    fetchWorkspaceDetail,
    navigateToWorkspaceRoot,
    onProfileResolved,
    persistRoadmapConfig,
    showSuccess,
    t,
    workspaceId,
  ]);

  const startMockTestGenerationPolling = useCallback(async () => {
    if (!workspaceId || pollingActiveRef.current) return;

    const runId = pollingRunRef.current + 1;
    pollingRunRef.current = runId;
    pollingActiveRef.current = true;
    let consecutiveFailures = 0;

    try {
      while (mountedRef.current && pollingRunRef.current === runId) {
        try {
          const profileData = await loadProfileData?.();
          if (!mountedRef.current || pollingRunRef.current !== runId) {
            return;
          }

          consecutiveFailures = 0;

          if (profileData) {
            onProfileResolved?.(profileData);
          }

          if (hasCompletedProfileStepTwo(profileData)) {
            setMockTestGenerationProgress(100);
            setMockTestGenerationState("ready");
            setMockTestGenerationMessage(getMockTestReadyMessage());

            if (shouldCloseAfterStartRef.current && autoFinalizePayloadRef.current) {
              await finalizeBackgroundMockTestProfile();
            }

            fetchWorkspaceDetail?.(workspaceId)?.catch?.(() => {});
            return;
          }
        } catch (error) {
          consecutiveFailures += 1;

          if (consecutiveFailures >= 3) {
            console.error("Failed to poll mock test generation status:", error);
            if (mountedRef.current && pollingRunRef.current === runId) {
              setMockTestGenerationState("error");
              setMockTestGenerationMessage(error?.message || getMockTestStatusErrorMessage());
            }
            return;
          }
        }

        await delay(1500);
      }
    } finally {
      if (pollingRunRef.current === runId) {
        pollingActiveRef.current = false;
      }
    }
  }, [
    fetchWorkspaceDetail,
    finalizeBackgroundMockTestProfile,
    getMockTestReadyMessage,
    getMockTestStatusErrorMessage,
    loadProfileData,
    onProfileResolved,
    workspaceId,
  ]);

  const syncMockTestGenerationFromProfile = useCallback(async (profileData, storedMockTestGeneration = readStoredMockTestGeneration()) => {
    if (isMockTestGenerationInProgress(profileData)) {
      shouldCloseAfterStartRef.current = Boolean(storedMockTestGeneration?.shouldCloseAfterStart);
      autoFinalizePayloadRef.current = storedMockTestGeneration?.autoFinalizePayload || null;
      setMockTestGenerationStartedAt(Number(storedMockTestGeneration?.startedAt) || Date.now());
      setMockTestGenerationElapsedSeconds(0);
      setMockTestGenerationState("pending");
      setMockTestGenerationMessage(getMockTestGeneratingMessage());
      setMockTestGenerationProgress(Number(storedMockTestGeneration?.progress) || 12);
      await startMockTestGenerationPolling();
      return "pending";
    }

    if (hasCompletedProfileStepTwo(profileData) && storedMockTestGeneration) {
      shouldCloseAfterStartRef.current = Boolean(storedMockTestGeneration?.shouldCloseAfterStart);
      autoFinalizePayloadRef.current = storedMockTestGeneration?.autoFinalizePayload || null;

      if (shouldCloseAfterStartRef.current && autoFinalizePayloadRef.current) {
        await finalizeBackgroundMockTestProfile();
        return "finalized";
      }

      setMockTestGenerationState("ready");
      setMockTestGenerationMessage(getMockTestReadyMessage());
      setMockTestGenerationProgress(100);
      return "ready";
    }

    resetMockTestGenerationStatus();
    return "idle";
  }, [
    finalizeBackgroundMockTestProfile,
    getMockTestGeneratingMessage,
    getMockTestReadyMessage,
    readStoredMockTestGeneration,
    resetMockTestGenerationStatus,
    startMockTestGenerationPolling,
  ]);

  const beginMockTestGeneration = useCallback((options = {}) => {
    const shouldCloseAfterStart = options?.shouldCloseAfterStart === true;
    shouldCloseAfterStartRef.current = shouldCloseAfterStart;
    autoFinalizePayloadRef.current = shouldCloseAfterStart ? (options?.autoFinalizePayload || null) : null;
    setMockTestGenerationStartedAt(Number(options?.startedAt) || Date.now());
    setMockTestGenerationElapsedSeconds(0);
    setMockTestGenerationProgress(Number(options?.initialProgress) || 12);
    setMockTestGenerationState("pending");
    setMockTestGenerationMessage(getMockTestGeneratingMessage());
    void startMockTestGenerationPolling();

    if (shouldCloseAfterStart) {
      closeProfileDialogs?.();
      navigateToWorkspaceRoot?.();
    }
  }, [
    closeProfileDialogs,
    getMockTestGeneratingMessage,
    navigateToWorkspaceRoot,
    startMockTestGenerationPolling,
  ]);

  useEffect(() => {
    if (mockTestGenerationState !== "ready") {
      clearReadyAutoHideTimer();
      return;
    }

    clearReadyAutoHideTimer();
    readyAutoHideTimerRef.current = globalThis.setTimeout(() => {
      resetMockTestGenerationStatus();
    }, 3000);

    return () => {
      clearReadyAutoHideTimer();
    };
  }, [clearReadyAutoHideTimer, mockTestGenerationState, resetMockTestGenerationStatus]);

  useEffect(() => {
    if (mockTestGenerationState !== "pending") {
      clearProgressTimer();
      if (mockTestGenerationState === "ready") {
        setMockTestGenerationProgress(100);
      }
      return;
    }

    clearProgressTimer();
    setMockTestGenerationProgress((current) => (current > 0 ? current : 12));
    progressTimerRef.current = globalThis.setInterval(() => {
      setMockTestGenerationProgress((current) => {
        if (current >= 92) return current;
        if (current < 40) return Math.min(92, current + 11);
        if (current < 70) return Math.min(92, current + 7);
        return Math.min(92, current + 3);
      });
    }, 450);

    return () => {
      clearProgressTimer();
    };
  }, [clearProgressTimer, mockTestGenerationState]);

  useEffect(() => {
    if (mockTestGenerationState !== "pending" || !mockTestGenerationStartedAt) {
      clearElapsedTimer();
      return;
    }

    setMockTestGenerationElapsedSeconds(Math.max(0, Math.floor((Date.now() - mockTestGenerationStartedAt) / 1000)));
    elapsedTimerRef.current = globalThis.setInterval(() => {
      setMockTestGenerationElapsedSeconds(Math.max(0, Math.floor((Date.now() - mockTestGenerationStartedAt) / 1000)));
    }, 1000);

    return () => {
      clearElapsedTimer();
    };
  }, [clearElapsedTimer, mockTestGenerationStartedAt, mockTestGenerationState]);

  useEffect(() => {
    if (!mockTestGenerationStorageKey || typeof window === "undefined") return;

    if (mockTestGenerationState === "idle") {
      window.sessionStorage.removeItem(mockTestGenerationStorageKey);
      return;
    }

    window.sessionStorage.setItem(
      mockTestGenerationStorageKey,
      JSON.stringify({
        state: mockTestGenerationState,
        message: mockTestGenerationMessage,
        progress: mockTestGenerationProgress,
        startedAt: mockTestGenerationStartedAt,
        shouldCloseAfterStart: shouldCloseAfterStartRef.current,
        autoFinalizePayload: autoFinalizePayloadRef.current,
      })
    );
  }, [
    mockTestGenerationMessage,
    mockTestGenerationProgress,
    mockTestGenerationStartedAt,
    mockTestGenerationState,
    mockTestGenerationStorageKey,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollingRunRef.current += 1;
      pollingActiveRef.current = false;
      clearProgressTimer();
      clearElapsedTimer();
      clearReadyAutoHideTimer();
    };
  }, [clearElapsedTimer, clearProgressTimer, clearReadyAutoHideTimer]);

  useEffect(() => {
    resetMockTestGenerationStatus();
  }, [resetMockTestGenerationStatus, workspaceId]);

  const isMockTestAwaitingBackend = mockTestGenerationState === "pending" && mockTestGenerationProgress >= 92;
  const isMockTestTakingLongerThanExpected = isMockTestAwaitingBackend && mockTestGenerationElapsedSeconds >= 20;
  const mockTestGenerationDisplayMessage = mockTestGenerationState === "pending"
    ? isMockTestTakingLongerThanExpected
      ? getMockTestLongWaitMessage(mockTestGenerationElapsedSeconds)
      : isMockTestAwaitingBackend
        ? getMockTestAwaitingBackendMessage(mockTestGenerationElapsedSeconds)
        : mockTestGenerationMessage
    : mockTestGenerationMessage;
  const mockTestGenerationDisplayLabel = mockTestGenerationState === "pending" && isMockTestAwaitingBackend
    ? translateOrFallback(
      t,
      "workspace.profileConfig.messages.mockTemplateAwaitingBackendShort",
      "Dang xac nhan"
    )
    : `${Math.max(0, Math.min(100, Number(mockTestGenerationProgress) || 0))}%`;

  const checkMockTestGenerationStatusNow = useCallback(async () => {
    if (!workspaceId || mockTestGenerationState !== "pending") return;

    try {
      const profileData = await loadProfileData?.();
      if (profileData) {
        onProfileResolved?.(profileData);
      }

      if (hasCompletedProfileStepTwo(profileData)) {
        setMockTestGenerationProgress(100);
        setMockTestGenerationState("ready");
        setMockTestGenerationMessage(getMockTestReadyMessage());
        if (shouldCloseAfterStartRef.current && autoFinalizePayloadRef.current) {
          await finalizeBackgroundMockTestProfile();
        }
        return;
      }

      if (mockTestGenerationProgress >= 92) {
        setMockTestGenerationMessage(getMockTestAwaitingBackendMessage(mockTestGenerationElapsedSeconds));
      }
    } catch (error) {
      console.error("Failed to manually check mock test status:", error);
      setMockTestGenerationState("error");
      setMockTestGenerationMessage(error?.message || getMockTestStatusErrorMessage());
    }
  }, [
    finalizeBackgroundMockTestProfile,
    getMockTestAwaitingBackendMessage,
    getMockTestReadyMessage,
    getMockTestStatusErrorMessage,
    loadProfileData,
    mockTestGenerationElapsedSeconds,
    mockTestGenerationProgress,
    mockTestGenerationState,
    onProfileResolved,
    workspaceId,
  ]);

  return {
    mockTestGenerationState,
    mockTestGenerationMessage,
    mockTestGenerationProgress,
    mockTestGenerationDisplayMessage,
    mockTestGenerationDisplayLabel,
    isMockTestAwaitingBackend,
    isMockTestTakingLongerThanExpected,
    resetMockTestGenerationStatus,
    readStoredMockTestGeneration,
    syncMockTestGenerationFromProfile,
    beginMockTestGeneration,
    finalizeBackgroundMockTestProfile,
    checkMockTestGenerationStatusNow,
  };
}
