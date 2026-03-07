import { useEffect, useRef, useCallback, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

/**
 * Hook quản lý WebSocket connection cho realtime updates (STOMP over SockJS)
 * @param {Object} options - WebSocket options
 * @param {string} options.workspaceId - ID của workspace cần theo dõi
 * @param {string} options.groupId - ID của group cần theo dõi (optional)
 * @param {Function} options.onMaterialUploaded - Callback khi có tài liệu mới được upload
 * @param {Function} options.onMaterialDeleted - Callback khi có tài liệu bị xóa
 * @param {Function} options.onMaterialUpdated - Callback khi có tài liệu được cập nhật
 * @param {Function} options.onProgress - Callback khi có progress update
 * @param {boolean} options.enabled - Bật/tắt WebSocket connection (mặc định: true)
 */
export function useWebSocket({
  workspaceId,
  groupId,
  onMaterialUploaded,
  onMaterialDeleted,
  onMaterialUpdated,
  onProgress,
  enabled = true,
} = {}) {
  const stompClientRef = useRef(null);
  const subscriptionsRef = useRef([]);
  const isDeactivatingRef = useRef(false);
  const callbackRefs = useRef({
    onMaterialUploaded,
    onMaterialDeleted,
    onMaterialUpdated,
    onProgress,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    callbackRefs.current = {
      onMaterialUploaded,
      onMaterialDeleted,
      onMaterialUpdated,
      onProgress,
    };
  }, [onMaterialUploaded, onMaterialDeleted, onMaterialUpdated, onProgress]);

  // Lấy token từ localStorage
  const getAuthToken = useCallback(() => {
    try {
      return (
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token")
      );
    } catch (err) {
      console.error("Failed to get auth token:", err);
      return null;
    }
  }, []);

  // Kết nối WebSocket
  useEffect(() => {
    // Không kết nối nếu disabled hoặc không có workspace/group ID
    if (!enabled || (!workspaceId && !groupId)) {
      return;
    }

    const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:8080/ws-quiz";
    const token = getAuthToken();
    const connectHeaders = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    if (!token) {
      console.warn("⚠️ STOMP: No JWT token found in localStorage");
    }

    // Tạo STOMP client với SockJS
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(WS_URL),

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
        console.log("🔔 Subscribed channel: /user/queue/progress");
        if (workspaceId) {
          console.log(`🔔 Subscribed channel: /topic/workspace/${workspaceId}/material`);
        }
        if (groupId) {
          console.log(`🔔 Subscribed channel: /topic/group/${groupId}/material`);
        }
        setIsConnected(true);

        // Subscribe to personal progress updates
        const progressSubscription = stompClient.subscribe(
          "/user/queue/progress",
          (message) => {
            try {
              const response = JSON.parse(message.body);
              console.log("📊 Progress update received:", response);
              console.log("   Progress status:", response.status);
              
              // Nếu progress COMPLETED, xử lý như material update
              if (response.status === 'COMPLETED' && response.data) {
                const materialData = response.data;
                console.log("✅ Progress COMPLETED - Material data:", materialData);
                console.log("   Material ID:", materialData.materialId);
                console.log("   Material status:", materialData.status);
                
                // Route dựa trên material status
                if (materialData.status === 'ACTIVE') {
                  console.log("🎉 Material upload completed successfully");
                  setLastMessage({ type: "material:uploaded", data: materialData, timestamp: Date.now() });
                  callbackRefs.current.onMaterialUploaded?.(materialData);
                } else if (materialData.status === 'ERROR') {
                  console.log("❌ Material upload failed");
                  setLastMessage({ type: "material:updated", data: materialData, timestamp: Date.now() });
                  callbackRefs.current.onMaterialUpdated?.(materialData);
                } else if (materialData.status === 'PROCESSING') {
                  console.log("⏳ Material still processing");
                  setLastMessage({ type: "material:updated", data: materialData, timestamp: Date.now() });
                  callbackRefs.current.onMaterialUpdated?.(materialData);
                }
              } else {
                // Progress update khác (không phải COMPLETED)
                setLastMessage({ type: "progress", data: response, timestamp: Date.now() });
                callbackRefs.current.onProgress?.(response);

                // Nhiều luồng BE gửi tiến trình qua /user/queue/progress thay vì /topic/*.
                // Nếu screen không truyền onProgress, vẫn kích hoạt onMaterialUpdated để reload list realtime.
                if (response.status === 'ERROR' || response.status === 'REJECTED' || response.status === 'PROCESSING') {
                  const fallbackMaterial =
                    typeof response.data === 'object' && response.data !== null
                      ? response.data
                      : { status: response.status, message: response.data };
                  console.log("🔄 Triggering fallback onMaterialUpdated from progress channel", fallbackMaterial);
                  callbackRefs.current.onMaterialUpdated?.(fallbackMaterial);
                }
              }
            } catch (err) {
              console.error("Failed to parse progress message:", err);
            }
          }
        );
        subscriptionsRef.current.push(progressSubscription);

        // Subscribe to workspace material updates
        if (workspaceId) {
          const workspaceSubscription = stompClient.subscribe(
            `/topic/workspace/${workspaceId}/material`,
            (message) => {
              try {
                console.log("📨 Raw WebSocket message received:", message.body);
                const data = JSON.parse(message.body);
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
                } else if (data.type === "UPDATED" || data.status === "UPDATED" || data.status === "PROCESSING" || data.status === "ERROR") {
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

        // Subscribe to group material updates
        if (groupId) {
          const groupSubscription = stompClient.subscribe(
            `/topic/group/${groupId}/material`,
            (message) => {
              try {
                console.log("📨 Raw WebSocket message received (GROUP):", message.body);
                const data = JSON.parse(message.body);
                console.log("📤 Group material update (parsed):", data);
                console.log("   - Type:", data.type);
                console.log("   - Status:", data.status);
                console.log("   - Material ID:", data.materialId);
                
                // Xử lý theo type của message
                if (data.type === "UPLOADED" || data.status === "UPLOADED" || data.status === "ACTIVE") {
                  console.log("✅ Triggering onMaterialUploaded callback (GROUP)");
                  setLastMessage({ type: "material:uploaded", data, timestamp: Date.now() });
                  callbackRefs.current.onMaterialUploaded?.(data);
                } else if (data.type === "DELETED" || data.status === "DELETED") {
                  console.log("🗑️ Triggering onMaterialDeleted callback (GROUP)");
                  setLastMessage({ type: "material:deleted", data, timestamp: Date.now() });
                  callbackRefs.current.onMaterialDeleted?.(data);
                } else if (data.type === "UPDATED" || data.status === "UPDATED" || data.status === "PROCESSING" || data.status === "ERROR") {
                  console.log("🔄 Triggering onMaterialUpdated callback (GROUP)");
                  setLastMessage({ type: "material:updated", data, timestamp: Date.now() });
                  callbackRefs.current.onMaterialUpdated?.(data);
                } else {
                  console.warn("⚠️ Unknown message type/status (GROUP):", { type: data.type, status: data.status });
                }
              } catch (err) {
                console.error("Failed to parse group material message:", err);
              }
            }
          );
          subscriptionsRef.current.push(groupSubscription);
        }
      },

      onDisconnect: () => {
        if (isDeactivatingRef.current) {
          console.log("ℹ️ STOMP WebSocket disconnected (cleanup)");
        } else {
          console.log("❌ STOMP WebSocket disconnected");
        }
        setIsConnected(false);
      },

      onStompError: (frame) => {
        console.error("⚠️ STOMP error:", frame.headers["message"]);
        console.error("Details:", frame.body);
        setIsConnected(false);
      },

      onWebSocketError: (error) => {
        if (isDeactivatingRef.current) {
          return;
        }
        console.error("⚠️ WebSocket error:", error);
        setIsConnected(false);
      },
    });

    stompClientRef.current = stompClient;
    stompClient.activate();

    // Cleanup khi component unmount
    return () => {
      isDeactivatingRef.current = true;

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
  }, [workspaceId, groupId, enabled, getAuthToken]);

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
    client: stompClientRef.current,
    isConnected,
    lastMessage,
    send,
  };
}
