import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit, Search, Shield, RefreshCw } from 'lucide-react';
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  getAllSystemUsers,
  createAdmin,
  listPermissions,
  getUserPermissions,
  syncUserPermissions,
} from '@/api/ManagementSystemAPI';
import { useDarkMode } from '@/hooks/useDarkMode';

// Permissions mà ADMIN được phép (khớp với BE RbacRoleMatrix.adminAllowedPermissions)
const ADMIN_ALLOWED_CODES = [
  'user:read', 'user:update', 'user:status_update', 'user:assign_role',
  'plan:read', 'plan:write', 'subscription:read', 'subscription:write',
  'payment:read', 'payment:write', 'material:moderate', 'audit:read',
  'system-settings:read', 'group:read_all',
];

function AdminManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  
  // State definitions
  const [searchTerm, setSearchTerm] = useState('');
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
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
      const data = res?.data ?? res;
      const list = Array.isArray(data) ? data : [];
      setAdmins(list.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'));
    } catch (err) {
      setError(err?.message || 'Không thể tải danh sách admin');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
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
      setSuccessMsg('Tạo admin thành công');
      setTimeout(() => setSuccessMsg(''), 3000);
      setIsCreateOpen(false);
      setFormData({ username: '', email: '', password: '', confirmPassword: '', fullName: '' });
      fetchAdmins();
    } catch (err) {
      setError(err?.message || 'Không thể tạo admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRbacPopup = async (admin) => {
    setSelectedAdmin(admin);
    setUserPermissions(admin?.permissions ? [...admin.permissions] : []);
    setIsRbacOpen(true);
    setIsRbacLoading(true);
    try {
      const [permRes, userPermRes] = await Promise.all([
        listPermissions(),
        admin.role === 'ADMIN' ? getUserPermissions(admin.id) : Promise.resolve({ data: [] }),
      ]);
      const permData = permRes?.data ?? permRes;
      const allPerms = Array.isArray(permData) ? permData : [];
      const adminPerms = allPerms.filter((p) => ADMIN_ALLOWED_CODES.includes(p.code?.toLowerCase()));
      setPermissions(adminPerms);

      if (admin.role === 'ADMIN') {
        const up = userPermRes?.data ?? userPermRes;
        setUserPermissions(Array.isArray(up) ? up.map((c) => String(c).toLowerCase()) : []);
      }
    } catch (err) {
      setUserPermissions(admin?.permissions ? [...admin.permissions] : []);
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
      setSuccessMsg('Đã đồng bộ quyền thành công');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err?.message || 'Không thể đồng bộ quyền');
    } finally {
      setIsRbacLoading(false);
    }
  };

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('vi-VN', {
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
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-900/30 px-4 py-3 text-emerald-700 dark:text-emerald-400">
          {successMsg}
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
            <Button variant="outline" size="icon" onClick={fetchAdmins} disabled={isLoading} className="h-11 rounded-xl">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="table-auto min-w-full text-left">
              <TableHeader className={`${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}`}>
                <TableRow className="border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="w-[80px] text-left font-bold text-slate-500">{t('adminManagement.table.id')}</TableHead>
                  <TableHead className="w-[180px] text-left font-bold text-slate-500">{t('adminManagement.table.username')}</TableHead>
                  <TableHead className="w-[220px] min-w-[200px] text-left font-bold text-slate-500">{t('adminManagement.table.email')}</TableHead>
                  <TableHead className="w-[120px] text-left font-bold text-slate-500">{t('adminManagement.table.status')}</TableHead>
                  <TableHead className="w-[100px] text-left font-bold text-slate-500">Role</TableHead>
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
                      <TableCell className="text-left font-bold text-blue-600 dark:text-blue-400">{admin.id}</TableCell>
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
                          RBAC
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 text-slate-400 font-medium italic">
                        {t('adminManagement.noData')}
                      </TableCell>
                    </TableRow>
                  )
                )}
                {isLoading && (
                   <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-slate-400 font-medium italic">
                      Loading...
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
              Tạo tài khoản Admin mới. Nhấn RBAC trên từng dòng để gán quyền.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div><Label>Username *</Label><Input required minLength={3} value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="admin_username" className="mt-1" /></div>
            <div><Label>Email *</Label><Input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="admin@example.com" className="mt-1" /></div>
            <div><Label>Mật khẩu *</Label><Input required type="password" minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Tối thiểu 6 ký tự" className="mt-1" /></div>
            <div><Label>Xác nhận mật khẩu *</Label><Input required type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Nhập lại mật khẩu" className="mt-1" /></div>
            <div><Label>Họ tên (tuỳ chọn)</Label><Input value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="Admin Name" className="mt-1" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>{t('auth.cancel')}</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang tạo...' : 'Tạo Admin'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RBAC Popup */}
      <Dialog open={isRbacOpen} onOpenChange={setIsRbacOpen}>
        <DialogContent className={`max-w-xl max-h-[90vh] overflow-hidden flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : ''}>
              Phân quyền: {selectedAdmin?.username}
            </DialogTitle>
            <DialogDescription>
              Bật/tắt quyền cho tài khoản ADMIN. SUPER_ADMIN có toàn quyền mặc định.
            </DialogDescription>
          </DialogHeader>

          {selectedAdmin && (
            <div className="flex flex-col gap-4 py-2 overflow-y-auto">
              {selectedAdmin.role === 'SUPER_ADMIN' ? (
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Tài khoản SUPER_ADMIN có toàn quyền mặc định, không cần cấu hình.
                </p>
              ) : selectedAdmin.role === 'ADMIN' && (
                <>
                  <div className="flex items-center justify-between border-b pb-3">
                    <Label className="text-sm font-medium">Quyền hạn ({userPermissions.length}/{permissions.length})</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAllPermissions(!allSelected)}
                      className="rounded-lg"
                    >
                      {allSelected ? 'Bỏ tất cả' : 'Cấp tất cả'}
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className={isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}>
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400 w-[45%]">Quyền</th>
                          <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400 w-[40%]">Mô tả</th>
                          <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400 w-[15%]">Bật/Tắt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isRbacLoading ? (
                          <tr><td colSpan={3} className="py-8 text-center text-slate-400">Đang tải...</td></tr>
                        ) : (
                          permissions.map((p) => {
                            const code = String(p.code).toLowerCase();
                            const checked = userPermissions.includes(code);
                            return (
                              <tr
                                key={p.code}
                                className={`border-t ${isDarkMode ? 'border-slate-700 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`}
                              >
                                <td className="py-3 px-4 font-mono text-xs">{p.code}</td>
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{p.description || '-'}</td>
                                <td className="py-3 px-4 text-right">
                                  <Switch
                                    checked={checked}
                                    onCheckedChange={() => togglePermission(code)}
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 border-t pt-4">
            <Button variant="outline" onClick={() => setIsRbacOpen(false)}>Đóng</Button>
            {selectedAdmin?.role === 'ADMIN' && (
              <Button onClick={handleSyncPermissions} disabled={isRbacLoading}>Đồng bộ quyền</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminManagement;
