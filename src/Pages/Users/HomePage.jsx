import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Settings, MoreVertical, Grid3x3, List, ChevronRight, ChevronDown, Menu } from 'lucide-react';
import LogoLight from "@/assets/LightMode_Logo.png";

// Component cho Note Card
function NoteCard({ note }) {
  return (
    <div 
      className={`${note.color} rounded-xl h-56 p-6 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between relative group border border-gray-200`}
    >
      {/* Emoji Icon */}
      <div className="text-5xl mb-2">{note.emoji}</div>

      {/* More Options Button */}
      <button className="absolute top-4 right-4 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 rounded-full">
        <MoreVertical className="w-4 h-4 text-gray-600" />
      </button>

      {/* Title */}
      <div className="flex-1 mt-2">
        <h3 className="text-[#1F1F1F] font-medium text-base line-clamp-2 leading-snug">
          {note.title}
        </h3>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-sm text-gray-600 mt-3 pt-3 border-t border-gray-200/50">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{note.date}</span>
          <span className="text-xs">·</span>
          <span className="text-xs">{note.sources} nguồn</span>
        </div>
        {note.isPublic && (
          <span className="text-gray-400 text-sm">🌐</span>
        )}
      </div>
    </div>
  );
}

function HomePage() {
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  // Mock data - giống NotebookLM
  const featuredNotes = [
    { id: 1, title: 'Featured 1', color: 'bg-purple-50' },
    { id: 2, title: 'Featured 2', color: 'bg-yellow-50' },
    { id: 3, title: 'Featured 3', color: 'bg-blue-50' },
    { id: 4, title: 'Featured 4', color: 'bg-green-50' },
    { id: 5, title: 'Featured 5', color: 'bg-pink-50' },
  ];

  const recentNotes = [
    { 
      id: 1, 
      title: 'Strategic Educational Workflow and Mocktest Integration Guide', 
      emoji: '🎓', 
      date: '31 thg 1, 2026', 
      sources: 1, 
      color: 'bg-purple-50' 
    },
    { 
      id: 2, 
      title: 'QuizMate AI System Architecture and Functional Specifications', 
      emoji: '🤖', 
      date: '24 thg 1, 2026', 
      sources: 6, 
      color: 'bg-yellow-50', 
      isPublic: true 
    },
    { 
      id: 3, 
      title: 'Untitled notebook', 
      emoji: '📔', 
      date: '24 thg 1, 2026', 
      sources: 0, 
      color: 'bg-blue-50' 
    },
    { 
      id: 4, 
      title: 'Principles of Scientific Socialism', 
      emoji: '🚩', 
      date: '23 thg 1, 2026', 
      sources: 1, 
      color: 'bg-pink-50' 
    },
    { 
      id: 5, 
      title: 'Untitled notebook', 
      emoji: '📔', 
      date: '23 thg 1, 2026', 
      sources: 0, 
      color: 'bg-blue-50' 
    },
    { 
      id: 6, 
      title: 'A Pilgrimage to Museum', 
      emoji: '🐱', 
      date: '21 thg 1, 2026', 
      sources: 1, 
      color: 'bg-green-50' 
    },
  ];

  return (
    <div className="bg-white min-h-screen">
      {/* Header - giống NotebookLM */}
      <header className="flex justify-between items-center px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <img src={LogoLight} alt="QuizMate AI" className="h-8 w-auto object-contain" />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-2 rounded-full text-gray-700 hover:bg-gray-100"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Cài đặt</span>
          </Button>
          
          {/* Menu Button */}
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            U
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1640px] mx-auto px-6 py-6">
        {/* Top Controls Row */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          {/* Left: Tab Filter */}
          <div className="flex items-center gap-1 bg-gray-50 rounded-full p-1 border border-gray-200">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === 'all' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setActiveTab('my')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'my' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Sổ ghi chú của tôi
            </button>
            <button 
              onClick={() => setActiveTab('featured')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'featured' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Sổ ghi chú nổi bật
            </button>
          </div>

          {/* Right: View Mode, Sort & Create */}
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}
                title="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-gray-300" />
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1 rounded-full border-gray-300">
              <span className="text-sm">Gần đây nhất</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>

            {/* Create Button */}
            <Button className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white rounded-full h-9 px-4">
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Tạo mới</span>
            </Button>
          </div>
        </div>

        {/* Featured Notes Section */}
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

        {/* Recent Notes Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium text-[#303030]">Sổ ghi chú gần đây</h2>
            <Button variant="ghost" size="sm" className="flex items-center gap-1 text-gray-600 hover:text-gray-900 rounded-full">
              <span className="text-sm">Xem tất cả</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {/* Create New Note Card */}
            <div className="rounded-xl border-2 border-dashed border-gray-300 h-56 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-gray-700 font-medium text-sm text-center px-4">Tạo sổ ghi chú mới</p>
            </div>

            {/* Note Cards */}
            {recentNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
