import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, RefreshCw, Plus, Edit2, Trash2, Eye,
  Package, Check, X, Zap, Coins,
  ToggleLeft, ToggleRight, Users, User,
  FileText, FileSpreadsheet, FileType, Image, Film, Headphones,
  Presentation, Bot, BarChart3, AlignLeft, Map, Lock,
  BookOpenText, SlidersHorizontal,
} from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getAccessToken } from '@/utils/tokenStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useDarkMode } from '@/hooks/useDarkMode';
import ListSpinner from '@/components/ui/ListSpinner';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/utils/getErrorMessage';
import PlanFormWizard from '@/pages/Admin/components/PlanFormWizard';
import {
  getAllPlans, createPlan, updatePlan, deletePlan, updatePlanStatus, getAiModels, getPlanById,
  getAllSystemSettings,
} from '@/api/ManagementSystemAPI';
import {
  AI_MODEL_GROUP_OPTIONS,
  filterSupportedAiModels,
  buildFunctionAssignmentMap,
  buildFunctionAssignmentsPayload,
  buildAiModelAssignmentMap,
  buildAiModelAssignmentsPayload,
} from '@/lib/aiModelCatalog';
import { getWebSocketUrl } from '@/lib/websocketUrl';

// Form mặc định cho PlanCatalog (khớp với PlanCatalogCreateRequest)
const EMPTY_FORM = {
  code: '',
  displayName: '',
  planScope: 'USER',
  planLevel: '0',
  price: '',
  description: '',
};

// Entitlement mặc định (khớp với PlanEntitlementRequest)
const EMPTY_ENTITLEMENT = {
  maxIndividualWorkspace: 1,
  maxMaterialInWorkspace: 10,
  canProcessPdf: true,
  canProcessWord: false,
  canProcessSlide: false,
  canProcessExcel: false,
  canProcessText: false,
  canProcessImage: false,
  canProcessVideo: false,
  canProcessAudio: false,
  canBuyCredit: false,
  planIncludedCredits: 0,
  hasAdvanceQuizConfig: false,
  canCreateRoadMap: false,
  hasAiCompanionMode: false,
  hasWorkspaceAnalytics: false,
  hasAiSummaryAndTextReading: false,
  hasAiQuizAssessmentAndRecommendation: false,
};

const EMPTY_AI_MODEL_ASSIGNMENTS = buildAiModelAssignmentMap([]);
const EMPTY_FUNCTION_ASSIGNMENTS = buildFunctionAssignmentMap([]);

const ENTITLEMENT_TOGGLES = {
  canProcessPdf: { labelKey: 'subscription.entitlements.canProcessPdf', defaultLabel: 'PDF', icon: FileText },
  canProcessWord: { labelKey: 'subscription.entitlements.canProcessWord', defaultLabel: 'Word', icon: FileType },
  canProcessSlide: { labelKey: 'subscription.entitlements.canProcessSlide', defaultLabel: 'Slide', icon: Presentation },
  canProcessExcel: { labelKey: 'subscription.entitlements.canProcessExcel', defaultLabel: 'Excel', icon: FileSpreadsheet },
  canProcessText: { labelKey: 'subscription.entitlements.canProcessText', defaultLabel: 'Text', icon: AlignLeft },
  canProcessImage: { labelKey: 'subscription.entitlements.canProcessImage', defaultLabel: 'Image', icon: Image },
  canProcessVideo: { labelKey: 'subscription.entitlements.canProcessVideo', defaultLabel: 'Video', icon: Film },
  canProcessAudio: { labelKey: 'subscription.entitlements.canProcessAudio', defaultLabel: 'Audio', icon: Headphones },
  canBuyCredit: { labelKey: 'subscription.entitlements.canBuyCredit', defaultLabel: 'Buy Credit', icon: Coins },
  hasAdvanceQuizConfig: { labelKey: 'subscription.entitlements.hasAdvanceQuizConfig', defaultLabel: 'Advanced Quiz Configuration', icon: SlidersHorizontal },
  canCreateRoadMap: { labelKey: 'subscription.entitlements.canCreateRoadMap', defaultLabel: 'Create Roadmap', icon: Map },
  hasAiCompanionMode: { labelKey: 'subscription.entitlements.hasAiCompanionMode', defaultLabel: 'AI Companion', icon: Bot },
  hasWorkspaceAnalytics: { labelKey: 'subscription.entitlements.hasWorkspaceAnalytics', defaultLabel: 'Analytics', icon: BarChart3 },
  hasAiSummaryAndTextReading: { labelKey: 'subscription.entitlements.hasAiSummaryAndTextReading', defaultLabel: 'AI Summary', icon: BookOpenText },
  hasAiQuizAssessmentAndRecommendation: { labelKey: 'subscription.entitlements.hasAiQuizAssessmentAndRecommendation', defaultLabel: 'AI Quiz Assessment', icon: Zap },
};

