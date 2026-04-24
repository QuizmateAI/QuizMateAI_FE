import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  Edit2,
  MessageSquareText,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Checkbox } from '@/Components/ui/checkbox';
import { Switch } from '@/Components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/Utils/getErrorMessage';
import { unwrapApiData, unwrapApiList } from '@/Utils/apiResponse';
import {
  createManagementFeedbackForm,
  getManagementFeedbackForms,
  getManagementFeedbackOverviewStats,
  updateManagementFeedbackForm,
} from '@/api/FeedbackAPI';
import {
  buildFeedbackFormConfig,
  buildFeedbackQuestionConfig,
  getFeedbackQuestionTypeLabel,
  getFeedbackRequiredBadgeClass,
  getFeedbackRequiredLabel,
  getFeedbackStatusBadgeClass,
  getFeedbackStatusLabel,
  getFeedbackTargetLabel,
  getFeedbackTriggerLabel,
  parseFeedbackFormConfig,
  parseFeedbackQuestionConfig,
} from '@/lib/feedback';
import { cn } from '@/lib/utils';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
} from './Components/SuperAdminSurface';

const TARGET_OPTIONS = ['QUIZ', 'PHASE', 'FLASHCARD', 'ROADMAP', 'WORKSPACE', 'SYSTEM_MILESTONE', 'SUPPORT'];
const TRIGGER_OPTIONS = ['AFTER_COMPLETION', 'AFTER_TIME', 'AFTER_N_COMPLETIONS', 'MANUAL'];
const QUESTION_TYPE_OPTIONS = ['STAR_RATING', 'YES_NO', 'TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE'];

function createBlankQuestion(displayOrder = 1) {
  return {
    questionId: null,
    questionText: '',
    questionType: 'TEXT',
    required: false,
    displayOrder,
    configJson: '',
    configValues: parseFeedbackQuestionConfig('TEXT', ''),
  };
}

function createBlankDraft() {
  return {
    formId: null,
    code: '',
    title: '',
    description: '',
    targetType: 'QUIZ',
    triggerType: 'MANUAL',
    configJson: '',
    configValues: parseFeedbackFormConfig(''),
    active: true,
    questions: [createBlankQuestion(1)],
  };
}

function normalizeDraft(form) {
  if (!form) return createBlankDraft();

  return {
    formId: form.formId ?? null,
    code: form.code ?? '',
    title: form.title ?? '',
    description: form.description ?? '',
    targetType: form.targetType ?? 'QUIZ',
    triggerType: form.triggerType ?? 'MANUAL',
    configJson: form.configJson ?? '',
    configValues: parseFeedbackFormConfig(form.configJson ?? ''),
    active: form.active ?? true,
    questions: Array.isArray(form.questions) && form.questions.length > 0
      ? form.questions.map((question, index) => ({
          questionId: question.questionId ?? null,
          questionText: question.questionText ?? '',
          questionType: question.questionType ?? 'TEXT',
          required: Boolean(question.required),
          displayOrder: question.displayOrder ?? index + 1,
          configJson: question.configJson ?? '',
          configValues: parseFeedbackQuestionConfig(question.questionType ?? 'TEXT', question.configJson ?? ''),
        }))
      : [createBlankQuestion(1)],
  };
}

