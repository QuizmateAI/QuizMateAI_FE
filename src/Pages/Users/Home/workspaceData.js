const workspaceData = [
  {
    id: 1,
    title: "Strategic Educational Workflow and Mocktest Integration Guide",
    emoji: "🎓",
    description: "Tổng hợp tài liệu và ghi chú nhanh.",
    updatedAt: "2026-02-05T08:30:00+07:00",
    count: "12 ghi chú",
    dateAt: "2026-01-24T09:00:00+07:00",
    sources: 1,
    color: "bg-purple-50",
    darkColor: "bg-purple-950/60",
  },
  {
    id: 2,
    title: "QuizMate AI System Architecture and Functional Specifications",
    emoji: "🤖",
    description: "Theo dõi roadmap và KPI theo quý.",
    updatedAt: "2026-02-04T17:10:00+07:00",
    count: "8 ghi chú",
    dateAt: "2026-01-31T09:00:00+07:00",
    sources: 6,
    color: "bg-yellow-50",
    darkColor: "bg-yellow-950/60",
  },
  {
    id: 3,
    title: "Roadmap Learning Sprint",
    emoji: "🧭",
    description: "Lộ trình học tập 4 tuần.",
    updatedAt: "2026-02-02T09:20:00+07:00",
    count: "5 ghi chú",
    dateAt: "2026-01-23T09:00:00+07:00",
    sources: 2,
    color: "bg-blue-50",
    darkColor: "bg-blue-950/60",
  },
  {
    id: 4,
    title: "AI Companion Voice Notes",
    emoji: "🎧",
    description: "Ghi chú hội thoại và phản hồi.",
    updatedAt: "2026-01-31T14:45:00+07:00",
    count: "9 ghi chú",
    dateAt: "2026-01-21T09:00:00+07:00",
    sources: 3,
    color: "bg-green-50",
    darkColor: "bg-green-950/60",
  },
  {
    id: 5,
    title: "Design Review Checklist",
    emoji: "🧩",
    description: "Theo dõi checklist đánh giá thiết kế.",
    updatedAt: "2026-01-29T10:00:00+07:00",
    count: "7 ghi chú",
    dateAt: "2026-01-19T09:00:00+07:00",
    sources: 2,
    color: "bg-pink-50",
    darkColor: "bg-pink-950/60",
  },
  {
    id: 6,
    title: "Study Group Weekly Summary",
    emoji: "📚",
    description: "Tổng hợp tiến độ nhóm học.",
    updatedAt: "2026-01-27T09:30:00+07:00",
    count: "6 ghi chú",
    dateAt: "2026-01-18T09:00:00+07:00",
    sources: 4,
    color: "bg-orange-50",
    darkColor: "bg-orange-950/60",
  },
  {
    id: 7,
    title: "Analytics Insights",
    emoji: "📈",
    description: "Tóm tắt dữ liệu hiệu suất học tập.",
    updatedAt: "2026-01-25T16:05:00+07:00",
    count: "4 ghi chú",
    dateAt: "2026-01-16T09:00:00+07:00",
    sources: 2,
    color: "bg-indigo-50",
    darkColor: "bg-indigo-950/60",
  },
  {
    id: 8,
    title: "Knowledge Map Draft",
    emoji: "🗺️",
    description: "Bản đồ kiến thức chủ đề chính.",
    updatedAt: "2026-01-22T13:50:00+07:00",
    count: "10 ghi chú",
    dateAt: "2026-01-14T09:00:00+07:00",
    sources: 5,
    color: "bg-teal-50",
    darkColor: "bg-teal-950/60",
  },
  {
    id: 9,
    title: "Productivity Experiments",
    emoji: "⚡",
    description: "Theo dõi các thử nghiệm năng suất.",
    updatedAt: "2026-01-15T11:15:00+07:00",
    count: "3 ghi chú",
    dateAt: "2026-01-10T09:00:00+07:00",
    sources: 1,
    color: "bg-rose-50",
    darkColor: "bg-rose-950/60",
  },
  {
    id: 10,
    title: "Learning Goals Q1",
    emoji: "🎯",
    description: "Mục tiêu học tập theo quý.",
    updatedAt: "2026-01-05T09:00:00+07:00",
    count: "11 ghi chú",
    dateAt: "2026-01-05T09:00:00+07:00",
    sources: 3,
    color: "bg-sky-50",
    darkColor: "bg-sky-950/60",
  },
];

export default workspaceData;

function formatUpdatedTime(updatedAt) {
  // Logic nghiệp vụ: hiển thị thời gian cập nhật dạng tương đối
  const now = new Date();
  const updatedTime = new Date(updatedAt);
  const diffMs = now.getTime() - updatedTime.getTime();

  if (diffMs <= 0) {
    return "Cập nhật vừa xong";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 60) {
    return `Cập nhật ${diffMinutes} phút trước`;
  }

  if (diffHours < 24) {
    return `Cập nhật ${diffHours} giờ trước`;
  }

  if (diffDays < 7) {
    return `Cập nhật ${diffDays} ngày trước`;
  }

  if (diffWeeks < 4) {
    return `Cập nhật ${diffWeeks} tuần trước`;
  }

  if (diffMonths < 12) {
    return `Cập nhật ${diffMonths} tháng trước`;
  }

  return `Cập nhật ${diffYears} năm trước`;
}

function formatDate(dateAt) {
  // Logic nghiệp vụ: hiển thị ngày theo định dạng tiếng Việt
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateAt));
}

export { formatDate, formatUpdatedTime };
