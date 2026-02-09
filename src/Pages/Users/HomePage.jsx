import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Plus, Settings, MoreVertical, Grid3x3, List, ChevronRight, ChevronDown, Menu } from 'lucide-react';
import LogoLight from "@/assets/LightMode_Logo.png";
import HomeContent from "@/Pages/Users/Home/HomeContent";
import UserWorkspace from "@/Pages/Users/Home/UserWorkspace";
import UserGroup from "@/Pages/Users/Home/UserGroup";

function HomePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  // Logic nghiệp vụ: hiển thị nội dung theo tab đang chọn
  const renderTabContent = () => {
    if (activeTab === 'workspace') {
      return <UserWorkspace viewMode={viewMode} />;
    }

    if (activeTab === 'group') {
      return <UserGroup viewMode={viewMode} />;
    }

    return <HomeContent viewMode={viewMode} />;
  };

  return (
    <div className="bg-white">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white">
      {/* Header - giống NotebookLM */}
      <header className="flex justify-between items-center px-20">
        <div className="w-[130px]  flex items-center justify-center cursor-pointer" 
        // onClick={() => navigate('/')}
        >
                   <img src={LogoLight} alt="QuizMate AI Logo" className="w-full h-full object-contain" />
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
          
          {/* Menu Button
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Menu className="w-5 h-5 text-gray-600" />
          </button> */}
          
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            U
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1640px] mx-auto px-20 pb-5">
        {/* Top Controls Row */}
        <div className="flex flex-wrap justify-between items-center gap-4 ">
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
              onClick={() => setActiveTab('workspace')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'workspace' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Workspace của tôi
            </button>
            <button 
              onClick={() => setActiveTab('group')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'group'
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Nhóm của tôi
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

            {/* Sort Dropdown
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1 rounded-full border-gray-300">
              <span className="text-sm">Gần đây nhất</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button> */}

            {/* Create Button */}
            <Button className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#6682bd] text-white rounded-full h-9 px-4">
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Tạo mới</span>
            </Button>
          </div>
        </div>

        
      </main>
      </div>
          <div className="pt-[190px] px-20 py-12">
  {renderTabContent()}
</div>
    </div>
  );
}

export default HomePage;
