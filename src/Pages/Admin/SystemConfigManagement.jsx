import React, { useDeferredValue, useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  BookOpenText,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import ListSpinner from '@/Components/ui/ListSpinner';
import CreateWizard from '@/Components/SystemConfig/CreateWizard';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useToast } from '@/context/ToastContext';
import { getCurrentUser } from '@/api/Authentication';
import {
  createDomain,
  createLevel,
  createKnowledge,
  createScheme,
  deleteDomain,
  deleteLevel,
  deleteKnowledge,
  deleteScheme,
  getAllDomains,
  getAllLevels,
  getAllKnowledge,
  getAllSchemes,
  getLevelsByKnowledgeId,
  getLevelsBySchemeId,
  getKnowledgeByDomainId,
  getSchemesByKnowledgeId,
  updateDomain,
  updateLevel,
  updateKnowledge,
  updateScheme,
} from '@/api/SystemConfigAPI';

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE'];
const LEVEL_SYSTEM_OPTIONS = ['SCORE_BASED', 'THREE_LEVEL'];
const ENTITY_ORDER = ['domain', 'knowledge', 'scheme', 'level'];

const ENTITY_META = {
  domain: { icon: BookOpenText, accent: 'from-sky-500/20 via-blue-500/10 to-transparent' },
  knowledge: { icon: GraduationCap, accent: 'from-emerald-500/20 via-teal-500/10 to-transparent' },
  scheme: { icon: Layers, accent: 'from-violet-500/20 via-indigo-500/10 to-transparent' },
  level: { icon: BarChart3, accent: 'from-amber-500/20 via-orange-500/10 to-transparent' },
};

const createEmptyForm = (entity, context = {}) => {
  if (entity === 'domain') {
    return { title: '', description: '' };
  }

  if (entity === 'knowledge') {
    return {
      domainId: context.selectedDomainId || '',
      title: '',
      levelSystemType: 'SCORE_BASED',
      description: '',
    };
  }

  if (entity === 'scheme') {
    return {
      knowledgeId: context.selectedKnowledgeId || '',
      title: '',
      levelSystemType: 'SCORE_BASED',
      description: '',
    };
  }

  return {
    knowledgeId: context.selectedKnowledgeId || '',
    schemeId: context.selectedSchemeId || '',
    levelValues: '',
    levelGroup: '',
    description: '',
  };
};

const createEditForm = (entity, item, context = {}) => {
  if (!item) {
    return createEmptyForm(entity, context);
  }

  if (entity === 'domain') {
    return {
      title: item.title || '',
      description: item.description || '',
      status: item.status || 'ACTIVE',
    };
  }

  if (entity === 'knowledge') {
    return {
      domainId: item.domainId ? String(item.domainId) : '',
      title: item.title || '',
      levelSystemType: item.levelSystemType || 'SCORE_BASED',
      description: item.description || '',
      status: item.status || 'ACTIVE',
    };
  }

  if (entity === 'scheme') {
    return {
      knowledgeId: item.knowledgeId ? String(item.knowledgeId) : '',
      title: item.title || '',
      levelSystemType: item.levelSystemType || 'SCORE_BASED',
      description: item.description || '',
      status: item.status || 'ACTIVE',
    };
  }

  return {
    knowledgeId: item.knowledgeId ? String(item.knowledgeId) : context.selectedKnowledgeId || '',
    schemeId: item.schemeId ? String(item.schemeId) : context.selectedSchemeId || '',
    levelValues: item.levelValues || (item.levelValuesList && item.levelValuesList.join(', ')) || '',
    levelGroup: item.levelGroup || '',
    description: item.description || '',
    status: item.status || 'ACTIVE',
  };
};

const matchesSearch = (search, values) => {
  if (!search) {
    return true;
  }

  return values.some((value) => String(value ?? '').toLowerCase().includes(search));
};

