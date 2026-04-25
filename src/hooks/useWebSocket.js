import { useEffect, useRef, useCallback, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getWebSocketUrl } from "@/lib/websocketUrl";
import { getAccessToken } from "@/Utils/tokenStorage";

const ACTIVE_WS_REGISTRY_KEY = "quizmate_active_websockets_v1";

function readActiveWebSocketRegistry() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_WS_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Khong the doc websocket registry:", error);
    return {};
  }
}

function writeActiveWebSocketRegistry(nextValue) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ACTIVE_WS_REGISTRY_KEY, JSON.stringify(nextValue || {}));
  } catch (error) {
    console.error("Khong the ghi websocket registry:", error);
  }
}

function registerActiveSocket(connectionKey, metadata = {}) {
  if (!connectionKey) return false;
  const registry = readActiveWebSocketRegistry();
  const existed = Boolean(registry[connectionKey]);
  registry[connectionKey] = {
    ...metadata,
    updatedAt: Date.now(),
  };
  writeActiveWebSocketRegistry(registry);
  return existed;
}

function unregisterActiveSocket(connectionKey) {
  if (!connectionKey) return;
  const registry = readActiveWebSocketRegistry();
  if (!registry[connectionKey]) return;
  delete registry[connectionKey];
  writeActiveWebSocketRegistry(registry);
}

function normalizeStatus(status) {
  if (!status) return status;
  const upper = String(status).toUpperCase();
  if (upper === "WARNED") return "WARN";
  if (upper === "REJECTED") return "REJECT";
  return upper;
}

function normalizeMaterialPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const normalizedStatus = normalizeStatus(payload.status || payload.final_status);
  return {
    ...payload,
    ...(normalizedStatus ? { status: normalizedStatus } : {}),
    ...(payload.final_status ? { final_status: normalizeStatus(payload.final_status) } : {}),
  };
}

function toNumberOrNull(value) {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
}

function buildProcessingObjectFromProgressPayload(payload) {
  if (!payload || typeof payload !== "object") return undefined;

  const data = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const taskType = String(
    data?.taskType
      ?? data?.task_type
      ?? payload?.taskType
      ?? payload?.task_type
      ?? payload?.processingObject?.taskType
      ?? payload?.processingObject?.task_type
      ?? ""
  ).toUpperCase();
  const workspaceId = toNumberOrNull(data?.workspaceId ?? data?.workspace_id ?? payload?.workspaceId ?? payload?.workspace_id);
  const roadmapId = toNumberOrNull(data?.roadmapId ?? data?.roadmap_id ?? payload?.roadmapId ?? payload?.roadmap_id);
  const phaseId = toNumberOrNull(data?.phaseId ?? data?.phase_id ?? payload?.phaseId ?? payload?.phase_id);
  const knowledgeId = toNumberOrNull(data?.knowledgeId ?? data?.knowledge_id ?? payload?.knowledgeId ?? payload?.knowledge_id);
  const quizId = toNumberOrNull(data?.quizId ?? data?.quiz_id ?? payload?.quizId ?? payload?.quiz_id);
  const materialId = toNumberOrNull(data?.materialId ?? data?.material_id ?? payload?.materialId ?? payload?.material_id);

  const processingObject = {
    ...(taskType ? { taskType } : {}),
    ...(workspaceId ? { workspaceId } : {}),
    ...(roadmapId ? { roadmapId } : {}),
    ...(phaseId ? { phaseId } : {}),
    ...(knowledgeId ? { knowledgeId } : {}),
    ...(quizId ? { quizId } : {}),
    ...(materialId ? { materialId } : {}),
  };

  return Object.keys(processingObject).length > 0 ? processingObject : undefined;
}

function isRoadmapScopedProgressPayload(payload, processingObject = {}) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const status = String(payload?.status ?? payload?.final_status ?? data?.status ?? data?.final_status ?? "").toUpperCase();
  const taskType = String(
    processingObject?.taskType
      ?? processingObject?.task_type
      ?? data?.taskType
      ?? data?.task_type
      ?? payload?.taskType
      ?? payload?.task_type
      ?? ""
  ).toUpperCase();
  const roadmapId = toNumberOrNull(processingObject?.roadmapId ?? processingObject?.roadmap_id ?? data?.roadmapId ?? data?.roadmap_id ?? payload?.roadmapId ?? payload?.roadmap_id);
  const phaseId = toNumberOrNull(processingObject?.phaseId ?? processingObject?.phase_id ?? data?.phaseId ?? data?.phase_id ?? payload?.phaseId ?? payload?.phase_id);

  return Boolean(
    status.startsWith("ROADMAP_")
      || taskType.includes("ROADMAP")
      || roadmapId
      || phaseId
  );
}

export function resolveMaterialEventFromProgressPayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  const normalizedResponseStatus = normalizeStatus(payload?.status ?? payload?.final_status);
  const data = payload?.data && typeof payload.data === "object"
    ? normalizeMaterialPayload(payload.data)
    : null;
  const processingObject = payload?.processingObject && typeof payload.processingObject === "object"
    ? payload.processingObject
    : (buildProcessingObjectFromProgressPayload(payload) || {});

  if (isRoadmapScopedProgressPayload(payload, processingObject)) {
    return null;
  }

  const materialId = toNumberOrNull(
    data?.materialId
      ?? data?.material_id
      ?? processingObject?.materialId
      ?? processingObject?.material_id
      ?? payload?.materialId
      ?? payload?.material_id
  );
  const materialStatus = normalizeStatus(
    data?.status
      ?? data?.final_status
      ?? (normalizedResponseStatus === "APPROVED" ? "ACTIVE" : normalizedResponseStatus)
  );

  if (!materialStatus) return null;
  if (!materialId && !data && !["PROCESSING", "ERROR", "WARN", "REJECT"].includes(materialStatus)) {
    return null;
  }

  const material = {
    ...(data || {}),
    ...(materialId ? { materialId } : {}),
    status: materialStatus,
  };

  if (
    !material.message
    && typeof payload?.message === "string"
    && payload.message.trim()
  ) {
    material.message = payload.message;
  }

  if (materialStatus === "ACTIVE") {
    return materialId
      ? { eventType: "material:uploaded", material }
      : null;
  }

  if (["PROCESSING", "ERROR", "WARN", "REJECT"].includes(materialStatus)) {
    return { eventType: "material:updated", material };
  }

  return null;
}

function enrichProgressWithActiveTaskShape(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const taskId = String(payload?.websocketTaskId ?? payload?.taskId ?? "").trim();
  if (!taskId) return payload;

  const normalizedStatus = normalizeStatus(payload?.status ?? payload?.final_status);
  const percent = Number(payload?.percent ?? payload?.progressPercent ?? payload?.data?.percent ?? payload?.data?.progressPercent ?? 0);
  const processingObject = payload?.processingObject || buildProcessingObjectFromProgressPayload(payload);
  const activeTask = {
    taskId,
    percent: Number.isFinite(percent) ? percent : 0,
    status: normalizedStatus || payload?.status,
    message: payload?.message ?? payload?.data?.message ?? "",
    ...(processingObject ? { processingObject } : {}),
  };

  return {
    ...payload,
    taskId,
    ...(normalizedStatus ? { status: normalizedStatus } : {}),
    ...(processingObject ? { processingObject } : {}),
    hasActiveTask: true,
    activeTaskCount: 1,
    activeTasks: [activeTask],
  };
}

/**
 * Hook quản lý WebSocket connection cho realtime updates (STOMP over SockJS)
 * @param {Object} options - WebSocket options
 * @param {string} options.workspaceId - ID của workspace cần theo dõi
 * @param {Function} options.onMaterialUploaded - Callback khi có tài liệu mới được upload
 * @param {Function} options.onMaterialDeleted - Callback khi có tài liệu bị xóa
 * @param {Function} options.onMaterialUpdated - Callback khi có tài liệu được cập nhật
 * @param {Function} options.onGroupUpdate - Callback khi có cập nhật thành viên/lời mời/cấu hình group
 * @param {Function} options.onDiscussionUpdate - Callback khi có cập nhật realtime cho discussion trong group
 * @param {Function} options.onProgress - Callback khi có progress update
 * @param {Function} options.onWalletUpdate - Callback khi ví cá nhân thay đổi
 * @param {Function} options.onWorkspaceWalletUpdate - Callback khi ví workspace/group thay đổi
 * @param {boolean} options.enabled - Bật/tắt WebSocket connection (mặc định: true)
 */
