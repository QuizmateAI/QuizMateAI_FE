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

      {isList ? (
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[minmax(240px,2fr)_minmax(140px,0.8fr)_minmax(160px,1fr)_minmax(120px,0.6fr)_32px] gap-4 px-4 py-3 text-xs font-semibold text-gray-500">
            <span>Tiêu đề / Title</span>
            <span>Thành viên / Members</span>
            <span>Cập nhật / Updates</span>
            <span>Vai trò / Role</span>
            <span />
          </div>
          <div className="divide-y divide-gray-200">
            {groups.map((group) => (
              <div
                key={group.id}
                className="grid grid-cols-[minmax(240px,2fr)_minmax(140px,0.8fr)_minmax(160px,1fr)_minmax(120px,0.6fr)_32px] gap-4 px-4 py-3 text-sm text-gray-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">👥</span>
                  <span className="truncate text-gray-900 font-medium">{group.name}</span>
                </div>
                <span className="text-xs text-gray-600 truncate">{group.members}</span>
                <span className="text-xs text-gray-600 truncate">{group.updates}</span>
                <span className="text-xs text-gray-600">Owner</span>
                <button className="text-gray-400 hover:text-gray-600">⋮</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 flex items-start gap-4 hover:shadow-sm transition-all overflow-hidden min-h-[160px]"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{group.name}</p>
                  {group.updates !== "Không có cập nhật" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      <Bell className="w-3 h-3" />
                      {group.updates}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1 truncate">{group.members}</p>
                <p className="text-xs text-gray-500 mt-2 truncate">{group.updates}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default UserGroup;