const statusBadgeClass = (status, isDarkMode) => {
  if (String(status || '').toUpperCase() === 'ACTIVE') {
    return isDarkMode
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return isDarkMode
    ? 'border-slate-600 bg-slate-700/40 text-slate-200'
    : 'border-slate-200 bg-slate-100 text-slate-700';
};

const entityIdOf = (entity, item) => {
  if (entity === 'domain') return item.domainId;
  if (entity === 'knowledge') return item.knowledgeId;
  if (entity === 'scheme') return item.schemeId;
  return item.levelId;
};

const SelectionChip = ({ label, value, onClear, isDarkMode }) => (
  <div
    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
      isDarkMode
        ? 'border-white/10 bg-white/5 text-slate-200'
        : 'border-slate-200 bg-white text-slate-700'
    }`}
  >
    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{label}</span>
    <span>{value}</span>
    <button
      type="button"
      onClick={onClear}
      className={`rounded-full px-1 text-[11px] transition-colors ${
        isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      x
    </button>
  </div>
);

function EntityPanel({
  entity,
  title,
  description,
  items,
  selectedId,
  getItemId,
  getPrimaryText,
  getSecondaryText,
  getDescriptionText,
  getMetaBadges,
  onSelect,
  onEdit,
  onDelete,
  canWrite,
  isLoading,
  isDarkMode,
  emptyText,
}) {
  const { t } = useTranslation();
  const Icon = ENTITY_META[entity].icon;

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border ${
        isDarkMode ? 'border-white/10 bg-slate-900/90' : 'border-slate-200 bg-white'
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-r ${ENTITY_META[entity].accent}`} />
      <div className="relative flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
              isDarkMode
                ? 'border-white/10 bg-white/5 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-800'
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className={`text-lg font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
          </div>
        </div>

        {!canWrite && <Badge className={statusBadgeClass('INACTIVE', isDarkMode)}>{t('systemConfig.writeDenied')}</Badge>}
      </div>

      <div className="relative px-5 pb-5 pt-4">
        {isLoading ? (
          <ListSpinner variant="section" />
        ) : items.length === 0 ? (
          <div
            className={`rounded-2xl border border-dashed px-4 py-10 text-center text-sm ${
              isDarkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            {emptyText}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const itemId = String(getItemId(item));
              const isSelected = selectedId && String(selectedId) === itemId;
              const badges = getMetaBadges(item);

              return (
                <div
                  role="button"
                  tabIndex={0}
                  key={itemId}
                  onClick={() => onSelect(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(item);
                    }
                  }}
                  className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? isDarkMode
                        ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]'
                        : 'border-blue-300 bg-blue-50 shadow-[0_0_0_1px_rgba(147,197,253,0.8)]'
                      : isDarkMode
                        ? 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                        : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`truncate text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {getPrimaryText(item)}
                        </span>
                        {badges.map((badge) => (
                          <Badge key={`${itemId}-${badge.label}`} className={badge.className}>
                            {badge.label}
                          </Badge>
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {getSecondaryText(item)}
                      </p>
                      {getDescriptionText(item) && (
                        <p className={`line-clamp-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          {getDescriptionText(item)}
                        </p>
                      )}
                    </div>
                    {entity === 'level' && onEdit && onDelete && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={!canWrite}
                          onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={!canWrite}
                          onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function SystemConfigManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { permissions, loading: permissionLoading } = useAdminPermissions();
  const { showError, showSuccess } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const canRead = isSuperAdmin || (!permissionLoading && permissions.has('system-settings:read'));
  const canWrite = isSuperAdmin || (!permissionLoading && permissions.has('system-settings:write'));

  const [searchTerm, setSearchTerm] = useState('');
  const [domains, setDomains] = useState([]);
  const [knowledges, setKnowledges] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [levels, setLevels] = useState([]);

  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState('');
  const [selectedSchemeId, setSelectedSchemeId] = useState('');

  const [loadingDomains, setLoadingDomains] = useState(false);
  const [loadingKnowledges, setLoadingKnowledges] = useState(false);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [dialogState, setDialogState] = useState({ open: false, entity: 'domain', mode: 'create', item: null });
  const [formState, setFormState] = useState(createEmptyForm('domain'));
  const [formErrors, setFormErrors] = useState({});
  const [deleteState, setDeleteState] = useState({ open: false, entity: 'domain', item: null });
  const [wizardOpen, setWizardOpen] = useState(false);

  const normalizedSearch = useDeferredValue(searchTerm.trim().toLowerCase());
  const selectedDomain = domains.find((item) => String(item.domainId) === String(selectedDomainId));
  const selectedKnowledge = knowledges.find(
    (item) => String(item.knowledgeId) === String(selectedKnowledgeId)
  );
  const selectedScheme = schemes.find((item) => String(item.schemeId) === String(selectedSchemeId));

  const fetchDomains = async () => {
    setLoadingDomains(true);
    try {
      const response = await getAllDomains();
      const nextDomains = response?.data?.content ?? [];
      setDomains(nextDomains);

      if (
        selectedDomainId &&
        !nextDomains.some((item) => String(item.domainId) === String(selectedDomainId))
      ) {
        setSelectedDomainId('');
        setSelectedKnowledgeId('');
        setSelectedSchemeId('');
      }
    } catch (error) {
      showError(error?.message || t('systemConfig.messages.fetchError'));
    } finally {
      setLoadingDomains(false);
    }
  };

  const fetchKnowledges = async (domainId = selectedDomainId) => {
    setLoadingKnowledges(true);
    try {
      const response = domainId ? await getKnowledgeByDomainId(domainId) : await getAllKnowledge();
      const nextKnowledges = domainId ? response?.data ?? [] : response?.data?.content ?? [];
      setKnowledges(nextKnowledges);

      if (
        selectedKnowledgeId &&
        !nextKnowledges.some((item) => String(item.knowledgeId) === String(selectedKnowledgeId))
      ) {
        setSelectedKnowledgeId('');
        setSelectedSchemeId('');
      }
    } catch (error) {
      showError(error?.message || t('systemConfig.messages.fetchError'));
    } finally {
      setLoadingKnowledges(false);
    }
  };

  const fetchSchemes = async (knowledgeId = selectedKnowledgeId) => {
    setLoadingSchemes(true);
    try {
      const response = knowledgeId ? await getSchemesByKnowledgeId(knowledgeId) : await getAllSchemes();
      const nextSchemes = knowledgeId ? response?.data ?? [] : response?.data?.content ?? [];
      setSchemes(nextSchemes);

      if (
        selectedSchemeId &&
        !nextSchemes.some((item) => String(item.schemeId) === String(selectedSchemeId))
      ) {
        setSelectedSchemeId('');
      }
    } catch (error) {
      showError(error?.message || t('systemConfig.messages.fetchError'));
    } finally {
      setLoadingSchemes(false);
    }
  };

  const fetchLevels = async (schemeId = selectedSchemeId, knowledgeId = selectedKnowledgeId) => {
    setLoadingLevels(true);
    try {
      let response;
      let nextLevels = [];

      if (schemeId) {
        response = await getLevelsBySchemeId(schemeId);
        nextLevels = response?.data ?? [];
      } else if (knowledgeId) {
        response = await getLevelsByKnowledgeId(knowledgeId);
        nextLevels = response?.data ?? [];
      } else {
        response = await getAllLevels();
        nextLevels = response?.data?.content ?? [];
      }

      setLevels(nextLevels);
    } catch (error) {
      showError(error?.message || t('systemConfig.messages.fetchError'));
    } finally {
      setLoadingLevels(false);
    }
  };

  const onFetchDomains = useEffectEvent(async () => {
    await fetchDomains();
  });

  const onFetchKnowledges = useEffectEvent(async (domainId) => {
    await fetchKnowledges(domainId);
  });

  const onFetchSchemes = useEffectEvent(async (knowledgeId) => {
    await fetchSchemes(knowledgeId);
  });

  const onFetchLevels = useEffectEvent(async (schemeId, knowledgeId) => {
    await fetchLevels(schemeId, knowledgeId);
  });

  useEffect(() => {
    if (permissionLoading && !isSuperAdmin) {
      return;
    }

    if (!canRead) {
      return;
    }

    onFetchDomains();
  }, [permissionLoading, canRead, isSuperAdmin]);

  useEffect(() => {
    if (permissionLoading && !isSuperAdmin) {
      return;
    }

    if (!canRead) {
      return;
    }

    onFetchKnowledges(selectedDomainId);
  }, [selectedDomainId, permissionLoading, canRead, isSuperAdmin]);

  useEffect(() => {
    if (permissionLoading && !isSuperAdmin) {
      return;
    }

    if (!canRead) {
      return;
    }

    onFetchSchemes(selectedKnowledgeId);
  }, [selectedKnowledgeId, permissionLoading, canRead, isSuperAdmin]);

  useEffect(() => {
    if (permissionLoading && !isSuperAdmin) {
      return;
    }

    if (!canRead) {
      return;
    }

    onFetchLevels(selectedSchemeId, selectedKnowledgeId);
  }, [selectedSchemeId, selectedKnowledgeId, permissionLoading, canRead, isSuperAdmin]);

  const refreshVisibleData = async () => {
    await fetchDomains();
    await fetchKnowledges(selectedDomainId);
    await fetchSchemes(selectedKnowledgeId);
    await fetchLevels(selectedSchemeId, selectedKnowledgeId);
  };

  const openCreateDialog = (entity) => {
    setDialogState({ open: true, entity, mode: 'create', item: null });
    setFormState(
      createEmptyForm(entity, {
        selectedDomainId,
        selectedKnowledgeId,
        selectedSchemeId,
      })
    );
    setFormErrors({});
  };

  const openEditDialog = (entity, item) => {
    setDialogState({ open: true, entity, mode: 'edit', item });
    setFormState(
      createEditForm(entity, item, {
        selectedDomainId,
        selectedKnowledgeId,
        selectedSchemeId,
      })
    );
    setFormErrors({});
  };

  const openDeleteDialog = (entity, item) => {
    setDeleteState({ open: true, entity, item });
  };

  const closeDialog = () => {
    setDialogState((current) => ({ ...current, open: false }));
    setFormErrors({});
  };

  const closeDeleteDialog = () => {
    setDeleteState((current) => ({ ...current, open: false, item: null }));
  };

  const resolveLevelParentType = () => {
    if (dialogState.entity !== 'level') {
      return null;
    }
    if (formState.schemeId) {
      return schemes.find((item) => String(item.schemeId) === String(formState.schemeId))?.levelSystemType;
    }
    return knowledges.find((item) => String(item.knowledgeId) === String(formState.knowledgeId))?.levelSystemType;
  };

  const validateForm = () => {
    const nextErrors = {};
    const entity = dialogState.entity;

    if (!formState.title?.trim()) nextErrors.title = t('systemConfig.validation.required');

    if (entity === 'knowledge' && !formState.domainId) {
      nextErrors.domainId = t('systemConfig.validation.required');
    }

    if (entity === 'knowledge' && !formState.levelSystemType) {
      nextErrors.levelSystemType = t('systemConfig.validation.required');
    }

    if (entity === 'scheme' && !formState.knowledgeId) {
      nextErrors.knowledgeId = t('systemConfig.validation.required');
    }

    if (entity === 'level') {
      if (!formState.knowledgeId) {
        nextErrors.knowledgeId = t('systemConfig.validation.required');
      }
      const levelSystemType = resolveLevelParentType();
      if (levelSystemType === 'SCORE_BASED' && !formState.levelValues?.trim()) {
        nextErrors.levelValues = t('systemConfig.validation.required');
      }
      if (levelSystemType === 'THREE_LEVEL' && !formState.levelGroup?.trim()) {
        nextErrors.levelGroup = t('systemConfig.validation.required');
      }
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => {
    const entity = dialogState.entity;

    if (entity === 'domain') {
      const payload = {
        title: formState.title.trim(),
        description: formState.description?.trim() || null,
      };
      return dialogState.mode === 'edit' ? { ...payload, status: formState.status } : payload;
    }

    if (entity === 'knowledge') {
      const payload = {
        domainId: Number(formState.domainId),
        title: formState.title.trim(),
        levelSystemType: formState.levelSystemType,
        description: formState.description?.trim() || null,
      };
      return dialogState.mode === 'edit' ? { ...payload, status: formState.status } : payload;
    }

    if (entity === 'scheme') {
      const knowledge = knowledges.find((k) => String(k.knowledgeId) === String(formState.knowledgeId));
      const payload = {
        knowledgeId: Number(formState.knowledgeId),
        title: formState.title.trim(),
        levelSystemType: knowledge?.levelSystemType || formState.levelSystemType || 'SCORE_BASED',
        description: formState.description?.trim() || null,
      };
      return dialogState.mode === 'edit' ? { ...payload, status: formState.status } : payload;
    }

    const payload = {
      knowledgeId: Number(formState.knowledgeId),
      schemeId: formState.schemeId ? Number(formState.schemeId) : (dialogState.mode === 'edit' && dialogState.item?.schemeId ? Number(dialogState.item.schemeId) : null),
      levelValues: formState.levelValues?.trim() || null,
      levelGroup: formState.levelGroup?.trim() || null,
      description: formState.description?.trim() || null,
    };
    return dialogState.mode === 'edit' ? { ...payload, status: formState.status } : payload;
  };

  const submitForm = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const entity = dialogState.entity;
    const payload = buildPayload();
    const entityLabel = t(`systemConfig.entities.${entity}`);

    setIsSubmitting(true);
    try {
      if (dialogState.mode === 'create') {
        if (entity === 'domain') await createDomain(payload);
        if (entity === 'knowledge') await createKnowledge(payload);
        if (entity === 'scheme') await createScheme(payload);
        if (entity === 'level') await createLevel(payload);
        showSuccess(t('systemConfig.messages.created', { entity: entityLabel }));
      } else {
        const entityId = entityIdOf(entity, dialogState.item);
        if (entity === 'domain') await updateDomain(entityId, payload);
        if (entity === 'knowledge') await updateKnowledge(entityId, payload);
        if (entity === 'scheme') await updateScheme(entityId, payload);
        if (entity === 'level') await updateLevel(entityId, payload);
        showSuccess(t('systemConfig.messages.updated', { entity: entityLabel }));
      }

      closeDialog();
      await refreshVisibleData();
    } catch (error) {
      showError(error?.message || t('systemConfig.messages.saveError', { entity: entityLabel }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteState.item) {
      return;
    }

    const entity = deleteState.entity;
    const entityLabel = t(`systemConfig.entities.${entity}`);

    setIsSubmitting(true);
    try {
      const entityId = entityIdOf(entity, deleteState.item);
      if (entity === 'domain') await deleteDomain(entityId);
      if (entity === 'knowledge') await deleteKnowledge(entityId);
      if (entity === 'scheme') await deleteScheme(entityId);
      if (entity === 'level') await deleteLevel(entityId);

      showSuccess(t('systemConfig.messages.deleted', { entity: entityLabel }));
      closeDeleteDialog();
      await refreshVisibleData();
    } catch (error) {
      showError(error?.message || t('systemConfig.messages.deleteError', { entity: entityLabel }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDomains = domains.filter((item) =>
    matchesSearch(normalizedSearch, [item.title, item.description, item.status])
  );

  const filteredKnowledges = knowledges.filter((item) =>
    matchesSearch(normalizedSearch, [
      item.title,
      item.description,
      item.domainTitle,
      item.levelSystemType,
      item.status,
    ])
  );

  const filteredSchemes = schemes.filter((item) =>
    matchesSearch(normalizedSearch, [
      item.title,
      item.description,
      item.knowledgeTitle,
      item.levelSystemType,
      item.status,
    ])
  );

  const filteredLevels = levels.filter((item) =>
    matchesSearch(normalizedSearch, [
      item.levelValues,
      item.levelGroup,
      item.description,
      item.knowledgeTitle,
      item.schemeTitle,
      item.levelSystemType,
      item.status,
    ])
  );

  const panelCounts = {
    domain: domains.length,
    knowledge: knowledges.length,
    scheme: schemes.length,
    level: levels.length,
  };

  const renderTextInput = (field, label, options = {}) => (
    <div className={options.fullWidth ? 'sm:col-span-2' : ''}>
      <Label className="text-sm font-semibold">{label}</Label>
      <Input
        className={`mt-1.5 ${
          formErrors[field] ? 'border-red-500 focus-visible:ring-red-500/20' : ''
        }`}
        value={formState[field] ?? ''}
        onChange={(event) => {
          setFormState((current) => ({ ...current, [field]: event.target.value }));
          setFormErrors((current) => ({ ...current, [field]: null }));
        }}
        placeholder={options.placeholder}
        type={options.type || 'text'}
      />
      {formErrors[field] && <p className="mt-1 text-xs text-red-500">{formErrors[field]}</p>}
    </div>
  );

  const renderSelect = (field, label, items, placeholder, valueKey, labelKey) => (
    <div>
      <Label className="text-sm font-semibold">{label}</Label>
      <select
        className={`mt-1.5 flex h-10 w-full rounded-md border bg-background px-3 text-sm ${
          formErrors[field] ? 'border-red-500' : 'border-input'
        }`}
        value={formState[field] ?? ''}
        onChange={(event) => {
          setFormState((current) => ({ ...current, [field]: event.target.value }));
          setFormErrors((current) => ({ ...current, [field]: null }));
        }}
      >
        <option key="__placeholder__" value="">{placeholder}</option>
        {items.map((item) => (
          <option key={String(item[valueKey] ?? '')} value={String(item[valueKey])}>
            {item[labelKey]}
          </option>
        ))}
      </select>
      {formErrors[field] && <p className="mt-1 text-xs text-red-500">{formErrors[field]}</p>}
    </div>
  );

  const renderStatusSelect = () => (
    <div>
      <Label className="text-sm font-semibold">{t('systemConfig.fields.status')}</Label>
      <select
        className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={formState.status ?? 'ACTIVE'}
        onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value }))}
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {t(`systemConfig.status.${status}`)}
          </option>
        ))}
      </select>
    </div>
  );

  const renderDialogFields = () => {
    const entity = dialogState.entity;
    const levelSystemType = resolveLevelParentType();

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {entity === 'knowledge' &&
          renderSelect(
            'domainId',
            t('systemConfig.fields.domain'),
            domains,
            t('systemConfig.placeholders.selectDomain'),
            'domainId',
            'title'
          )}

        {entity === 'scheme' &&
          renderSelect(
            'knowledgeId',
            t('systemConfig.fields.knowledge'),
            knowledges,
            t('systemConfig.placeholders.selectKnowledge'),
            'knowledgeId',
            'title'
          )}

        {entity === 'level' && (
          <>
            {renderSelect(
              'knowledgeId',
              t('systemConfig.fields.knowledge'),
              knowledges,
              t('systemConfig.placeholders.selectKnowledge'),
              'knowledgeId',
              'title'
            )}
            {renderSelect(
              'schemeId',
              t('systemConfig.fields.schemeOptional'),
              schemes.filter((s) => !formState.knowledgeId || String(s.knowledgeId) === String(formState.knowledgeId)),
              'Bỏ trống nếu không có scheme',
              'schemeId',
              'title'
            )}
          </>
        )}

        {entity !== 'level' && renderTextInput('title', t('systemConfig.fields.title'))}

        {entity === 'knowledge' && (
          <div>
            <Label className="text-sm font-semibold">{t('systemConfig.fields.levelSystemType')}</Label>
            <select
              className={`mt-1.5 flex h-10 w-full rounded-md border bg-background px-3 text-sm ${
                formErrors.levelSystemType ? 'border-red-500' : 'border-input'
              }`}
              value={formState.levelSystemType ?? 'SCORE_BASED'}
              onChange={(event) => {
                setFormState((current) => ({ ...current, levelSystemType: event.target.value }));
                setFormErrors((current) => ({ ...current, levelSystemType: null }));
              }}
            >
              {LEVEL_SYSTEM_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {t(`systemConfig.levelSystems.${item}`)}
                </option>
              ))}
            </select>
            {formErrors.levelSystemType && <p className="mt-1 text-xs text-red-500">{formErrors.levelSystemType}</p>}
          </div>
        )}

        {entity === 'scheme' && (
          <div
            className={`sm:col-span-2 rounded-lg border px-3 py-2 text-sm ${
              isDarkMode ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            {t('systemConfig.wizard.schemeLevelTypeInherited')}:{' '}
            <strong>
              {t(`systemConfig.levelSystems.${knowledges.find((k) => String(k.knowledgeId) === String(formState.knowledgeId))?.levelSystemType || 'SCORE_BASED'}`)}
            </strong>
          </div>
        )}

        {entity === 'level' && (
          <>
            {levelSystemType === 'SCORE_BASED' && renderTextInput(
              'levelValues',
              t('systemConfig.fields.levelValues'),
              { placeholder: '5.0, 5.5, 6.0, 6.5, 7.0' }
            )}
            {levelSystemType === 'THREE_LEVEL' && renderTextInput(
              'levelGroup',
              t('systemConfig.fields.levelGroup'),
              { placeholder: 'Sơ cấp, Trung cấp, Cao cấp' }
            )}
            <div className="sm:col-span-2">
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  isDarkMode
                    ? 'border-white/10 bg-white/[0.03] text-slate-300'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {levelSystemType === 'SCORE_BASED'
                  ? t('systemConfig.levelHints.scoreBased')
                  : levelSystemType === 'THREE_LEVEL'
                    ? t('systemConfig.levelHints.threeLevel')
                    : t('systemConfig.levelHints.selectParent')}
              </div>
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <Label className="text-sm font-semibold">{t('systemConfig.fields.description')}</Label>
          <textarea
            className={`mt-1.5 min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition ${
              formErrors.description ? 'border-red-500' : 'border-input'
            }`}
            value={formState.description ?? ''}
            onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
            placeholder={t('systemConfig.placeholders.description')}
          />
        </div>

        {dialogState.mode === 'edit' && renderStatusSelect()}
      </div>
    );
  };

  if (permissionLoading && !isSuperAdmin) {
    return (
      <div className={`p-6 ${fontClass}`}>
        <ListSpinner variant="section" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className={`p-6 ${fontClass}`}>
        <div
          className={`mx-auto max-w-3xl rounded-3xl border px-6 py-16 text-center ${
            isDarkMode ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'
          }`}
        >
          <div
            className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
              isDarkMode ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-600'
            }`}
          >
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black">{t('systemConfig.readDeniedTitle')}</h1>
          <p className={`mt-3 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('systemConfig.readDeniedDescription')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 p-6 pt-8 scroll-mt-20 ${fontClass}`}>
      <section
        className={`overflow-hidden rounded-[28px] border ${
          isDarkMode ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'
        }`}
      >
        <div
          className={`relative overflow-hidden px-6 py-6 ${
            isDarkMode
              ? 'bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_45%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_35%)]'
              : 'bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_45%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_35%)]'
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className={statusBadgeClass('ACTIVE', isDarkMode)}>{t('systemConfig.badge')}</Badge>
              <h1 className={`mt-4 text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {t('systemConfig.title')}
              </h1>
              <p className={`mt-2 text-sm md:text-base ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {t('systemConfig.description')}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[280px]">
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('systemConfig.searchPlaceholder')}
                  className={isDarkMode ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-500' : ''}
                />
              </div>
              {canWrite && (
                <Button
                  type="button"
                  onClick={() => setWizardOpen(true)}
                  className="animate-in fade-in-50 slide-in-from-right-2"
                >
                  <Plus className="h-4 w-4" />
                  {t('systemConfig.wizard.action')}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={refreshVisibleData}>
                <RefreshCw className="h-4 w-4" />
                {t('common.refresh')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ENTITY_ORDER.map((entity) => {
          const Icon = ENTITY_META[entity].icon;
          return (
            <div
              key={entity}
              className={`rounded-3xl border px-5 py-4 ${
                isDarkMode ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t(`systemConfig.entities.${entity}`)}
                  </p>
                  <p className={`mt-2 text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {panelCounts[entity]}
                  </p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-50 text-slate-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-wrap items-center gap-2">
        {selectedDomain && (
          <SelectionChip
            label={t('systemConfig.filters.domain')}
            value={selectedDomain.title}
            onClear={() => {
              setSelectedDomainId('');
              setSelectedKnowledgeId('');
              setSelectedSchemeId('');
            }}
            isDarkMode={isDarkMode}
          />
        )}
        {selectedKnowledge && (
          <SelectionChip
            label={t('systemConfig.filters.knowledge')}
            value={selectedKnowledge.title}
            onClear={() => {
              setSelectedKnowledgeId('');
              setSelectedSchemeId('');
            }}
            isDarkMode={isDarkMode}
          />
        )}
        {selectedScheme && (
          <SelectionChip
            label={t('systemConfig.filters.scheme')}
            value={selectedScheme.title}
            onClear={() => setSelectedSchemeId('')}
            isDarkMode={isDarkMode}
          />
        )}
        {!canWrite && (
          <div
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              isDarkMode ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {t('systemConfig.writeDenied')}
          </div>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <EntityPanel
          entity="domain"
          title={t('systemConfig.entities.domain')}
          description={t('systemConfig.panels.domain')}
          items={filteredDomains}
          selectedId={selectedDomainId}
          getItemId={(item) => item.domainId}
          getPrimaryText={(item) => item.title}
          getSecondaryText={() => ''}
          getDescriptionText={(item) => item.description}
          getMetaBadges={(item) => [
            { label: t(`systemConfig.status.${item.status || 'ACTIVE'}`), className: statusBadgeClass(item.status, isDarkMode) },
          ]}
          onSelect={(item) => {
            setSelectedDomainId(String(item.domainId));
            setSelectedKnowledgeId('');
            setSelectedSchemeId('');
          }}
          onEdit={undefined}
          onDelete={undefined}
          canWrite={canWrite}
          isLoading={loadingDomains}
          isDarkMode={isDarkMode}
          emptyText={t('systemConfig.empty.domain')}
        />

        <EntityPanel
          entity="knowledge"
          title={t('systemConfig.entities.knowledge')}
          description={
            selectedDomain
              ? t('systemConfig.context.knowledge', { parent: selectedDomain.title })
              : t('systemConfig.panels.knowledge')
          }
          items={filteredKnowledges}
          selectedId={selectedKnowledgeId}
          getItemId={(item) => item.knowledgeId}
          getPrimaryText={(item) => item.title}
          getSecondaryText={(item) => item.domainTitle || '-'}
          getDescriptionText={(item) => item.description}
          getMetaBadges={(item) => [
            {
              label: t(`systemConfig.levelSystems.${item.levelSystemType || 'SCORE_BASED'}`),
              className: isDarkMode
                ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700',
            },
            { label: t(`systemConfig.status.${item.status || 'ACTIVE'}`), className: statusBadgeClass(item.status, isDarkMode) },
          ]}
          onSelect={(item) => {
            setSelectedKnowledgeId(String(item.knowledgeId));
            setSelectedSchemeId('');
          }}
          onEdit={undefined}
          onDelete={undefined}
          canWrite={canWrite}
          isLoading={loadingKnowledges}
          isDarkMode={isDarkMode}
          emptyText={t('systemConfig.empty.knowledge')}
        />

        <EntityPanel
          entity="scheme"
          title={t('systemConfig.entities.scheme')}
          description={
            selectedKnowledge
              ? t('systemConfig.context.scheme', { parent: selectedKnowledge.title })
              : t('systemConfig.panels.scheme')
          }
          items={filteredSchemes}
          selectedId={selectedSchemeId}
          getItemId={(item) => item.schemeId}
          getPrimaryText={(item) => item.title}
          getSecondaryText={(item) => item.knowledgeTitle || '-'}
          getDescriptionText={(item) => item.description}
          getMetaBadges={(item) => {
            const badges = [
              {
                label: t(`systemConfig.levelSystems.${item.levelSystemType || 'SCORE_BASED'}`),
                className: isDarkMode
                  ? 'border border-violet-500/20 bg-violet-500/10 text-violet-300'
                  : 'border border-violet-200 bg-violet-50 text-violet-700',
              },
              { label: t(`systemConfig.status.${item.status || 'ACTIVE'}`), className: statusBadgeClass(item.status, isDarkMode) },
            ];

            return badges;
          }}
          onSelect={(item) => setSelectedSchemeId(String(item.schemeId))}
          onEdit={undefined}
          onDelete={undefined}
          canWrite={canWrite}
          isLoading={loadingSchemes}
          isDarkMode={isDarkMode}
          emptyText={t('systemConfig.empty.scheme')}
        />

        <EntityPanel
          entity="level"
          title={t('systemConfig.entities.level')}
          description={
            selectedKnowledge
              ? t('systemConfig.context.levelKnowledge', { parent: selectedKnowledge.title }) ||
                `${selectedScheme ? selectedScheme.title + ' · ' : ''}${selectedKnowledge.title}`
              : t('systemConfig.panels.level')
          }
          items={filteredLevels}
          selectedId=""
          getItemId={(item) => item.levelId}
          getPrimaryText={(item) => item.levelGroup || item.levelValues || item.knowledgeTitle || '-'}
          getSecondaryText={(item) =>
            `${item.schemeTitle ? item.schemeTitle + ' · ' : ''}${item.knowledgeTitle || '-'}`
          }
          getDescriptionText={(item) => item.description}
          getMetaBadges={(item) => {
            const badges = [
              {
                label: t(`systemConfig.levelSystems.${item.levelSystemType || 'SCORE_BASED'}`),
                className: isDarkMode
                  ? 'border border-amber-500/20 bg-amber-500/10 text-amber-300'
                  : 'border border-amber-200 bg-amber-50 text-amber-700',
              },
              { label: t(`systemConfig.status.${item.status || 'ACTIVE'}`), className: statusBadgeClass(item.status, isDarkMode) },
            ];

            if (item.levelValues) {
              badges.unshift({
                label: item.levelValues,
                className: isDarkMode
                  ? 'border border-sky-500/20 bg-sky-500/10 text-sky-300'
                  : 'border border-sky-200 bg-sky-50 text-sky-700',
              });
            }
            if (item.levelGroup) {
              badges.unshift({
                label: item.levelGroup,
                className: isDarkMode
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700',
              });
            }
            return badges;
          }}
          onSelect={() => {}}
          onEdit={(item) => openEditDialog('level', item)}
          onDelete={(item) => openDeleteDialog('level', item)}
          canWrite={canWrite}
          isLoading={loadingLevels}
          isDarkMode={isDarkMode}
          emptyText={t('systemConfig.empty.level')}
        />
      </section>

      <Dialog open={dialogState.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {dialogState.mode === 'create'
                ? t('systemConfig.dialogs.createTitle', { entity: t(`systemConfig.entities.${dialogState.entity}`) })
                : t('systemConfig.dialogs.editTitle', { entity: t(`systemConfig.entities.${dialogState.entity}`) })}
            </DialogTitle>
            <DialogDescription>
              {dialogState.mode === 'create'
                ? t('systemConfig.dialogs.createDescription')
                : t('systemConfig.dialogs.editDescription')}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={submitForm}>
            {renderDialogFields()}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t('systemConfig.dialogs.saving')
                  : dialogState.mode === 'create'
                    ? t('systemConfig.dialogs.createAction')
                    : t('systemConfig.dialogs.updateAction')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CreateWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={refreshVisibleData}
      />

      <Dialog open={deleteState.open} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('systemConfig.dialogs.deleteTitle', { entity: t(`systemConfig.entities.${deleteState.entity}`) })}
            </DialogTitle>
            <DialogDescription>
              {deleteState.entity === 'domain'
                ? t('systemConfig.dialogs.deleteDescriptionDomainCascade', {
                    name: deleteState.item?.title || '',
                  })
                : t('systemConfig.dialogs.deleteDescription', {
                    entity: t(`systemConfig.entities.${deleteState.entity}`),
                    name: deleteState.item?.title || deleteState.item?.levelGroup || deleteState.item?.levelValues || '',
                  })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDeleteDialog}>
              {t('common.cancel')}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isSubmitting}>
              {isSubmitting ? t('systemConfig.dialogs.deleting') : t('systemConfig.dialogs.deleteAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SystemConfigManagement;
