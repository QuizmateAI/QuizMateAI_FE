import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Button } from "@/Components/ui/button";
import { Globe, Grid3x3, List, Moon, Settings, Sun, CreditCard } from 'lucide-react';
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import UserWorkspace from "@/Pages/Users/Home/Components/UserWorkspace";
import UserGroup from "@/Pages/Users/Home/Components/UserGroup";
import EditWorkspaceDialog from "@/Pages/Users/Home/Components/EditWorkspaceDialog";
import DeleteWorkspaceDialog from "@/Pages/Users/Home/Components/DeleteWorkspaceDialog";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useGroup } from '@/hooks/useGroup';
import { useNavigateWithLoading } from '@/hooks/useNavigateWithLoading';
import { useToast } from '@/context/ToastContext';

function normalizeHomeTab(value) {
  return value === 'group' ? 'group' : 'workspace';
}

function isGroupWorkspace(workspace) {
  return String(workspace?.workspaceKind || '').toUpperCase() === 'GROUP';
}

function toTimestamp(value) {
  if (!value) return 0;
  const parsedValue = new Date(value);
  return Number.isNaN(parsedValue.getTime()) ? 0 : parsedValue.getTime();
}

function createOwnedGroupFallback(workspace) {
  const normalizedTitle = workspace?.displayTitle ?? workspace?.name ?? '';
  const memberCount = Number(workspace?.memberCount);

  return {
    ...workspace,
    workspaceId: workspace?.workspaceId ?? null,
    groupName: normalizedTitle,
    displayTitle: normalizedTitle,
    name: normalizedTitle,
    memberRole: 'LEADER',
    description: workspace?.description ?? '',
    memberCount: Number.isFinite(memberCount) && memberCount > 0 ? memberCount : 1,
    joinedAt: workspace?.createdAt ?? null,
    createdAt: workspace?.createdAt ?? null,
  };
}

function mergeGroupsWithOwnedWorkspaces(groups = [], workspaces = []) {
  const mergedGroups = new Map();

  workspaces
    .filter(isGroupWorkspace)
    .forEach((workspace) => {
      if (!workspace?.workspaceId) return;
      mergedGroups.set(String(workspace.workspaceId), createOwnedGroupFallback(workspace));
    });

  groups.forEach((group) => {
    const workspaceId = group?.workspaceId ?? group?.id;
    if (!workspaceId) return;

    const existingGroup = mergedGroups.get(String(workspaceId));
    mergedGroups.set(String(workspaceId), {
      ...existingGroup,
      ...group,
      workspaceId,
      groupName: group?.groupName ?? existingGroup?.groupName ?? existingGroup?.displayTitle ?? existingGroup?.name ?? '',
      displayTitle: group?.displayTitle ?? group?.groupName ?? existingGroup?.displayTitle ?? existingGroup?.groupName ?? '',
      name: group?.name ?? group?.groupName ?? existingGroup?.name ?? existingGroup?.groupName ?? '',
      description: group?.description ?? existingGroup?.description ?? '',
      memberRole: group?.memberRole ?? existingGroup?.memberRole ?? 'MEMBER',
      memberCount: Number.isFinite(Number(group?.memberCount))
        ? Number(group.memberCount)
        : (existingGroup?.memberCount ?? 0),
      joinedAt: group?.joinedAt ?? existingGroup?.joinedAt ?? group?.createdAt ?? existingGroup?.createdAt ?? null,
      createdAt: group?.createdAt ?? existingGroup?.createdAt ?? null,
    });
  });

  return Array.from(mergedGroups.values()).sort((left, right) =>
    toTimestamp(right?.joinedAt || right?.createdAt) - toTimestamp(left?.joinedAt || left?.createdAt)
  );
}

