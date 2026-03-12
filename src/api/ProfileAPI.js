import api from "./api";
import { getCachedProfile, setCachedProfile, clearUserCache } from "@/Utils/userCache";

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
    throw new Error("Thiếu token đăng nhập");
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

  const userProfile = response?.data || response || {};

  const profile = {
    email: userProfile.email || "",
    username: userProfile.username || "",
    fullName: userProfile.fullName || userProfile.username || "",
    avatarUrl: userProfile.avatar || userProfile.avatarUrl || "",
    birthday: userProfile.birthday || null,
  };

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
    throw new Error("Thiếu token đăng nhập");
  }

  const response = await api.put("/user/profile", {
    fullName: profileData.fullName,
    birthday: profileData.birthday,
    avatar: profileData.avatar,
  });

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
    throw new Error("Thiếu token đăng nhập");
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
    throw new Error("Thiếu token đăng nhập");
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

export { getUserProfile, getStoredToken, updateUserProfile, changePassword, uploadAvatar };
