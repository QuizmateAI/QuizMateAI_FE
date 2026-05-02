import api from "./api";
import i18n from "@/i18n";
import { getStoredToken, updateUserPreferredLanguage, updateUserThemeMode } from "./ProfilePreferencesAPI";
import { getCachedProfile, setCachedProfile, clearUserCache } from "@/utils/userCache";
import { getCurrentUser } from "@/api/Authentication";
import { normalizeUserProfile } from "@/utils/userProfile";
import { hasAccessToken } from "@/utils/tokenStorage";

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

  const hasInMemoryAccessToken = hasAccessToken();

  const response = hasInMemoryAccessToken
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

async function getProfileLearningSummary() {
  const token = getStoredToken();

  if (!token) {
    throw new Error(i18n.t("error.missingAuthToken"));
  }

  const response = await api.get("/user/profile/learning-summary");
  return response?.data?.data ?? response?.data ?? response ?? {};
}

export {
  getUserProfile,
  getStoredToken,
  updateUserProfile,
  updateUserPreferredLanguage,
  updateUserThemeMode,
  changePassword,
  uploadAvatar,
  getProfileLearningSummary,
};