export function useWebSocket({
  workspaceId,
  onMaterialUploaded,
  onMaterialDeleted,
  onMaterialUpdated,
  onGroupUpdate,
  onDiscussionUpdate,
  onProgress,
  onWalletUpdate,
  onWorkspaceWalletUpdate,
  onQuizAttemptGrading,
  onChallengeUpdate,
  enabled = true,
} = {}) {
  const stompClientRef = useRef(null);
  const subscriptionsRef = useRef([]);
  const isDeactivatingRef = useRef(false);
  const shouldKeepRegistryOnCleanupRef = useRef(false);
  const hasRequestedResyncRef = useRef(false);
  const callbackRefs = useRef({
    onMaterialUploaded,
    onMaterialDeleted,
    onMaterialUpdated,
    onGroupUpdate,
    onDiscussionUpdate,
    onProgress,
    onWalletUpdate,
    onWorkspaceWalletUpdate,
    onQuizAttemptGrading,
    onChallengeUpdate,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const needsProgressQueue = Boolean(
    onProgress || onMaterialUploaded || onMaterialDeleted || onMaterialUpdated,
  );
  const needsWalletQueue = Boolean(onWalletUpdate);
  const needsQuizAttemptGradingQueue = Boolean(onQuizAttemptGrading);
  const hasMaterialSubscription = Boolean(
    workspaceId && (onMaterialUploaded || onMaterialDeleted || onMaterialUpdated),
  );
  const hasChallengeSubscription = Boolean(workspaceId && onChallengeUpdate);
  const hasGroupSubscription = Boolean(workspaceId && onGroupUpdate);
  const hasDiscussionSubscription = Boolean(workspaceId && onDiscussionUpdate);
  const hasWorkspaceWalletSubscription = Boolean(workspaceId && onWorkspaceWalletUpdate);
  const hasWorkspaceSubscription = Boolean(
    workspaceId && (
      hasMaterialSubscription
      || hasChallengeSubscription
      || hasGroupSubscription
      || hasDiscussionSubscription
      || hasWorkspaceWalletSubscription
    ),
  );
  const shouldConnect = Boolean(enabled) && (
    needsProgressQueue
    || needsWalletQueue
    || needsQuizAttemptGradingQueue
    || hasWorkspaceSubscription
  );
  const connectionKey = [
    hasWorkspaceSubscription ? `workspace:${workspaceId}` : null,
    needsProgressQueue ? "progress" : null,
    needsWalletQueue ? "wallet" : null,
    needsQuizAttemptGradingQueue ? "quiz-attempt-grading" : null,
    hasMaterialSubscription ? "material" : null,
    hasChallengeSubscription ? "challenge" : null,
    hasGroupSubscription ? "group" : null,
    hasDiscussionSubscription ? "discussion" : null,
    hasWorkspaceWalletSubscription ? "workspace-wallet" : null,
  ].filter(Boolean).join("|") || null;

  useEffect(() => {
    callbackRefs.current = {
      onMaterialUploaded,
      onMaterialDeleted,
      onMaterialUpdated,
      onGroupUpdate,
      onDiscussionUpdate,
      onProgress,
      onWalletUpdate,
      onWorkspaceWalletUpdate,
      onQuizAttemptGrading,
      onChallengeUpdate,
    };
  }, [
    onMaterialUploaded,
    onMaterialDeleted,
    onMaterialUpdated,
    onGroupUpdate,
    onDiscussionUpdate,
    onProgress,
    onWalletUpdate,
    onWorkspaceWalletUpdate,
    onQuizAttemptGrading,
    onChallengeUpdate,
  ]);

  // Lấy token từ localStorage
  const getAuthToken = useCallback(() => {
    try {
      return getAccessToken() || null;
    } catch (err) {
      console.error("Failed to get auth token:", err);
      return null;
    }
  }, []);

  // Kết nối WebSocket
  useEffect(() => {
    if (!shouldConnect || !connectionKey) {
      return;
    }

    const websocketUrl = getWebSocketUrl();
    if (!websocketUrl) {
      console.warn("STOMP WebSocket URL is not configured.");
      return;
    }

    shouldKeepRegistryOnCleanupRef.current = false;
    hasRequestedResyncRef.current = false;

    const restoredFromRegistry = registerActiveSocket(connectionKey, {
      workspaceId: workspaceId ?? null,
      type: hasWorkspaceSubscription ? "workspace" : "user",
    });

    const handleBeforeUnload = () => {
      shouldKeepRegistryOnCleanupRef.current = true;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const token = getAuthToken();
    const connectHeaders = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    if (!token) {
      console.warn("⚠️ STOMP: No JWT token found in localStorage");
    }

    // Tạo STOMP client với SockJS
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(websocketUrl),

      connectHeaders,

      debug: (str) => {
        console.log("STOMP Debug:", str);
      },

      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        isDeactivatingRef.current = false;
        console.log("✅ STOMP WebSocket connected");
        if (needsProgressQueue) {
          console.log("🔔 Subscribed channel: /user/queue/progress");
        }
        if (needsWalletQueue) {
          console.log("🔔 Subscribed channel: /user/queue/wallet");
        }
        if (needsQuizAttemptGradingQueue) {
          console.log("🔔 Subscribed channel: /user/queue/quiz-attempt-grading");
        }
        if (hasMaterialSubscription && workspaceId) {
          console.log(`🔔 Subscribed channel: /topic/workspace/${workspaceId}/material`);
        }
        if (hasChallengeSubscription && workspaceId) {
          console.log(`🔔 Subscribed channel: /topic/workspace/${workspaceId}/challenge`);
        }
        if (hasGroupSubscription && workspaceId) {
          console.log(`🔔 Subscribed channel: /topic/workspace/${workspaceId}/group`);
        }
        if (hasDiscussionSubscription && workspaceId) {
          console.log(`🔔 Subscribed channel: /topic/workspace/${workspaceId}/discussion`);
        }
        if (hasWorkspaceWalletSubscription && workspaceId) {
          console.log(`🔔 Subscribed channel: /topic/workspace/${workspaceId}/wallet`);
        }
        setIsConnected(true);

        if (!hasRequestedResyncRef.current) {
          hasRequestedResyncRef.current = true;
          if (hasMaterialSubscription) {
            callbackRefs.current.onMaterialUpdated?.({
              type: "SOCKET_RESTORED",
              status: "SYNC_REQUIRED",
              workspaceId,
              restoredFromRegistry,
              timestamp: Date.now(),
            });
          }
          if (hasGroupSubscription) {
            callbackRefs.current.onGroupUpdate?.({
              type: "SOCKET_RESTORED",
              workspaceId,
              restoredFromRegistry,
              timestamp: Date.now(),
            });
          }
          if (hasDiscussionSubscription) {
            callbackRefs.current.onDiscussionUpdate?.({
              type: "SOCKET_RESTORED",
              workspaceId,
              restoredFromRegistry,
              timestamp: Date.now(),
            });
          }
          if (needsWalletQueue) {
            callbackRefs.current.onWalletUpdate?.({
              type: "SOCKET_RESTORED",
              restoredFromRegistry,
              timestamp: Date.now(),
            });
          }
          if (hasWorkspaceWalletSubscription) {
            callbackRefs.current.onWorkspaceWalletUpdate?.({
              type: "SOCKET_RESTORED",
              workspaceId,
              restoredFromRegistry,
              timestamp: Date.now(),
            });
          }
        }

        // Subscribe to personal progress updates
        if (needsProgressQueue) {
          const progressSubscription = stompClient.subscribe(
            "/user/queue/progress",
            (message) => {
              try {
                const response = enrichProgressWithActiveTaskShape(JSON.parse(message.body));
                const materialEvent = resolveMaterialEventFromProgressPayload(response);
                console.log("📊 Progress update received:", response);
                console.log("   Progress status:", response.status);

                setLastMessage({ type: "progress", data: response, timestamp: Date.now() });
                callbackRefs.current.onProgress?.(response);

                if (materialEvent) {
                  console.log("🔄 Routed material event from progress channel:", materialEvent);
                  setLastMessage({
                    type: materialEvent.eventType,
                    data: materialEvent.material,
                    timestamp: Date.now(),
                  });

                  if (materialEvent.eventType === "material:uploaded") {
                    callbackRefs.current.onMaterialUploaded?.(materialEvent.material);
                  } else {
                    callbackRefs.current.onMaterialUpdated?.(materialEvent.material);
                  }
                }
              } catch (err) {
                console.error("Failed to parse progress message:", err);
              }
            }
          );
          subscriptionsRef.current.push(progressSubscription);
        }

        if (needsWalletQueue) {
          const walletSubscription = stompClient.subscribe(
            "/user/queue/wallet",
            (message) => {
              try {
                const response = JSON.parse(message.body);
                console.log("💳 Wallet update received:", response);
                setLastMessage({ type: "wallet:update", data: response, timestamp: Date.now() });
                callbackRefs.current.onWalletUpdate?.(response);
              } catch (err) {
                console.error("Failed to parse wallet message:", err);
              }
            }
          );
          subscriptionsRef.current.push(walletSubscription);
        }

        if (needsQuizAttemptGradingQueue) {
          const gradingSubscription = stompClient.subscribe(
            "/user/queue/quiz-attempt-grading",
            (message) => {
              try {
                const response = JSON.parse(message.body);
                console.log("🧪 Quiz attempt grading event:", response);
                setLastMessage({ type: "quiz:attempt-grading", data: response, timestamp: Date.now() });
                callbackRefs.current.onQuizAttemptGrading?.(response);
              } catch (err) {
                console.error("Failed to parse quiz attempt grading message:", err);
              }
            }
          );
          subscriptionsRef.current.push(gradingSubscription);
        }

        // Subscribe to workspace material updates
        if (hasMaterialSubscription && workspaceId) {
          const workspaceSubscription = stompClient.subscribe(
            `/topic/workspace/${workspaceId}/material`,
            (message) => {
              try {
                console.log("📨 Raw WebSocket message received:", message.body);
                const data = normalizeMaterialPayload(JSON.parse(message.body));
                console.log("📤 Workspace material update (parsed):", data);
                console.log("   - Type:", data.type);
                console.log("   - Status:", data.status);
                console.log("   - Material ID:", data.materialId);
                console.log("   - Full data:", JSON.stringify(data, null, 2));
                
                // Xử lý theo type của message
                if (data.type === "UPLOADED" || data.status === "UPLOADED" || data.status === "ACTIVE") {
                  console.log("✅ Triggering onMaterialUploaded callback");
                  setLastMessage({ type: "material:uploaded", data, timestamp: Date.now() });
                  callbackRefs.current.onMaterialUploaded?.(data);
                } else if (data.type === "DELETED" || data.status === "DELETED") {
                  console.log("🗑️ Triggering onMaterialDeleted callback");
                  setLastMessage({ type: "material:deleted", data, timestamp: Date.now() });
                  callbackRefs.current.onMaterialDeleted?.(data);
                } else if (data.type === "UPDATED" || ["UPDATED", "PROCESSING", "ERROR", "WARN", "REJECT"].includes(data.status)) {
                  console.log("🔄 Triggering onMaterialUpdated callback");
                  setLastMessage({ type: "material:updated", data, timestamp: Date.now() });
                  callbackRefs.current.onMaterialUpdated?.(data);
                } else {
                  console.warn("⚠️ Unknown message type/status:", { type: data.type, status: data.status });
                }
              } catch (err) {
                console.error("Failed to parse workspace material message:", err);
              }
            }
          );
          subscriptionsRef.current.push(workspaceSubscription);
        }

        // Subscribe to workspace challenge updates
        if (hasChallengeSubscription && workspaceId) {
          const challengeSubscription = stompClient.subscribe(
            `/topic/workspace/${workspaceId}/challenge`,
            (message) => {
              try {
                const data = JSON.parse(message.body);
                console.log("⚔️ Challenge update:", data);
                setLastMessage({ type: "challenge:update", data, timestamp: Date.now() });
                callbackRefs.current.onChallengeUpdate?.(data);
              } catch (err) {
                console.error("Failed to parse challenge message:", err);
              }
            }
          );
          subscriptionsRef.current.push(challengeSubscription);
        }

        if (hasGroupSubscription && workspaceId) {
          const groupSubscription = stompClient.subscribe(
            `/topic/workspace/${workspaceId}/group`,
            (message) => {
              try {
                const data = JSON.parse(message.body);
                console.log("👥 Group workspace update:", data);
                setLastMessage({ type: "group:update", data, timestamp: Date.now() });
                callbackRefs.current.onGroupUpdate?.(data);
              } catch (err) {
                console.error("Failed to parse group workspace message:", err);
              }
            }
          );
          subscriptionsRef.current.push(groupSubscription);
        }

        if (hasDiscussionSubscription && workspaceId) {
          const discussionSubscription = stompClient.subscribe(
            `/topic/workspace/${workspaceId}/discussion`,
            (message) => {
              try {
                const data = JSON.parse(message.body);
                console.log("💬 Discussion update:", data);
                setLastMessage({ type: "discussion:update", data, timestamp: Date.now() });
                callbackRefs.current.onDiscussionUpdate?.(data);
              } catch (err) {
                console.error("Failed to parse discussion message:", err);
              }
            }
          );
          subscriptionsRef.current.push(discussionSubscription);
        }

        if (hasWorkspaceWalletSubscription && workspaceId) {
          const workspaceWalletSubscription = stompClient.subscribe(
            `/topic/workspace/${workspaceId}/wallet`,
            (message) => {
              try {
                const data = JSON.parse(message.body);
                console.log("💳 Workspace wallet update:", data);
                setLastMessage({ type: "workspace-wallet:update", data, timestamp: Date.now() });
                callbackRefs.current.onWorkspaceWalletUpdate?.(data);
              } catch (err) {
                console.error("Failed to parse workspace wallet message:", err);
              }
            }
          );
          subscriptionsRef.current.push(workspaceWalletSubscription);
        }
      },

      onDisconnect: () => {
        if (isDeactivatingRef.current) {
          console.log("ℹ️ STOMP WebSocket disconnected (cleanup)");
        } else {
          console.log("❌ STOMP WebSocket disconnected");
          hasRequestedResyncRef.current = false;
        }
        setIsConnected(false);
      },

      onStompError: (frame) => {
        console.error("⚠️ STOMP error:", frame.headers["message"]);
        console.error("Details:", frame.body);
        hasRequestedResyncRef.current = false;
        setIsConnected(false);
      },

      onWebSocketError: (error) => {
        if (isDeactivatingRef.current) {
          return;
        }
        console.error("⚠️ WebSocket error:", error);
        hasRequestedResyncRef.current = false;
        setIsConnected(false);
      },
    });

    stompClientRef.current = stompClient;
    stompClient.activate();

    // Cleanup khi component unmount
    return () => {
      isDeactivatingRef.current = true;
      window.removeEventListener("beforeunload", handleBeforeUnload);

      if (!shouldKeepRegistryOnCleanupRef.current) {
        unregisterActiveSocket(connectionKey);
      }

      // Unsubscribe all subscriptions
      subscriptionsRef.current.forEach((subscription) => {
        try {
          subscription.unsubscribe();
        } catch (err) {
          console.error("Failed to unsubscribe:", err);
        }
      });
      subscriptionsRef.current = [];

      // Deactivate STOMP client
      if (stompClient.active) {
        stompClient.reconnectDelay = 0;
        stompClient.deactivate();
      }
      stompClientRef.current = null;
    };
  }, [
    connectionKey,
    getAuthToken,
    hasGroupSubscription,
    hasDiscussionSubscription,
    hasMaterialSubscription,
    hasWorkspaceSubscription,
    hasWorkspaceWalletSubscription,
    hasChallengeSubscription,
    needsProgressQueue,
    needsWalletQueue,
    needsQuizAttemptGradingQueue,
    shouldConnect,
    workspaceId,
  ]);

  // Gửi message qua WebSocket
  const send = useCallback((destination, body) => {
    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({
        destination: `/app${destination}`, // Auto-add /app prefix
        body: JSON.stringify(body),
      });
    } else {
      console.warn("STOMP not connected, cannot send to:", destination);
    }
  }, []);

  return {
    clientRef: stompClientRef,
    isConnected,
    lastMessage,
    send,
  };
}
