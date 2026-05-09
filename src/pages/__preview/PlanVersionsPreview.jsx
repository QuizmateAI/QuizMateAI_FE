import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  BadgeCheck,
  Layers,
  Search,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminPagination from '@/pages/Admin/components/AdminPagination';

const MOCK_PLANS = [
  { planCatalogId: 1, planCode: 'TEAM', planDisplayName: 'TEAM', planVersion: 1, planIsCurrent: false, planScope: 'WORKSPACE', purchaseCount: 3, distinctPayerCount: 3, baseRevenueVnd: 0, revenueVnd: 15_000_000, aiProviderCostVnd: 63_405, estimatedMarginVnd: 14_936_595 },
  { planCatalogId: 2, planCode: 'TEAM', planDisplayName: 'TEAM', planVersion: 2, planIsCurrent: false, planScope: 'WORKSPACE', purchaseCount: 2, distinctPayerCount: 2, baseRevenueVnd: 2_100_000, revenueVnd: 10_500_000, aiProviderCostVnd: 17_573, estimatedMarginVnd: 10_482_427 },
  { planCatalogId: 3, planCode: 'TITANIUM', planDisplayName: 'TITANIUM', planVersion: 1, planIsCurrent: false, planScope: 'USER', purchaseCount: 9, distinctPayerCount: 9, baseRevenueVnd: 0, revenueVnd: 9_000_000, aiProviderCostVnd: 75_906, estimatedMarginVnd: 8_924_094 },
  { planCatalogId: 4, planCode: 'TITANIUM', planDisplayName: 'TITANIUM', planVersion: 2, planIsCurrent: false, planScope: 'USER', purchaseCount: 4, distinctPayerCount: 4, baseRevenueVnd: 2_000_000, revenueVnd: 6_000_000, aiProviderCostVnd: 88_790, estimatedMarginVnd: 5_911_210 },
  { planCatalogId: 5, planCode: 'TEAM', planDisplayName: 'TEAM', planVersion: 3, planIsCurrent: true, planScope: 'WORKSPACE', purchaseCount: 1, distinctPayerCount: 1, baseRevenueVnd: 1_100_000, revenueVnd: 5_500_000, aiProviderCostVnd: 1_126, estimatedMarginVnd: 5_498_874 },
  { planCatalogId: 6, planCode: 'TITANIUM', planDisplayName: 'TITANIUM', planVersion: 5, planIsCurrent: true, planScope: 'USER', purchaseCount: 3, distinctPayerCount: 3, baseRevenueVnd: 1_500_000, revenueVnd: 4_500_000, aiProviderCostVnd: 3_570, estimatedMarginVnd: 4_496_430 },
  { planCatalogId: 7, planCode: 'TITANIUM', planDisplayName: 'TITANIUM', planVersion: 4, planIsCurrent: false, planScope: 'USER', purchaseCount: 1, distinctPayerCount: 1, baseRevenueVnd: 500_000, revenueVnd: 1_500_000, aiProviderCostVnd: 7_486, estimatedMarginVnd: 1_492_514 },
  { planCatalogId: 8, planCode: 'PRO', planDisplayName: 'PRO', planVersion: 1, planIsCurrent: true, planScope: 'USER', purchaseCount: 1, distinctPayerCount: 1, baseRevenueVnd: 200_000, revenueVnd: 700_000, aiProviderCostVnd: 0, estimatedMarginVnd: 700_000 },
];

