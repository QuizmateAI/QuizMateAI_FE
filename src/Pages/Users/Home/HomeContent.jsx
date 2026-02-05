
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, ChevronRight } from "lucide-react";

function NoteCard({ note, isList }) {
  return (
    <div
      className={`${note.color} rounded-xl ${
        isList ? "h-24" : "h-56"
      } p-6 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between relative group border border-gray-200`}
    >
      <div className="flex items-start justify-between">
        <div className="text-3xl">{note.emoji}</div>
        <button className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 rounded-full">
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 mt-2">
        <h3 className="text-[#1F1F1F] font-medium text-base line-clamp-2 leading-snug">
          {note.title}
        </h3>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mt-3 pt-3 border-t border-gray-200/50">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{note.date}</span>
          <span className="text-xs">·</span>
          <span className="text-xs">{note.sources} nguồn</span>
        </div>
        {note.isPublic && <span className="text-gray-400 text-sm">🌐</span>}
      </div>
    </div>
  );
}

function HomeContent({ viewMode }) {
  // Logic nghiệp vụ: đổi layout theo chế độ xem
  const isList = viewMode === "list";

  const featuredNotes = [
    { id: 1, title: "Featured 1", color: "bg-purple-50" },
    { id: 2, title: "Featured 2", color: "bg-yellow-50" },
    { id: 3, title: "Featured 3", color: "bg-blue-50" },
    { id: 4, title: "Featured 4", color: "bg-green-50" },
    { id: 5, title: "Featured 5", color: "bg-pink-50" },
  ];

  const recentNotes = [
    {
      id: 1,
      title: "Strategic Educational Workflow and Mocktest Integration Guide",
      emoji: "🎓",
      date: "31 thg 1, 2026",
      sources: 1,
      color: "bg-purple-50",
    },
    {
      id: 2,
      title: "QuizMate AI System Architecture and Functional Specifications",
      emoji: "🤖",
      date: "24 thg 1, 2026",
      sources: 6,
      color: "bg-yellow-50",
      isPublic: true,
    },
    {
      id: 3,
      title: "Untitled notebook",
      emoji: "📔",
      date: "24 thg 1, 2026",
      sources: 0,
      color: "bg-blue-50",
    },
    {
      id: 4,
      title: "Principles of Scientific Socialism",
      emoji: "🚩",
      date: "23 thg 1, 2026",
      sources: 1,
      color: "bg-pink-50",
    },
    {
      id: 5,
      title: "Untitled notebook",
      emoji: "📔",
      date: "23 thg 1, 2026",
      sources: 0,
      color: "bg-blue-50",
    },
    {
      id: 6,
      title: "A Pilgrimage to Museum",
      emoji: "🐱",
      date: "21 thg 1, 2026",
      sources: 1,
      color: "bg-green-50",
    },
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
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div
          className={
            isList
              ? "flex flex-col gap-3"
              : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          }
        >
          <div
            className={`rounded-xl border-2 border-dashed border-gray-300 ${
              isList ? "h-24" : "h-56"
            } flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all`}
          >
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-gray-700 font-medium text-sm text-center px-4">
              Tạo sổ ghi chú mới
            </p>
          </div>

          {recentNotes.map((note) => (
            <NoteCard key={note.id} note={note} isList={isList} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomeContent;