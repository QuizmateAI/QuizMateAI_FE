import React from "react";
import { MoreVertical, Plus } from "lucide-react";
import workspaceData from "@/Pages/Users/Home/workspaceData";
import { formatDate, formatUpdatedTime } from "@/Pages/Users/Home/workspaceData";

function UserWorkspace({ viewMode }) {
  // Logic nghiệp vụ: chuyển đổi hiển thị giữa lưới và danh sách
  const isList = viewMode === "list";
  const workspaces = [...workspaceData].sort(
    (a, b) => new Date(b.dateAt).getTime() - new Date(a.dateAt).getTime()
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium text-[#303030]">Workspace của tôi</h2>
      </div>

      {isList ? (
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[minmax(240px,2fr)_minmax(110px,0.7fr)_minmax(140px,0.8fr)_minmax(120px,0.6fr)_32px] gap-4 px-4 py-3 text-xs font-semibold text-gray-500">
            <span>Tiêu đề / Title</span>
            <span>Nguồn / Sources</span>
            <span>Đã tạo / Created</span>
            <span>Vai trò / Role</span>
            <span />
          </div>
          <div className="divide-y divide-gray-200">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="grid grid-cols-[minmax(240px,2fr)_minmax(110px,0.7fr)_minmax(140px,0.8fr)_minmax(120px,0.6fr)_32px] gap-4 px-4 py-3 text-sm text-gray-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">{workspace.emoji}</span>
                  <span className="truncate text-gray-900 font-medium">{workspace.title}</span>
                </div>
                <span className="text-xs text-gray-600">{workspace.sources} nguồn</span>
                <span className="text-xs text-gray-600">{formatDate(workspace.dateAt)}</span>
                <span className="text-xs text-gray-600">Owner</span>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div className="rounded-xl border-2 border-dashed border-gray-300 h-56 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all overflow-hidden">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-gray-700 font-medium text-sm text-center px-4">
              Tạo workspace mới
            </p>
          </div>

          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className={`${workspace.color} rounded-xl h-56 p-6 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between relative group border border-gray-200 overflow-hidden`}
            >
              <div className="flex items-start justify-between">
                <div className="text-3xl shrink-0">{workspace.emoji}</div>
                <button className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 rounded-full">
                  <MoreVertical className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="flex-1 min-w-0 mt-2">
                <h3 className="text-[#1F1F1F] font-medium text-base line-clamp-2 leading-snug">
                  {workspace.title}
                </h3>
                <p className="text-xs text-gray-600 mt-1">{workspace.description}</p>
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                  <span className="truncate">{formatUpdatedTime(workspace.updatedAt)}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="truncate">{workspace.count}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600 mt-3 pt-3 border-t border-gray-200/50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs truncate">{formatDate(workspace.dateAt)}</span>
                  <span className="text-xs">·</span>
                  <span className="text-xs truncate">{workspace.sources} nguồn</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default UserWorkspace;
