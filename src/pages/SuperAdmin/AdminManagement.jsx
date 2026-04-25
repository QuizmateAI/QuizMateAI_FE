import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MoreHorizontal, Plus, Shield, RefreshCw, Trash2,
  Users, Package, CreditCard, Banknote, FileText,
  ClipboardList, UsersRound, ShieldCheck, Eye, Pencil,
  Clock, Infinity as InfinityIcon,
  Bot, Cpu, Coins, ScrollText, MessageSquare,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ListSpinner from "@/components/ui/ListSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SuperAdminMetricCard,
  SuperAdminPage,
  SuperAdminPageHeader,
  SuperAdminPanel,
  SuperAdminSearchField,
} from './Components/SuperAdminSurface';
import {
  getAllSystemUsers,
  createAdmin,
  deleteAdmin,
  listPermissions,
  getAdminAllowedPermissions,
  getUserPermissions,
  getUserPermissionDetails,
  syncUserPermissions,
} from '@/api/ManagementSystemAPI';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import {
  filterRemovedLearningConfigPermissionCodes,
  filterRemovedLearningConfigPermissions,
} from '@/lib/learningConfigAdminFilters';

const PERM_CATEGORIES = [
  { prefix: 'user:',            labelKey: 'sidebar.users', icon: Users,         color: 'text-blue-400',    bg: 'from-blue-500 to-blue-600' },
  { prefix: 'group:',           labelKey: 'sidebar.groups', icon: UsersRound,   color: 'text-violet-400',  bg: 'from-violet-500 to-purple-600' },
  { prefix: 'plan:',            labelKey: 'adminManagement.categories.plans', icon: Package, color: 'text-cyan-400', bg: 'from-cyan-500 to-teal-500' },
  { prefix: 'subscription:',    labelKey: 'sidebar.subscriptions', icon: CreditCard, color: 'text-emerald-400', bg: 'from-emerald-500 to-green-600' },
  { prefix: 'credit-package:',  labelKey: 'sidebar.creditPackages', icon: CreditCard, color: 'text-sky-400', bg: 'from-sky-500 to-blue-600' },
  { prefix: 'payment:',         labelKey: 'sidebar.payments', icon: Banknote,   color: 'text-amber-400',   bg: 'from-amber-500 to-orange-500' },
  { prefix: 'material:',        labelKey: 'adminManagement.categories.materials', icon: FileText, color: 'text-rose-400', bg: 'from-rose-500 to-pink-600' },
  { prefix: 'feedback:',        labelKey: 'adminManagement.categories.feedback', icon: MessageSquare, color: 'text-pink-400', bg: 'from-pink-500 to-rose-600' },
  { prefix: 'ai-provider:',     labelKey: 'adminManagement.categories.aiProvider', icon: Cpu, color: 'text-teal-400', bg: 'from-teal-500 to-cyan-600' },
  { prefix: 'ai-model:',        labelKey: 'adminManagement.categories.aiModel', icon: Bot, color: 'text-purple-400', bg: 'from-purple-500 to-fuchsia-600' },
  { prefix: 'ai-cost:',         labelKey: 'adminManagement.categories.aiCost', icon: Coins, color: 'text-yellow-400', bg: 'from-yellow-500 to-amber-600' },
  { prefix: 'ai-audit:',        labelKey: 'adminManagement.categories.aiAudit', icon: ScrollText, color: 'text-orange-400', bg: 'from-orange-500 to-red-600' },
  { prefix: 'audit:',           labelKey: 'adminManagement.categories.audit', icon: ClipboardList, color: 'text-indigo-400', bg: 'from-indigo-500 to-blue-600' },
  { prefix: 'system-settings:', labelKey: 'sidebar.systemSettings', icon: ShieldCheck, color: 'text-fuchsia-400', bg: 'from-fuchsia-500 to-pink-600' },
];

