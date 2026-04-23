import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Button } from "@/Components/ui/button";
import { CreditCard, Globe, Grid3x3, List, Moon, Search, Settings, Sparkles, Sun, X } from 'lucide-react';
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import UserWorkspace, { WorkspaceFilterControls } from "@/Pages/Users/Home/Components/UserWorkspace";
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useGroup } from '@/hooks/useGroup';
import { useNavigateWithLoading } from '@/hooks/useNavigateWithLoading';
import { preloadGroupWorkspacePage, preloadWorkspacePage } from '@/lib/routeLoaders';
import { useToast } from '@/context/ToastContext';
import { getMyWallet } from '@/api/ManagementSystemAPI';
import CreditIconImage from "@/Components/ui/CreditIconImage";
import { buildGroupWorkspacePath, buildWorkspacePath } from '@/lib/routePaths';
import { useCurrentSubscription } from '@/hooks/useCurrentSubscription';

const LazyUserGroup = lazy(() => import("@/Pages/Users/Home/Components/UserGroup"));
const LazyCommunityGroupBoard = lazy(() => import("@/Pages/Users/Home/Components/CommunityGroupBoard"));
const LazyEditWorkspaceDialog = lazy(() => import("@/Pages/Users/Home/Components/EditWorkspaceDialog"));
const LazyDeleteWorkspaceDialog = lazy(() => import("@/Pages/Users/Home/Components/DeleteWorkspaceDialog"));
const LazyUserProfilePopover = lazy(() => import("@/Components/features/Users/UserProfilePopover"));

function formatNumber(value, locale) {
  try {
    return new Intl.NumberFormat(locale).format(Number(value) || 0);
  } catch {
    return String(value ?? 0);
  }
}

const EMPTY_WALLET_SUMMARY = {
  totalAvailableCredits: 0,
  regularCreditBalance: 0,
  planCreditBalance: 0,
  hasActivePlan: false,
  planCreditExpiresAt: null,
};

