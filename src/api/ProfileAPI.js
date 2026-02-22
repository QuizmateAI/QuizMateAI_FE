import api from "./api";

function getStoredToken() {
  // Logic nghiệp vụ: ưu tiên token hiện tại, fallback key JWT cũ để tương thích.
  return localStorage.getItem("accessToken") || localStorage.getItem("jwt_token") || "";
}

async function getUserProfile() {
  const token = getStoredToken();

  if (!token) {
    throw new Error("Thiếu token đăng nhập");
  }

  try {
    const hasAccessToken = !!localStorage.getItem("accessToken");

    // Nếu interceptor đã thêm accessToken thì gọi không cần header thủ công.
    // Nếu dùng fallback (jwt_token) thì đính kèm header ở đây.
    const response = hasAccessToken
      ? await api.get("/user/profile")
      : await api.get("/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

    // `api` interceptor có thể trả về `response.data` hoặc toàn bộ response.
    const userProfile = response?.data || response || {};

    return {
      email: userProfile.email || "",
      username: userProfile.username || "",
      fullName: userProfile.fullName || userProfile.username || "",
      avatarUrl: userProfile.avatar || userProfile.avatarUrl || "",
      birthday: userProfile.birthday || null,
    };
  } catch (error) {
    // Re-throw để caller có thể xử lý (giữ nguyên thông điệp lỗi từ server nếu có)
    throw error;
  }
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

  try {
    const response = await api.put("/user/profile", {
      fullName: profileData.fullName,
      birthday: profileData.birthday,
      avatar: profileData.avatar,
    });

    return response?.data || response;
  } catch (error) {
    throw error;
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
    throw new Error("Thiếu token đăng nhập");
  }

  try {
    const response = await api.put("/user/password", {
      oldPassword: passwordData.oldPassword,
      newPassword: passwordData.newPassword,
      confirmNewPassword: passwordData.confirmNewPassword,
    });

    return response?.data || response;
  } catch (error) {
    throw error;
  }
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

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/user/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    // Server trả về URL avatar trong response.data
    return response?.data || response;
  } catch (error) {
    throw error;
  }
}

export { getUserProfile, getStoredToken, updateUserProfile, changePassword, uploadAvatar };