const extractApiData = (response) => response?.data?.data ?? response?.data ?? response ?? null;
const PLAN_LOCKED_EDIT_FALLBACK = 'Goi level 1/2 da co nguoi mua hoac dang mua nen khong the cap nhat.';

function getAuthToken() {
  try {
    return getAccessToken() || null;
  } catch (error) {
    console.error('Failed to get auth token for admin plan websocket:', error);
    return null;
  }
}

function formatCurrency(value, t, locale) {
  const amount = Number(value) || 0;
  if (amount === 0) return t('subscription.free');
  return `${amount.toLocaleString(locale)} VND`;
}

function getScopeLabel(scope, t) {
  return scope === 'WORKSPACE'
    ? t('subscription.scope.workspace', 'Group workspace')
    : t('subscription.scope.user', 'User');
}

function PlanManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { permissions, loading: permLoading } = useAdminPermissions();
  const { showSuccess, showError } = useToast();
  // Quyền ghi cho Plan sử dụng permission backend `plan:write`
  const canWrite = !permLoading && permissions.has('plan:write');
  const getFriendlyError = (err, fallbackKey) => {
    const mapped = getErrorMessage(t, err);
    if (mapped && mapped !== 'error.unknown') return mapped;
    return t(fallbackKey);
  };
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const pageFontStyle = {
    fontFamily: i18n.language === 'en'
      ? '"Poppins", var(--quiz-ui-font)'
      : '"Be Vietnam Pro", var(--quiz-ui-font)',
  };
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const dk = isDarkMode;

  const [plans, setPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [entitlement, setEntitlement] = useState({ ...EMPTY_ENTITLEMENT });
  const [aiModelAssignments, setAiModelAssignments] = useState({ ...EMPTY_AI_MODEL_ASSIGNMENTS });
  const [functionAssignmentMap, setFunctionAssignmentMap] = useState({ ...EMPTY_FUNCTION_ASSIGNMENTS });
  const [availableAiModels, setAvailableAiModels] = useState([]);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailPlan, setDetailPlan] = useState(null);
  const [creditUnitPrice, setCreditUnitPrice] = useState(200);
  const editingPlanRef = useRef(null);
  const stompClientRef = useRef(null);

  useEffect(() => {
    editingPlanRef.current = editingPlan;
  }, [editingPlan]);

  useEffect(() => {
    const fetchCatalogs = async () => {
      setIsLoading(true);
      try {
        const [plansRes, modelsRes, settingsRes] = await Promise.all([
          getAllPlans(),
          getAiModels(),
          getAllSystemSettings().catch(() => null),
        ]);
        const planData = extractApiData(plansRes);
        const modelData = extractApiData(modelsRes);
        setPlans(Array.isArray(planData) ? planData : []);
        setAvailableAiModels(filterSupportedAiModels(Array.isArray(modelData) ? modelData : []));
        const settingsData = extractApiData(settingsRes);
        if (Array.isArray(settingsData)) {
          const creditSetting = settingsData.find((s) => s.key === 'credit.unit_price_vnd');
          if (creditSetting?.value) setCreditUnitPrice(Number(creditSetting.value) || 200);
        }
      } catch (err) { showError(getFriendlyError(err, 'subscription.fetchError')); }
      finally { setIsLoading(false); }
    };
    fetchCatalogs();
  }, [t, showError]);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await getAllPlans();
      const data = extractApiData(res);
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) { showError(getFriendlyError(err, 'subscription.fetchError')); }
    finally { setIsLoading(false); }
  };

  const getPlanEditLockedReason = useCallback(
    (plan) => plan?.editLockedReason || t(
      'subscription.planEditLocked',
      'Goi level 1/2 da co nguoi mua hoac dang mua nen khong the cap nhat.'
    ),
    [t]
  );

  const applyPlanEditabilityPayload = useCallback((payload) => {
    const planCatalogId = Number(payload?.planCatalogId);
    if (!Number.isInteger(planCatalogId) || planCatalogId <= 0) {
      return;
    }

    const editable = payload?.editable !== false;
    const editLockedReason = payload?.editLockedReason || PLAN_LOCKED_EDIT_FALLBACK;

    setPlans((prev) => prev.map((plan) => (
      plan.planCatalogId === planCatalogId
        ? { ...plan, editable, editLockedReason }
        : plan
    )));
    setDetailPlan((prev) => (
      prev?.planCatalogId === planCatalogId
        ? { ...prev, editable, editLockedReason }
        : prev
    ));

    const currentEditingPlan = editingPlanRef.current;
    if (currentEditingPlan?.planCatalogId === planCatalogId) {
      if (currentEditingPlan.editable !== false && !editable) {
        showError(editLockedReason);
      }
      setEditingPlan((prev) => (
        prev?.planCatalogId === planCatalogId
          ? { ...prev, editable, editLockedReason }
          : prev
      ));
    }
  }, [showError]);

  useEffect(() => {
    const websocketUrl = getWebSocketUrl();
    if (!websocketUrl) {
      return undefined;
    }

    const token = getAuthToken();
    const stompClient = new Client({
      webSocketFactory: () => new SockJS(websocketUrl),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        stompClient.subscribe('/topic/admin/plan-catalog/editability', (message) => {
          try {
            const payload = JSON.parse(message.body || '{}');
            applyPlanEditabilityPayload(payload);
          } catch (error) {
            console.error('Failed to parse plan editability websocket payload:', error);
          }
        });
      },
      onDisconnect: () => {},
      onStompError: () => {},
      onWebSocketClose: () => {},
      onWebSocketError: () => {},
    });

    stompClientRef.current = stompClient;
    stompClient.activate();

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [applyPlanEditabilityPayload]);

  const openCreateForm = () => {
    setEditingPlan(null);
    setFormData({ ...EMPTY_FORM });
    setEntitlement({ ...EMPTY_ENTITLEMENT });
    setAiModelAssignments({ ...EMPTY_AI_MODEL_ASSIGNMENTS });
    setFunctionAssignmentMap({ ...EMPTY_FUNCTION_ASSIGNMENTS });
    setIsFormOpen(true);
  };

  const populatePlanForm = (plan) => {
    setEditingPlan(plan);
    // Backend returns USER | WORKSPACE; normalize legacy GROUP_WORKSPACE for dropdown
    const planScope = (plan.planScope === 'GROUP_WORKSPACE' || plan.planScope === 'WORKSPACE') ? 'WORKSPACE' : (plan.planScope || 'USER');
    setFormData({
      code: plan.code || '',
      displayName: plan.displayName || '',
      planScope,
      planLevel: plan.planLevel != null ? String(plan.planLevel) : '0',
      price: plan.price != null ? String(plan.price) : '',
      description: plan.description || '',
    });
    setEntitlement(plan.entitlement ? { ...EMPTY_ENTITLEMENT, ...plan.entitlement } : { ...EMPTY_ENTITLEMENT });
    setAiModelAssignments(buildAiModelAssignmentMap(plan.aiModelAssignments || []));
    setFunctionAssignmentMap(buildFunctionAssignmentMap(plan.aiFunctionAssignments || []));
    setIsFormOpen(true);
  };

  const openEditForm = async (plan) => {
    if (plan?.editable === false) {
      showError(getPlanEditLockedReason(plan));
      return;
    }
    try {
      const response = await getPlanById(plan.planCatalogId);
      const detail = extractApiData(response);
      if (detail?.editable === false) {
        showError(getPlanEditLockedReason(detail));
        setPlans((prev) => prev.map((item) => (
          item.planCatalogId === detail.planCatalogId ? { ...item, ...detail } : item
        )));
        return;
      }
      populatePlanForm(detail || plan);
    } catch (err) {
      showError(getFriendlyError(err, 'subscription.fetchError'));
      populatePlanForm(plan);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const isDefaultPlanLevel = String(formData.planLevel ?? '0') === '0';
    if (editingPlan?.editable === false) {
      showError(getPlanEditLockedReason(editingPlan));
      return;
    }
    if (!formData.code.trim()) { showError(t('subscription.nameRequired')); return; }
    if (!formData.displayName.trim()) { showError(t('subscription.nameRequired')); return; }
    if (formData.planScope !== 'WORKSPACE') {
      const maxIndividualWorkspace = Number(entitlement.maxIndividualWorkspace);
      if (!Number.isFinite(maxIndividualWorkspace) || maxIndividualWorkspace <= 0) {
        showError(t(
          'subscription.wizard.validation.maxIndividualWorkspaceRequired',
          'Max individual workspace is required and must be greater than 0.'
        ));
        return;
      }

      const maxMaterialInWorkspace = Number(entitlement.maxMaterialInWorkspace);
      if (!Number.isFinite(maxMaterialInWorkspace) || maxMaterialInWorkspace <= 0) {
        showError(t(
          'subscription.wizard.validation.maxMaterialInWorkspaceRequired',
          'Max material / workspace is required and must be greater than 0.'
        ));
        return;
      }

      if (!isDefaultPlanLevel) {
        const planIncludedCredits = Number(entitlement.planIncludedCredits);
        if (!Number.isFinite(planIncludedCredits) || planIncludedCredits <= 0) {
          showError(t(
            'subscription.wizard.validation.planIncludedCreditsRequired',
            'Included credits is required and must be greater than 0.'
          ));
          return;
        }
      }
    }
    setIsSubmitting(true);
    try {
      const credits = isDefaultPlanLevel ? 0 : (parseInt(entitlement.planIncludedCredits, 10) || 0);
      const minPrice = credits * creditUnitPrice;
      const inputPrice = parseInt(formData.price, 10) || 0;
      const resolvedPrice = isDefaultPlanLevel ? 0 : Math.max(inputPrice, minPrice);

      const payload = {
        displayName: formData.displayName.trim(),
        price: resolvedPrice,
        description: formData.description || '',
        entitlement: {
          ...entitlement,
          maxIndividualWorkspace: entitlement.maxIndividualWorkspace != null ? parseInt(entitlement.maxIndividualWorkspace, 10) || 0 : 0,
          maxMaterialInWorkspace: entitlement.maxMaterialInWorkspace != null ? parseInt(entitlement.maxMaterialInWorkspace, 10) || 0 : 0,
          canBuyCredit: isDefaultPlanLevel ? false : entitlement.canBuyCredit,
          planIncludedCredits: credits,
        },
        aiModelAssignments: buildAiModelAssignmentsPayload(aiModelAssignments),
        aiFunctionAssignments: buildFunctionAssignmentsPayload(functionAssignmentMap),
      };

      if (editingPlan) {
        await updatePlan(editingPlan.planCatalogId, payload);
        showSuccess(t('subscription.updateSuccess'));
      } else {
        // Backend enum is USER | WORKSPACE only (normalize legacy GROUP_WORKSPACE)
        const planScope = (formData.planScope === 'GROUP_WORKSPACE' || formData.planScope === 'WORKSPACE') ? 'WORKSPACE' : (formData.planScope || 'USER');
        await createPlan({
          code: formData.code.trim(),
          displayName: formData.displayName.trim(),
          planScope,
          planLevel: formData.planLevel ? parseInt(formData.planLevel, 10) || 0 : 0,
          price: payload.price,
          description: payload.description,
          entitlement: payload.entitlement,
          aiModelAssignments: payload.aiModelAssignments,
          aiFunctionAssignments: payload.aiFunctionAssignments,
        });
        showSuccess(t('subscription.createSuccess'));
      }
      setIsFormOpen(false); fetchPlans();
    } catch (err) {
      const rawMsg = err?.message || '';
      let msg = getFriendlyError(err, 'subscription.submitError');
      if (rawMsg === 'Default plan already exists for this type' || rawMsg?.includes?.('Default plan already exists')) {
        msg = t('subscription.defaultPlanExists', { type: formData.planType });
      }
      showError(msg);
    }
    finally { setIsSubmitting(false); }
  };

  const handleToggleStatus = async (plan) => {
    const nextStatus = isActive(plan.status) ? 'INACTIVE' : 'ACTIVE';
    try {
      await updatePlanStatus(plan.planCatalogId, nextStatus);
      showSuccess(t('subscription.updateSuccess'));
      fetchPlans();
    }
    catch (err) { showError(getFriendlyError(err, 'subscription.submitError')); }
  };

  const confirmDelete = (plan) => { setDeletingPlan(plan); setIsDeleteOpen(true); };

  const handleDelete = async () => {
    if (!deletingPlan) return; setIsSubmitting(true);
    try {
      await deletePlan(deletingPlan.planCatalogId);
      showSuccess(t('subscription.deleteSuccess'));
      fetchPlans();
    } catch (err) {
      const rawMsg = err?.message || '';
      const msg = (rawMsg === 'Plan is in use' || rawMsg?.includes?.('Plan is in use'))
        ? t('subscription.planInUse')
        : getFriendlyError(err, 'subscription.deleteError');
      showError(msg);
    } finally {
      setIsDeleteOpen(false);
      setDeletingPlan(null);
      setIsSubmitting(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    const name = (p.displayName || '').toLowerCase();
    const code = (p.code || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || code.includes(term);
  });
  const isActive = (s) => (s || '').toUpperCase() === 'ACTIVE';

  const highestActiveUserPlanEntitlement = useMemo(() => {
    const activeUserPlans = plans
      .filter((p) => p.planScope === 'USER' && (p.status || '').toUpperCase() === 'ACTIVE')
      .sort((a, b) => (a.planLevel || 0) - (b.planLevel || 0));
    if (activeUserPlans.length === 0) return null;
    return activeUserPlans[activeUserPlans.length - 1]?.entitlement || null;
  }, [plans]);

  const userScopeCount = plans.filter(p => p.planScope === 'USER').length;
  const workspaceScopeCount = plans.filter(p => p.planScope === 'WORKSPACE').length;
  const activeCount = plans.filter(p => isActive(p.status)).length;

  const sectionCls = `rounded-xl border p-4 ${dk ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50/90 border-slate-200'}`;
  const getAssignedModelForPlan = (plan, modelGroup) => {
    const assignment = Array.isArray(plan?.aiModelAssignments)
      ? plan.aiModelAssignments.find((item) => item.modelGroup === modelGroup)
      : null;

    if (!assignment) return null;

    return availableAiModels.find((model) => String(model.aiModelId) === String(assignment.aiModelId)) ?? assignment;
  };

  return (
    <div className={`space-y-6 p-6 animate-in fade-in duration-500 ${fontClass}`} style={pageFontStyle}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${dk ? 'text-white' : 'text-slate-950'}`}>
            {t('subscription.title')}
          </h1>
          <p className={`mt-1 text-[15px] ${dk ? 'text-slate-400' : 'text-slate-600'} font-semibold`}>
            {t('subscription.desc')}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreateForm} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-11 px-5 rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-[0.97] cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />
            {t('subscription.addPlan')}
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('subscription.stats.totalPlans'), value: plans.length, icon: Package, from: 'from-blue-500', to: 'to-blue-600', shadow: 'shadow-blue-500/20' },
          { label: t('subscription.stats.userScope', 'User scope'), value: userScopeCount, icon: User, from: 'from-cyan-500', to: 'to-teal-500', shadow: 'shadow-cyan-500/20' },
          { label: t('subscription.stats.workspaceScope', 'Group workspace scope'), value: workspaceScopeCount, icon: Users, from: 'from-violet-500', to: 'to-purple-600', shadow: 'shadow-violet-500/20' },
          { label: t('subscription.stats.activeSubs'), value: `${activeCount}/${plans.length}`, icon: Zap, from: 'from-amber-400', to: 'to-orange-500', shadow: 'shadow-amber-500/20' },
        ].map((s) => (
          <div key={s.label} className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] cursor-default ${
            dk ? 'bg-white/[0.04] border border-white/[0.06]' : 'bg-white border border-slate-200 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.35)]'
          }`}>
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${s.from} ${s.to} opacity-[0.08] -translate-y-6 translate-x-6`} />
            <div className="flex items-center justify-between relative">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.14em] ${dk ? 'text-slate-500' : 'text-slate-500'}`}>{s.label}</p>
                <p className={`text-3xl font-black mt-1 ${dk ? 'text-white' : 'text-slate-950'}`}>{s.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.from} ${s.to} flex items-center justify-center shadow-lg ${s.shadow}`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Plans Table */}
      <div className={`rounded-2xl border overflow-hidden transition-colors ${dk ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-slate-200 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]'}`}>
        <div className={`flex flex-col md:flex-row items-center justify-between gap-4 p-5 border-b ${dk ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <h2 className={`text-xl font-extrabold tracking-tight ${dk ? 'text-white' : 'text-slate-900'}`}>
            {t('subscription.planList')} <span className={`font-semibold text-sm ${dk ? 'text-slate-500' : 'text-slate-500'}`}>({filteredPlans.length})</span>
          </h2>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${dk ? 'text-slate-400' : 'text-slate-500'}`} />
              <Input placeholder={t('subscription.searchPlan')} className={`pl-10 h-10 rounded-xl ${dk ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'border-slate-300 text-slate-800 placeholder:text-slate-500'}`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" onClick={fetchPlans} disabled={isLoading} className={`h-10 w-10 rounded-xl cursor-pointer ${dk ? 'border-white/10 hover:bg-white/5' : ''}`}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="table-auto min-w-full text-left">
            <TableHeader>
              <TableRow className={dk ? 'bg-white/[0.02] border-b border-white/[0.06]' : 'bg-slate-50 border-b border-slate-200'}>
                <TableHead className="w-[220px] font-bold text-xs uppercase tracking-[0.14em] text-slate-500">{t('subscription.table.name')}</TableHead>
                <TableHead className="w-[90px] font-bold text-xs uppercase tracking-[0.14em] text-slate-500">{t('subscription.table.scope', 'Scope')}</TableHead>
                <TableHead className="w-[80px] font-bold text-xs uppercase tracking-[0.14em] text-slate-500">{t('subscription.table.level', 'Level')}</TableHead>
                <TableHead className="w-[130px] font-bold text-xs uppercase tracking-[0.14em] text-slate-500">{t('subscription.table.price')}</TableHead>
                <TableHead className="w-[90px] text-center font-bold text-xs uppercase tracking-[0.14em] text-slate-500">{t('subscription.table.status')}</TableHead>
                <TableHead className="w-[130px] text-right font-bold text-xs uppercase tracking-[0.14em] text-slate-500">{t('subscription.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-4">
                  <ListSpinner variant="table" />
                </TableCell></TableRow>
              ) : filteredPlans.length > 0 ? filteredPlans.map((plan) => (
                <TableRow key={plan.planCatalogId} className={`border-b transition-colors cursor-pointer ${dk ? 'border-white/[0.04] hover:bg-white/[0.03]' : 'border-slate-100 hover:bg-slate-50/90'}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        plan.planScope === 'WORKSPACE'
                          ? dk ? 'bg-violet-500/15' : 'bg-violet-100'
                          : dk ? 'bg-cyan-500/15' : 'bg-cyan-100'
                      }`}>
                        {plan.planScope === 'WORKSPACE'
                          ? <Users className={`w-4 h-4 ${dk ? 'text-violet-400' : 'text-violet-600'}`} />
                          : <User className={`w-4 h-4 ${dk ? 'text-cyan-400' : 'text-cyan-600'}`} />
                        }
                      </div>
                      <div>
                        <p className={`font-bold text-[15px] ${dk ? 'text-white' : 'text-slate-900'}`}>{plan.displayName}</p>
                        <p className={`text-xs font-medium ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{plan.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                      dk ? 'bg-slate-100/10 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {getScopeLabel(plan.planScope, t)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-mono text-sm font-semibold ${dk ? 'text-slate-300' : 'text-slate-700'}`}>
                      {plan.planLevel ?? '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-extrabold ${(plan.price ?? 0) === 0 ? 'text-emerald-600' : dk ? 'text-white' : 'text-slate-900'}`}>
                      {formatCurrency(plan.price, t, locale)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                      isActive(plan.status)
                        ? dk ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                        : dk ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive(plan.status) ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                      {plan.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {[
                        { icon: Eye, color: dk ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-500 hover:bg-blue-50', action: () => { setDetailPlan(plan); setIsDetailOpen(true); }, tip: t('subscription.viewDetail') },
                        ...(canWrite ? [
                          { icon: isActive(plan.status) ? ToggleRight : ToggleLeft, color: isActive(plan.status) ? (dk ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-500 hover:bg-emerald-50') : (dk ? 'text-slate-500 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-50'), action: () => handleToggleStatus(plan), tip: t('subscription.actions.toggleStatus', 'Toggle status') },
                          { icon: plan.editable === false ? Lock : Edit2, color: plan.editable === false ? (dk ? 'text-slate-500 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-50') : (dk ? 'text-amber-400 hover:bg-amber-500/10' : 'text-amber-500 hover:bg-amber-50'), action: () => openEditForm(plan), tip: plan.editable === false ? getPlanEditLockedReason(plan) : t('subscription.edit') },
                          { icon: Trash2, color: dk ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50', action: () => confirmDelete(plan), tip: t('subscription.delete') },
                        ] : []),
                      ].map(({ icon: Icon, color, action, tip }) => (
                        <button key={`${plan.planCatalogId}-${tip}`} onClick={action} title={tip} className={`h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${color}`}>
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} className={`text-center py-20 text-sm italic font-medium ${dk ? 'text-slate-500' : 'text-slate-500'}`}>{t('subscription.noPlans')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {isFormOpen ? (
        <PlanFormWizard
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          isDarkMode={dk}
          t={t}
          locale={locale}
          editingPlan={editingPlan}
          isSubmitting={isSubmitting}
          formData={formData}
          setFormData={setFormData}
          entitlement={entitlement}
          setEntitlement={setEntitlement}
          entitlementToggles={ENTITLEMENT_TOGGLES}
          aiModelAssignments={aiModelAssignments}
          setAiModelAssignments={setAiModelAssignments}
          functionAssignmentMap={functionAssignmentMap}
          setFunctionAssignmentMap={setFunctionAssignmentMap}
          availableAiModels={availableAiModels}
          plans={plans}
          creditUnitPrice={creditUnitPrice}
          highestActiveUserPlanEntitlement={highestActiveUserPlanEntitlement}
          editLocked={editingPlan?.editable === false}
          editLockedReason={editingPlan?.editable === false ? getPlanEditLockedReason(editingPlan) : ''}
          onSubmit={handleSubmit}
          onValidationError={showError}
        />
      ) : null}

      {/* ──── Delete Confirmation ──── */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!open && !isSubmitting) setIsDeleteOpen(false); }}>
        <DialogContent hideClose className={`max-w-md ${dk ? 'bg-[#0f1629] border-white/[0.08]' : ''}`} onPointerDownOutside={(e) => isSubmitting && e.preventDefault()} onInteractOutside={(e) => isSubmitting && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className={dk ? 'text-white' : ''}>{t('subscription.confirmDelete')}</DialogTitle>
            <DialogDescription>{t('subscription.confirmDeleteDesc', { name: deletingPlan?.displayName })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className={`cursor-pointer ${dk ? 'border-white/10 text-slate-300 hover:bg-white/5' : ''}`}>{t('auth.cancel')}</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting} className="cursor-pointer">{isSubmitting ? t('subscription.deleting') : t('subscription.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Plan Detail Dialog ──── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent hideClose className={`max-w-4xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden ${dk ? 'bg-[#0f1629] border-white/[0.08]' : 'bg-white'}`}>
          {detailPlan && (
            <>
              {/* Fixed header */}
              <div className={`flex-shrink-0 px-6 pt-6 pb-4 border-b ${dk ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      detailPlan.planScope === 'WORKSPACE'
                        ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-cyan-500 to-blue-600'
                    } shadow-lg`}>
                      {detailPlan.planScope === 'WORKSPACE' ? <Users className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-slate-900'}`}>{detailPlan.displayName}</h3>
                      <p className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('subscription.detail.planType', {
                          scope: getScopeLabel(detailPlan.planScope, t),
                          defaultValue: '{{scope}} plan',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                    isActive(detailPlan.status)
                      ? dk ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                      : dk ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isActive(detailPlan.status) ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                    {detailPlan.status}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t('subscription.table.price'), value: formatCurrency(detailPlan.price, t, locale), color: dk ? 'text-emerald-400' : 'text-emerald-600' },
                    { label: t('subscription.table.scope', 'Scope'), value: getScopeLabel(detailPlan.planScope, t), color: dk ? 'text-blue-400' : 'text-blue-600' },
                    { label: t('subscription.table.level', 'Level'), value: detailPlan.planLevel ?? '-', color: dk ? 'text-amber-400' : 'text-amber-600' },
                  ].map((item) => (
                    <div key={item.label} className={`p-3.5 rounded-xl text-center ${dk ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-slate-50 border border-slate-100'}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wider ${dk ? 'text-slate-500' : 'text-slate-400'}`}>{item.label}</p>
                      <p className={`font-bold mt-1 ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Entitlement & features */}
                {detailPlan.entitlement && (
                  <div className={sectionCls}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${dk ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {t('subscription.detail.entitlement', 'Entitlement')}
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
                      <div className={`flex items-center justify-between py-1.5 border-b ${dk ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                        <span className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                          {t('subscription.detail.maxIndividualWorkspace', 'Max individual workspace')}
                        </span>
                        <span className={`font-bold text-sm tabular-nums ${dk ? 'text-white' : 'text-slate-800'}`}>{detailPlan.entitlement.maxIndividualWorkspace ?? '—'}</span>
                      </div>
                      <div className={`flex items-center justify-between py-1.5 border-b ${dk ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                        <span className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                          {t('subscription.detail.maxMaterialInWorkspace', 'Max material / workspace')}
                        </span>
                        <span className={`font-bold text-sm tabular-nums ${dk ? 'text-white' : 'text-slate-800'}`}>{detailPlan.entitlement.maxMaterialInWorkspace ?? '—'}</span>
                      </div>
                      <div className={`flex items-center justify-between py-1.5 border-b ${dk ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                        <span className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                          {t('subscription.detail.planIncludedCredits', 'Included credits')}
                        </span>
                        <span className={`font-bold text-sm tabular-nums ${dk ? 'text-white' : 'text-slate-800'}`}>{detailPlan.entitlement.planIncludedCredits ?? 0}</span>
                      </div>
                    </div>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${dk ? 'text-violet-400' : 'text-violet-600'}`}>
                      {t('subscription.detail.features', 'Features')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(ENTITLEMENT_TOGGLES).map(([key, meta]) => {
                        const enabled = detailPlan.entitlement[key];
                        const Icon = meta.icon;
                        return (
                          <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
                            enabled
                              ? dk ? 'bg-white/[0.04]' : 'bg-emerald-50/80'
                              : dk ? 'opacity-40' : 'opacity-40'
                          }`}>
                            {enabled ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <X className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                            <Icon className={`w-4 h-4 flex-shrink-0 ${enabled ? 'text-blue-400' : dk ? 'text-slate-600' : 'text-slate-300'}`} />
                            <span className={`text-sm font-medium ${
                              enabled ? dk ? 'text-white' : 'text-slate-700' : dk ? 'text-slate-600 line-through' : 'text-slate-400 line-through'
                            }`}>{t(meta.labelKey, meta.defaultLabel)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className={sectionCls}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${dk ? 'text-violet-400' : 'text-violet-600'}`}>
                    {t('subscription.aiModels.title')}
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {AI_MODEL_GROUP_OPTIONS.map((group) => {
                      const assignedModel = getAssignedModelForPlan(detailPlan, group.value);

                      return (
                        <div
                          key={group.value}
                          className={`rounded-xl border px-4 py-3 ${dk ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-100 bg-white'}`}
                        >
                          <p className={`text-sm font-semibold ${dk ? 'text-white' : 'text-slate-800'}`}>
                            {t(group.labelKey)}
                          </p>
                          {assignedModel ? (
                            <>
                              <p className={`mt-2 text-sm font-medium ${dk ? 'text-slate-200' : 'text-slate-700'}`}>
                                {assignedModel.displayName || assignedModel.modelCode || `#${assignedModel.aiModelId}`}
                              </p>
                              <p className={`mt-1 text-xs ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                                {assignedModel.provider || '-'} / {assignedModel.modelCode || `#${assignedModel.aiModelId}`}
                              </p>
                            </>
                          ) : (
                            <p className={`mt-2 text-sm italic ${dk ? 'text-slate-500' : 'text-slate-400'}`}>
                              {t('subscription.aiModels.noAssignment')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PlanManagement;
