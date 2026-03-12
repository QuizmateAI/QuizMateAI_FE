import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, RefreshCw, Plus, Edit2, Trash2, Eye,
  Coins, ToggleLeft, ToggleRight, CheckCircle2, CircleOff,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/Components/ui/dialog';
import { Label } from '@/Components/ui/label';
import ListSpinner from '@/Components/ui/ListSpinner';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import {
  getAllCreditPackages,
  createCreditPackage,
  updateCreditPackage,
  updateCreditPackageStatus,
  deleteCreditPackage,
} from '@/api/ManagementSystemAPI';

const EMPTY_FORM = {
  name: '',
  description: '',
  creditAmount: '0',
  price: '0',
  bonusCredit: '0',
};

const STATUS_META = {
  ACTIVE: {
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    icon: CheckCircle2,
  },
  INACTIVE: {
    color: 'text-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    icon: CircleOff,
  },
};

function CreditPackageManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { permissions, loading: permLoading } = useAdminPermissions();
  const { showSuccess, showError } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const dk = isDarkMode;

  const canWrite = !permLoading && permissions.has('credit-package:write');

  const [packages, setPackages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingPackage, setDeletingPackage] = useState(null);

  const getFriendlyError = (err, fallbackKey) => {
    const mapped = getErrorMessage(t, err);
    if (mapped && mapped !== 'error.unknown') return mapped;
    return t(fallbackKey);
  };

  const fetchPackages = async () => {
    setIsLoading(true);
    try {
      const res = await getAllCreditPackages();
      const data = res?.data ?? res;
      setPackages(Array.isArray(data) ? data : []);
    } catch (err) {
      showError(getFriendlyError(err, 'creditPackage.fetchError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateForm = () => {
    setEditingPackage(null);
    setFormData({ ...EMPTY_FORM });
    setIsFormOpen(true);
  };

  const openEditForm = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.displayName || pkg.name || '',
      description: pkg.description || '',
      creditAmount: String(pkg.baseCredit ?? pkg.creditAmount ?? '0'),
      price: String(pkg.price ?? '0'),
      bonusCredit: String(pkg.bonusCredit ?? pkg.bonusPercent ?? '0'),
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError(t('creditPackage.nameRequired'));
      return;
    }
    setIsSubmitting(true);
    try {
      const baseCredit = parseInt(formData.creditAmount, 10) || 0;
      const bonusCredit = Math.floor(baseCredit * 0.1);
      const price = parseInt(formData.price, 10) || (baseCredit * 200);

      const payload = {
        code: formData.name.trim().toLowerCase().replace(/\s+/g, '-'),
        displayName: formData.name.trim(),
        baseCredit,
        bonusCredit,
        price,
      };
      if (editingPackage) {
        await updateCreditPackage(editingPackage.creditPackageId ?? editingPackage.id, payload);
        showSuccess(t('creditPackage.updateSuccess'));
      } else {
        await createCreditPackage(payload);
        showSuccess(t('creditPackage.createSuccess'));
      }
      setIsFormOpen(false);
      fetchPackages();
    } catch (err) {
      showError(getFriendlyError(err, 'creditPackage.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (pkg) => {
    try {
      const nextStatus = (pkg.status || '').toUpperCase() === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await updateCreditPackageStatus(pkg.creditPackageId ?? pkg.id, { status: nextStatus });
      showSuccess(t('creditPackage.updateStatusSuccess'));
      fetchPackages();
    } catch (err) {
      showError(getFriendlyError(err, 'creditPackage.submitError'));
    }
  };

  const confirmDelete = (pkg) => {
    setDeletingPackage(pkg);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPackage) return;
    setIsSubmitting(true);
    try {
      await deleteCreditPackage(deletingPackage.creditPackageId ?? deletingPackage.id);
      showSuccess(t('creditPackage.deleteSuccess'));
      fetchPackages();
    } catch (err) {
      showError(getFriendlyError(err, 'creditPackage.deleteError'));
    } finally {
      setIsDeleteOpen(false);
      setDeletingPackage(null);
      setIsSubmitting(false);
    }
  };

  const filteredPackages = useMemo(
    () => packages.filter((p) => (p.displayName || p.name || '').toLowerCase().includes(searchTerm.toLowerCase())),
    [packages, searchTerm],
  );

  const inputCls = `mt-1.5 h-10 rounded-lg transition-colors duration-200 ${
    dk
      ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500 focus:ring-blue-500/20'
      : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500/20'
  }`;

  const sectionCls = `rounded-xl border p-4 ${
    dk ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50/80 border-slate-100'
  }`;

  const formatCurrency = (val) => {
    if (val == null) return '—';
    const n = Number(val) || 0;
    return `${n.toLocaleString('vi-VN')} VND`;
  };

  const getStatusMeta = (status) => {
    const key = (status || '').toUpperCase();
    return STATUS_META[key] || STATUS_META.INACTIVE;
  };

  return (
    <div className={`space-y-6 p-6 animate-in fade-in duration-500 ${fontClass}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${dk ? 'text-white' : 'text-slate-900'}`}>
            {t('creditPackage.title', 'Credit Packages')}
          </h1>
          <p className={`${dk ? 'text-slate-400' : 'text-slate-500'} font-medium`}>
            {t('creditPackage.desc', 'Quản lý các gói Credit cho hệ thống thanh toán.')}
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={openCreateForm}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-11 px-5 rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-[0.97] cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('creditPackage.add', 'Thêm gói Credit')}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t('creditPackage.stats.total', 'Tổng số gói'),
            value: packages.length,
            from: 'from-blue-500',
            to: 'to-indigo-600',
          },
          {
            label: t('creditPackage.stats.active', 'Đang ACTIVE'),
            value: packages.filter((p) => (p.status || '').toUpperCase() === 'ACTIVE').length,
            from: 'from-emerald-500',
            to: 'to-teal-600',
          },
          {
            label: t('creditPackage.stats.minPrice', 'Giá thấp nhất'),
            value:
              packages.length === 0
                ? '—'
                : formatCurrency(Math.min(...packages.map((p) => p.price || 0))),
            from: 'from-amber-500',
            to: 'to-orange-600',
          },
          {
            label: t('creditPackage.stats.maxCredit', 'Credit cao nhất'),
            value:
              packages.length === 0
                ? '—'
                : Math.max(...packages.map((p) => p.baseCredit || p.creditAmount || 0)).toLocaleString('vi-VN'),
            from: 'from-cyan-500',
            to: 'to-sky-600',
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] cursor-default ${
              dk ? 'bg-white/[0.04] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'
            }`}
          >
            <div
              className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${s.from} ${s.to} opacity-[0.08] -translate-y-6 translate-x-6`}
            />
            <div className="flex items-center justify-between relative">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                  {s.label}
                </p>
                <p className={`text-2xl font-black mt-1 ${dk ? 'text-white' : 'text-slate-900'}`}>{s.value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/40">
                <Coins className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        className={`rounded-2xl border overflow-hidden transition-colors ${
          dk ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div
          className={`flex flex-col md:flex-row items-center justify-between gap-4 p-5 border-b ${
            dk ? 'border-white/[0.06]' : 'border-slate-100'
          }`}
        >
          <h2 className={`text-lg font-bold ${dk ? 'text-white' : 'text-slate-800'}`}>
            {t('creditPackage.tableTitle', 'Danh sách gói Credit')}{' '}
            <span className={`font-normal text-sm ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              ({filteredPackages.length})
            </span>
          </h2>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('creditPackage.search', 'Tìm kiếm theo tên gói')}
                className={`pl-10 h-10 rounded-xl ${
                  dk ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'border-slate-200'
                }`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchPackages}
              disabled={isLoading}
              className={`h-10 w-10 rounded-xl cursor-pointer ${dk ? 'border-white/10 hover:bg-white/5' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="table-auto min-w-full text-left">
            <TableHeader>
              <TableRow
                className={
                  dk ? 'bg-white/[0.02] border-b border-white/[0.06]' : 'bg-slate-50/80 border-b border-slate-100'
                }
              >
                <TableHead className="w-[60px] font-semibold text-xs uppercase tracking-wider text-slate-400">ID</TableHead>
                <TableHead className="w-[220px] font-semibold text-xs uppercase tracking-wider text-slate-400">
                  {t('creditPackage.table.name', 'Tên gói')}
                </TableHead>
                <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider text-slate-400">
                  {t('creditPackage.table.credit', 'Số Credit')}
                </TableHead>
                <TableHead className="w-[130px] font-semibold text-xs uppercase tracking-wider text-slate-400">
                  {t('creditPackage.table.price', 'Giá')}
                </TableHead>
                <TableHead className="w-[110px] font-semibold text-xs uppercase tracking-wider text-slate-400">
                  {t('creditPackage.table.bonus', 'Bonus Credit')}
                </TableHead>
                <TableHead className="w-[110px] text-center font-semibold text-xs uppercase tracking-wider text-slate-400">
                  {t('creditPackage.table.status', 'Trạng thái')}
                </TableHead>
                <TableHead className="w-[140px] text-right font-semibold text-xs uppercase tracking-wider text-slate-400">
                  {t('creditPackage.table.actions', 'Thao tác')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    <ListSpinner variant="table" />
                  </TableCell>
                </TableRow>
              ) : filteredPackages.length > 0 ? (
                filteredPackages.map((pkg) => {
                  const statusMeta = getStatusMeta(pkg.status);
                  return (
                    <TableRow
                      key={pkg.creditPackageId ?? pkg.id}
                      className={`border-b transition-colors ${
                        dk ? 'border-white/[0.04] hover:bg-white/[0.03]' : 'border-slate-50 hover:bg-blue-50/30'
                      }`}
                    >
                      <TableCell className="font-mono text-sm font-semibold text-blue-500">{pkg.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={`font-semibold text-sm ${dk ? 'text-white' : 'text-slate-800'}`}>
                            {pkg.displayName || pkg.name}
                          </span>
                          {pkg.description && (
                            <span className={`text-xs mt-0.5 ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                              {pkg.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${dk ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {Number(pkg.baseCredit || pkg.creditAmount || 0).toLocaleString('vi-VN')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${dk ? 'text-white' : 'text-slate-800'}`}>
                          {formatCurrency(pkg.price)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${dk ? 'text-amber-300' : 'text-amber-600'}`}>
                          {Number(pkg.bonusCredit || pkg.bonusPercent || 0).toLocaleString('vi-VN')}{" "}
                          {t('wallet.creditsUnit', 'Credit')}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${statusMeta.bg} ${statusMeta.color}`}
                        >
                          <statusMeta.icon className="w-3.5 h-3.5" />
                          {pkg.status || 'INACTIVE'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => openEditForm(pkg)}
                            title={t('creditPackage.edit', 'Chỉnh sửa')}
                            className={`h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                              dk ? 'text-amber-300 hover:bg-amber-500/10' : 'text-amber-500 hover:bg-amber-50'
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canWrite && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(pkg)}
                                title={t('creditPackage.toggleStatus', 'Bật/Tắt')}
                                className={`h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                                  (pkg.status || '').toUpperCase() === 'ACTIVE'
                                    ? dk
                                      ? 'text-emerald-400 hover:bg-emerald-500/10'
                                      : 'text-emerald-500 hover:bg-emerald-50'
                                    : dk
                                      ? 'text-slate-400 hover:bg-white/5'
                                      : 'text-slate-400 hover:bg-slate-50'
                                }`}
                              >
                                {(pkg.status || '').toUpperCase() === 'ACTIVE' ? (
                                  <ToggleRight className="w-4 h-4" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditForm(pkg)}
                                title={t('creditPackage.edit', 'Chỉnh sửa')}
                                className={`h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                                  dk ? 'text-blue-300 hover:bg-blue-500/10' : 'text-blue-500 hover:bg-blue-50'
                                }`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmDelete(pkg)}
                                title={t('creditPackage.delete', 'Xoá')}
                                className={`h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                                  dk ? 'text-rose-300 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-16 text-slate-400 text-sm italic"
                  >
                    {t('creditPackage.empty', 'Chưa có gói Credit nào.')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent
          hideClose
          className={`max-w-lg max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden ${
            dk ? 'bg-[#0f1629] border-white/[0.08]' : 'bg-white'
          }`}
        >
          <div
            className={`flex-shrink-0 px-6 pt-6 pb-4 border-b ${
              dk ? 'border-white/[0.06]' : 'border-slate-100'
            }`}
          >
            <DialogHeader className="p-0 space-y-1">
              <DialogTitle className={`text-xl font-bold ${dk ? 'text-white' : 'text-slate-900'}`}>
                {editingPackage
                  ? t('creditPackage.editTitle', 'Chỉnh sửa gói Credit')
                  : t('creditPackage.addTitle', 'Thêm gói Credit')}
              </DialogTitle>
              <DialogDescription className={dk ? 'text-slate-400' : 'text-slate-500'}>
                {t(
                  'creditPackage.formDesc',
                  'Nhập thông tin gói Credit, số Credit và giá bán.',
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
            <div className={sectionCls}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-4 ${dk ? 'text-blue-400' : 'text-blue-600'}`}>
                {t('creditPackage.basicInfo', 'Thông tin cơ bản')}
              </p>
              <div className="space-y-4">
                        <div>
                  <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('creditPackage.form.name', 'Tên gói')} *
                  </Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('creditPackage.form.namePlaceholder', 'VD: Starter, Pro, Enterprise...')}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('creditPackage.form.description', 'Mô tả')}
                  </Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('creditPackage.form.descriptionPlaceholder', 'Mô tả ngắn về gói...')}
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                      {t('creditPackage.form.creditAmount', 'Số Credit')}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.creditAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        const n = parseInt(value, 10) || 0;
                        const bonus = Math.floor(n * 0.1);
                        setFormData({
                          ...formData,
                          creditAmount: value,
                          price: String(n * 200),
                          bonusCredit: String(bonus),
                        });
                      }}
                      onBlur={() => {
                        const n = parseInt(formData.creditAmount, 10) || 0;
                        const bonus = Math.floor(n * 0.1);
                        setFormData((prev) => ({
                          ...prev,
                          creditAmount: String(n),
                          price: String(n * 200),
                          bonusCredit: String(bonus),
                        }));
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                      {t('creditPackage.form.price', 'Giá (VND)')}
                    </Label>
                    <Input
                      type="text"
                      value={(parseInt(formData.price, 10) || 0).toLocaleString('vi-VN')}
                      readOnly
                      className={`${inputCls} bg-slate-900/40 dark:bg-slate-900/40 cursor-not-allowed`}
                    />
                  </div>
                </div>
                <div>
                  <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('creditPackage.form.bonusCredit', 'Bonus Credit (10% số credit, tự tính)')}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.bonusCredit}
                    readOnly
                    className={`${inputCls} bg-slate-900/40 dark:bg-slate-900/40 cursor-not-allowed`}
                  />
                </div>
              </div>
            </div>

            <div
              className={`flex justify-end gap-3 pt-2 border-t ${
                dk ? 'border-white/[0.06]' : 'border-slate-100'
              }`}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className={`rounded-lg cursor-pointer ${
                  dk ? 'border-white/10 text-slate-300 hover:bg-white/5' : ''
                }`}
              >
                {t('auth.cancel', 'Huỷ')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-lg shadow-blue-600/25 cursor-pointer"
              >
                {isSubmitting
                  ? t('creditPackage.submitting', 'Đang lưu...')
                  : editingPackage
                    ? t('creditPackage.save', 'Lưu thay đổi')
                    : t('creditPackage.create', 'Tạo gói')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setIsDeleteOpen(false);
        }}
      >
        <DialogContent
          hideClose
          className={`max-w-md ${dk ? 'bg-[#0f1629] border-white/[0.08]' : ''}`}
          onPointerDownOutside={(e) => isSubmitting && e.preventDefault()}
          onInteractOutside={(e) => isSubmitting && e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className={dk ? 'text-white' : ''}>
              {t('creditPackage.confirmDelete', 'Xoá gói Credit')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'creditPackage.confirmDeleteDesc',
                'Bạn có chắc chắn muốn xoá gói này? Hành động này không thể hoàn tác.',
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className={`cursor-pointer ${
                dk ? 'border-white/10 text-slate-300 hover:bg-white/5' : ''
              }`}
            >
              {t('auth.cancel', 'Huỷ')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {isSubmitting
                ? t('creditPackage.deleting', 'Đang xoá...')
                : t('creditPackage.delete', 'Xoá')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreditPackageManagement;

