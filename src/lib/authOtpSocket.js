import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

function buildWebSocketUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.quizmateai.io.vn';
  const normalizedUrl = new URL(baseUrl);
  const normalizedPath = normalizedUrl.pathname.replace(/\/+$/, '').replace(/\/api$/, '');

  return `${normalizedUrl.origin}${normalizedPath}/ws-quiz`;
}

export function waitForOtpStatus(email, sendOtpRequest, options = {}) {
  const { timeoutMs = 30000 } = options;

  return new Promise((resolve, reject) => {
    const wsUrl = buildWebSocketUrl();
    const topic = `/topic/otp/${email}`;
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 0,
    });

    let settled = false;
    let subscription;
    let timeoutId;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (subscription) {
        subscription.unsubscribe();
        subscription = undefined;
      }

      if (client.active) {
        void client.deactivate();
      }
    };

    const fail = (message) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error(message));
    };

    client.onConnect = async () => {
      subscription = client.subscribe(topic, (message) => {
        if (settled) {
          return;
        }

        try {
          const payload = JSON.parse(message.body);
          settled = true;
          cleanup();
          resolve(payload);
        } catch {
          fail('Không thể đọc trạng thái gửi OTP từ máy chủ');
        }
      });

      try {
        const response = await sendOtpRequest();

        if (![0, 200, 202].includes(response.statusCode)) {
          fail(response.message || 'Gửi OTP thất bại, vui lòng thử lại');
        }
      } catch (error) {
        fail(error?.message || 'Gửi OTP thất bại, vui lòng thử lại');
      }
    };

    client.onStompError = (frame) => {
      fail(frame.headers?.message || 'Kết nối WebSocket gửi OTP gặp lỗi');
    };

    client.onWebSocketError = () => {
      fail('Không thể kết nối WebSocket để nhận trạng thái OTP');
    };

    timeoutId = setTimeout(() => {
      fail('Hệ thống gửi OTP phản hồi chậm, vui lòng thử lại');
    }, timeoutMs);

    client.activate();
  });
}