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

export { getUserProfile, getStoredToken };