function normalizeHomeTab(value) {
  if (value === 'community') return 'community';
  if (value === 'group') return 'group';
  return 'workspace';
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

function GroupSearchControls({ searchQuery, onSearchQueryChange, isDarkMode }) {
  const { t } = useTranslation();

  return (
    <div className="relative w-full sm:w-80">
      <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
      <input
        type="text"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder={t("home.search.groupPlaceholder")}
        className={`h-10 w-full rounded-xl border pl-9 pr-9 text-sm outline-none transition-colors ${
          isDarkMode
            ? "border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-blue-500"
            : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
        }`}
      />
      {searchQuery ? (
        <button
          type="button"
          onClick={() => onSearchQueryChange("")}
          className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg transition-colors ${
            isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          }`}
          aria-label={t("home.search.clear")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function LazySectionFallback({ isDarkMode }) {
  return (
    <div
      className={`min-h-[240px] rounded-[28px] border ${
        isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-slate-50/70"
      }`}
    />
  );
}

function HomePage() {
  const [viewMode, setViewMode] = useState('grid');
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [communitySearchQuery, setCommunitySearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [joiningPublicGroupId, setJoiningPublicGroupId] = useState(null);
  const settingsRef = useRef(null);
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigateWithLoading();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess } = useToast();
  const activeTab = normalizeHomeTab(searchParams.get('tab'));
  const shouldLoadGroups = activeTab === 'group' || activeTab === 'community';
  const { summary: currentPlanSummary } = useCurrentSubscription();
  const [walletSummary, setWalletSummary] = useState(EMPTY_WALLET_SUMMARY);
  const [loadingWallet, setLoadingWallet] = useState(true);

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
    sortMode,
    changeSortMode,
  } = useWorkspace({ enabled: true });
  const {
    groups,
    loading: groupsLoading,
    publicGroups,
    publicGroupsLoading,
    joinPublicGroup,
    fetchPublicGroups,
  } = useGroup({ enabled: shouldLoadGroups, publicEnabled: shouldLoadGroups });
  const mergedGroups = shouldLoadGroups ? mergeGroupsWithOwnedWorkspaces(groups, workspaces) : [];
  const groupTabLoading = activeTab === 'group' && (groupsLoading || loading) && mergedGroups.length === 0;
  const publicGroupTabLoading = activeTab === 'community' && publicGroupsLoading && publicGroups.length === 0;


  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);


  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';
  const walletLocale = currentLang === 'vi' ? 'vi-VN' : 'en-US';
  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  const handleOpenCreate = async () => {
    try {
      void preloadWorkspacePage();
      const createdWorkspace = await createWorkspace({ title: null });
      const createdWorkspaceId = createdWorkspace?.workspaceId;

      if (!createdWorkspaceId) {
        throw new Error(t('home.workspace.createError') || 'Không thể tạo workspace');
      }

      navigate(buildWorkspacePath(createdWorkspaceId), {
        state: {
          openProfileConfig: true,
          returnToHomeOnIncompleteProfile: true,
        },
      });
    } catch (err) {
      showError(err?.message || t('home.workspace.createError') || 'Không thể tạo workspace');
    }
  };

  // Nhảy thẳng vào trang group workspace mới
  const handleOpenCreateGroup = async () => {
    try {
      void preloadGroupWorkspacePage();
      showSuccess(t('home.group.creating') || 'Äang táº¡o group workspace...');
      const newGroupWorkspace = await createGroupWorkspace({ title: null });
      if (!newGroupWorkspace?.workspaceId) {
        throw new Error(t('home.group.createError') || 'KhÃ´ng thá»ƒ táº¡o group workspace');
      }
      navigate(buildGroupWorkspacePath(newGroupWorkspace.workspaceId), { state: { openProfileConfig: true } });
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

  const handleOpenExistingGroup = (group) => {
    if (!group?.workspaceId) {
      return;
    }
    void preloadGroupWorkspacePage();
    navigate(buildGroupWorkspacePath(group.workspaceId));
  };

  const handleJoinPublicGroup = async (group) => {
    const workspaceId = group?.workspaceId;
    if (!workspaceId) {
      return;
    }

    try {
      setJoiningPublicGroupId(workspaceId);
      await joinPublicGroup(workspaceId);
      showSuccess(t('home.groupHub.joinSuccess') || 'Tham gia nhóm thành công');
    } catch (err) {
      await fetchPublicGroups();
      showError(err?.message || t('home.groupHub.joinError') || 'Không thể tham gia nhóm');
    } finally {
      setJoiningPublicGroupId(null);
    }
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
      void handleOpenCreate();
      navigate('/home', { replace: true });
    }
  }, [handleOpenCreate, location.state, navigate]);

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab === 'workspace' || currentTab === 'group' || currentTab === 'community') {
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

  const handleOpenCommunity = () => {
    handleTabChange('community');
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

  useEffect(() => {
    let cancelled = false;
    let idleHandle = null;
    let timeoutHandle = null;
    let hasFetched = false;

    const fetchWallet = async () => {
      if (hasFetched || cancelled) return;
      hasFetched = true;
      setLoadingWallet(true);
      try {
        const res = await getMyWallet();
        const data = res?.data ?? res;
        if (cancelled) return;
        setWalletSummary({
          ...EMPTY_WALLET_SUMMARY,
          ...data,
          totalAvailableCredits: data?.totalAvailableCredits ?? data?.balance ?? 0,
          regularCreditBalance: data?.regularCreditBalance ?? 0,
          planCreditBalance: data?.planCreditBalance ?? 0,
          hasActivePlan: Boolean(data?.hasActivePlan),
          planCreditExpiresAt: data?.planCreditExpiresAt ?? null,
        });
      } catch (err) {
        if (!cancelled) {
          setWalletSummary(EMPTY_WALLET_SUMMARY);
        }
      } finally {
        if (!cancelled) {
          setLoadingWallet(false);
        }
      }
    };

    const scheduleFetchWallet = () => {
      void fetchWallet();
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(scheduleFetchWallet, { timeout: 1500 });
    }
    timeoutHandle = window.setTimeout(scheduleFetchWallet, 250);

    return () => {
      cancelled = true;
      if (idleHandle !== null && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, []);

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
          sortMode={sortMode}
          onSortModeChange={changeSortMode}
          searchQuery={workspaceSearchQuery}
        />
      );
    }

    if (activeTab === 'group') {
      return (
        <Suspense fallback={<LazySectionFallback isDarkMode={isDarkMode} />}>
          <LazyUserGroup
            viewMode={viewMode}
            isDarkMode={isDarkMode}
            groups={mergedGroups}
            loading={groupTabLoading}
            onOpenCreate={handleOpenCreateGroup}
            searchQuery={groupSearchQuery}
            onSearchQueryChange={setGroupSearchQuery}
          />
        </Suspense>
      );
    }

    if (activeTab === 'community') {
      return (
        <Suspense fallback={<LazySectionFallback isDarkMode={isDarkMode} />}>
          <LazyCommunityGroupBoard
            groups={publicGroups}
            loading={publicGroupTabLoading}
            searchQuery={communitySearchQuery}
            isDarkMode={isDarkMode}
            onJoinGroup={handleJoinPublicGroup}
            onOpenGroup={handleOpenExistingGroup}
            onCreateGroup={handleOpenCreateGroup}
            joiningWorkspaceId={joiningPublicGroupId}
            myGroupCount={mergedGroups.length}
          />
        </Suspense>
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
        sortMode={sortMode}
        onSortModeChange={changeSortMode}
        searchQuery={workspaceSearchQuery}
      />
    );
  };

  return (
    <div className={`${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-gray-900'} min-h-screen transition-colors duration-300`}>
      <div className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isDarkMode ? 'bg-slate-950/90 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm'}`}>
      {/* Header - giống NotebookLM */}
      <header className={`flex justify-between items-center px-20 ${fontClass} ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className="w-[130px] flex items-center justify-center" 
        // onClick={() => navigate('/')}
        >
                   <img src={isDarkMode ? LogoDark : LogoLight} alt="QuizMate AI Logo" className="w-full h-full object-contain" width={130} height={40} />
                 </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/plans', { state: { from: '/home' } })}
            className={`flex h-10 max-w-[320px] items-center gap-2 rounded-full px-4 ${
              isDarkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="hidden max-w-[180px] truncate text-sm font-semibold sm:inline">
              {currentPlanSummary?.planName || t('common.plan')}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/wallets', { state: { from: '/home' } })}
            className={`flex h-10 items-center gap-2 rounded-full px-3.5 ${
              isDarkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'
            }`}
            aria-label={t('common.wallet')}
          >
            <span className={`inline-flex items-center justify-center rounded-full ring-1 ring-inset ${
              isDarkMode ? 'bg-blue-500/10 ring-blue-400/25' : 'bg-blue-600/10 ring-blue-600/20'
            }`}>
              <CreditIconImage alt="Quizmate Credit" className="h-6 w-6 rounded-full" />
            </span>
            <span className="text-sm font-semibold leading-none">
              {loadingWallet ? '—' : formatNumber(walletSummary.totalAvailableCredits, walletLocale)}
            </span>
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
                className={`absolute right-0 top-full z-[100] mt-2 w-56 overflow-hidden rounded-xl border shadow-lg transition-colors duration-300 ${
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
          
          <Suspense fallback={<div className={`h-10 w-10 rounded-full ${isDarkMode ? 'bg-slate-900' : 'bg-gray-100'}`} />}>
            <LazyUserProfilePopover isDarkMode={isDarkMode} />
          </Suspense>
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-[1640px] mx-auto px-20 pb-5 ${fontClass}`}>
        {/* Top Controls Row */}
        <div className="flex flex-wrap justify-between items-center gap-4 ">
          <div className="flex flex-wrap items-center gap-3">
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

            <Button
              type="button"
              onClick={handleOpenCommunity}
              className={`h-10 rounded-full px-4 ${
                activeTab === 'community'
                  ? isDarkMode
                    ? 'bg-slate-800 text-blue-300'
                    : 'bg-blue-50 text-blue-700'
                  : isDarkMode
                    ? 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    : 'border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t('home.actions.openGroupCommunity')}
            </Button>
          </div>

          {/* Right: Search, Sort & View Mode */}
          <div className="flex flex-1 items-center justify-end gap-2">
            {activeTab === 'workspace' ? (
              <WorkspaceFilterControls
                searchQuery={workspaceSearchQuery}
                onSearchQueryChange={setWorkspaceSearchQuery}
                sortMode={sortMode}
                onSortModeChange={changeSortMode}
                isDarkMode={isDarkMode}
              />
            ) : null}
            {activeTab === 'group' ? (
              <GroupSearchControls
                searchQuery={groupSearchQuery}
                onSearchQueryChange={setGroupSearchQuery}
                isDarkMode={isDarkMode}
              />
            ) : null}
            {activeTab === 'community' ? (
              <GroupSearchControls
                searchQuery={communitySearchQuery}
                onSearchQueryChange={setCommunitySearchQuery}
                isDarkMode={isDarkMode}
              />
            ) : null}

            {/* View Toggle */}
            {activeTab !== 'community' ? (
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
            ) : null}

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
      <div className="px-20 pb-12 pt-[215px]">
        {renderTabContent()}
      </div>

      {/* Dialogs */}
      {editDialogOpen ? (
        <Suspense fallback={null}>
          <LazyEditWorkspaceDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            workspace={selectedWorkspace}
            onEdit={handleEdit}
            isDarkMode={isDarkMode}
          />
        </Suspense>
      ) : null}
      {deleteDialogOpen ? (
        <Suspense fallback={null}>
          <LazyDeleteWorkspaceDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            workspace={selectedWorkspace}
            onDelete={handleDelete}
            isDarkMode={isDarkMode}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

export default HomePage;