const getPermAction = (code) => {
  const action = code.split(':')[1] || '';
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

function AdminManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showSuccess, showError } = useToast();
  const getFriendlyError = (err, fallbackKey, fallbackText) => {
    const mapped = getErrorMessage(t, err);
    if (mapped && mapped !== 'error.unknown') return mapped;
    if (fallbackKey) return t(fallbackKey);
    return fallbackText;
  };
  
  // State definitions
  const [searchTerm, setSearchTerm] = useState('');
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Create Admin Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    confirmPassword: '', 
    fullName: '' 
  });
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  // RBAC Dialog State
  const [isRbacOpen, setIsRbacOpen] = useState(false);
  const [isRbacLoading, setIsRbacLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [permissionDetailsMap, setPermissionDetailsMap] = useState({});

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const fetchAdmins = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getAllSystemUsers();
      const pageData = res?.data ?? res;
      const list = Array.isArray(pageData?.content) ? pageData.content : (Array.isArray(pageData) ? pageData : []);
      setAdmins(
        list.filter(
          (u) => u.role === 'ADMIN' && String(u.status || '').toUpperCase() !== 'DELETED',
        ),
      );
    } catch (err) {
      setError(getFriendlyError(err, 'adminManagement.errors.loadAdmins'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      const msg = t('adminManagement.form.passwordMismatch');
      setError(msg);
      showError(msg);
      return;
    }
    if (formData.password.length < 6) {
      const msg = t('adminManagement.form.passwordTooShort');
      setError(msg);
      showError(msg);
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await createAdmin({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        fullName: formData.fullName || undefined,
      });
      showSuccess(t('adminManagement.form.success'));
      setIsCreateOpen(false);
      setFormData({ username: '', email: '', password: '', confirmPassword: '', fullName: '' });
      fetchAdmins();
    } catch (err) {
      const msg = getFriendlyError(err, 'adminManagement.form.error');
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRbacPopup = async (admin) => {
    setSelectedAdmin(admin);
    setUserPermissions(filterRemovedLearningConfigPermissionCodes(admin?.permissions ? [...admin.permissions] : []));
    setPermissionDetailsMap({});
    setIsRbacOpen(true);
    setIsRbacLoading(true);
    try {
      const [permRes, allowedPermRes, userPermRes, userPermDetailsRes] = await Promise.all([
        listPermissions(),
        getAdminAllowedPermissions(),
        admin.role === 'ADMIN' ? getUserPermissions(admin.id) : Promise.resolve({ data: [] }),
        admin.role === 'ADMIN' ? getUserPermissionDetails(admin.id) : Promise.resolve({ data: [] }),
      ]);
      const permPageData = permRes?.data ?? permRes;
      const allPerms = Array.isArray(permPageData?.content) ? permPageData.content : (Array.isArray(permPageData) ? permPageData : []);
      const allowedPermData = allowedPermRes?.data ?? allowedPermRes;
      const allowedPermCodes = new Set(
        (Array.isArray(allowedPermData) ? allowedPermData : []).map((code) => String(code).toLowerCase())
      );
      const adminPerms = filterRemovedLearningConfigPermissions(allPerms).filter((p) =>
        allowedPermCodes.has(String(p.code).toLowerCase())
      );
      setPermissions(adminPerms);

      if (admin.role === 'ADMIN') {
        const up = userPermRes?.data ?? userPermRes;
        setUserPermissions(filterRemovedLearningConfigPermissionCodes(Array.isArray(up) ? up : []));

        const detailsData = userPermDetailsRes?.data ?? userPermDetailsRes;
        const detailsList = Array.isArray(detailsData) ? detailsData : [];
        const map = {};
        detailsList.forEach((d) => {
          if (d?.code) map[String(d.code).toLowerCase()] = d;
        });
        setPermissionDetailsMap(map);
      }
    } catch (err) {
      setUserPermissions(filterRemovedLearningConfigPermissionCodes(admin?.permissions ? [...admin.permissions] : []));
    } finally {
      setIsRbacLoading(false);
    }
  };

  const togglePermission = (code) => {
    const c = String(code).toLowerCase();
    setUserPermissions((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const setAllPermissions = (grantAll) => {
    if (grantAll) {
      setUserPermissions(permissions.map((p) => String(p.code).toLowerCase()));
    } else {
      setUserPermissions([]);
    }
  };

  const handleSyncPermissions = async () => {
    if (!selectedAdmin || selectedAdmin.role !== 'ADMIN') return;
    setIsRbacLoading(true);
    setError('');
    try {
      await syncUserPermissions(selectedAdmin.id, userPermissions);
      showSuccess(t('adminManagement.syncSuccess'));
    } catch (err) {
      const msg = getFriendlyError(err, 'adminManagement.syncError');
      setError(msg);
      showError(msg);
    } finally {
      setIsRbacLoading(false);
    }
  };

  const openDeleteDialog = (admin) => {
    if (!admin?.id) return;
    setDeleteTarget(admin);
    setDeleteConfirmText('');
    setDeleteReason('');
    setIsDeleteOpen(true);
  };

  const handleDeleteAdmin = async () => {
    if (!deleteTarget?.id) return;
    const trimmedReason = deleteReason.trim();

    if (deleteConfirmText !== 'FORCE-DELETE-USER') {
      const msg = t(
        'adminManagement.deleteDialog.confirmMismatch',
        'Please type FORCE-DELETE-USER exactly to confirm deletion.',
      );
      setError(msg);
      showError(msg);
      return;
    }

    if (trimmedReason.length < 10) {
      const msg = t(
        'adminManagement.deleteDialog.reasonTooShort',
        'Please enter a reason with at least 10 characters.',
      );
      setError(msg);
      showError(msg);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await deleteAdmin(deleteTarget.id, {
        confirmText: deleteConfirmText,
        reason: trimmedReason,
      });
      showSuccess(t('adminManagement.deleteSuccess', 'Xóa tài khoản admin thành công.'));
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      setDeleteConfirmText('');
      setDeleteReason('');
      await fetchAdmins();
    } catch (err) {
      const msg = getFriendlyError(
        err,
        null,
        t('adminManagement.deleteError', 'Không thể xóa tài khoản admin.'),
      );
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString(locale, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatRemainingTime = (expiresAt) => {
    if (!expiresAt) return null;
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (Number.isNaN(ms) || ms <= 0) return t('adminManagement.rbac.expired', 'expired');
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days >= 1) return t('adminManagement.rbac.remainingDays', { count: days, defaultValue: '{{count}}d left' });
    if (hours >= 1) return t('adminManagement.rbac.remainingHours', { count: hours, defaultValue: '{{count}}h left' });
    const minutes = Math.max(1, Math.floor(ms / (60 * 1000)));
    return t('adminManagement.rbac.remainingMinutes', { count: minutes, defaultValue: '{{count}}m left' });
  };

  const getStatusBadge = (status) => {
    const s = status?.toUpperCase?.() || status;
    switch (s) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'INACTIVE': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'BANNED': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const allSelected = permissions.length > 0 && permissions.every((p) =>
    userPermissions.includes(String(p.code).toLowerCase())
  );
  const activeAdminCount = admins.filter((admin) => String(admin.status || '').toUpperCase() === 'ACTIVE').length;
  const totalPermissionAssignments = admins.reduce(
    (sum, admin) => sum + (Array.isArray(admin.permissions) ? admin.permissions.length : 0),
    0,
  );
  const recentActivityCount = admins.filter((admin) => {
    const rawValue = admin.lastLoginAt || admin.updatedAt || admin.createdAt;
    if (!rawValue) return false;
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return false;
    return Date.now() - parsed.getTime() <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <SuperAdminPage className={`animate-in fade-in duration-500 ${fontClass}`}>
      <SuperAdminPageHeader
        eyebrow="Access Control"
        title={t('adminManagement.title')}
        description={t('adminManagement.desc')}
        actions={(
          <Button
            className="h-10 rounded-2xl bg-[#0455BF] px-4 text-white hover:bg-[#03449a]"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('adminManagement.add')}
          </Button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SuperAdminMetricCard
          label={t('adminManagement.table.role', 'Admins')}
          value={admins.length.toLocaleString(locale)}
          helper={t('adminManagement.metricAdmins', 'Total privileged accounts')}
          icon={Shield}
          tone="blue"
          isDarkMode={isDarkMode}
        />
        <SuperAdminMetricCard
          label={t('adminManagement.table.status', 'Active')}
          value={activeAdminCount.toLocaleString(locale)}
          helper={t('adminManagement.metricStatus', 'Accounts currently enabled')}
          icon={ShieldCheck}
          tone="emerald"
          isDarkMode={isDarkMode}
        />
        <SuperAdminMetricCard
          label={t('adminManagement.table.rbac', 'Permission Slots')}
          value={totalPermissionAssignments.toLocaleString(locale)}
          helper={t('adminManagement.metricPermissions', 'Assignments synced from RBAC')}
          icon={ClipboardList}
          tone="amber"
          isDarkMode={isDarkMode}
        />
        <SuperAdminMetricCard
          label={t('adminManagement.table.lastLogin', '7d Activity')}
          value={recentActivityCount.toLocaleString(locale)}
          helper={t('adminManagement.metricRecentActivity', 'Admins with a recent login')}
          icon={Users}
          tone="slate"
          isDarkMode={isDarkMode}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-100 dark:bg-rose-900/30 px-4 py-3 text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}
      <SuperAdminPanel
        title={t('adminManagement.cardTitle')}
        description={t('adminManagement.cardSubtitle', 'Provision admin accounts and jump straight into permission management.')}
        action={(
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <SuperAdminSearchField
              placeholder={t('adminManagement.searchPlaceholder')}
              className="w-full md:w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={fetchAdmins}
              disabled={isLoading}
              className="h-11 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              aria-label={t('common.refresh')}
              title={t('common.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
        contentClassName="p-0"
      >
          <div className="overflow-x-auto">
            <Table className="table-auto min-w-full text-left">
              <TableHeader className={`${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}`}>
                <TableRow className="border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="w-[180px] text-left font-bold text-slate-500">{t('adminManagement.table.username')}</TableHead>
                  <TableHead className="w-[220px] min-w-[200px] text-left font-bold text-slate-500">{t('adminManagement.table.email')}</TableHead>
                  <TableHead className="w-[120px] text-left font-bold text-slate-500">{t('adminManagement.table.status')}</TableHead>
                  <TableHead className="w-[100px] text-left font-bold text-slate-500">{t('adminManagement.table.role')}</TableHead>
                  <TableHead className="w-[150px] text-left font-bold text-slate-500">{t('adminManagement.table.lastLogin')}</TableHead>
                  <TableHead className="w-[140px] text-right font-bold text-slate-500">{t('adminManagement.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.length > 0 ? (
                  filteredAdmins.map((admin) => (
                    <TableRow
                      key={admin.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <TableCell className={`text-left font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        {admin.username}
                      </TableCell>
                      <TableCell className={`text-left ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{admin.email}</TableCell>
                      <TableCell className="text-left">
                        <Badge className={`rounded-lg px-2.5 py-0.5 border-none ${getStatusBadge(admin.status)}`}>
                          {admin.status || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <Badge
                          className={
                            admin.role === 'SUPER_ADMIN'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                          }
                        >
                          {admin.role}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-left text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDate(admin.lastLoginAt || admin.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-lg"
                              aria-label={t('adminManagement.table.actions', 'Actions')}
                              title={t('adminManagement.table.actions', 'Actions')}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className={isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : ''}
                          >
                            <DropdownMenuItem
                              onClick={() => openRbacPopup(admin)}
                              className="cursor-pointer"
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              {t('adminManagement.table.rbac', 'RBAC')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(admin)}
                              className="cursor-pointer text-rose-600 focus:text-rose-700 dark:text-rose-300 dark:focus:text-rose-200"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('common.delete', 'Delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-medium italic">
                        {t('adminManagement.noData')}
                      </TableCell>
                    </TableRow>
                  )
                )}
                {isLoading && (
                   <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      <ListSpinner variant="table" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
      </SuperAdminPanel>

      {/* Create Admin Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className={isDarkMode ? 'bg-slate-900 border-slate-800' : ''}>
          <DialogHeader>
            <DialogTitle>{t('adminManagement.add')}</DialogTitle>
            <DialogDescription>
              {t('adminManagement.form.description', 'Create a new admin account. Open RBAC on each row to assign permissions.')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div><Label>{t('adminManagement.form.username')} *</Label><Input required minLength={3} value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder={t('adminManagement.form.usernamePlaceholder', 'admin_username')} className="mt-1" /></div>
            <div><Label>{t('adminManagement.form.email')} *</Label><Input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder={t('adminManagement.form.emailPlaceholder', 'admin@example.com')} className="mt-1" /></div>
            <div><Label>{t('adminManagement.form.password')} *</Label><Input required type="password" minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={t('adminManagement.form.passwordPlaceholder', 'At least 6 characters')} className="mt-1" /></div>
            <div><Label>{t('adminManagement.form.confirmPassword')} *</Label><Input required type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder={t('adminManagement.form.confirmPasswordPlaceholder', 'Re-enter password')} className="mt-1" /></div>
            <div><Label>{t('adminManagement.form.fullNameOptional', 'Full Name (Optional)')}</Label><Input value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder={t('adminManagement.form.fullNamePlaceholder', 'Admin Name')} className="mt-1" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>{t('auth.cancel')}</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('adminManagement.form.creating', 'Creating...') : t('adminManagement.form.submit')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmText('');
            setDeleteReason('');
          }
        }}
      >
        <DialogContent className={isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : ''}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : ''}>
              {t('adminManagement.deleteDialog.title', 'Delete admin account')}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : ''}>
              {t(
                'adminManagement.deleteDialog.description',
                {
                  username: deleteTarget?.username || '-',
                  email: deleteTarget?.email || '-',
                  defaultValue: 'This action will permanently remove admin account {{username}} ({{email}}).',
                },
              )}
            </DialogDescription>
          </DialogHeader>

          <div className={`rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? 'border-rose-500/20 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            {t(
              'adminManagement.deleteDialog.warning',
              'The account will lose access to the admin system immediately after deletion.',
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>
                {t('adminManagement.deleteDialog.confirmLabel', 'Confirmation text')}
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder="FORCE-DELETE-USER"
                className={`mt-1.5 ${isDarkMode ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500' : ''}`}
              />
              <p className={`mt-1.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {t(
                  'adminManagement.deleteDialog.confirmHelp',
                  'Type FORCE-DELETE-USER exactly to confirm this action.',
                )}
              </p>
            </div>

            <div>
              <Label className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>
                {t('adminManagement.deleteDialog.reasonLabel', 'Reason')}
              </Label>
              <textarea
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                rows={4}
                placeholder={t(
                  'adminManagement.deleteDialog.reasonPlaceholder',
                  'Enter the audit reason for deleting this admin account...',
                )}
                className={`mt-1.5 w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none transition-colors ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500'
                    : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                }`}
              />
              <p className={`mt-1.5 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                {t(
                  'adminManagement.deleteDialog.reasonHelp',
                  'Minimum 10 characters. This will be stored in the audit log.',
                )}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteOpen(false);
                setDeleteTarget(null);
                setDeleteConfirmText('');
                setDeleteReason('');
              }}
              className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleDeleteAdmin}
              disabled={isLoading}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isLoading ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RBAC Popup */}
      <Dialog open={isRbacOpen} onOpenChange={setIsRbacOpen}>
        <DialogContent hideClose className={`max-w-xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden ${isDarkMode ? 'bg-[#0f1629] border-white/[0.08]' : 'bg-white'}`}>
          {/* Fixed header */}
          <div className={`flex-shrink-0 px-6 pt-6 pb-4 border-b ${isDarkMode ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <DialogHeader className="p-0 space-y-1">
              <DialogTitle className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {t('adminManagement.rbac.title', {
                  username: selectedAdmin?.username,
                  defaultValue: 'Permissions: {{username}}',
                })}
              </DialogTitle>
              <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                {t(
                  'adminManagement.rbac.description',
                  'Toggle permissions for ADMIN accounts. SUPER_ADMIN keeps full default access.'
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {selectedAdmin && (
              <>
                {selectedAdmin.role === 'SUPER_ADMIN' ? (
                  <div className={`flex flex-col items-center justify-center py-10 gap-3`}>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                      <ShieldCheck className="w-7 h-7 text-white" />
                    </div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t(
                        'adminManagement.rbac.superAdminReadonly',
                        'SUPER_ADMIN accounts always have full default access.'
                      )}
                    </p>
                  </div>
                ) : selectedAdmin.role === 'ADMIN' && (
                  <div className="space-y-4">
                    {/* Counter + Toggle All */}
                    <div className={`flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          isDarkMode ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {userPermissions.length}/{permissions.length}
                        </div>
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('adminManagement.form.grantedPermissions', 'granted permissions')}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAllPermissions(!allSelected)}
                        className={`rounded-lg text-xs h-8 cursor-pointer ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : ''}`}
                      >
                        {allSelected
                          ? t('adminManagement.rbac.clearAll', 'Clear all')
                          : t('adminManagement.rbac.grantAll', 'Grant all')}
                      </Button>
                    </div>

                    {isRbacLoading ? (
                      <ListSpinner variant="inline" />
                    ) : (
                      <div className="space-y-4">
                        {PERM_CATEGORIES.map((cat) => {
                          const catPerms = permissions.filter((p) => String(p.code).toLowerCase().startsWith(cat.prefix));
                          if (catPerms.length === 0) return null;
                          const CatIcon = cat.icon;
                          const allCatChecked = catPerms.every((p) => userPermissions.includes(String(p.code).toLowerCase()));
                          return (
                            <div key={cat.prefix} className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                              {/* Category header */}
                              <div className={`flex items-center gap-2.5 px-4 py-2.5 ${isDarkMode ? 'bg-white/[0.02]' : 'bg-slate-50'}`}>
                                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cat.bg} flex items-center justify-center shadow-sm`}>
                                  <CatIcon className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span className={`text-xs font-bold uppercase tracking-wider ${cat.color}`}>{t(cat.labelKey)}</span>
                                <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  allCatChecked
                                    ? isDarkMode ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                                    : isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-200 text-slate-400'
                                }`}>
                                  {catPerms.filter((p) => userPermissions.includes(String(p.code).toLowerCase())).length}/{catPerms.length}
                                </span>
                              </div>
                              {/* Permission items */}
                              <div className={`divide-y ${isDarkMode ? 'divide-white/[0.04]' : 'divide-slate-100'}`}>
                                {catPerms.map((p) => {
                                  const code = String(p.code).toLowerCase();
                                  const checked = userPermissions.includes(code);
                                  const action = getPermAction(code);
                                  const isRead = code.includes('read');
                                  const detail = permissionDetailsMap[code];
                                  const expiresAt = detail?.expiresAt;
                                  const remaining = formatRemainingTime(expiresAt);
                                  const isExpiringSoon = expiresAt && (new Date(expiresAt).getTime() - Date.now()) < 24 * 60 * 60 * 1000;
                                  return (
                                    <label key={p.code} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-150 ${
                                      checked
                                        ? isDarkMode ? 'bg-blue-500/[0.07]' : 'bg-blue-50/60'
                                        : isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-white'
                                    }`}>
                                      <Switch checked={checked} onCheckedChange={() => togglePermission(code)} />
                                      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                                        checked
                                          ? isDarkMode ? 'bg-white/10' : 'bg-blue-100'
                                          : isDarkMode ? 'bg-white/5' : 'bg-slate-100'
                                      }`}>
                                        {isRead
                                          ? <Eye className={`w-3 h-3 ${checked ? cat.color : isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                                          : <Pencil className={`w-3 h-3 ${checked ? cat.color : isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                                        }
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className={`block text-sm font-medium ${
                                          checked ? isDarkMode ? 'text-white' : 'text-slate-800' : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                        }`}>{action}</span>
                                        {checked && detail && (
                                          <span className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium ${
                                            expiresAt
                                              ? isExpiringSoon
                                                ? isDarkMode ? 'text-amber-300' : 'text-amber-600'
                                                : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                              : isDarkMode ? 'text-emerald-300' : 'text-emerald-600'
                                          }`}>
                                            {expiresAt ? (
                                              <>
                                                <Clock className="h-3 w-3" />
                                                <span title={formatDate(expiresAt)}>
                                                  {t('adminManagement.rbac.expiresAt', 'Expires')} {formatDate(expiresAt)} · {remaining}
                                                </span>
                                              </>
                                            ) : (
                                              <>
                                                <InfinityIcon className="h-3 w-3" />
                                                <span>{t('adminManagement.rbac.permanent', 'Permanent')}</span>
                                              </>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                      <span className={`font-mono text-[10px] ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>{p.code}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Fixed footer */}
          <div className={`flex-shrink-0 px-6 py-4 border-t flex flex-col gap-2 ${isDarkMode ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            {selectedAdmin?.role === 'ADMIN' && Object.values(permissionDetailsMap).some((d) => d?.expiresAt) && (
              <p className={`text-[11px] leading-snug ${isDarkMode ? 'text-amber-300' : 'text-amber-600'}`}>
                {t(
                  'adminManagement.rbac.syncWarning',
                  'Sync sẽ biến mọi quyền đang được cấp thành quyền vĩnh viễn (mất expiresAt). Dùng tab Yêu cầu cấp quyền để duyệt quyền có thời hạn.'
                )}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsRbacOpen(false)} className={`rounded-lg cursor-pointer ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : ''}`}>{t('common.close', 'Close')}</Button>
              {selectedAdmin?.role === 'ADMIN' && (
                <Button onClick={handleSyncPermissions} disabled={isRbacLoading} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-lg shadow-blue-600/25 cursor-pointer">
                  {t('adminManagement.form.syncPermissions', 'Sync permissions')}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SuperAdminPage>
  );
}

export default AdminManagement;
