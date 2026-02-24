import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Pencil,
  Loader2,
  Trash2,
  AlertTriangle,
  Info,
  Check,
} from 'lucide-react';
import api from '@/api/api';

// Tab Cài đặt: Đổi tên nhóm, mô tả, xóa nhóm (chỉ leader)
function GroupSettingsTab({ isDarkMode, group, isLeader, onGroupUpdated }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(group?.groupName || '');
  const [description, setDescription] = useState(group?.description || '');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  // Khởi tạo lại khi group thay đổi
  React.useEffect(() => {
    if (group) {
      setGroupName(group.groupName || '');
      setDescription(group.description || '');
    }
  }, [group]);

  // Lưu thay đổi tên/mô tả
  const handleSave = useCallback(async () => {
    if (!groupName.trim()) {
      setErrorMsg(t('home.group.nameRequired'));
      return;
    }
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      // Gọi API cập nhật nhóm (giả định endpoint PUT /group/{id})
      await api.put(`/group/${group.groupId}`, {
        groupName: groupName.trim(),
        description: description.trim(),
      });
      setIsEditing(false);
      setSuccessMsg(t('groupManage.settings.saveSuccess'));
      if (onGroupUpdated) await onGroupUpdated();
      // Ẩn message sau 3s
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(t('groupManage.settings.saveError'));
      console.error('Lỗi cập nhật nhóm:', err);
    } finally {
      setSaving(false);
    }
  }, [groupName, description, group, onGroupUpdated, t]);

  // Xóa nhóm
  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await api.delete(`/group/${group.groupId}`);
      // Redirect ra trang home sau khi xóa
      window.location.href = '/home';
    } catch (err) {
      setErrorMsg(t('groupManage.settings.deleteError'));
      console.error('Lỗi xóa nhóm:', err);
      setDeleting(false);
    }
  }, [group, t]);

  const handleCancel = () => {
    setGroupName(group?.groupName || '');
    setDescription(group?.description || '');
    setIsEditing(false);
    setErrorMsg('');
  };

  const cardClass = `rounded-2xl border transition-colors duration-300 ${
    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
  }`;

  const inputClass = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
    isDarkMode
      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500 placeholder:text-slate-500'
      : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500 placeholder:text-gray-400'
  }`;

  return (
    <div className={`space-y-6 animate-in fade-in duration-300 max-w-2xl mx-auto ${fontClass}`}>
      {/* Thông báo thành công */}
      {successMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${
          isDarkMode ? 'bg-green-950/30 border-green-800/50 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          <Check className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      {/* Thông báo lỗi */}
      {errorMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${
          isDarkMode ? 'bg-red-950/30 border-red-800/50 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <AlertTriangle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      {/* Thông tin nhóm */}
      <div className={`${cardClass} p-6`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Info className={`w-5 h-5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('groupManage.settings.groupInfo')}
            </h3>
          </div>
          {isLeader && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all active:scale-95 ${
                isDarkMode ? 'text-blue-400 hover:bg-blue-950/30' : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t('groupManage.settings.edit')}
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Tên nhóm */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              {t('home.group.groupName')}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className={inputClass}
                placeholder={t('home.group.groupNamePlaceholder')}
              />
            ) : (
              <p className={`text-sm py-3 px-4 rounded-xl ${
                isDarkMode ? 'bg-slate-800/50 text-slate-200' : 'bg-gray-50 text-gray-800'
              }`}>
                {group?.groupName || '—'}
              </p>
            )}
          </div>

          {/* Mô tả */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              {t('home.group.description')}
            </label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder={t('home.group.descriptionPlaceholder')}
              />
            ) : (
              <p className={`text-sm py-3 px-4 rounded-xl min-h-[60px] ${
                isDarkMode ? 'bg-slate-800/50 text-slate-200' : 'bg-gray-50 text-gray-800'
              }`}>
                {group?.description || t('groupManage.dashboard.noDescription')}
              </p>
            )}
          </div>

          {/* Thông tin chỉ đọc: Topic, Subject */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('groupManage.dashboard.topic')}
              </label>
              <p className={`text-sm py-3 px-4 rounded-xl ${
                isDarkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-gray-50 text-gray-500'
              }`}>
                {group?.topicName || '—'}
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('groupManage.settings.subject')}
              </label>
              <p className={`text-sm py-3 px-4 rounded-xl ${
                isDarkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-gray-50 text-gray-500'
              }`}>
                {group?.subjectName || '—'}
              </p>
            </div>
          </div>

          {/* Nút lưu / hủy */}
          {isEditing && (
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCancel}
                className={`px-5 py-2.5 text-sm rounded-xl border transition-all active:scale-95 ${
                  isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('home.group.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('groupManage.settings.save')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Vùng nguy hiểm - Xóa nhóm (chỉ leader) */}
      {isLeader && (
        <div className={`rounded-2xl border-2 transition-colors duration-300 ${
          isDarkMode ? 'border-red-900/50 bg-red-950/10' : 'border-red-100 bg-red-50/30'
        } p-6`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-5 h-5 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
              {t('groupManage.settings.dangerZone')}
            </h3>
          </div>
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {t('groupManage.settings.deleteWarning')}
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border-2 font-medium transition-all active:scale-95 ${
                isDarkMode
                  ? 'border-red-800 text-red-400 hover:bg-red-950/30'
                  : 'border-red-200 text-red-600 hover:bg-red-50'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              {t('groupManage.settings.deleteGroup')}
            </button>
          ) : (
            <div className={`flex flex-col gap-4 p-4 rounded-xl border ${
              isDarkMode ? 'bg-red-950/20 border-red-900/50' : 'bg-red-50 border-red-200'
            }`}>
              <div className="space-y-2">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                  {t('groupManage.settings.deleteConfirm')}
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  {i18n.language === 'en' 
                    ? <>To confirm, please type <span className="font-bold select-all">delete {group.groupName}</span> below:</>
                    : <>Để xác nhận, vui lòng nhập <span className="font-bold select-all">delete {group.groupName}</span> vào ô bên dưới:</>}
                </p>
                <input
                  type="text"
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all ${
                    isDarkMode
                      ? 'bg-slate-900 border-red-800/50 text-white focus:border-red-500 placeholder:text-slate-500'
                      : 'bg-white border-red-200 text-gray-900 focus:border-red-500 placeholder:text-gray-400'
                  }`}
                  placeholder={`delete ${group.groupName}`}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmationInput('');
                  }}
                  className={`px-4 py-2 text-sm rounded-xl border transition-all active:scale-95 ${
                    isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t('home.group.cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmationInput !== `delete ${group.groupName}` || deleting}
                  className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('groupManage.settings.confirmDelete')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nếu không phải leader, hiển thị thông báo */}
      {!isLeader && (
        <div className={`${cardClass} p-6 text-center`}>
          <Settings className={`w-10 h-10 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-gray-300'}`} />
          <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {t('groupManage.settings.leaderOnly')}
          </p>
        </div>
      )}
    </div>
  );
}

export default GroupSettingsTab;
