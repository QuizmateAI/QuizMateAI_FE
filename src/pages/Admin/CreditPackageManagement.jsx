import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, RefreshCw, Plus, Edit2, Trash2, Eye,
  Coins, ToggleLeft, ToggleRight, CheckCircle2, CircleOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import ListSpinner from '@/components/ui/ListSpinner';
import CreditPackageFormDialog from './components/CreditPackageFormDialog';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useFormValidator } from '@/hooks/useFormValidator';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage, buildAdminErrorPayload } from '@/utils/getErrorMessage';
import {
  getAllCreditPackages,
  createCreditPackage,
  updateCreditPackage,
  updateCreditPackageStatus,
  deleteCreditPackage,
  getAllSystemSettings,
} from '@/api/ManagementSystemAPI';

const DEFAULT_CREDIT_UNIT_PRICE = 200;

const EMPTY_FORM = {
  name: '',
  description: '',
  creditAmount: '0',
  price: '0',
  bonusCredit: '0',
};

// BE regex: ^[A-Z0-9_\-]+$, length 2–64. Must strip diacritics + force uppercase.
const slugifyCode = (name) => {
  const base = (name || '')
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 64);
  return base.length >= 2 ? base : `${base}PACK`.slice(0, 64);
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

const CREDIT_PACKAGES_QUERY_KEY = ['admin', 'creditPackages'];

function CreditPackageManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { permissions, loading: permLoading } = useAdminPermissions();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const dk = isDarkMode;

  const canWrite = !permLoading && permissions.has('credit-package:write');

  const [searchTerm, setSearchTerm] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingPackage, setDeletingPackage] = useState(null);

  const validator = useFormValidator({
    name: {
      required: true,
      min: 1,
      max: 200,
      message: 'Tên gói phải 1–200 ký tự',
    },
    creditAmount: {
      required: true,
      kind: 'number',
      min: 1,
      max: 100_000_000,
      message: 'Số Credit phải 1 – 100,000,000',
    },
  });

  const getFriendlyError = (err, fallbackKey) => {
    const mapped = getErrorMessage(t, err);
    if (mapped && mapped !== 'error.unknown') return mapped;
    return t(fallbackKey);
  };

  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
  } = useQuery({
    queryKey: CREDIT_PACKAGES_QUERY_KEY,
    queryFn: async () => {
      const [res, settingsRes] = await Promise.all([
        getAllCreditPackages(),
        getAllSystemSettings().catch(() => null),
      ]);
      const list = res?.data ?? res;
      const settingsData = settingsRes?.data ?? settingsRes;
      const settingsList = Array.isArray(settingsData) ? settingsData : [];
      const unitPriceSetting = settingsList.find((s) => s.key === 'credit.unit_price_vnd');
      const resolvedUnitPrice = Number(unitPriceSetting?.value);
      const creditUnitPrice = Number.isFinite(resolvedUnitPrice) && resolvedUnitPrice > 0
        ? resolvedUnitPrice
        : DEFAULT_CREDIT_UNIT_PRICE;
      return {
        packages: Array.isArray(list) ? list : [],
        creditUnitPrice,
      };
    },
  });

  const packages = data?.packages ?? [];
  const creditUnitPrice = data?.creditUnitPrice ?? DEFAULT_CREDIT_UNIT_PRICE;

  React.useEffect(() => {
    if (queryError) {
      showError(getFriendlyError(queryError, 'creditPackageManagement.fetchError'));
    }
  }, [queryError]);

  const invalidatePackages = () =>
    queryClient.invalidateQueries({ queryKey: CREDIT_PACKAGES_QUERY_KEY });

  const calculatePrice = (baseCredit) => {
    const credit = parseInt(baseCredit, 10) || 0;
    return credit * creditUnitPrice;
  };

  const openCreateForm = () => {
    setEditingPackage(null);
    setFormData({ ...EMPTY_FORM });
    validator.reset();
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
    validator.reset();
    setIsFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      if (id != null) {
        return updateCreditPackage(id, payload);
      }
      return createCreditPackage(payload);
    },
    onSuccess: (_resp, variables) => {
      showSuccess(
        variables.id != null
          ? t('creditPackageManagement.updateSuccess', 'Credit package updated successfully.')
          : t('creditPackageManagement.createSuccess', 'Credit package created successfully.'),
      );
      setIsFormOpen(false);
      invalidatePackages();
    },
    onError: (err) => {
      showError(buildAdminErrorPayload(t, err, 'Không lưu được gói Credit'));
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateCreditPackageStatus(id, { status }),
    onSuccess: () => {
      showSuccess(t('creditPackageManagement.updateStatusSuccess', 'Credit package status updated successfully.'));
      invalidatePackages();
    },
    onError: (err) => {
      showError(buildAdminErrorPayload(t, err, 'Không đổi được trạng thái gói'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }) => deleteCreditPackage(id),
    onSuccess: () => {
      showSuccess(t('creditPackageManagement.deleteSuccess', 'Credit package deleted successfully.'));
      setIsDeleteOpen(false);
      setDeletingPackage(null);
      invalidatePackages();
    },
    onError: (err) => {
      showError(buildAdminErrorPayload(t, err, 'Không xoá được gói Credit'));
    },
  });

  const isSubmitting = saveMutation.isPending || deleteMutation.isPending;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validator.validateAll(formData)) {
      showError(t('common.formHasErrors', 'Vui lòng kiểm tra các trường bị đánh dấu đỏ.'));
      return;
    }
    const baseCredit = parseInt(formData.creditAmount, 10) || 0;
    const bonusCredit = Math.floor(baseCredit * 0.1);
    const price = calculatePrice(baseCredit);
    const displayName = formData.name.trim();

    if (editingPackage) {
      saveMutation.mutate({
        id: editingPackage.creditPackageId ?? editingPackage.id,
        payload: { displayName, baseCredit, bonusCredit, price },
      });
    } else {
      saveMutation.mutate({
        id: null,
        payload: {
          code: slugifyCode(displayName),
          displayName,
          baseCredit,
          bonusCredit,
          price,
        },
      });
    }
  };

  const handleToggleStatus = (pkg) => {
    const nextStatus = (pkg.status || '').toUpperCase() === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    statusMutation.mutate({ id: pkg.creditPackageId ?? pkg.id, status: nextStatus });
  };

  const confirmDelete = (pkg) => {
    setDeletingPackage(pkg);
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deletingPackage) return;
    deleteMutation.mutate({ id: deletingPackage.creditPackageId ?? deletingPackage.id });
  };

  const filteredPackages = useMemo(
    () => packages.filter((p) => (p.displayName || p.name || '').toLowerCase().includes(searchTerm.toLowerCase())),
    [packages, searchTerm],
  );

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
            {t('creditPackageManagement.title', 'Credit Packages')}
          </h1>
          <p className={`${dk ? 'text-slate-400' : 'text-slate-500'} font-medium`}>
            {t('creditPackageManagement.desc', 'Manage the portfolio of credit packages used within the system.')}
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={openCreateForm}
            className="bg-ocean-cta hover:brightness-110 text-white h-11 px-5 rounded-xl shadow-lg shadow-ocean-500/25 transition-all active:scale-[0.97] cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('creditPackageManagement.add', 'Add package')}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t('creditPackageManagement.stats.total', 'Total'),
            value: packages.length,
            from: 'from-blue-500',
            to: 'to-indigo-600',
          },
          {
            label: t('creditPackageManagement.stats.active', 'Active'),
            value: packages.filter((p) => (p.status || '').toUpperCase() === 'ACTIVE').length,
            from: 'from-emerald-500',
            to: 'to-teal-600',
          },
          {
            label: t('creditPackageManagement.stats.minPrice', 'Min Price'),
            value:
              packages.length === 0
                ? '—'
                : formatCurrency(Math.min(...packages.map((p) => p.price || 0))),
            from: 'from-amber-500',
            to: 'to-orange-600',
          },
          {
            label: t('creditPackageManagement.stats.maxCredit', 'Max Credit'),
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
            {t('creditPackageManagement.tableTitle', 'List of credit packages')}{' '}
            <span className={`font-normal text-sm ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
              ({filteredPackages.length})
            </span>
          </h2>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('creditPackageManagement.search', 'Search packages')}
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
              onClick={invalidatePackages}
              disabled={isFetching}
              className={`h-10 w-10 rounded-xl cursor-pointer ${dk ? 'border-white/10 hover:bg-white/5' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
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
                <TableHead className="w-[220px] font-semibold text-xs uppercase tracking-wider text-slate-400">
                  {t('creditPackageManagement.table.name', 'Name')}
                </TableHead>
                <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider text-slate-400">
                  {t('creditPackageManagement.table.credit', 'Credit')}
                </TableHead>
                <TableHead className="w-[130px] font-semibold text-xs uppercase tracking-wider text-slate-400">
                  {t('creditPackageManagement.table.price', 'Price')}
                </TableHead>
                <TableHead className="w-[110px] font-semibold text-xs uppercase tracking-wider text-slate-400">
                  {t('creditPackageManagement.table.bonus', 'Credits per package')}
                </TableHead>
                <TableHead className="w-[110px] text-center font-semibold text-xs uppercase tracking-wider text-slate-400">
                  {t('creditPackageManagement.table.status', 'Status')}
                </TableHead>
                <TableHead className="w-[140px] text-right font-semibold text-xs uppercase tracking-wider text-slate-400">
                  {t('creditPackageManagement.table.actions', 'Actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
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
                            title={t('creditPackageManagement.edit', 'Edit')}
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
                                title={t('creditPackageManagement.toggleStatus', 'Toggle status')}
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
                                title={t('creditPackageManagement.edit', 'Edit')}
                                className={`h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                                  dk ? 'text-blue-300 hover:bg-blue-500/10' : 'text-blue-500 hover:bg-blue-50'
                                }`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmDelete(pkg)}
                                title={t('creditPackageManagement.delete', 'Delete')}
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
                    colSpan={6}
                    className="text-center py-16 text-slate-400 text-sm italic"
                  >
                    {t('creditPackageManagement.empty', 'No credit packages found.')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreditPackageFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingPackage={editingPackage}
        formData={formData}
        setFormData={setFormData}
        validator={validator}
        calculatePrice={calculatePrice}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        isDarkMode={dk}
        t={t}
      />

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
              {t('creditPackageManagement.confirmDelete', 'Delete credit package?')}
            </DialogTitle>
            <DialogDescription>
              {t('creditPackageManagement.confirmDeleteDesc', 'This action cannot be undone. The selected credit package will be permanently removed.',
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
              {t('auth.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {isSubmitting
                ? t('creditPackageManagement.deleting', 'Deleting...')
                : t('creditPackageManagement.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreditPackageManagement;

