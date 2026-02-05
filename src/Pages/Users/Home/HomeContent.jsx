
import React from "react";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import workspaceData from "@/Pages/Users/Home/workspaceData";
import { formatDate, formatUpdatedTime } from "@/Pages/Users/Home/workspaceData";

function WorkspaceCard({ workspace, isList }) {
  return (
    <div
      className={`${workspace.color} rounded-xl ${
        isList ? "h-24" : "h-56"
      } p-6 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between relative group border border-gray-200`}
    >
      <div className="flex items-start justify-between">
        <div className="text-3xl">{workspace.emoji}</div>
        <button className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 rounded-full">
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 mt-2">
        <h3 className="text-[#1F1F1F] font-medium text-base line-clamp-2 leading-snug">
          {workspace.title}
        </h3>
        <p className="text-xs text-gray-600 mt-1">{workspace.description}</p>
        <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
          <span>{formatUpdatedTime(workspace.updatedAt)}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span>{workspace.count}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mt-3 pt-3 border-t border-gray-200/50">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{formatDate(workspace.dateAt)}</span>
          <span className="text-xs">·</span>
          <span className="text-xs">{workspace.sources} nguồn</span>
        </div>
      </div>
    </div>
  );
}

function HomeContent({ viewMode }) {
  // Logic nghiệp vụ: đổi layout theo chế độ xem
  const isList = viewMode === "list";
  const recentWorkspaces = [...workspaceData]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const featuredNotes = [
    { id: 1, title: "Featured 1", color: "bg-purple-50" },
    { id: 2, title: "Featured 2", color: "bg-yellow-50" },
    { id: 3, title: "Featured 3", color: "bg-blue-50" },
    { id: 4, title: "Featured 4", color: "bg-green-50" },
    { id: 5, title: "Featured 5", color: "bg-pink-50" },
  ];

  return (
    <div className="space-y-10">
      <section className="mb-10">
        <h2 className="text-xl font-medium text-[#303030] mb-4">Sổ ghi chú nổi bật</h2>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
          {featuredNotes.map((note) => (
            <div
              key={note.id}
              className={`${note.color} rounded-xl min-w-[280px] h-56 flex-shrink-0 cursor-pointer hover:shadow-md transition-all border border-gray-200`}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium text-[#303030]">Workspace gần đây</h2>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 rounded-full"
          >
            <span className="text-sm">Xem tất cả</span>
          </Button>
        </div>

        <div
          className={
            isList
              ? "flex flex-col gap-3"
              : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          }
        >
          {recentWorkspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} isList={isList} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomeContent;