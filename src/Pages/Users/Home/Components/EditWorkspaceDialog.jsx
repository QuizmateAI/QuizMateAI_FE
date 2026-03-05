import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Loader2 } from 'lucide-react';

// Dialog chỉnh sửa workspace - sửa tên và mô tả (title không bắt buộc)
function EditWorkspaceDialog({ open, onOpenChange, workspace, onEdit, isDarkMode }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Điền dữ liệu workspace vào form khi mở dialog
  useEffect(() => {
    if (open && workspace) {
      setTitle(workspace.title || '');
      setDescription(workspace.description || '');
      setErrors({});
      setSubmitting(false);
    }
  }, [open, workspace]);

  // Kiểm tra dữ liệu hợp lệ - title không bắt buộc
  const validate = () => {
    setErrors({});
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onEdit(workspace.workspaceId, {
        title: title.trim() || null,
        description: description.trim() || null,
      });
      onOpenChange(false);
    } catch {
      // Lỗi được xử lý ở component cha
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase = `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all ${
    isDarkMode
      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500'
      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 placeholder:text-gray-400'
  }`;



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[480px] ${fontClass} ${
          isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        <DialogHeader>
          <DialogTitle className={isDarkMode ? 'text-white' : 'text-gray-900'}>
            {t('home.workspace.editTitle')}
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>
            {t('home.workspace.editDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Tên workspace (không bắt buộc) */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              {t('home.workspace.titleLabel')} <span className={`text-xs font-normal ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>({t('common.optional')})</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('home.workspace.titlePlaceholder')}
              className={inputBase}
              autoFocus
              maxLength={255}
            />
          </div>

          {/* Mô tả (không bắt buộc) */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              {t('home.workspace.descriptionLabel')} <span className={`text-xs font-normal ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>({t('common.optional')})</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('home.workspace.descriptionPlaceholder')}
              rows={2}
              className={`${inputBase} resize-none`}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={`rounded-full ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              {t('home.workspace.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('home.workspace.saving')}
                </>
              ) : (
                t('home.workspace.save')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditWorkspaceDialog;
