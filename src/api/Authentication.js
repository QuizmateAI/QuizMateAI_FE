import api from './api';
import { setCachedProfile, setCachedSubscription, clearUserCache } from '@/utils/userCache';
import { normalizeUserProfile } from '@/utils/userProfile';
import { queryClient } from '@/lib/queryClient';
import { clearPlanPurchaseState } from '@/utils/planPurchaseState';
import {
  clearCurrentUser,
  getCurrentUser as getCurrentUserFromStorage,
  setCurrentUser,
} from '@/lib/currentUser';
import {
  clearTokens,
  getAccessToken,
  hasAccessToken,
  setTokens,
} from '@/utils/tokenStorage';

// ======================= AUTH API SERVICES =======================

// Auth requests in production may wait on DB, OAuth, or email providers longer
// than the generic client timeout used for the rest of the app.
const AUTH_REQUEST_TIMEOUT_MS = 30000;

export const register = async (userData) => {
    const response = await api.post('/auth/register', userData, {
        timeout: AUTH_REQUEST_TIMEOUT_MS,
    });
    return response;
};

function saveLoginDataToCache(data) {
    clearPlanPurchaseState();
    if (data?.user) {
        const profile = normalizeUserProfile(data.user, data);
        setCachedProfile(profile);
    }
    setCachedSubscription(data?.subscription ?? null);
    // Groups từ login → React Query cache → tab Nhóm load instant (<1s)
    if (Array.isArray(data?.groups) && data.groups.length >= 0) {
        queryClient.setQueryData(['groups'], data.groups);
    }
    // Đảm bảo mọi query còn lại trong cache (nếu có từ session cũ) được refetch
    // với token mới → tránh tình trạng user phải reload trang sau khi login.
    queryClient.invalidateQueries();
}

function notifyAuthChanged(type) {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent('auth:changed', {
        detail: {
            type,
            at: Date.now(),
        },
    }));
}

function clearAuthState() {
    clearTokens();
    clearCurrentUser();
    clearUserCache();
    clearPlanPurchaseState();
    queryClient.clear();
}

export const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials, {
        timeout: AUTH_REQUEST_TIMEOUT_MS,
    });

    // Lưu token và thông tin user nếu đăng nhập thành công.
    // Lưu access token để reload trang không làm mất phiên đăng nhập.
    // Nếu BE set refresh cookie httpOnly thì browser vẫn tự gửi cookie đó khi refresh token.
    if (response.statusCode === 200 || response.statusCode === 0) {
        const { accessToken, refreshToken, userID, username, role, email, authProvider } = response.data;

        setTokens({ accessToken, refreshToken });
        setCurrentUser({ userID, username, role, email, authProvider });
        // Cache profile + subscription từ BE (lần load sau chỉ verify token)
        saveLoginDataToCache(response.data);
        notifyAuthChanged('login');
    }

    return response;
};

export const checkUsername = async (username) => {
    const response = await api.get(`/auth/check-username?username=${encodeURIComponent(username)}`);
    return response;
};

export const checkEmail = async (email) => {
    const response = await api.get(`/auth/check-email?email=${encodeURIComponent(email)}`);
    return response;
};

export const googleLogin = async (idToken) => {
    const response = await api.post('/auth/google-login', { idToken }, {
        timeout: AUTH_REQUEST_TIMEOUT_MS,
    });

    // See login() above — keep access token across reloads, cookie refresh still works if available.
    if (response.statusCode === 200 || response.statusCode === 0) {
        const { accessToken, refreshToken, userID, username, role, email, authProvider } = response.data;

        setTokens({ accessToken, refreshToken });
        setCurrentUser({ userID, username, role, email, authProvider });
        saveLoginDataToCache(response.data);
        notifyAuthChanged('login');
    }

    return response;
};

export const sendOTP = async (email) => {
    const response = await api.post('/auth/send-otp', { email }, {
        timeout: AUTH_REQUEST_TIMEOUT_MS,
    });
    return response;
};

const OTP_FAILURE_MESSAGE_PATTERNS = [
    /khong hop le/i,
    /không hợp lệ/i,
    /invalid/i,
    /khong dung/i,
    /không đúng/i,
    /incorrect/i,
    /het han/i,
    /hết hạn/i,
    /expired/i,
    /that bai/i,
    /thất bại/i,
    /fail/i,
];

const isOtpVerifySuccess = (response) => {
    if (!response || typeof response !== 'object') {
        return false;
    }

    const hasSuccessStatus = response.statusCode === 200 || response.statusCode === 0;
    if (!hasSuccessStatus) {
        return false;
    }

    const payload = response.data;
    if (typeof payload === 'boolean' && payload === false) {
        return false;
    }

    if (payload && typeof payload === 'object') {
        if (payload.success === false || payload.valid === false || payload.isValid === false) {
            return false;
        }
    }

    const message = typeof response.message === 'string' ? response.message.trim() : '';
    if (message && OTP_FAILURE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) {
        return false;
    }

    return true;
};

export const verifyOTP = async (email, otp) => {
    const response = await api.post(
        '/auth/verify-otp',
        { email, otp },
        {
            timeout: AUTH_REQUEST_TIMEOUT_MS,
        },
    );

    if (!isOtpVerifySuccess(response)) {
        const fallbackMessage = 'Xác thực OTP thất bại, mã không đúng hoặc đã hết hạn';
        throw {
            statusCode: response?.statusCode ?? 400,
            code: response?.code,
            message: response?.message || fallbackMessage,
            data: response,
        };
    }

    return response;
};

export const resetPassword = async (email, otp, newPassword) => {
    const response = await api.post(
        '/auth/reset-password',
        { email, otp, newPassword },
        {
            timeout: AUTH_REQUEST_TIMEOUT_MS,
        },
    );
    return response;
};

export const logout = () => {
    const token = getAccessToken();

    // Dọn local state ngay để UI chuyển trạng thái tức thì.
    clearAuthState();
    notifyAuthChanged('logout');

    // Gọi BE logout song song để revoke token + clear refresh cookie phía server.
    if (token) {
        void api.post('/auth/logout', null, {
            skipAuthRedirect: true,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }).catch(() => {
            // Không block UX khi request logout thất bại.
        });
    }
};

export const getCurrentUser = () => {
    return getCurrentUserFromStorage();
};

export const isAuthenticated = () => {
    return hasAccessToken();
};