function formatVnd(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n).toLocaleString('vi-VN')} ₫`;
}

function formatScope(value) {
  if (value == null || value === '') return '—';
  return String(value);
}

function getPlanInitials(planCode, fallbackName) {
  const source = String(planCode || fallbackName || '').trim().toUpperCase();
  if (!source) return '—';
  const cleaned = source.replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, 2) || source.slice(0, 2);
}

const PLAN_FAMILY_ACCENT = {
  TEAM: 'from-indigo-500 to-blue-700',
  TITANIUM: 'from-slate-700 to-slate-900',
  PRO: 'from-cyan-400 to-sky-600',
};

function getPlanFamilyAccent(planCode) {
  const key = String(planCode || '').trim().toUpperCase();
  return PLAN_FAMILY_ACCENT[key] || 'from-ocean-500 to-ocean-700';
}

const SORT_OPTIONS = [
  { value: 'revenue_desc', label: 'Doanh thu ↓' },
  { value: 'revenue_asc', label: 'Doanh thu ↑' },
  { value: 'purchases_desc', label: 'Lượt mua ↓' },
  { value: 'purchases_asc', label: 'Lượt mua ↑' },
  { value: 'base_desc', label: 'Tiền gốc ↓' },
  { value: 'base_asc', label: 'Tiền gốc ↑' },
  { value: 'margin_desc', label: 'Biên ↓' },
  { value: 'margin_asc', label: 'Biên ↑' },
];

function comparePlans(a, b, sortKey) {
  const pick = (row) => {
    switch (sortKey) {
      case 'purchases_desc':
      case 'purchases_asc':
        return Number(row?.purchaseCount) || 0;
      case 'base_desc':
      case 'base_asc':
        return Number(row?.baseRevenueVnd) || 0;
      case 'margin_desc':
      case 'margin_asc':
        return Number(row?.estimatedMarginVnd) || 0;
      case 'revenue_asc':
      case 'revenue_desc':
      default:
        return Number(row?.revenueVnd) || 0;
    }
  };
  const dir = sortKey?.endsWith('_asc') ? 1 : -1;
  const av = pick(a);
  const bv = pick(b);
  if (av === bv) return 0;
  return av < bv ? -1 * dir : 1 * dir;
}

const TABLE_PAGE_SIZE = 10;

export default function PlanVersionsPreview() {
  const isDarkMode = false;
  const [tableSearch, setTableSearch] = useState('');
  const [tableGroupFilter, setTableGroupFilter] = useState('all');
  const [tableStatusFilter, setTableStatusFilter] = useState('all');
  const [tableSort, setTableSort] = useState('revenue_desc');
  const [tablePage, setTablePage] = useState(0);

  const plans = MOCK_PLANS;

  const planGroupOptions = useMemo(() => {
    const set = new Set();
    plans.forEach((row) => {
      const code = row?.planCode;
      if (code) set.add(code);
    });
    return Array.from(set).sort();
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const term = tableSearch.trim().toLowerCase();
    return plans.filter((row) => {
      if (tableGroupFilter !== 'all' && row?.planCode !== tableGroupFilter) return false;
      if (tableStatusFilter === 'current' && row?.planIsCurrent === false) return false;
      if (tableStatusFilter === 'old' && row?.planIsCurrent !== false) return false;
      if (!term) return true;
      const haystack = [
        row?.planCode,
        row?.planDisplayName,
        row?.planScope,
        Number.isFinite(Number(row?.planVersion)) ? `v${row.planVersion}` : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [plans, tableSearch, tableGroupFilter, tableStatusFilter]);

  const sortedPlans = useMemo(() => {
    const next = filteredPlans.slice();
    next.sort((a, b) => comparePlans(a, b, tableSort));
    return next;
  }, [filteredPlans, tableSort]);

  useEffect(() => {
    setTablePage(0);
  }, [tableSearch, tableGroupFilter, tableStatusFilter, tableSort]);

  const totalPlanRows = sortedPlans.length;
  const totalPlanPages = Math.max(1, Math.ceil(totalPlanRows / TABLE_PAGE_SIZE));
  const safePlanPage = Math.min(tablePage, totalPlanPages - 1);
  const pagedPlans = useMemo(
    () => sortedPlans.slice(safePlanPage * TABLE_PAGE_SIZE, safePlanPage * TABLE_PAGE_SIZE + TABLE_PAGE_SIZE),
    [sortedPlans, safePlanPage],
  );

  const filteredTotals = useMemo(
    () => filteredPlans.reduce(
      (acc, row) => ({
        purchaseCount: acc.purchaseCount + (Number(row?.purchaseCount) || 0),
        distinctPayerCount: acc.distinctPayerCount + (Number(row?.distinctPayerCount) || 0),
        baseRevenueVnd: acc.baseRevenueVnd + (Number(row?.baseRevenueVnd) || 0),
        revenueVnd: acc.revenueVnd + (Number(row?.revenueVnd) || 0),
        aiProviderCostVnd: acc.aiProviderCostVnd + (Number(row?.aiProviderCostVnd) || 0),
        estimatedMarginVnd: acc.estimatedMarginVnd + (Number(row?.estimatedMarginVnd) || 0),
      }),
      {
        purchaseCount: 0,
        distinctPayerCount: 0,
        baseRevenueVnd: 0,
        revenueVnd: 0,
        aiProviderCostVnd: 0,
        estimatedMarginVnd: 0,
      },
    ),
    [filteredPlans],
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Chi tiết theo phiên bản</h3>
            <p className="text-xs text-slate-500">
              Mỗi dòng tương ứng một gói × version. Bấm <strong className="text-ocean-600">Người mua</strong> để xem danh sách user đã mua.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-50/60 px-5 py-3">
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Tìm theo tên gói, version..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Layers className="h-4 w-4 text-ocean-500" />
              <span className="text-xs font-semibold text-slate-600">Nhóm gói</span>
              <select
                value={tableGroupFilter}
                onChange={(e) => setTableGroupFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-ocean-600 outline-none"
              >
                <option value="all">Tất cả</option>
                {planGroupOptions.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <BadgeCheck className="h-4 w-4 text-ocean-500" />
              <span className="text-xs font-semibold text-slate-600">Trạng thái</span>
              <select
                value={tableStatusFilter}
                onChange={(e) => setTableStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-ocean-600 outline-none"
              >
                <option value="all">Tất cả</option>
                <option value="current">Đang bán</option>
                <option value="old">Cũ</option>
              </select>
            </div>

            <div className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <ArrowUpDown className="h-4 w-4 text-ocean-500" />
              <span className="text-xs font-semibold text-slate-600">Sắp xếp</span>
              <select
                value={tableSort}
                onChange={(e) => setTableSort(e.target.value)}
                className="bg-transparent text-xs font-semibold text-ocean-600 outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28%]">Gói</TableHead>
                <TableHead className="text-right">Lượt mua</TableHead>
                <TableHead className="text-right">Người trả</TableHead>
                <TableHead className="text-right">Tiền gốc</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
                <TableHead className="text-right">COGS AI</TableHead>
                <TableHead className="text-right">Biên ước lượng</TableHead>
                <TableHead className="w-[120px] text-right">Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedPlans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                    Không có gói nào khớp với bộ lọc hiện tại.
                  </TableCell>
                </TableRow>
              ) : (
                pagedPlans.map((row) => {
                  const margin = Number(row?.estimatedMarginVnd);
                  const marginNeg = Number.isFinite(margin) && margin < 0;
                  const revenue = Number(row?.revenueVnd) || 0;
                  const marginPct = revenue > 0 && Number.isFinite(margin) ? (margin / revenue) * 100 : null;
                  const isCurrent = row?.planIsCurrent !== false;
                  const initials = getPlanInitials(row?.planCode, row?.planDisplayName);
                  const accent = getPlanFamilyAccent(row?.planCode);
                  return (
                    <TableRow key={row.planCatalogId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-[11px] font-extrabold tracking-wide text-white shadow-sm`} aria-hidden>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-bold tracking-tight text-slate-900">
                                {row.planDisplayName || row.planCode || '—'}
                              </span>
                              {Number.isFinite(Number(row.planVersion)) ? (
                                <span className="inline-flex items-center rounded-md bg-ocean-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide tabular-nums text-ocean-700">
                                  v{row.planVersion}
                                </span>
                              ) : null}
                              {isCurrent ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  đang bán
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                  cũ
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {row.planCode ? `${row.planCode} · ` : ''}{formatScope(row.planScope)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{Number(row.purchaseCount || 0).toLocaleString('vi-VN')}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(row.distinctPayerCount || 0).toLocaleString('vi-VN')}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatVnd(row.baseRevenueVnd)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-slate-900">{formatVnd(row.revenueVnd)}</TableCell>
                      <TableCell className="text-right tabular-nums text-violet-600">{formatVnd(row.aiProviderCostVnd)}</TableCell>
                      <TableCell className="text-right">
                        <div className={`tabular-nums font-semibold ${marginNeg ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {formatVnd(row.estimatedMarginVnd)}
                        </div>
                        {marginPct != null ? (
                          <div className={`text-[11px] tabular-nums ${marginNeg ? 'text-rose-500/80' : 'text-emerald-600/80'}`}>
                            {marginPct.toFixed(2)}%
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl gap-1.5 border-ocean-200 bg-ocean-50 text-ocean-700 hover:bg-ocean-100"
                        >
                          <Users className="h-3.5 w-3.5" />
                          Người mua
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {filteredPlans.length > 0 ? (
                <TableRow className="border-slate-200 bg-slate-50 font-semibold">
                  <TableCell>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                      Tổng cộng — {filteredPlans.length} phiên bản
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{filteredTotals.purchaseCount.toLocaleString('vi-VN')}</TableCell>
                  <TableCell className="text-right tabular-nums">{filteredTotals.distinctPayerCount.toLocaleString('vi-VN')}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(filteredTotals.baseRevenueVnd)}</TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-slate-900">{formatVnd(filteredTotals.revenueVnd)}</TableCell>
                  <TableCell className="text-right tabular-nums text-violet-600">{formatVnd(filteredTotals.aiProviderCostVnd)}</TableCell>
                  <TableCell className="text-right">
                    <div className={`tabular-nums font-bold ${filteredTotals.estimatedMarginVnd < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {formatVnd(filteredTotals.estimatedMarginVnd)}
                    </div>
                    {filteredTotals.revenueVnd > 0 ? (
                      <div className={`text-[11px] tabular-nums ${filteredTotals.estimatedMarginVnd < 0 ? 'text-rose-500/80' : 'text-emerald-600/80'}`}>
                        {((filteredTotals.estimatedMarginVnd / filteredTotals.revenueVnd) * 100).toFixed(2)}%
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell />
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          {filteredPlans.length > 0 ? (
            <AdminPagination
              currentPage={safePlanPage}
              totalPages={totalPlanPages}
              totalElements={totalPlanRows}
              pageSize={TABLE_PAGE_SIZE}
              onPageChange={setTablePage}
              isDarkMode={isDarkMode}
              hidePageSize
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
