import React from "react";
import { Folder, Sparkles } from "lucide-react";

const workspaces = [
  {
    id: 1,
    name: "AI Research",
    description: "Tổng hợp tài liệu và ghi chú nhanh.",
    updated: "Cập nhật 2 giờ trước",
    count: "12 ghi chú",
  },
  {
    id: 2,
    name: "Product Strategy",
    description: "Theo dõi roadmap và KPI theo quý.",
    updated: "Cập nhật hôm qua",
    count: "8 ghi chú",
  },
  {
    id: 3,
    name: "Study Sprint",
    description: "Lộ trình học tập 4 tuần.",
    updated: "Cập nhật 3 ngày trước",
    count: "5 ghi chú",
  },
];

function UserWorkspace({ viewMode }) {
  // Logic nghiệp vụ: chuyển đổi hiển thị giữa lưới và danh sách
  const isList = viewMode === "list";

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium text-[#303030]">Workspace của tôi</h2>
        <button className="text-sm text-gray-600 hover:text-gray-900">Quản lý</button>
      </div>

      <div
        className={
          isList
            ? "flex flex-col gap-3"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        }
      >
        {workspaces.map((workspace) => (
          <div
            key={workspace.id}
            className={`rounded-2xl border border-gray-200 bg-white p-5 flex items-start gap-4 hover:shadow-sm transition-all ${
              isList ? "h-24 items-center" : "min-h-[160px]"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Folder className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-900">{workspace.name}</p>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xs text-gray-600 mt-1">{workspace.description}</p>
              <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                <span>{workspace.updated}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span>{workspace.count}</span>
              </div>
            </div>
            {isList && (
              <button className="text-xs text-gray-600 hover:text-gray-900">Mở</button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default UserWorkspace;