function HomePage() {
  const [viewMode, setViewMode] = useState('grid');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigateWithLoading();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess } = useToast();
  const activeTab = normalizeHomeTab(searchParams.get('tab'));

  // Prefetch cả workspace VÀ groups ngay khi load trang → chuyển tab instant (<1s)
  const {
    workspaces,
    loading,
    pagination,
    createWorkspace,
    createGroupWorkspace,
    editWorkspace,
    removeWorkspace,
    changePage,
    changePageSize,
  } = useWorkspace({ enabled: true });
  const { groups, loading: groupsLoading } = useGroup({ enabled: true });
  const mergedGroups = mergeGroupsWithOwnedWorkspaces(groups, workspaces);
  const groupTabLoading = (groupsLoading || loading) && mergedGroups.length === 0;


  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);


  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  // Nhảy thẳng vào trang workspace mới (bỏ qua dialog, tạo trực tiếp)
  const handleOpenCreate = async () => {
    try {
      showSuccess(t('home.workspace.creating') || 'Đang tạo workspace...');
      const newWorkspace = await createWorkspace({ title: null });
      if (newWorkspace?.workspaceId) {
        showSuccess(t('home.workspace.createSuccess') || 'Tạo workspace thành công!');
        navigate(`/workspace/${newWorkspace.workspaceId}`, { state: { openProfileConfig: true } });
      }
    } catch (err) {
      showError(err?.message || t('home.workspace.createError') || 'Không thể tạo workspace');
    }
  };

  // Nhảy thẳng vào trang group workspace mới
  const handleOpenCreateGroup = async () => {
    try {
      showSuccess(t('home.group.creating') || 'Äang táº¡o group workspace...');
      const newGroupWorkspace = await createGroupWorkspace({ title: null });
      if (!newGroupWorkspace?.workspaceId) {
        throw new Error(t('home.group.createError') || 'KhÃ´ng thá»ƒ táº¡o group workspace');
      }
      navigate(`/group-workspace/${newGroupWorkspace.workspaceId}`, { state: { openProfileConfig: true } });
    } catch (err) {
      showError(err?.message || t('home.group.createError') || 'KhÃ´ng thá»ƒ táº¡o group workspace');
    }
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

  // Xử lý cập nhật workspace
  const handleEdit = async (workspaceId, data) => {
    await editWorkspace(workspaceId, data);
  };

  // Xử lý xóa workspace
  const handleDelete = async (workspaceId) => {
    try {
      await removeWorkspace(workspaceId);
      showSuccess(t('home.workspace.deleteSuccess') || 'Xóa workspace thành công!');
    } catch (err) {
      showError(err?.message || t('home.workspace.deleteError') || 'Không thể xóa workspace');
    }
  };

  // Nếu được gọi từ GroupWorkspace với yêu cầu tạo workspace → nhảy sang trang tạo
  useEffect(() => {
    if (location.state?.openCreateDialog) {
      navigate('/workspace/new', { replace: true });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab === 'workspace' || currentTab === 'group') {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', 'workspace');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleTabChange = (nextTab) => {
    const normalizedTab = normalizeHomeTab(nextTab);
    if (normalizedTab === activeTab) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', normalizedTab);
    setSearchParams(nextParams);
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
      // Chỉ hiển thị Individual workspace ở tab workspace
      const individualWorkspaces = workspaces.filter(
        (ws) => !ws.workspaceKind || ws.workspaceKind === 'INDIVIDUAL'
      );
      return (
        <UserWorkspace
          viewMode={viewMode}
          isDarkMode={isDarkMode}
          workspaces={individualWorkspaces}
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
          groups={mergedGroups}
          loading={groupTabLoading}
          onOpenCreate={handleOpenCreateGroup}
        />
      );
    }

    // Default: hiển thị individual workspace
    const individualWorkspacesDefault = workspaces.filter(
      (ws) => !ws.workspaceKind || ws.workspaceKind === 'INDIVIDUAL'
    );
    return (
      <UserWorkspace
        viewMode={viewMode}
        isDarkMode={isDarkMode}
        workspaces={individualWorkspacesDefault}
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
                   <img src={isDarkMode ? LogoDark : LogoLight} alt="QuizMate AI Logo" className="w-full h-full object-contain" width={130} height={40} fetchPriority="high" />
                 </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/plan')}
            className={`flex items-center gap-2 rounded-full h-10 px-4 ${isDarkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{t('common.plan')}</span>
          </Button>
          <div ref={settingsRef} className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              className={`flex items-center gap-2 rounded-full h-10 px-4 ${isDarkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'}`}
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
              onClick={() => handleTabChange('workspace')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'workspace' 
                  ? isDarkMode ? 'bg-slate-800 text-blue-300' : 'bg-blue-50 text-blue-700'
                  : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t('home.tabs.workspace')}
            </button>
            <button 
              onClick={() => handleTabChange('group')}
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
            {/* <Button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#6682bd] text-white rounded-full h-9 px-4"
            >
              <Plus className="w-4 h-4" />
              <span className={`text-sm font-medium ${fontClass}`}>{t('home.actions.create')}</span>
            </Button> */}
          </div>
        </div>

        
      </main>
      </div>
          <div className="pt-[190px] px-20 py-12">
  {renderTabContent()}
</div>

      {/* Dialogs */}
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
