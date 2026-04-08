import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Shield, RefreshCw,
  Users, Package, CreditCard, Banknote, FileText,
  ClipboardList, UsersRound, ShieldCheck, Eye, Pencil,
} from 'lucide-react';
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/Components/ui/dialog";
import { Label } from "@/Components/ui/label";
import ListSpinner from "@/Components/ui/ListSpinner";
import { Card, CardHeader, CardTitle, CardContent } from "@/Components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import { Badge } from "@/Components/ui/badge";
import { Switch } from "@/Components/ui/switch";
import {
  getAllSystemUsers,
  createAdmin,
  listPermissions,
  getAdminAllowedPermissions,
  getUserPermissions,
  syncUserPermissions,
} from '@/api/ManagementSystemAPI';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
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

  // RBAC Dialog State
  const [isRbacOpen, setIsRbacOpen] = useState(false);
  const [isRbacLoading, setIsRbacLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);

  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const fetchAdmins = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getAllSystemUsers();
      const pageData = res?.data ?? res;
      const list = Array.isArray(pageData?.content) ? pageData.content : (Array.isArray(pageData) ? pageData : []);
      setAdmins(list.filter((u) => u.role === 'ADMIN'));
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
    setIsRbacOpen(true);
    setIsRbacLoading(true);
    try {
      const [permRes, allowedPermRes, userPermRes] = await Promise.all([
        listPermissions(),
        getAdminAllowedPermissions(),
        admin.role === 'ADMIN' ? getUserPermissions(admin.id) : Promise.resolve({ data: [] }),
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

  return (
    <div className={`space-y-6 p-6 animate-in fade-in duration-500 ${fontClass}`}>
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('adminManagement.title')}
          </h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'} font-medium`}>
            {t('adminManagement.desc')}
          </p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 h-12 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('adminManagement.add')}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-100 dark:bg-rose-900/30 px-4 py-3 text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}
      <Card
        className={`border shadow-sm overflow-hidden rounded-[24px] transition-colors duration-300 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {t('adminManagement.cardTitle')}
          </CardTitle>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('adminManagement.searchPlaceholder')}
                className={`pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 ${
                  isDarkMode ? 'text-white placeholder:text-slate-500' : 'text-slate-900'
                }`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchAdmins}
              disabled={isLoading}
              className="h-11 rounded-xl"
              aria-label={t('common.refresh')}
              title={t('common.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => openRbacPopup(admin)}
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          {t('adminManagement.table.rbac', 'RBAC')}
                        </Button>
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
        </CardContent>
      </Card>

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
                                        <span className={`text-sm font-medium ${
                                          checked ? isDarkMode ? 'text-white' : 'text-slate-800' : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                        }`}>{action}</span>
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
          <div className={`flex-shrink-0 px-6 py-4 border-t flex justify-end gap-3 ${isDarkMode ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <Button variant="outline" onClick={() => setIsRbacOpen(false)} className={`rounded-lg cursor-pointer ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : ''}`}>{t('common.close', 'Close')}</Button>
            {selectedAdmin?.role === 'ADMIN' && (
              <Button onClick={handleSyncPermissions} disabled={isRbacLoading} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-lg shadow-blue-600/25 cursor-pointer">
                {t('adminManagement.form.syncPermissions', 'Sync permissions')}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminManagement;