function formatPercent(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(2)}%` : '0.00%';
}

function formatRating(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : '0.00';
}

function MetricCard({ title, value, helper, icon: Icon, isDarkMode }) {
  return (
    <div
      className={cn(
        'rounded-[24px] border p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.18)]',
        isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cn('text-sm font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>{title}</p>
          <p className={cn('mt-3 text-3xl font-black tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-slate-950')}>
            {value}
          </p>
          {helper ? <p className={cn('mt-2 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>{helper}</p> : null}
        </div>
        <div className={cn('rounded-2xl p-3', isDarkMode ? 'bg-slate-800 text-blue-300' : 'bg-blue-50 text-blue-700')}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function FeedbackManagement() {
  const { i18n, t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showSuccess, showError } = useToast();
  const currentLang = i18n.language;
  const isEnglish = currentLang.startsWith('en');
  const fontClass = isEnglish ? 'font-poppins' : 'font-sans';

  const [forms, setForms] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [draft, setDraft] = useState(createBlankDraft());

  const selectedForm = useMemo(
    () => forms.find((form) => form.formId === selectedFormId) ?? forms[0] ?? null,
    [forms, selectedFormId],
  );

  const fieldClass = isDarkMode
    ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500'
    : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400';

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      setLoading(true);
      try {
        const [formsResponse, overviewResponse] = await Promise.all([
          getManagementFeedbackForms(),
          getManagementFeedbackOverviewStats(),
        ]);

        if (cancelled) return;
        const nextForms = unwrapApiList(formsResponse);
        setForms(nextForms);
        setOverview(unwrapApiData(overviewResponse));
        setSelectedFormId((currentSelectedFormId) => currentSelectedFormId ?? nextForms[0]?.formId ?? null);
      } catch (error) {
        if (!cancelled) {
          showError(getErrorMessage(t, error));
          setForms([]);
          setOverview(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPage();
    return () => {
      cancelled = true;
    };
  }, [showError, t]);

  const refreshPage = async () => {
    setLoading(true);
    try {
      const [formsResponse, overviewResponse] = await Promise.all([
        getManagementFeedbackForms(),
        getManagementFeedbackOverviewStats(),
      ]);
      const nextForms = unwrapApiList(formsResponse);
      setForms(nextForms);
      setOverview(unwrapApiData(overviewResponse));
      setSelectedFormId((currentSelectedFormId) => currentSelectedFormId ?? nextForms[0]?.formId ?? null);
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setLoading(false);
    }
  };

  const openCreateEditor = () => {
    setDraft(createBlankDraft());
    setEditorOpen(true);
  };

  const openEditEditor = (form) => {
    setDraft(normalizeDraft(form));
    setEditorOpen(true);
  };

  const updateDraft = (field, value) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const updateDraftConfig = (field, value) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      configValues: {
        ...(currentDraft.configValues || {}),
        [field]: value,
      },
    }));
  };

  const updateQuestionType = (index, nextQuestionType) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: currentDraft.questions.map((question, questionIndex) => {
        if (questionIndex !== index) {
          return question;
        }

        return {
          ...question,
          questionType: nextQuestionType,
          configValues: (() => {
            const nextConfigValues = parseFeedbackQuestionConfig(nextQuestionType, question.configJson ?? '');
            if ((nextQuestionType === 'SINGLE_CHOICE' || nextQuestionType === 'MULTIPLE_CHOICE')
              && (!Array.isArray(nextConfigValues.options) || nextConfigValues.options.length < 2)) {
              return {
                ...nextConfigValues,
                options: ['', ''],
              };
            }
            return nextConfigValues;
          })(),
        };
      }),
    }));
  };

  const updateQuestion = (index, patch) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: currentDraft.questions.map((question, questionIndex) => (
        questionIndex === index ? { ...question, ...patch } : question
      )),
    }));
  };

  const updateQuestionConfig = (index, field, value) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: currentDraft.questions.map((question, questionIndex) => {
        if (questionIndex !== index) {
          return question;
        }

        return {
          ...question,
          configValues: {
            ...(question.configValues || {}),
            [field]: value,
          },
        };
      }),
    }));
  };

  const addQuestionOption = (index) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: currentDraft.questions.map((question, questionIndex) => {
        if (questionIndex !== index) {
          return question;
        }

        return {
          ...question,
          configValues: {
            ...(question.configValues || {}),
            options: [...(question.configValues?.options || []), ''],
          },
        };
      }),
    }));
  };

  const updateQuestionOption = (index, optionIndex, value) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: currentDraft.questions.map((question, questionIndex) => {
        if (questionIndex !== index) {
          return question;
        }

        return {
          ...question,
          configValues: {
            ...(question.configValues || {}),
            options: (question.configValues?.options || []).map((option, currentOptionIndex) => (
              currentOptionIndex === optionIndex ? value : option
            )),
          },
        };
      }),
    }));
  };

  const removeQuestionOption = (index, optionIndex) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: currentDraft.questions.map((question, questionIndex) => {
        if (questionIndex !== index) {
          return question;
        }

        const nextOptions = (question.configValues?.options || []).filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex);
        return {
          ...question,
          configValues: {
            ...(question.configValues || {}),
            options: nextOptions.length > 0 ? nextOptions : ['', ''],
          },
        };
      }),
    }));
  };

  const addQuestion = () => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: [...currentDraft.questions, createBlankQuestion(currentDraft.questions.length + 1)],
    }));
  };

  const removeQuestion = (index) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      questions: currentDraft.questions
        .filter((_, questionIndex) => questionIndex !== index)
        .map((question, questionIndex) => ({
          ...question,
          displayOrder: questionIndex + 1,
        })),
    }));
  };

  const handleSave = async () => {
    if (draft.triggerType === 'AFTER_TIME' && Number(draft.configValues?.daysAfter) <= 0) {
      showError(t('feedbackManagement.validation.daysAfterRequired', 'Please enter the number of days before sending feedback.'));
      return;
    }

    if (draft.triggerType === 'AFTER_N_COMPLETIONS' && Number(draft.configValues?.minCompletedQuizCount) <= 0) {
      showError(t('feedbackManagement.validation.minCompletedQuizRequired', 'Please enter the minimum completed quiz count.'));
      return;
    }

    const invalidChoiceQuestion = draft.questions.find((question) => {
      if (question.questionType !== 'SINGLE_CHOICE' && question.questionType !== 'MULTIPLE_CHOICE') {
        return false;
      }
      const optionCount = (question.configValues?.options || [])
        .map((option) => String(option || '').trim())
        .filter(Boolean).length;
      return optionCount < 2;
    });

    if (invalidChoiceQuestion) {
      showError(t('feedbackManagement.validation.choiceMinOptions', 'Choice questions must have at least 2 options.'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: draft.code.trim(),
        title: draft.title.trim(),
        description: draft.description?.trim() || '',
        targetType: draft.targetType,
        triggerType: draft.triggerType,
        configJson: buildFeedbackFormConfig(draft.triggerType, draft.configValues),
        active: draft.active,
        questions: draft.questions.map((question, index) => ({
          questionId: question.questionId,
          questionText: question.questionText.trim(),
          questionType: question.questionType,
          required: Boolean(question.required),
          displayOrder: Number(question.displayOrder) || index + 1,
          configJson: buildFeedbackQuestionConfig(question.questionType, question.configValues),
        })),
      };

      if (draft.formId) {
        await updateManagementFeedbackForm(draft.formId, payload);
        showSuccess(t('feedbackManagement.toast.formUpdated', 'Feedback form updated.'));
      } else {
        await createManagementFeedbackForm(payload);
        showSuccess(t('feedbackManagement.toast.formCreated', 'Feedback form created.'));
      }

      setEditorOpen(false);
      await refreshPage();
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setSaving(false);
    }
  };

  const renderFormConfigFields = () => {
    if (draft.triggerType === 'AFTER_TIME') {
      return (
        <div className={cn('rounded-[24px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
          <div className="mb-4">
            <h3 className="text-sm font-semibold">{t('feedbackManagement.formConfig.scheduleTitle', 'Schedule configuration')}</h3>
            <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
              {t('feedbackManagement.formConfig.scheduleDescription', 'Enter the schedule normally. The system will store the correct JSON automatically.')}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('feedbackManagement.formConfig.daysAfterLabel', 'Send after (days)')}</label>
              <Input
                type="number"
                min="1"
                value={draft.configValues?.daysAfter || ''}
                onChange={(event) => updateDraftConfig('daysAfter', event.target.value)}
                className={fieldClass}
                placeholder="7"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('feedbackManagement.formConfig.recurrenceLabel', 'Repeat every (days)')}</label>
              <Input
                type="number"
                min="1"
                value={draft.configValues?.recurrenceDays || ''}
                onChange={(event) => updateDraftConfig('recurrenceDays', event.target.value)}
                className={fieldClass}
                placeholder="90"
              />
              <p className={cn('text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                {t('feedbackManagement.formConfig.recurrenceHelper', 'Leave empty if this should only happen once.')}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (draft.triggerType === 'AFTER_N_COMPLETIONS') {
      return (
        <div className={cn('rounded-[24px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
          <div className="mb-4">
            <h3 className="text-sm font-semibold">{t('feedbackManagement.formConfig.milestoneTitle', 'Milestone configuration')}</h3>
            <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
              {t('feedbackManagement.formConfig.milestoneDescription', 'The current backend uses this trigger for completed quiz count milestones.')}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('feedbackManagement.formConfig.minCompletedQuizLabel', 'Minimum completed quizzes')}</label>
            <Input
              type="number"
              min="1"
              value={draft.configValues?.minCompletedQuizCount || ''}
              onChange={(event) => updateDraftConfig('minCompletedQuizCount', event.target.value)}
              className={fieldClass}
              placeholder="3"
            />
          </div>
        </div>
      );
    }

    return (
      <div className={cn('rounded-[24px] border border-dashed px-4 py-3 text-sm', isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600')}>
        {draft.triggerType === 'AFTER_COMPLETION'
          ? t('feedbackManagement.formConfig.afterCompletionHelper', 'No extra configuration is needed. The system will create feedback after the target is completed.')
          : t('feedbackManagement.formConfig.manualHelper', 'No extra configuration is needed for manual feedback.')}
      </div>
    );
  };

  const renderQuestionConfigFields = (question, index) => {
    if (question.questionType === 'STAR_RATING') {
      return (
        <div className="space-y-4 md:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('feedbackManagement.question.minStarLabel', 'Minimum star')}</label>
              <Input
                type="number"
                min="1"
                max="5"
                value={question.configValues?.min || '1'}
                onChange={(event) => updateQuestionConfig(index, 'min', event.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('feedbackManagement.question.maxStarLabel', 'Maximum star')}</label>
              <Input
                type="number"
                min="1"
                max="5"
                value={question.configValues?.max || '5'}
                onChange={(event) => updateQuestionConfig(index, 'max', event.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
          <p className={cn('text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
            {t('feedbackManagement.question.starRangeHelper', 'The current backend supports a rating range between 1 and 5.')}
          </p>
        </div>
      );
    }

    if (question.questionType === 'SINGLE_CHOICE' || question.questionType === 'MULTIPLE_CHOICE') {
      return (
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="text-sm font-medium">{t('feedbackManagement.question.optionsLabel', 'Answer options')}</label>
              <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                {question.questionType === 'SINGLE_CHOICE'
                  ? t('feedbackManagement.question.singleChoiceHelper', 'Users can choose exactly one answer.')
                  : t('feedbackManagement.question.multipleChoiceHelper', 'Users can choose multiple answers.')}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addQuestionOption(index)}
              className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}
            >
              <Plus className="h-4 w-4" />
              <span>{t('feedbackManagement.question.addOption', 'Add option')}</span>
            </Button>
          </div>

          <div className="space-y-3">
            {(question.configValues?.options || []).map((option, optionIndex) => (
              <div key={`${question.questionId ?? 'new'}-option-${optionIndex}`} className="flex items-center gap-3">
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold',
                  isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-600',
                )}>
                  {optionIndex + 1}
                </div>
                <Input
                  value={option}
                  onChange={(event) => updateQuestionOption(index, optionIndex, event.target.value)}
                  className={fieldClass}
                  placeholder={t('feedbackManagement.question.optionPlaceholder', 'Option {{index}}', { index: optionIndex + 1 })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestionOption(index, optionIndex)}
                  className={isDarkMode ? 'text-rose-300 hover:bg-rose-950/40 hover:text-rose-200' : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={cn('rounded-2xl border border-dashed px-4 py-3 text-sm md:col-span-2', isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-white text-slate-600')}>
        {question.questionType === 'YES_NO'
          ? t('feedbackManagement.question.yesNoHelper', 'No extra configuration is needed for yes/no questions.')
          : t('feedbackManagement.question.textHelper', 'No extra configuration is needed for free-text questions.')}
      </div>
    );
  };

  return (
    <SuperAdminPage className={`${fontClass} ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      <SuperAdminPageHeader
        eyebrow="Platform"
        title={t('feedbackManagement.header.title', 'Feedback Management')}
        description={t('feedbackManagement.header.subtitle', 'Manage feedback forms and monitor response KPIs.')}
        actions={(
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={refreshPage}
              disabled={loading}
              className="h-10 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label={t('feedbackManagement.header.refresh', 'Refresh')}
              title={t('feedbackManagement.header.refresh', 'Refresh')}
            >
              <RefreshCw className={cn('h-4 w-4', loading ? 'animate-spin' : '')} />
            </Button>
            <Button type="button" className="h-10 rounded-2xl bg-[#0455BF] px-4 text-white hover:bg-[#03449a]" onClick={openCreateEditor}>
              <Plus className="h-4 w-4" />
              <span>{t('feedbackManagement.header.newForm', 'New form')}</span>
            </Button>
          </>
        )}
      />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title={t('feedbackManagement.metrics.totalRequests', 'Total requests')}
            value={overview?.totalRequests ?? 0}
            helper={t('feedbackManagement.metrics.totalRequestsHelper', 'All generated feedback requests')}
            icon={ClipboardList}
            isDarkMode={isDarkMode}
          />
          <MetricCard
            title={t('feedbackManagement.metrics.pendingRequests', 'Pending requests')}
            value={overview?.pendingRequests ?? 0}
            helper={t('feedbackManagement.metrics.pendingRequestsHelper', 'Waiting for user responses')}
            icon={Sparkles}
            isDarkMode={isDarkMode}
          />
          <MetricCard
            title={t('feedbackManagement.metrics.averageRating', 'Average rating')}
            value={formatRating(overview?.averageRating)}
            helper={t('feedbackManagement.metrics.averageRatingHelper', 'Across submitted feedback')}
            icon={BarChart3}
            isDarkMode={isDarkMode}
          />
          <MetricCard
            title={t('feedbackManagement.metrics.satisfactionRate', 'Satisfaction rate')}
            value={formatPercent(overview?.satisfactionRate)}
            helper={`${formatPercent(overview?.responseRate)} ${t('feedbackManagement.metrics.responseRateSuffix', 'response rate')}`}
            icon={MessageSquareText}
            isDarkMode={isDarkMode}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
          <section className={cn('rounded-[28px] border p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.18)]', isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white')}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{t('feedbackManagement.forms.sectionTitle', 'Feedback forms')}</h2>
                <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {t('feedbackManagement.forms.sectionSubtitle', 'Select a form to inspect or edit it.')}
                </p>
              </div>
              <Badge variant="secondary">{forms.length}</Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow className={isDarkMode ? 'border-slate-800' : ''}>
                  <TableHead>Code</TableHead>
                  <TableHead>{t('feedbackManagement.forms.tableTarget', 'Target')}</TableHead>
                  <TableHead>{t('feedbackManagement.forms.tableTrigger', 'Trigger')}</TableHead>
                  <TableHead>{t('feedbackManagement.forms.tableQuestions', 'Questions')}</TableHead>
                  <TableHead>{t('feedbackManagement.forms.tableStatus', 'Status')}</TableHead>
                  <TableHead className="text-right">{t('feedbackManagement.forms.tableActions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className={isDarkMode ? 'border-slate-800' : ''}>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-slate-500">
                      {t('feedbackManagement.forms.loading', 'Loading feedback forms...')}
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loading && forms.length === 0 ? (
                  <TableRow className={isDarkMode ? 'border-slate-800' : ''}>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-slate-500">
                      {t('feedbackManagement.forms.empty', 'No feedback forms found.')}
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loading && forms.map((form) => {
                  const isSelected = selectedForm?.formId === form.formId;
                  return (
                    <TableRow
                      key={form.formId}
                      className={cn(
                        'cursor-pointer',
                        isDarkMode ? 'border-slate-800' : '',
                        isSelected && (isDarkMode ? 'bg-slate-800/70' : 'bg-blue-50/70'),
                      )}
                      onClick={() => setSelectedFormId(form.formId)}
                    >
                      <TableCell className="font-medium">{form.code}</TableCell>
                      <TableCell>{getFeedbackTargetLabel(form.targetType, currentLang)}</TableCell>
                      <TableCell>{getFeedbackTriggerLabel(form.triggerType, currentLang)}</TableCell>
                      <TableCell>{form.questions?.length ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getFeedbackStatusBadgeClass(form.active, isDarkMode)}>
                          {getFeedbackStatusLabel(form.active, currentLang)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditEditor(form);
                          }}
                          className={isDarkMode ? 'hover:bg-slate-800' : ''}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>

          <section className={cn('rounded-[28px] border p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.18)]', isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white')}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{t('feedbackManagement.selected.title', 'Selected form')}</h2>
                  <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                    {t('feedbackManagement.selected.subtitle', 'Review the current structure before editing.')}
                  </p>
                </div>
                {selectedForm ? (
                  <Button type="button" variant="outline" onClick={() => openEditEditor(selectedForm)} className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}>
                    <Edit2 className="h-4 w-4" />
                    <span>{t('feedbackManagement.selected.edit', 'Edit')}</span>
                  </Button>
                ) : null}
              </div>

              {selectedForm ? (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{selectedForm.code}</Badge>
                    <Badge variant="outline">{getFeedbackTargetLabel(selectedForm.targetType, currentLang)}</Badge>
                    <Badge variant="outline">{getFeedbackTriggerLabel(selectedForm.triggerType, currentLang)}</Badge>
                    <Badge variant="outline" className={getFeedbackStatusBadgeClass(selectedForm.active, isDarkMode)}>
                      {getFeedbackStatusLabel(selectedForm.active, currentLang)}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{selectedForm.title}</h3>
                    <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                      {selectedForm.description || t('feedbackManagement.selected.noDescription', 'No description.')}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {(selectedForm.questions || []).map((question) => (
                      <div key={question.questionId} className={cn('rounded-2xl border px-4 py-3', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{question.displayOrder}. {question.questionText}</p>
                            <p className={cn('mt-1 text-xs uppercase tracking-[0.18em]', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                              {getFeedbackQuestionTypeLabel(question.questionType, currentLang)}
                            </p>
                          </div>
                          <Badge variant="outline" className={getFeedbackRequiredBadgeClass(question.required, isDarkMode)}>
                            {getFeedbackRequiredLabel(question.required, currentLang)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className={cn('mt-4 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {t('feedbackManagement.selected.empty', 'Select a form from the table to inspect it.')}
                </p>
              )}
          </section>
        </div>

        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className={cn('max-w-5xl', isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : '')}>
            <DialogHeader>
              <DialogTitle>
                {draft.formId
                  ? t('feedbackManagement.editor.editTitle', 'Edit feedback form')
                  : t('feedbackManagement.editor.createTitle', 'Create feedback form')}
              </DialogTitle>
              <DialogDescription className={isDarkMode ? 'text-slate-400' : ''}>
                {t('feedbackManagement.editor.description', 'Configure the form metadata, trigger logic, and question list.')}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Code</label>
                  <Input value={draft.code} onChange={(event) => updateDraft('code', event.target.value)} className={fieldClass} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('feedbackManagement.editor.titleLabel', 'Title')}</label>
                  <Input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} className={fieldClass} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('feedbackManagement.editor.targetTypeLabel', 'Target type')}</label>
                  <select value={draft.targetType} onChange={(event) => updateDraft('targetType', event.target.value)} className={cn('h-10 w-full rounded-md border px-3 text-sm outline-none', fieldClass)}>
                    {TARGET_OPTIONS.map((option) => (
                      <option key={option} value={option}>{getFeedbackTargetLabel(option, currentLang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('feedbackManagement.editor.triggerTypeLabel', 'Trigger type')}</label>
                  <select value={draft.triggerType} onChange={(event) => updateDraft('triggerType', event.target.value)} className={cn('h-10 w-full rounded-md border px-3 text-sm outline-none', fieldClass)}>
                    {TRIGGER_OPTIONS.map((option) => (
                      <option key={option} value={option}>{getFeedbackTriggerLabel(option, currentLang)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('feedbackManagement.editor.descriptionLabel', 'Description')}</label>
                  <textarea value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} className={cn('min-h-[90px] w-full rounded-2xl border px-4 py-3 text-sm outline-none', fieldClass)} />
                </div>
                {renderFormConfigFields()}
                <div className="flex items-center gap-3">
                  <Switch checked={draft.active} onCheckedChange={(checked) => updateDraft('active', checked)} />
                  <span className="text-sm font-medium">{t('feedbackManagement.editor.activeLabel', 'Form is active')}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{t('feedbackManagement.editor.questionsTitle', 'Questions')}</h3>
                  <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                    {t('feedbackManagement.editor.questionsSubtitle', 'Arrange the form questions in the order you want them displayed.')}
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addQuestion} className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}>
                  <Plus className="h-4 w-4" />
                  <span>{t('feedbackManagement.editor.addQuestion', 'Add question')}</span>
                </Button>
              </div>

              <div className="mt-4 flex flex-col gap-4">
                {draft.questions.map((question, index) => (
                  <div key={`${question.questionId ?? 'new'}-${index}`} className={cn('rounded-[24px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{t('feedbackManagement.editor.questionLabel', 'Question')} {index + 1}</p>
                        <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                          {t('feedbackManagement.editor.questionHelper', 'Fine-tune type, order, and validation.')}
                        </p>
                      </div>
                      {draft.questions.length > 1 ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(index)} className={isDarkMode ? 'text-rose-300 hover:bg-rose-950/40 hover:text-rose-200' : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">{t('feedbackManagement.editor.questionTextLabel', 'Question text')}</label>
                        <Input value={question.questionText} onChange={(event) => updateQuestion(index, { questionText: event.target.value })} className={fieldClass} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('feedbackManagement.editor.questionTypeLabel', 'Question type')}</label>
                        <select value={question.questionType} onChange={(event) => updateQuestionType(index, event.target.value)} className={cn('h-10 w-full rounded-md border px-3 text-sm outline-none', fieldClass)}>
                          {QUESTION_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>{getFeedbackQuestionTypeLabel(option, currentLang)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t('feedbackManagement.editor.displayOrderLabel', 'Display order')}</label>
                        <Input type="number" min="1" value={question.displayOrder} onChange={(event) => updateQuestion(index, { displayOrder: event.target.value })} className={fieldClass} />
                      </div>
                      {renderQuestionConfigFields(question, index)}
                      <div className="flex items-center gap-3 md:col-span-2">
                        <Checkbox checked={Boolean(question.required)} onCheckedChange={(checked) => updateQuestion(index, { required: checked === true })} />
                        <span className="text-sm font-medium">{t('feedbackManagement.editor.requiredLabel', 'Required question')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)} disabled={saving} className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}>
                <X className="h-4 w-4" />
                <span>{t('feedbackManagement.editor.cancel', 'Cancel')}</span>
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{saving ? t('feedbackManagement.editor.saving', 'Saving...') : t('feedbackManagement.editor.save', 'Save form')}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </SuperAdminPage>
  );
}

export default FeedbackManagement;
