import React from "react";
import { Users, Bell } from "lucide-react";

const groups = [
  {
    id: 1,
    name: "Front-end Bootcamp",
    members: "12 thành viên",
    updates: "2 thông báo mới",
  },
  {
    id: 2,
    name: "AI Companion Study",
    members: "7 thành viên",
    updates: "1 bài tập mới",
  },
  {
    id: 3,
    name: "Product Design",
    members: "9 thành viên",
    updates: "Không có cập nhật",
  },
];

function UserGroup({ viewMode }) {
  // Logic nghiệp vụ: hiển thị badge khi có thông báo
  const isList = viewMode === "list";

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium text-[#303030]">Nhóm của tôi</h2>
        <button className="text-sm text-gray-600 hover:text-gray-900">Tạo nhóm</button>
      </div>

      <div
        className={
          isList
            ? "flex flex-col gap-3"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        }
      >
        {groups.map((group) => (
          <div
            key={group.id}
            className={`rounded-2xl border border-gray-200 bg-white p-5 flex items-start gap-4 hover:shadow-sm transition-all ${
              isList ? "h-24 items-center" : "min-h-[160px]"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-900">{group.name}</p>
                {group.updates !== "Không có cập nhật" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    <Bell className="w-3 h-3" />
                    {group.updates}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1">{group.members}</p>
              <p className="text-xs text-gray-500 mt-2">{group.updates}</p>
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

export default UserGroup;
