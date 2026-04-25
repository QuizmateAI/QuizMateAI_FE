import { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createFeedbackTicket } from '@/api/FeedbackAPI';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/context/ToastContext';
import { getFeedbackChannelLabel } from '@/lib/feedback';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/getErrorMessage';

function createInitialForm(channelType) {
  return {
    channelType: channelType ?? 'PRODUCT',
    title: '',
    description: '',
  };
}

function FeedbackTicketDialog({
  open,
  onOpenChange,
  defaultChannelType = 'PRODUCT',
  isDarkMode = false,
  onSubmitted,
}) {
  const { i18n, t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const currentLang = i18n.language;
  const isEnglish = currentLang.startsWith('en');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => createInitialForm(defaultChannelType));

  useEffect(() => {
    if (open) {
      setForm(createInitialForm(defaultChannelType));
    }
  }, [defaultChannelType, open]);

  const fieldClass = isDarkMode
    ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500'
    : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400';

  const descriptionPlaceholder = form.channelType === 'SYSTEM'
    ? t('feedbackTicket.placeholders.systemDescription', 'Describe the incident, where it happened, and what is currently blocked.')
    : t('feedbackTicket.placeholders.productDescription', 'Describe the bug, support need, or product issue you want the team to handle.');

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      showError(t('feedbackTicket.errors.titleAndContentRequired', 'Please enter both title and content.'));
      return;
    }

    setSaving(true);
    try {
      const response = await createFeedbackTicket({
        channelType: form.channelType,
        title: form.title.trim(),
        description: form.description.trim(),
      });
      showSuccess(t('feedbackTicket.successSent', 'Feedback ticket sent.'));
      onOpenChange(false);
      onSubmitted?.(response?.data ?? response);
    } catch (error) {
      showError(getErrorMessage(t, error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-2xl', isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : '')}>
        <DialogHeader>
          <DialogTitle>{t('feedbackTicket.dialogTitle', 'Send feedback ticket')}</DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : ''}>
            {t('feedbackTicket.dialogDescription', 'Send product or system feedback and track the handling status from the feedback center.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className={cn('rounded-2xl border px-4 py-3', isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50')}>
            <div className="flex items-center gap-3">
              <span className={cn('text-sm font-medium', isDarkMode ? 'text-slate-300' : 'text-slate-700')}>
                {t('feedbackTicket.category', 'Category')}
              </span>
              <Badge variant="outline">{getFeedbackChannelLabel(form.channelType, currentLang)}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('feedbackTicket.title', 'Title')}</label>
            <Input
              value={form.title}
              onChange={(event) => setForm((currentForm) => ({ ...currentForm, title: event.target.value }))}
              className={fieldClass}
              placeholder={t('feedbackTicket.placeholders.titleShort', 'Short summary of the issue')}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('feedbackTicket.details', 'Details')}</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((currentForm) => ({ ...currentForm, description: event.target.value }))}
              className={cn('min-h-[180px] w-full rounded-2xl border px-4 py-3 text-sm outline-none', fieldClass)}
              placeholder={descriptionPlaceholder}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span>{saving ? (isEnglish ? 'Sending...' : 'Đang gửi...') : (isEnglish ? 'Send ticket' : 'Gửi ticket')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FeedbackTicketDialog;
