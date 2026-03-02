import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, RefreshCw, Plus, Edit2, Trash2, Eye,
  Package, Check, X, Clock, Zap,
  ToggleLeft, ToggleRight, Users, User,
  FileText, FileSpreadsheet, FileType, Image, Film, Headphones,
  Presentation, Bot, BrainCircuit, BarChart3, AlignLeft,
  BookOpenText, SlidersHorizontal, Layers,
  Crown, Infinity,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/Components/ui/dialog';
import { Switch } from '@/Components/ui/switch';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useToast } from '@/context/ToastContext';
import {
  getAllPlans, createPlan, updatePlan, deletePlan, togglePlanStatus,
} from '@/api/ManagementSystemAPI';

const EMPTY_LIMIT = {
  maxWorkspace: 5,
  maxMaterialPerWorkspace: 10,
  maxMaterialInGroup: 10,
  maxAiCreateQuizPerDay: 3,
  maxAiCreateFlashcardPerDay: 3,
  maxAiCreateMockTestPerDay: 1,
  maxAiCompanionModePerDay: 5,
  maxAiCreateItemPerFlashcard: 20,
  maxAiCreateQuestionPerQuiz: 30,
  maxMemberSlot: 5,
};

const EMPTY_FEATURE = {
  processPdf: true,
  processWord: false,
  processSlide: false,
  processExcel: false,
  processText: false,
  processImage: false,
  processVideo: false,
  processAudio: false,
  hasAiCompanionMode: false,
  hasAiContentStructuring: false,
  hasPersonalizedLearningAnalytic: false,
  hasAiTextReadingAndSummarization: false,
  hasAdvancedAiConfiguration: false,
};

const EMPTY_FORM = {
  planName: '',
  price: '0',
  planType: 'INDIVIDUAL',
  durationInDay: '30',
  isDefault: false,
};

const FEATURE_META = {
  processPdf:                          { label: 'PDF Processing',           icon: FileText,          color: 'text-red-400' },
  processWord:                         { label: 'Word Processing',          icon: FileType,          color: 'text-blue-400' },
  processSlide:                        { label: 'Slide Processing',         icon: Presentation,      color: 'text-orange-400' },
  processExcel:                        { label: 'Excel Processing',         icon: FileSpreadsheet,   color: 'text-green-400' },
  processText:                         { label: 'Text Processing',          icon: AlignLeft,         color: 'text-slate-400' },
  processImage:                        { label: 'Image Processing',         icon: Image,             color: 'text-pink-400' },
  processVideo:                        { label: 'Video Processing',         icon: Film,              color: 'text-rose-400' },
  processAudio:                        { label: 'Audio Processing',         icon: Headphones,        color: 'text-purple-400' },
  hasAiCompanionMode:                  { label: 'AI Companion Mode',        icon: Bot,               color: 'text-sky-400' },
  hasAiContentStructuring:             { label: 'AI Content Structuring',   icon: Layers,            color: 'text-indigo-400' },
  hasPersonalizedLearningAnalytic:     { label: 'Personalized Analytics',   icon: BarChart3,         color: 'text-emerald-400' },
  hasAiTextReadingAndSummarization:    { label: 'AI Text Summarization',    icon: BookOpenText,      color: 'text-teal-400' },
  hasAdvancedAiConfiguration:          { label: 'Advanced AI Config',       icon: SlidersHorizontal, color: 'text-amber-400' },
};

const LIMIT_LABELS = {
  maxWorkspace:                 'Max Workspaces',
  maxMaterialPerWorkspace:      'Materials / Workspace',
  maxMaterialInGroup:           'Materials / Group',
  maxAiCreateQuizPerDay:        'AI Quiz / Day',
  maxAiCreateFlashcardPerDay:   'AI Flashcard / Day',
  maxAiCreateMockTestPerDay:    'AI Mock Test / Day',
  maxAiCompanionModePerDay:     'AI Companion / Day',
  maxAiCreateItemPerFlashcard:  'Items / Flashcard',
  maxAiCreateQuestionPerQuiz:   'Questions / Quiz',
  maxMemberSlot:                'Member Slots',
};

function SubscriptionManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { permissions, loading: permLoading } = useAdminPermissions();
  const { showSuccess, showError } = useToast();
  const canWrite = !permLoading && permissions.has('subscription:write');
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const dk = isDarkMode;

  const [plans, setPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [limitData, setLimitData] = useState({ ...EMPTY_LIMIT });
  const [featureData, setFeatureData] = useState({ ...EMPTY_FEATURE });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailPlan, setDetailPlan] = useState(null);

  const fetchPlans = async () => {
    setIsLoading(true); setError('');
    try {
      const res = await getAllPlans();
      const data = res?.data ?? res;
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) { const msg = err?.message || t('subscription.fetchError'); setError(msg); showError(msg); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchPlans(); }, []);

  const openCreateForm = () => {
    setEditingPlan(null); setFormData({ ...EMPTY_FORM }); setLimitData({ ...EMPTY_LIMIT }); setFeatureData({ ...EMPTY_FEATURE });
    setIsFormOpen(true); setError('');
  };

  const openEditForm = (plan) => {
    setEditingPlan(plan);
    const isDef = plan.isDefault ?? false;
    setFormData({
      planName: plan.planName || '',
      price: isDef ? '0' : String(plan.price ?? '0'),
      planType: plan.type || 'INDIVIDUAL',
      durationInDay: isDef ? '999999' : String(plan.durationInDay ?? '30'),
      isDefault: isDef,
    });
    setLimitData(plan.planLimit ? { ...EMPTY_LIMIT, ...plan.planLimit } : { ...EMPTY_LIMIT });
    setFeatureData(plan.planFeature ? { ...EMPTY_FEATURE, ...plan.planFeature } : { ...EMPTY_FEATURE });
    setIsFormOpen(true); setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.planName.trim()) { const msg = t('subscription.nameRequired'); setError(msg); showError(msg); return; }
    if (formData.isDefault) {
      const existingDefault = plans.find((p) => p.isDefault && (p.type || '').toUpperCase() === (formData.planType || '').toUpperCase());
      if (existingDefault && (!editingPlan || existingDefault.planId !== editingPlan.planId)) {
        const msg = t('subscription.defaultPlanExists', { type: formData.planType });
        setError(msg);
        showError(msg);
        return;
      }
    }
    setIsSubmitting(true); setError('');
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.planId, {
          planName: formData.planName.trim(), price: parseInt(formData.price) || 0, planType: formData.planType,
          durationInDay: parseInt(formData.durationInDay) || 30, isDefault: formData.isDefault,
          planLimitUpdateRequest: { ...limitData }, planFeatureUpdateRequest: { ...featureData },
        });
        showSuccess(t('subscription.updateSuccess'));
      } else {
        await createPlan({
          planName: formData.planName.trim(), price: parseInt(formData.price) || 0, planType: formData.planType,
          durationInDay: parseInt(formData.durationInDay) || 30, isDefault: formData.isDefault,
          planLimitCreateRequest: { ...limitData }, planFeatureCreateRequest: { ...featureData },
        });
        showSuccess(t('subscription.createSuccess'));
      }
      setIsFormOpen(false); fetchPlans();
    } catch (err) {
      const rawMsg = err?.message || '';
      let msg = rawMsg || t('subscription.submitError');
      if (rawMsg === 'Default plan already exists for this type' || rawMsg?.includes?.('Default plan already exists')) {
        msg = t('subscription.defaultPlanExists', { type: formData.planType });
      }
      setError(msg);
      showError(msg);
    }
    finally { setIsSubmitting(false); }
  };

  const handleToggleStatus = async (plan) => {
    try { await togglePlanStatus(plan.planId); showSuccess(t('subscription.updateSuccess')); fetchPlans(); }
    catch (err) { const msg = err?.message || t('subscription.submitError'); setError(msg); showError(msg); }
  };

  const confirmDelete = (plan) => { setDeletingPlan(plan); setIsDeleteOpen(true); };

  const handleDelete = async () => {
    if (!deletingPlan) return; setIsSubmitting(true);
    try {
      await deletePlan(deletingPlan.planId);
      showSuccess(t('subscription.deleteSuccess'));
      fetchPlans();
    } catch (err) {
      const rawMsg = err?.message || '';
      const msg = (rawMsg === 'Plan is in use' || rawMsg?.includes?.('Plan is in use'))
        ? t('subscription.planInUse')
        : (rawMsg || t('subscription.deleteError'));
      setError(msg);
      showError(msg);
    } finally {
      setIsDeleteOpen(false);
      setDeletingPlan(null);
      setIsSubmitting(false);
    }
  };

  const filteredPlans = plans.filter((p) => (p.planName || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const formatCurrency = (val) => (val == null || val === 0) ? t('subscription.free') : `${Number(val).toLocaleString()} VND`;
  const isActive = (s) => (s || '').toUpperCase() === 'ACTIVE';

  const individualCount = plans.filter(p => p.type === 'INDIVIDUAL').length;
  const groupCount = plans.filter(p => p.type === 'GROUP').length;
  const activeCount = plans.filter(p => isActive(p.status)).length;

  const inputCls = `mt-1.5 h-10 rounded-lg transition-colors duration-200 ${
    dk ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500 focus:ring-blue-500/20'
       : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-blue-500/20'
  }`;

  const selectCls = `mt-1.5 w-full h-10 rounded-lg border px-3 text-sm transition-colors duration-200 ${
    dk ? 'bg-white/5 border-white/10 text-white focus:border-blue-500'
       : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
  }`;

  const sectionCls = `rounded-xl border p-4 ${dk ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50/80 border-slate-100'}`;

  return (
    <div className={`space-y-6 p-6 animate-in fade-in duration-500 ${fontClass}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${dk ? 'text-white' : 'text-slate-900'}`}>
            {t('subscription.title')}
          </h1>
          <p className={`mt-1 ${dk ? 'text-slate-400' : 'text-slate-500'} font-medium`}>
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
          { label: t('subscription.stats.individual'), value: individualCount, icon: User, from: 'from-cyan-500', to: 'to-teal-500', shadow: 'shadow-cyan-500/20' },
          { label: t('subscription.stats.group'), value: groupCount, icon: Users, from: 'from-violet-500', to: 'to-purple-600', shadow: 'shadow-violet-500/20' },
          { label: t('subscription.stats.activeSubs'), value: `${activeCount}/${plans.length}`, icon: Zap, from: 'from-amber-400', to: 'to-orange-500', shadow: 'shadow-amber-500/20' },
        ].map((s) => (
          <div key={s.label} className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] cursor-default ${
            dk ? 'bg-white/[0.04] border border-white/[0.06]' : 'bg-white border border-slate-100 shadow-sm'
          }`}>
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${s.from} ${s.to} opacity-[0.08] -translate-y-6 translate-x-6`} />
            <div className="flex items-center justify-between relative">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${dk ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</p>
                <p className={`text-3xl font-black mt-1 ${dk ? 'text-white' : 'text-slate-900'}`}>{s.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.from} ${s.to} flex items-center justify-center shadow-lg ${s.shadow}`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Plans Table */}
      <div className={`rounded-2xl border overflow-hidden transition-colors ${dk ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className={`flex flex-col md:flex-row items-center justify-between gap-4 p-5 border-b ${dk ? 'border-white/[0.06]' : 'border-slate-100'}`}>
          <h2 className={`text-lg font-bold ${dk ? 'text-white' : 'text-slate-800'}`}>
            {t('subscription.planList')} <span className={`font-normal text-sm ${dk ? 'text-slate-500' : 'text-slate-400'}`}>({filteredPlans.length})</span>
          </h2>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder={t('subscription.searchPlan')} className={`pl-10 h-10 rounded-xl ${dk ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'border-slate-200'}`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" onClick={fetchPlans} disabled={isLoading} className={`h-10 w-10 rounded-xl cursor-pointer ${dk ? 'border-white/10 hover:bg-white/5' : ''}`}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="table-auto min-w-full text-left">
            <TableHeader>
              <TableRow className={dk ? 'bg-white/[0.02] border-b border-white/[0.06]' : 'bg-slate-50/80 border-b border-slate-100'}>
                <TableHead className="w-[50px] font-semibold text-xs uppercase tracking-wider text-slate-400">ID</TableHead>
                <TableHead className="w-[220px] font-semibold text-xs uppercase tracking-wider text-slate-400">{t('subscription.table.name')}</TableHead>
                <TableHead className="w-[130px] font-semibold text-xs uppercase tracking-wider text-slate-400">{t('subscription.table.price')}</TableHead>
                <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wider text-slate-400">Type</TableHead>
                <TableHead className="w-[110px] font-semibold text-xs uppercase tracking-wider text-slate-400">{t('subscription.table.duration')}</TableHead>
                <TableHead className="w-[90px] text-center font-semibold text-xs uppercase tracking-wider text-slate-400">{t('subscription.table.status')}</TableHead>
                <TableHead className="w-[130px] text-right font-semibold text-xs uppercase tracking-wider text-slate-400">{t('subscription.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-20">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto text-blue-500" /><p className="mt-3 text-slate-400 text-sm">{t('subscription.loading')}</p>
                </TableCell></TableRow>
              ) : filteredPlans.length > 0 ? filteredPlans.map((plan) => (
                <TableRow key={plan.planId} className={`border-b transition-colors cursor-pointer ${dk ? 'border-white/[0.04] hover:bg-white/[0.03]' : 'border-slate-50 hover:bg-blue-50/30'}`}>
                  <TableCell className="font-mono text-sm font-semibold text-blue-500">{plan.planId}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        plan.type === 'GROUP'
                          ? dk ? 'bg-violet-500/15' : 'bg-violet-100'
                          : dk ? 'bg-cyan-500/15' : 'bg-cyan-100'
                      }`}>
                        {plan.type === 'GROUP'
                          ? <Users className={`w-4 h-4 ${dk ? 'text-violet-400' : 'text-violet-600'}`} />
                          : <User className={`w-4 h-4 ${dk ? 'text-cyan-400' : 'text-cyan-600'}`} />
                        }
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${dk ? 'text-white' : 'text-slate-800'}`}>{plan.planName}</p>
                        {plan.isDefault && (
                          <div className="flex items-center gap-1 mt-0.5"><Crown className="w-3 h-3 text-amber-500" /><span className="text-[11px] text-amber-500 font-semibold">Default</span></div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${(plan.price ?? 0) === 0 ? 'text-emerald-500' : dk ? 'text-white' : 'text-slate-800'}`}>
                      {formatCurrency(plan.price)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                      plan.type === 'GROUP'
                        ? dk ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-100 text-violet-700'
                        : dk ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-100 text-cyan-700'
                    }`}>
                      {plan.type}
                    </span>
                  </TableCell>
                  <TableCell className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>
                    {plan.isDefault ? (
                      <span className="flex items-center gap-1.5"><Infinity className="w-3.5 h-3.5" />{t('subscription.unlimited')}</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{plan.durationInDay} {t('subscription.days')}</span>
                    )}
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
                          { icon: isActive(plan.status) ? ToggleRight : ToggleLeft, color: isActive(plan.status) ? (dk ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-500 hover:bg-emerald-50') : (dk ? 'text-slate-500 hover:bg-white/5' : 'text-slate-400 hover:bg-slate-50'), action: () => handleToggleStatus(plan), tip: 'Toggle' },
                          { icon: Edit2, color: dk ? 'text-amber-400 hover:bg-amber-500/10' : 'text-amber-500 hover:bg-amber-50', action: () => openEditForm(plan), tip: t('subscription.edit') },
                          { icon: Trash2, color: dk ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50', action: () => confirmDelete(plan), tip: t('subscription.delete') },
                        ] : []),
                      ].map(({ icon: Icon, color, action, tip }) => (
                        <button key={tip} onClick={action} title={tip} className={`h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${color}`}>
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={7} className="text-center py-20 text-slate-400 text-sm italic">{t('subscription.noPlans')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ──── Create / Edit Dialog ──── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent hideClose className={`max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden ${dk ? 'bg-[#0f1629] border-white/[0.08]' : 'bg-white'}`}>
          {/* Fixed header */}
          <div className={`flex-shrink-0 px-6 pt-6 pb-4 border-b ${dk ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <DialogHeader className="p-0 space-y-1">
              <DialogTitle className={`text-xl font-bold ${dk ? 'text-white' : 'text-slate-900'}`}>
                {editingPlan ? t('subscription.editPlan') : t('subscription.addPlan')}
              </DialogTitle>
              <DialogDescription className={dk ? 'text-slate-400' : 'text-slate-500'}>
                {editingPlan ? t('subscription.editPlanDesc') : t('subscription.addPlanDesc')}
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
            {/* Basic Info */}
            <div className={sectionCls}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-4 ${dk ? 'text-blue-400' : 'text-blue-600'}`}>
                Basic Information
              </p>
              <div className="space-y-4">
                <div>
                  <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>{t('subscription.form.name')} *</Label>
                  <Input required value={formData.planName} onChange={(e) => setFormData({ ...formData, planName: e.target.value })} placeholder="e.g. Pro, Elite..." className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>{t('subscription.form.price')} (VND)</Label>
                    {formData.isDefault ? (
                      <div className={`mt-1.5 h-10 rounded-lg border flex items-center gap-2 px-3 ${dk ? 'bg-white/5 border-white/10 text-emerald-400' : 'bg-slate-50 border-slate-200 text-emerald-600'}`}>
                        <span className="font-medium">0</span>
                      </div>
                    ) : (
                      <Input type="number" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="0" className={inputCls} />
                    )}
                  </div>
                  <div>
                    <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>{t('subscription.form.duration')}</Label>
                    {formData.isDefault ? (
                      <div className={`mt-1.5 h-10 rounded-lg border flex items-center gap-2 px-3 ${dk ? 'bg-white/5 border-white/10 text-amber-400' : 'bg-slate-50 border-slate-200 text-amber-600'}`}>
                        <Infinity className="w-5 h-5" />
                        <span className="font-medium">{t('subscription.unlimited')}</span>
                      </div>
                    ) : (
                      <Input type="number" min="1" value={formData.durationInDay} onChange={(e) => setFormData({ ...formData, durationInDay: e.target.value })} placeholder="30" className={inputCls} />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className={`text-xs font-semibold ${dk ? 'text-slate-300' : 'text-slate-600'}`}>Plan Type *</Label>
                    <select value={formData.planType} onChange={(e) => setFormData({ ...formData, planType: e.target.value })} className={selectCls}>
                      <option value="INDIVIDUAL">INDIVIDUAL</option>
                      <option value="GROUP">GROUP</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors ${dk ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                      <Switch checked={formData.isDefault} onCheckedChange={(val) => setFormData({ ...formData, isDefault: val, price: val ? '0' : formData.price, durationInDay: val ? '999999' : '30' })} />
                      <span className={`text-sm font-medium ${dk ? 'text-slate-300' : 'text-slate-600'}`}>Default Plan</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Limits */}
            <div className={sectionCls}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-4 ${dk ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Limits & Quotas
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {Object.entries(LIMIT_LABELS).map(([key, label]) => (
                  <div key={key}>
                    <Label className={`text-[11px] font-semibold ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{label}</Label>
                    <Input type="number" min="0" value={limitData[key] ?? ''} onChange={(e) => setLimitData({ ...limitData, [key]: parseInt(e.target.value) || 0 })} className={`${inputCls} h-9`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className={sectionCls}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-4 ${dk ? 'text-violet-400' : 'text-violet-600'}`}>
                Features
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(FEATURE_META).map(([key, meta]) => {
                  const checked = featureData[key] ?? false;
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                        checked
                          ? dk ? 'bg-white/[0.06] ring-1 ring-white/10' : 'bg-blue-50/80 ring-1 ring-blue-200'
                          : dk ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <Switch checked={checked} onCheckedChange={(val) => setFeatureData({ ...featureData, [key]: val })} />
                      <meta.icon className={`w-4 h-4 flex-shrink-0 ${checked ? meta.color : dk ? 'text-slate-600' : 'text-slate-300'}`} />
                      <span className={`text-sm font-medium transition-colors ${
                        checked
                          ? dk ? 'text-white' : 'text-slate-800'
                          : dk ? 'text-slate-500' : 'text-slate-400'
                      }`}>{meta.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className={`flex justify-end gap-3 pt-2 border-t ${dk ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className={`rounded-lg cursor-pointer ${dk ? 'border-white/10 text-slate-300 hover:bg-white/5' : ''}`}>
                {t('auth.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-lg shadow-blue-600/25 cursor-pointer">
                {isSubmitting ? t('subscription.submitting') : editingPlan ? t('subscription.save') : t('subscription.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ──── Delete Confirmation ──── */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!open && !isSubmitting) setIsDeleteOpen(false); }}>
        <DialogContent hideClose className={`max-w-md ${dk ? 'bg-[#0f1629] border-white/[0.08]' : ''}`} onPointerDownOutside={(e) => isSubmitting && e.preventDefault()} onInteractOutside={(e) => isSubmitting && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className={dk ? 'text-white' : ''}>{t('subscription.confirmDelete')}</DialogTitle>
            <DialogDescription>{t('subscription.confirmDeleteDesc', { name: deletingPlan?.planName })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className={`cursor-pointer ${dk ? 'border-white/10 text-slate-300 hover:bg-white/5' : ''}`}>{t('auth.cancel')}</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting} className="cursor-pointer">{isSubmitting ? t('subscription.deleting') : t('subscription.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Plan Detail Dialog ──── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent hideClose className={`max-w-xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden ${dk ? 'bg-[#0f1629] border-white/[0.08]' : 'bg-white'}`}>
          {detailPlan && (
            <>
              {/* Fixed header */}
              <div className={`flex-shrink-0 px-6 pt-6 pb-4 border-b ${dk ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      detailPlan.type === 'GROUP'
                        ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-cyan-500 to-blue-600'
                    } shadow-lg`}>
                      {detailPlan.type === 'GROUP' ? <Users className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${dk ? 'text-white' : 'text-slate-900'}`}>{detailPlan.planName}</h3>
                      <p className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{detailPlan.type} Plan</p>
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
                    { label: t('subscription.table.price'), value: formatCurrency(detailPlan.price), color: dk ? 'text-emerald-400' : 'text-emerald-600' },
                    { label: 'Type', value: detailPlan.type, color: dk ? 'text-blue-400' : 'text-blue-600' },
                    { label: t('subscription.table.duration'), value: detailPlan.isDefault ? t('subscription.unlimited') : `${detailPlan.durationInDay} ${t('subscription.days')}`, color: dk ? 'text-amber-400' : 'text-amber-600' },
                  ].map((item) => (
                    <div key={item.label} className={`p-3.5 rounded-xl text-center ${dk ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-slate-50 border border-slate-100'}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wider ${dk ? 'text-slate-500' : 'text-slate-400'}`}>{item.label}</p>
                      <p className={`font-bold mt-1 ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Limits */}
                {detailPlan.planLimit && (
                  <div className={sectionCls}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${dk ? 'text-emerald-400' : 'text-emerald-600'}`}>Limits & Quotas</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {Object.entries(LIMIT_LABELS).map(([key, label]) => (
                        <div key={key} className={`flex items-center justify-between py-1.5 border-b ${dk ? 'border-white/[0.04]' : 'border-slate-100'} last:border-0`}>
                          <span className={`text-sm ${dk ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
                          <span className={`font-bold text-sm tabular-nums ${dk ? 'text-white' : 'text-slate-800'}`}>{detailPlan.planLimit[key] ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                {detailPlan.planFeature && (
                  <div className={sectionCls}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${dk ? 'text-violet-400' : 'text-violet-600'}`}>Features</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(FEATURE_META).map(([key, meta]) => {
                        const enabled = detailPlan.planFeature[key];
                        return (
                          <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${
                            enabled
                              ? dk ? 'bg-white/[0.04]' : 'bg-emerald-50/80'
                              : dk ? 'opacity-40' : 'opacity-40'
                          }`}>
                            {enabled
                              ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              : <X className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            }
                            <meta.icon className={`w-4 h-4 flex-shrink-0 ${enabled ? meta.color : dk ? 'text-slate-600' : 'text-slate-300'}`} />
                            <span className={`text-sm font-medium ${
                              enabled ? dk ? 'text-white' : 'text-slate-700' : dk ? 'text-slate-600 line-through' : 'text-slate-400 line-through'
                            }`}>{meta.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SubscriptionManagement;
