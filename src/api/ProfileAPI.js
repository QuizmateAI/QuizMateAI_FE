import api from "./api";
import i18n from "@/i18n";
import { getCachedProfile, setCachedProfile, clearUserCache } from "@/Utils/userCache";
import { getCurrentUser } from "@/api/Authentication";
import { normalizeUserProfile } from "@/Utils/userProfile";

function getStoredToken() {
  return localStorage.getItem("accessToken") || localStorage.getItem("jwt_token") || "";
}

/**
 * Lấy profile user - dùng cache trước, fetch khi hết hạn (5 phút)
 * Lần load thứ 2 ~500ms thay vì gọi API
 */
async function getUserProfile() {
  const token = getStoredToken();

  if (!token) {
    throw new Error(i18n.t("error.missingAuthToken"));
  }

  // Cache trước - trả về ngay nếu còn valid
  const cached = getCachedProfile();
  if (cached) {
    return cached;
  }

  const hasAccessToken = !!localStorage.getItem("accessToken");

  const response = hasAccessToken
    ? await api.get("/user/profile")
    : await api.get("/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

  const userProfile = response?.data?.data ?? response?.data ?? response ?? {};
  const profile = normalizeUserProfile(userProfile, getCurrentUser() || {});

  setCachedProfile(profile);
  return profile;
}

/**
 * Cập nhật thông tin profile người dùng
 * @param {Object} profileData - Dữ liệu profile cần cập nhật
 * @param {string} profileData.fullName - Họ tên đầy đủ
 * @param {string} profileData.birthday - Ngày sinh (YYYY-MM-DD)
 * @param {string} profileData.avatar - URL avatar
 */
async function updateUserProfile(profileData) {
  const token = getStoredToken();

  if (!token) {
    throw new Error(i18n.t("error.missingAuthToken"));
  }

  const payload = {
    fullName: profileData.fullName,
    birthday: profileData.birthday,
    avatar: profileData.avatar,
  };
  if (profileData.preferredLanguage !== undefined) {
    payload.preferredLanguage = profileData.preferredLanguage;
  }

  const response = await api.put("/user/profile", payload);

  clearUserCache(); // Invalidate cache sau khi cập nhật
  return response?.data || response;
}

/**
 * Cập nhật ngôn ngữ ưa thích của người dùng (best-effort — không throw nếu lỗi).
 * Gọi sau khi i18n.changeLanguage() đã apply phía client.
 */
async function updateUserPreferredLanguage(language) {
  const token = getStoredToken();
  if (!token) return null;

  const normalized = typeof language === "string" ? language.trim().toLowerCase() : "";
  if (!normalized) return null;

  try {
    await api.put("/user/profile", { preferredLanguage: normalized });
    clearUserCache();
    return normalized;
  } catch (error) {
    console.warn("[ProfileAPI] Failed to persist preferred language:", error);
    return null;
  }
}

/**
 * Cập nhật themeMode (light/dark) của người dùng (best-effort — không throw nếu lỗi).
 * Gọi sau khi dark mode đã toggle phía client.
 */
async function updateUserThemeMode(themeMode) {
  const token = getStoredToken();
  if (!token) return null;

  const normalized = typeof themeMode === "string" ? themeMode.trim().toLowerCase() : "";
  if (!normalized) return null;

  try {
    await api.put("/user/profile", { themeMode: normalized });
    clearUserCache();
    return normalized;
  } catch (error) {
    console.warn("[ProfileAPI] Failed to persist theme mode:", error);
    return null;
  }
}

/**
 * Đổi mật khẩu người dùng
 * @param {Object} passwordData - Dữ liệu mật khẩu
 * @param {string} passwordData.oldPassword - Mật khẩu cũ
 * @param {string} passwordData.newPassword - Mật khẩu mới
 * @param {string} passwordData.confirmNewPassword - Xác nhận mật khẩu mới
 */
async function changePassword(passwordData) {
  const token = getStoredToken();

  if (!token) {
    throw new Error(i18n.t("error.missingAuthToken"));
  }

  const response = await api.put("/user/password", {
    oldPassword: passwordData.oldPassword,
    newPassword: passwordData.newPassword,
    confirmNewPassword: passwordData.confirmNewPassword,
  });

  return response?.data || response;
}

/**
 * Upload avatar lên Cloudflare R2 và cập nhật vào profile
 * @param {File} file - File hình ảnh avatar
 * @returns {Promise<string>} URL avatar đã upload
 */
async function uploadAvatar(file) {
  const token = getStoredToken();

  if (!token) {
    throw new Error(i18n.t("error.missingAuthToken"));
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/user/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  clearUserCache(); // Invalidate cache sau khi đổi avatar
  return response?.data || response;
}

export { getUserProfile, getStoredToken, updateUserProfile, updateUserPreferredLanguage, updateUserThemeMode, changePassword, uploadAvatar };
