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

// Dialog tạo nhóm mới với topic/subject selector
function CreateGroupDialog({ open, onOpenChange, topics, topicsLoading, onFetchTopics, onCreate, isDarkMode }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [groupName, setGroupName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form khi đóng dialog
  useEffect(() => {
    if (!open) {
      setGroupName('');
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  // Kiểm tra dữ liệu hợp lệ
  const validate = () => {
    const newErrors = {};
    if (!groupName.trim()) newErrors.groupName = t('home.group.nameRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onCreate({
        groupName: groupName.trim(),
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

  const selectBase = `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all appearance-none cursor-pointer ${
    isDarkMode
      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
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
            {t('home.group.createTitle')}
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>
            {t('home.group.createDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Tên nhóm */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              {t('home.group.groupName')}
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t('home.group.groupNamePlaceholder')}
              className={`${inputBase} ${errors.groupName ? 'border-red-500' : ''}`}
              autoFocus
            />
            {errors.groupName && <p className="text-red-500 text-xs mt-1">{errors.groupName}</p>}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={`rounded-lg ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}`}
            >
              {t('home.group.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t('home.group.creating')}
                </>
              ) : (
                t('home.group.create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateGroupDialog;
