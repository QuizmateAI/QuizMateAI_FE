import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Loader2, ChevronDown, Briefcase, Users } from 'lucide-react';

// Dialog hợp nhất tạo workspace cá nhân / group workspace — có tab chuyển đổi
function CreateNewDialog({
  open,
  onOpenChange,
  topics,
  topicsLoading,
  onCreateWorkspace,
  onCreateGroup,
  isDarkMode,
  initialMode = 'workspace',
}) {
  const { t, i18n } = useTranslation();
  const { showError } = useToast();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  // Chế độ: 'workspace' | 'group'
  const [mode, setMode] = useState(initialMode);

  // Shared fields
  const [topicId, setTopicId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  // Workspace fields
  const [wsTitle, setWsTitle] = useState('');
  const [wsDescription, setWsDescription] = useState('');

  // Group fields
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Lấy danh sách subjects từ topic đã chọn
  const selectedTopic = topics.find((tp) => tp.topicId === Number(topicId));
  const subjects = selectedTopic?.subjects || [];

  // Đồng bộ initialMode khi prop thay đổi (khi mở từ nút khác nhau)
  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  // Reset toàn bộ form khi đóng dialog
  useEffect(() => {
    if (!open) {
      setWsTitle('');
      setWsDescription('');
      setGroupName('');
      setDescription('');
      setTopicId('');
      setSubjectId('');
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  // Reset subject khi đổi topic
  useEffect(() => {
    setSubjectId('');
  }, [topicId]);

  // Reset lỗi khi đổi mode
  useEffect(() => {
    setErrors({});
  }, [mode]);

  // Kiểm tra dữ liệu hợp lệ theo mode
  const validate = () => {
    const newErrors = {};

    if (mode === 'workspace') {
      // Title không bắt buộc - có thể tạo workspace không có tiêu đề
    } else {
      if (!groupName.trim()) newErrors.groupName = t('home.group.nameRequired');
      if (!topicId) newErrors.topicId = t('home.group.topicRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (mode === 'workspace') {
        await onCreateWorkspace({
          name: wsTitle.trim() || '',
          description: wsDescription.trim() || '',
        });
      } else {
        await onCreateGroup({
          topicId: Number(topicId),
          ...(subjectId ? { subjectId: Number(subjectId) } : {}),
          groupName: groupName.trim(),
          description: description.trim(),
        });
      }
      onOpenChange(false);
    } catch (err) {
      showError(err?.message || t('home.workspace.createError') || 'Không thể tạo workspace');
    } finally {
      setSubmitting(false);
    }
  };

  // Tiêu đề và mô tả động theo mode
  const dialogTitle = mode === 'workspace'
    ? t('home.workspace.createTitle')
    : t('home.group.createTitle');

  const dialogDesc = mode === 'workspace'
    ? t('home.workspace.createDesc')
    : t('home.group.createDesc');

  const submitLabel = mode === 'workspace'
    ? t('home.workspace.create')
    : t('home.group.create');

  const submittingLabel = mode === 'workspace'
    ? t('home.workspace.creating')
    : t('home.group.creating');

  const cancelLabel = mode === 'workspace'
    ? t('home.workspace.cancel')
    : t('home.group.cancel');

  // Style chung
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

  // Label chung cho tab
  const topicNs = mode === 'workspace' ? 'home.workspace' : 'home.group';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[500px] ${fontClass} ${
          isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Tab chuyển đổi workspace / group */}
        <div className={`flex items-center gap-1 rounded-full p-1 border mb-1 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'
        }`}>
          <button
            type="button"
            onClick={() => setMode('workspace')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              mode === 'workspace'
                ? isDarkMode
                  ? 'bg-slate-800 text-blue-300 shadow-sm'
                  : 'bg-white text-blue-700 shadow-sm'
                : isDarkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            {t('home.create.personalTab')}
          </button>
          <button
            type="button"
            onClick={() => setMode('group')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
              mode === 'group'
                ? isDarkMode
                  ? 'bg-slate-800 text-blue-300 shadow-sm'
                  : 'bg-white text-blue-700 shadow-sm'
                : isDarkMode
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            {t('home.create.groupTab')}
          </button>
        </div>

        <DialogHeader>
          <DialogTitle className={isDarkMode ? 'text-white' : 'text-gray-900'}>
            {dialogTitle}
          </DialogTitle>
          <DialogDescription className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>
            {dialogDesc}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Form workspace: Tên workspace (không bắt buộc) + Mô tả */}
          {mode === 'workspace' && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  {t('home.workspace.titleLabel')} <span className={`text-xs font-normal ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>({t('common.optional')})</span>
                </label>
                <input
                  type="text"
                  value={wsTitle}
                  onChange={(e) => setWsTitle(e.target.value)}
                  placeholder={t('home.workspace.titlePlaceholder')}
                  className={inputBase}
                  autoFocus
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  {t('home.workspace.descriptionLabel')} <span className={`text-xs font-normal ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>({t('common.optional')})</span>
                </label>
                <textarea
                  value={wsDescription}
                  onChange={(e) => setWsDescription(e.target.value)}
                  placeholder={t('home.workspace.descriptionPlaceholder')}
                  rows={2}
                  className={`${inputBase} resize-none`}
                />
              </div>
            </>
          )}

          {/* Form group: Tên nhóm + Mô tả */}
          {mode === 'group' && (
            <>
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

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  {t('home.group.description')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('home.group.descriptionPlaceholder')}
                  rows={2}
                  className={`${inputBase} resize-none`}
                />
              </div>
            </>
          )}

          {/* Chọn Topic (chỉ cho group) */}
          {mode === 'group' && (<div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              {t(`${topicNs}.topicLabel`)}
            </label>
            <div className="relative">
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className={`${selectBase} ${errors.topicId ? 'border-red-500' : ''}`}
                disabled={topicsLoading}
              >
                <option value="">{topicsLoading ? '...' : t(`${topicNs}.topicPlaceholder`)}</option>
                {topics.map((topic) => (
                  <option key={topic.topicId} value={topic.topicId}>
                    {topic.title}
                  </option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
            </div>
            {errors.topicId && <p className="text-red-500 text-xs mt-1">{errors.topicId}</p>}
          </div>)}

          {/* Chọn Subject (chỉ cho group, không bắt buộc) */}
          {mode === 'group' && (<div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              {t(`${topicNs}.subjectLabel`)} <span className={`text-xs font-normal ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>({t('common.optional')})</span>
            </label>
            <div className="relative">
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className={`${selectBase} ${errors.subjectId ? 'border-red-500' : ''} ${!topicId ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!topicId || topicsLoading}
              >
                <option value="">
                  {!topicId ? t(`${topicNs}.selectTopicFirst`) : t(`${topicNs}.subjectPlaceholder`)}
                </option>
                {subjects.map((sub) => (
                  <option key={sub.subjectId} value={sub.subjectId}>
                    {sub.title}
                  </option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} />
            </div>
            {errors.subjectId && <p className="text-red-500 text-xs mt-1">{errors.subjectId}</p>}
          </div>)}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={`rounded-full ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {submittingLabel}
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateNewDialog;
