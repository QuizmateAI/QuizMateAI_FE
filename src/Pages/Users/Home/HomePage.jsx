import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Globe, Grid3x3, List, Moon, Plus, Settings, Sun } from 'lucide-react';
import LogoLight from "@/assets/LightMode_Logo.png";
import LogoDark from "@/assets/DarkMode_Logo.png";
import HomeContent from "@/Pages/Users/Home/Components/HomeContent";
import UserWorkspace from "@/Pages/Users/Home/Components/UserWorkspace";
import UserGroup from "@/Pages/Users/Home/Components/UserGroup";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';

function HomePage() {
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };

    // Logic nghiep vu: dong menu khi click ra ngoai.
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  // Logic nghiệp vụ: hiển thị nội dung theo tab đang chọn
  const renderTabContent = () => {
    if (activeTab === 'workspace') {
      return <UserWorkspace viewMode={viewMode} isDarkMode={isDarkMode} />;
    }

    if (activeTab === 'group') {
      return <UserGroup viewMode={viewMode} isDarkMode={isDarkMode} />;
    }

    return <HomeContent viewMode={viewMode} isDarkMode={isDarkMode} />;
  };

  return (
    <div className={`${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-gray-900'} min-h-screen transition-colors duration-300`}>
      <div className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isDarkMode ? 'bg-slate-950/90 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm'}`}>
      {/* Header - giống NotebookLM */}
      <header className={`flex justify-between items-center px-20 ${fontClass} ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className="w-[130px]  flex items-center justify-center cursor-pointer" 
        // onClick={() => navigate('/')}
        >
                   <img src={isDarkMode ? LogoDark : LogoLight} alt="QuizMate AI Logo" className="w-full h-full object-contain" />
                 </div>
        
        <div className="flex items-center gap-2">
          <div ref={settingsRef} className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              className={`flex items-center gap-2 rounded-full ${isDarkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'}`}
              aria-expanded={isSettingsOpen}
              aria-haspopup="menu"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">{t('common.settings')}</span>
            </Button>

            {isSettingsOpen ? (
              <div
                role="menu"
                className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-lg overflow-hidden transition-colors duration-300 ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-800'
                }`}
              >
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                    isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`flex items-center gap-2 ${fontClass}`}>
                    <Globe className="w-4 h-4" />
                    {t('common.language')}
                  </span>
                  <span className={`text-xs font-semibold ${fontClass}`}>
                    {currentLang === 'vi' ? 'VI' : 'EN'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                    isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`flex items-center gap-2 ${fontClass}`}>
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {t('common.theme')}
                  </span>
                  <span className={`text-xs font-semibold ${fontClass}`}>
                    {isDarkMode ? t('common.dark') : t('common.light')}
                  </span>
                </button>
              </div>
            ) : null}
          </div>
          
          {/* Menu Button
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Menu className="w-5 h-5 text-gray-600" />
          </button> */}
          
          <UserProfilePopover isDarkMode={isDarkMode} />
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-[1640px] mx-auto px-20 pb-5 ${fontClass}`}>
        {/* Top Controls Row */}
        <div className="flex flex-wrap justify-between items-center gap-4 ">
          {/* Left: Tab Filter */}
          <div className={`flex items-center gap-1 rounded-full p-1 border ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'
          }`}>
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === 'all' 
                  ? isDarkMode ? 'bg-slate-800 text-blue-300' : 'bg-blue-50 text-blue-700'
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t('home.tabs.all')}
            </button>
            <button 
              onClick={() => setActiveTab('workspace')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'workspace' 
                  ? isDarkMode ? 'bg-slate-800 text-blue-300' : 'bg-blue-50 text-blue-700'
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t('home.tabs.workspace')}
            </button>
            <button 
              onClick={() => setActiveTab('group')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'group'
                  ? isDarkMode ? 'bg-slate-800 text-blue-300' : 'bg-blue-50 text-blue-700'
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t('home.tabs.group')}
            </button>
          </div>

          {/* Right: View Mode, Sort & Create */}
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className={`flex items-center rounded-lg overflow-hidden border ${
              isDarkMode ? 'border-slate-700' : 'border-gray-300'
            }`}>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? isDarkMode ? 'bg-slate-800 text-blue-300' : 'bg-blue-50 text-blue-700' : isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-50 text-gray-600'}`}
                title={t('home.view.grid')}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-300'}`} />
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? isDarkMode ? 'bg-slate-800 text-blue-300' : 'bg-blue-50 text-blue-700' : isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-50 text-gray-600'}`}
                title={t('home.view.list')}
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
              <span className={`text-sm font-medium ${fontClass}`}>{t('home.actions.create')}</span>
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
