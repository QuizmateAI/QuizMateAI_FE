import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/Components/ui/button";
import { Globe, Grid3x3, List, Moon, Plus, Settings, Sun, CreditCard } from 'lucide-react';
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import UserWorkspace from "@/Pages/Users/Home/Components/UserWorkspace";
import UserGroup from "@/Pages/Users/Home/Components/UserGroup";
import CreateNewDialog from "@/Pages/Users/Home/Components/CreateNewDialog";
import EditWorkspaceDialog from "@/Pages/Users/Home/Components/EditWorkspaceDialog";
import DeleteWorkspaceDialog from "@/Pages/Users/Home/Components/DeleteWorkspaceDialog";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useGroup } from '@/hooks/useGroup';

function HomePage() {
  const [activeTab, setActiveTab] = useState('workspace');
  const [viewMode, setViewMode] = useState('grid');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();

  // Hook quản lý workspace: CRUD + topics
  const {
    workspaces,
    topics,
    loading,
    topicsLoading,
    pagination,
    fetchTopics,
    createWorkspace,
    editWorkspace,
    removeWorkspace,
    changePage,
    changePageSize,
  } = useWorkspace();

  // Hook quản lý group: CRUD + members
  const {
    groups,
    topics: groupTopics,
    loading: groupLoading,
    topicsLoading: groupTopicsLoading,
    fetchTopics: fetchGroupTopics,
    createGroup,
  } = useGroup();

  // State cho các dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogMode, setCreateDialogMode] = useState('workspace');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  // Mở dialog tạo workspace mới (mặc định tab workspace)
  const handleOpenCreate = () => {
    setCreateDialogMode('workspace');
    setCreateDialogOpen(true);
  };

  // Mở dialog tạo nhóm mới (mặc định tab group)
  const handleOpenCreateGroup = () => {
    setCreateDialogMode('group');
    setCreateDialogOpen(true);
  };

  // Mở dialog sửa workspace
  const handleOpenEdit = (ws) => {
    setSelectedWorkspace(ws);
    setEditDialogOpen(true);
  };

  // Mở dialog xóa workspace
  const handleOpenDelete = (ws) => {
    setSelectedWorkspace(ws);
    setDeleteDialogOpen(true);
  };

  // Xử lý tạo workspace
  const handleCreate = async (data) => {
    const newWorkspace = await createWorkspace(data);
    if (newWorkspace?.workspaceId) {
      navigate(`/workspace/${newWorkspace.workspaceId}`);
    }
  };

  // Xử lý cập nhật workspace
  const handleEdit = async (workspaceId, data) => {
    await editWorkspace(workspaceId, data);
  };

  // Xử lý xóa workspace
  const handleDelete = async (workspaceId) => {
    await removeWorkspace(workspaceId);
  };

  // Xử lý tạo nhóm
  const handleCreateGroup = async (data) => {
    await createGroup(data);
  };

  // Mở dialog tạo workspace nếu được gọi từ GroupWorkspace
  useEffect(() => {
    if (location.state?.openCreateDialog) {
      setCreateDialogMode('workspace');
      setCreateDialogOpen(true);
      // Xóa state sau khi đã xử lý
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

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
      return (
        <UserWorkspace
          viewMode={viewMode}
          isDarkMode={isDarkMode}
          workspaces={workspaces}
          loading={loading}
          pagination={pagination}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
          onOpenCreate={handleOpenCreate}
          onOpenEdit={handleOpenEdit}
          onOpenDelete={handleOpenDelete}
        />
      );
    }

    if (activeTab === 'group') {
      return (
        <UserGroup
          viewMode={viewMode}
          isDarkMode={isDarkMode}
          groups={groups}
          loading={groupLoading}
          onOpenCreate={handleOpenCreateGroup}
        />
      );
    }

    // Default: hiển thị workspace
    return (
      <UserWorkspace
        viewMode={viewMode}
        isDarkMode={isDarkMode}
        workspaces={workspaces}
        loading={loading}
        pagination={pagination}
        onPageChange={changePage}
        onPageSizeChange={changePageSize}
        onOpenCreate={handleOpenCreate}
        onOpenEdit={handleOpenEdit}
        onOpenDelete={handleOpenDelete}
      />
    );
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
                <div className={`h-px w-full ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`} />
                <button
                  type="button"
                  onClick={() => { setIsSettingsOpen(false); navigate('/profile', { state: { tab: 'subscription' } }); }}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
                    isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`flex items-center gap-2 ${fontClass}`}>
                    <CreditCard className="w-4 h-4" />
                    {t('common.subscription')}
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
            <Button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#6682bd] text-white rounded-full h-9 px-4"
            >
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

      {/* Dialogs */}
      <CreateNewDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        topics={topics.length > 0 ? topics : groupTopics}
        topicsLoading={topicsLoading || groupTopicsLoading}
        onFetchTopics={fetchTopics}
        onCreateWorkspace={handleCreate}
        onCreateGroup={handleCreateGroup}
        isDarkMode={isDarkMode}
        initialMode={createDialogMode}
      />
      <EditWorkspaceDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        workspace={selectedWorkspace}
        onEdit={handleEdit}
        isDarkMode={isDarkMode}
      />
      <DeleteWorkspaceDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        workspace={selectedWorkspace}
        onDelete={handleDelete}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

export default HomePage;
