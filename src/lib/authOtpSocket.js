import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWebSocketUrl } from '@/api/api';

export function waitForOtpStatus(email, sendOtpRequest, options = {}) {
  const { timeoutMs = 30000 } = options;

  return new Promise((resolve, reject) => {
    const wsUrl = getWebSocketUrl();
    const topic = `/topic/otp/${email}`;
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 1500,
    });

    let settled = false;
    let otpRequestSent = false;
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
      if (subscription) {
        subscription.unsubscribe();
        subscription = undefined;
      }

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

      if (!otpRequestSent) {
        otpRequestSent = true;
        try {
          const response = await sendOtpRequest();

          if (![0, 200, 202].includes(response.statusCode)) {
            fail(response.message || 'Gửi OTP thất bại, vui lòng thử lại');
          }
        } catch (error) {
          fail(error?.message || 'Gửi OTP thất bại, vui lòng thử lại');
        }
      }
    };

    client.onStompError = (frame) => {
      const message = frame.headers?.message || 'Kết nối WebSocket gửi OTP gặp lỗi';
      if (/401|403|unauthorized|forbidden/i.test(message)) {
        fail(message);
      }
    };

    client.onWebSocketError = () => {
      if (settled) return;
      console.warn('WebSocket OTP dang reconnect...');
    };

    timeoutId = setTimeout(() => {
      fail('Hệ thống gửi OTP phản hồi chậm, vui lòng thử lại');
    }, timeoutMs);

    client.activate();
  });
}
