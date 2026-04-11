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
      showError(isEnglish ? 'Please enter the number of days before sending feedback.' : 'Vui lòng nhập số ngày trước khi gửi phản hồi.');
      return;
    }

    if (draft.triggerType === 'AFTER_N_COMPLETIONS' && Number(draft.configValues?.minCompletedQuizCount) <= 0) {
      showError(isEnglish ? 'Please enter the minimum completed quiz count.' : 'Vui lòng nhập số bài quiz hoàn thành tối thiểu.');
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
      showError(isEnglish
        ? 'Choice questions must have at least 2 options.'
        : 'Câu hỏi lựa chọn phải có ít nhất 2 đáp án.');
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
        showSuccess(isEnglish ? 'Feedback form updated.' : 'Đã cập nhật form phản hồi.');
      } else {
        await createManagementFeedbackForm(payload);
        showSuccess(isEnglish ? 'Feedback form created.' : 'Đã tạo form phản hồi.');
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
            <h3 className="text-sm font-semibold">{isEnglish ? 'Schedule configuration' : 'Cấu hình lịch gửi'}</h3>
            <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
              {isEnglish
                ? 'Enter the schedule normally. The system will store the correct JSON automatically.'
                : 'Nhập lịch gửi theo cách thông thường. Hệ thống sẽ tự lưu JSON đúng định dạng.'}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{isEnglish ? 'Send after (days)' : 'Gửi sau (ngày)'}</label>
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
              <label className="text-sm font-medium">{isEnglish ? 'Repeat every (days)' : 'Lặp lại mỗi (ngày)'}</label>
              <Input
                type="number"
                min="1"
                value={draft.configValues?.recurrenceDays || ''}
                onChange={(event) => updateDraftConfig('recurrenceDays', event.target.value)}
                className={fieldClass}
                placeholder="90"
              />
              <p className={cn('text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                {isEnglish ? 'Leave empty if this should only happen once.' : 'Để trống nếu chỉ muốn gửi một lần.'}
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
            <h3 className="text-sm font-semibold">{isEnglish ? 'Milestone configuration' : 'Cấu hình mốc kích hoạt'}</h3>
            <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
              {isEnglish
                ? 'The current backend uses this trigger for completed quiz count milestones.'
                : 'Backend hiện tại dùng trigger này cho mốc số bài quiz đã hoàn thành.'}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{isEnglish ? 'Minimum completed quizzes' : 'Số bài quiz hoàn thành tối thiểu'}</label>
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
          ? (isEnglish
              ? 'No extra configuration is needed. The system will create feedback after the target is completed.'
              : 'Không cần cấu hình thêm. Hệ thống sẽ tạo phản hồi sau khi đối tượng được hoàn thành.')
          : (isEnglish
              ? 'No extra configuration is needed for manual feedback.'
              : 'Không cần cấu hình thêm cho phản hồi thủ công.')}
      </div>
    );
  };

  const renderQuestionConfigFields = (question, index) => {
    if (question.questionType === 'STAR_RATING') {
      return (
        <div className="space-y-4 md:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{isEnglish ? 'Minimum star' : 'Số sao thấp nhất'}</label>
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
              <label className="text-sm font-medium">{isEnglish ? 'Maximum star' : 'Số sao cao nhất'}</label>
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
            {isEnglish ? 'The current backend supports a rating range between 1 and 5.' : 'Backend hiện tại hỗ trợ thang điểm từ 1 đến 5 sao.'}
          </p>
        </div>
      );
    }

    if (question.questionType === 'SINGLE_CHOICE' || question.questionType === 'MULTIPLE_CHOICE') {
      return (
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="text-sm font-medium">{isEnglish ? 'Answer options' : 'Danh sách đáp án'}</label>
              <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                {question.questionType === 'SINGLE_CHOICE'
                  ? (isEnglish ? 'Users can choose exactly one answer.' : 'Người dùng chỉ được chọn đúng một đáp án.')
                  : (isEnglish ? 'Users can choose multiple answers.' : 'Người dùng có thể chọn nhiều đáp án.')}
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
              <span>{isEnglish ? 'Add option' : 'Thêm đáp án'}</span>
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
                  placeholder={isEnglish ? `Option ${optionIndex + 1}` : `Đáp án ${optionIndex + 1}`}
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
          ? (isEnglish ? 'No extra configuration is needed for yes/no questions.' : 'Không cần cấu hình thêm cho câu hỏi có/không.')
          : (isEnglish ? 'No extra configuration is needed for free-text questions.' : 'Không cần cấu hình thêm cho câu hỏi nhập văn bản tự do.')}
      </div>
    );
  };

  return (
    <div className={`min-h-screen p-6 ${fontClass} ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className={cn('rounded-[30px] border p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.2)]', isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white')}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-2xl p-3', isDarkMode ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-700')}>
                <MessageSquareText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {isEnglish ? 'Feedback Management' : 'Quản lý phản hồi'}
                </h1>
                <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {isEnglish
                    ? 'Manage feedback forms and monitor response KPIs.'
                    : 'Quản lý form phản hồi và theo dõi các KPI phản hồi.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={refreshPage}
                disabled={loading}
                className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}
                aria-label={isEnglish ? 'Refresh' : 'Làm mới'}
                title={isEnglish ? 'Refresh' : 'Làm mới'}
              >
                <RefreshCw className={cn('h-4 w-4', loading ? 'animate-spin' : '')} />
              </Button>
              <Button type="button" onClick={openCreateEditor}>
                <Plus className="h-4 w-4" />
                <span>{isEnglish ? 'New form' : 'Tạo form mới'}</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title={isEnglish ? 'Total requests' : 'Tổng yêu cầu'}
            value={overview?.totalRequests ?? 0}
            helper={isEnglish ? 'All generated feedback requests' : 'Tất cả yêu cầu phản hồi đã được tạo'}
            icon={ClipboardList}
            isDarkMode={isDarkMode}
          />
          <MetricCard
            title={isEnglish ? 'Pending requests' : 'Yêu cầu đang chờ'}
            value={overview?.pendingRequests ?? 0}
            helper={isEnglish ? 'Waiting for user responses' : 'Đang chờ người dùng phản hồi'}
            icon={Sparkles}
            isDarkMode={isDarkMode}
          />
          <MetricCard
            title={isEnglish ? 'Average rating' : 'Điểm trung bình'}
            value={formatRating(overview?.averageRating)}
            helper={isEnglish ? 'Across submitted feedback' : 'Tính trên các phản hồi đã gửi'}
            icon={BarChart3}
            isDarkMode={isDarkMode}
          />
          <MetricCard
            title={isEnglish ? 'Satisfaction rate' : 'Tỷ lệ hài lòng'}
            value={formatPercent(overview?.satisfactionRate)}
            helper={`${formatPercent(overview?.responseRate)} ${isEnglish ? 'response rate' : 'tỷ lệ phản hồi'}`}
            icon={MessageSquareText}
            isDarkMode={isDarkMode}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
          <section className={cn('rounded-[28px] border p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.18)]', isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white')}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{isEnglish ? 'Feedback forms' : 'Danh sách form phản hồi'}</h2>
                <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                  {isEnglish ? 'Select a form to inspect or edit it.' : 'Chọn một form để xem chi tiết hoặc chỉnh sửa.'}
                </p>
              </div>
              <Badge variant="secondary">{forms.length}</Badge>
            </div>

            <Table>
              <TableHeader>
                <TableRow className={isDarkMode ? 'border-slate-800' : ''}>
                  <TableHead>Code</TableHead>
                  <TableHead>{isEnglish ? 'Target' : 'Đối tượng'}</TableHead>
                  <TableHead>{isEnglish ? 'Trigger' : 'Kích hoạt'}</TableHead>
                  <TableHead>{isEnglish ? 'Questions' : 'Câu hỏi'}</TableHead>
                  <TableHead>{isEnglish ? 'Status' : 'Trạng thái'}</TableHead>
                  <TableHead className="text-right">{isEnglish ? 'Actions' : 'Thao tác'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className={isDarkMode ? 'border-slate-800' : ''}>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-slate-500">
                      {isEnglish ? 'Loading feedback forms...' : 'Đang tải form phản hồi...'}
                    </TableCell>
                  </TableRow>
                ) : null}

                {!loading && forms.length === 0 ? (
                  <TableRow className={isDarkMode ? 'border-slate-800' : ''}>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-slate-500">
                      {isEnglish ? 'No feedback forms found.' : 'Chưa có form phản hồi nào.'}
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
                  <h2 className="text-lg font-semibold">{isEnglish ? 'Selected form' : 'Form đang chọn'}</h2>
                  <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                    {isEnglish ? 'Review the current structure before editing.' : 'Xem nhanh cấu trúc hiện tại trước khi chỉnh sửa.'}
                  </p>
                </div>
                {selectedForm ? (
                  <Button type="button" variant="outline" onClick={() => openEditEditor(selectedForm)} className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}>
                    <Edit2 className="h-4 w-4" />
                    <span>{isEnglish ? 'Edit' : 'Sửa'}</span>
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
                      {selectedForm.description || (isEnglish ? 'No description.' : 'Chưa có mô tả.')}
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
                  {isEnglish ? 'Select a form from the table to inspect it.' : 'Chọn một form ở bảng bên trái để xem chi tiết.'}
                </p>
              )}
          </section>
        </div>

        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className={cn('max-w-5xl', isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : '')}>
            <DialogHeader>
              <DialogTitle>
                {draft.formId
                  ? (isEnglish ? 'Edit feedback form' : 'Chỉnh sửa form phản hồi')
                  : (isEnglish ? 'Create feedback form' : 'Tạo form phản hồi')}
              </DialogTitle>
              <DialogDescription className={isDarkMode ? 'text-slate-400' : ''}>
                {isEnglish
                  ? 'Configure the form metadata, trigger logic, and question list.'
                  : 'Cấu hình thông tin form, điều kiện kích hoạt và danh sách câu hỏi.'}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Code</label>
                  <Input value={draft.code} onChange={(event) => updateDraft('code', event.target.value)} className={fieldClass} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEnglish ? 'Title' : 'Tiêu đề'}</label>
                  <Input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} className={fieldClass} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEnglish ? 'Target type' : 'Loại đối tượng'}</label>
                  <select value={draft.targetType} onChange={(event) => updateDraft('targetType', event.target.value)} className={cn('h-10 w-full rounded-md border px-3 text-sm outline-none', fieldClass)}>
                    {TARGET_OPTIONS.map((option) => (
                      <option key={option} value={option}>{getFeedbackTargetLabel(option, currentLang)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEnglish ? 'Trigger type' : 'Loại kích hoạt'}</label>
                  <select value={draft.triggerType} onChange={(event) => updateDraft('triggerType', event.target.value)} className={cn('h-10 w-full rounded-md border px-3 text-sm outline-none', fieldClass)}>
                    {TRIGGER_OPTIONS.map((option) => (
                      <option key={option} value={option}>{getFeedbackTriggerLabel(option, currentLang)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEnglish ? 'Description' : 'Mô tả'}</label>
                  <textarea value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} className={cn('min-h-[90px] w-full rounded-2xl border px-4 py-3 text-sm outline-none', fieldClass)} />
                </div>
                {renderFormConfigFields()}
                <div className="flex items-center gap-3">
                  <Switch checked={draft.active} onCheckedChange={(checked) => updateDraft('active', checked)} />
                  <span className="text-sm font-medium">{isEnglish ? 'Form is active' : 'Bật form này'}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{isEnglish ? 'Questions' : 'Danh sách câu hỏi'}</h3>
                  <p className={cn('mt-1 text-sm', isDarkMode ? 'text-slate-400' : 'text-slate-600')}>
                    {isEnglish ? 'Arrange the form questions in the order you want them displayed.' : 'Sắp xếp bộ câu hỏi theo đúng thứ tự muốn hiển thị.'}
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addQuestion} className={isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : ''}>
                  <Plus className="h-4 w-4" />
                  <span>{isEnglish ? 'Add question' : 'Thêm câu hỏi'}</span>
                </Button>
              </div>

              <div className="mt-4 flex flex-col gap-4">
                {draft.questions.map((question, index) => (
                  <div key={`${question.questionId ?? 'new'}-${index}`} className={cn('rounded-[24px] border p-4', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{isEnglish ? 'Question' : 'Câu hỏi'} {index + 1}</p>
                        <p className={cn('mt-1 text-xs', isDarkMode ? 'text-slate-500' : 'text-slate-500')}>
                          {isEnglish ? 'Fine-tune type, order, and validation.' : 'Điều chỉnh kiểu câu hỏi, thứ tự hiển thị và quy tắc bắt buộc.'}
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
                        <label className="text-sm font-medium">{isEnglish ? 'Question text' : 'Nội dung câu hỏi'}</label>
                        <Input value={question.questionText} onChange={(event) => updateQuestion(index, { questionText: event.target.value })} className={fieldClass} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isEnglish ? 'Question type' : 'Loại câu hỏi'}</label>
                        <select value={question.questionType} onChange={(event) => updateQuestionType(index, event.target.value)} className={cn('h-10 w-full rounded-md border px-3 text-sm outline-none', fieldClass)}>
                          {QUESTION_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>{getFeedbackQuestionTypeLabel(option, currentLang)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{isEnglish ? 'Display order' : 'Thứ tự hiển thị'}</label>
                        <Input type="number" min="1" value={question.displayOrder} onChange={(event) => updateQuestion(index, { displayOrder: event.target.value })} className={fieldClass} />
                      </div>
                      {renderQuestionConfigFields(question, index)}
                      <div className="flex items-center gap-3 md:col-span-2">
                        <Checkbox checked={Boolean(question.required)} onCheckedChange={(checked) => updateQuestion(index, { required: checked === true })} />
                        <span className="text-sm font-medium">{isEnglish ? 'Required question' : 'Câu hỏi bắt buộc'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)} disabled={saving} className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}>
                <X className="h-4 w-4" />
                <span>{isEnglish ? 'Cancel' : 'Hủy'}</span>
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{saving ? (isEnglish ? 'Saving...' : 'Đang lưu...') : (isEnglish ? 'Save form' : 'Lưu form')}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default FeedbackManagement;
