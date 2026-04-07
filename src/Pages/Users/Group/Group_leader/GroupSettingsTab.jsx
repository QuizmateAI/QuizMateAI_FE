import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Check,
  Fingerprint,
  Globe,
  Info,
  Loader2,
  Lock,
  Pencil,
  Radar,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { updateWorkspace } from '@/api/WorkspaceAPI';
import { toggleVisibility as apiToggleVisibility } from '@/api/GroupAPI';
import GroupProfileOverviewPanel from '../Components/GroupProfileOverviewPanel';

function GroupSettingsTab({
  isDarkMode,
  group,
  isLeader,
  onGroupUpdated,
  compactMode = false,
  onOpenProfileConfig,
  profileEditLocked = false,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(group?.groupName || '');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  // Visibility state
  const [isPublic, setIsPublic] = useState(Boolean(group?.isPublic));
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [visibilityMsg, setVisibilityMsg] = useState('');

  useEffect(() => {
    if (!group) return;
    setGroupName(group.groupName || '');
    setIsPublic(Boolean(group.isPublic));
  }, [group]);

  const shellClass = isDarkMode
    ? 'border-white/10 bg-[#08131a]/92 text-white'
    : 'border-white/80 bg-white/82 text-slate-900';
  const softCardClass = isDarkMode
    ? 'border-white/10 bg-white/[0.04]'
    : 'border-white/80 bg-white/78';
  const eyebrowClass = isDarkMode ? 'text-slate-500' : 'text-slate-500';
  const subtleTextClass = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const inputClass = `w-full rounded-[20px] border px-4 py-3 text-sm outline-none transition-all ${
    isDarkMode
      ? 'border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-cyan-400/35 focus:bg-white/[0.06]'
      : 'border-white/80 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-200 focus:bg-white'
  }`;

  const confirmationPhrase = useMemo(() => `delete ${group?.groupName || ''}`, [group?.groupName]);
  const governanceSignals = [
    {
      label: currentLang === 'en' ? 'Identity state' : 'Trạng thái nhận diện',
      value: group?.groupName ? (currentLang === 'en' ? 'Aligned' : 'Ổn định') : (currentLang === 'en' ? 'Needs setup' : 'Cần thiết lập'),
      note: currentLang === 'en' ? 'the group name anchors this room' : 'tên nhóm là dấu hiệu nhận diện chính của không gian',
      icon: Fingerprint,
      tone: isDarkMode ? 'text-cyan-200 bg-cyan-400/10' : 'text-cyan-700 bg-cyan-50',
    },
    {
      label: currentLang === 'en' ? 'Governance lane' : 'Làn quản trị',
      value: isLeader ? (currentLang === 'en' ? 'Leader access' : 'Quyền trưởng nhóm') : (currentLang === 'en' ? 'Read only' : 'Chỉ theo dõi'),
      note: currentLang === 'en' ? 'who can actively reshape the group' : 'ai đang có quyền thay đổi nhóm',
      icon: ShieldCheck,
      tone: isDarkMode ? 'text-emerald-200 bg-emerald-400/10' : 'text-emerald-700 bg-emerald-50',
    },
    {
      label: currentLang === 'en' ? 'Subject axis' : 'Trục nội dung',
      value: group?.subjectName || group?.topicName || '—',
      note: currentLang === 'en' ? 'the academic direction of this room' : 'hướng nội dung chính của không gian này',
      icon: Radar,
      tone: isDarkMode ? 'text-amber-200 bg-amber-400/10' : 'text-amber-700 bg-amber-50',
      isText: true,
    },
  ];

  const handleToggleVisibility = useCallback(async () => {
    if (visibilityLoading || !group?.workspaceId) return;
    setVisibilityLoading(true);
    setVisibilityMsg('');
    try {
      const res = await apiToggleVisibility(group.workspaceId);
      const newValue = res?.data?.data?.isPublic ?? !isPublic;
      setIsPublic(newValue);
      setVisibilityMsg(
        newValue
          ? (currentLang === 'en' ? 'Group is now Public' : 'Nhóm đã chuyển sang Công khai')
          : (currentLang === 'en' ? 'Group is now Private' : 'Nhóm đã chuyển sang Riêng tư'),
      );
      setTimeout(() => setVisibilityMsg(''), 3000);
    } catch {
      setVisibilityMsg(currentLang === 'en' ? 'Failed to update visibility' : 'Cập nhật thất bại');
      setTimeout(() => setVisibilityMsg(''), 3000);
    } finally {
      setVisibilityLoading(false);
    }
  }, [group, isPublic, visibilityLoading, currentLang]);

  const handleSave = useCallback(async () => {
    if (!groupName.trim()) {
      setErrorMsg(t('home.group.nameRequired'));
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const storedUser = JSON.parse(window.localStorage.getItem('user') || 'null');
      const editorUserId = group?.createdByUserId ?? group?.ownerUserId ?? group?.userId ?? storedUser?.userID;
      if (!editorUserId) {
        throw new Error('Missing user id');
      }

      await updateWorkspace(group.workspaceId, {
        userId: editorUserId,
        name: groupName.trim(),
        description: group?.description || null,
      });
      setIsEditing(false);
      setSuccessMsg(t('groupManage.settings.saveSuccess'));
      if (onGroupUpdated) {
        await onGroupUpdated();
      }
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(t('groupManage.settings.saveError'));
      console.error('Lỗi cập nhật nhóm:', err);
    } finally {
      setSaving(false);
    }
  }, [group, groupName, onGroupUpdated, t]);

  const handleDelete = useCallback(async () => {
    if (!group?.workspaceId) return;

    setErrorMsg(t('groupManage.settings.deleteError'));
    setDeleting(false);
  }, [group, t]);

  const handleCancel = useCallback(() => {
    setGroupName(group?.groupName || '');
    setIsEditing(false);
    setErrorMsg('');
  }, [group]);

  if (compactMode) {
    return (
      <div className={`space-y-4 animate-in fade-in duration-300 ${fontClass}`}>
        {successMsg ? (
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            <Check className="h-4 w-4" />
            {successMsg}
          </div>
        ) : null}

        {errorMsg ? (
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${isDarkMode ? 'border-red-400/20 bg-red-400/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <AlertTriangle className="h-4 w-4" />
            {errorMsg}
          </div>
        ) : null}

        <section className={`rounded-2xl border p-5 ${shellClass}`}>
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {currentLang === 'en' ? 'General group information' : 'Thông tin chung nhóm'}
          </h3>

          <div className="mt-4 space-y-3">
            <div>
              <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('home.group.groupName')}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  className={inputClass}
                  placeholder={t('home.group.groupNamePlaceholder')}
                />
              ) : (
                <div className={`rounded-xl border px-4 py-3 ${softCardClass}`}>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{group?.groupName || '—'}</p>
                </div>
              )}
            </div>

            {isLeader && !isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${isDarkMode ? 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.10]' : 'border-white bg-white text-slate-700 hover:bg-white'}`}
              >
                <Pencil className="h-4 w-4" />
                {t('groupManage.settings.edit')}
              </button>
            ) : null}

            {isEditing ? (
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={handleCancel} className={`rounded-full border px-5 py-2.5 text-sm font-medium ${isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-white bg-white text-slate-700 hover:bg-white'}`}>
                  {t('home.group.cancel')}
                </button>
                <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t('groupManage.settings.save')}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {/* Visibility – compact */}
        {isLeader && (
          <section className={`rounded-2xl border p-5 ${shellClass}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isPublic
                  ? <Globe className="h-4 w-4 text-emerald-500" />
                  : <Lock className={`h-4 w-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />}
                <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentLang === 'en' ? 'Group Visibility' : 'Chế độ hiển thị nhóm'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleToggleVisibility}
                disabled={visibilityLoading}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                  isPublic ? 'bg-emerald-500' : (isDarkMode ? 'bg-slate-600' : 'bg-slate-300')
                }`}
                role="switch"
                aria-checked={isPublic}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {isPublic
                ? (currentLang === 'en' ? 'Anyone can discover this group.' : 'Mọi người có thể tìm thấy nhóm này.')
                : (currentLang === 'en' ? 'Only invited members can join.' : 'Chỉ thành viên được mời mới có thể tham gia.')}
            </p>
            {visibilityMsg && (
              <p className={`mt-2 text-xs font-medium ${isPublic ? 'text-emerald-500' : (isDarkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                {visibilityMsg}
              </p>
            )}
          </section>
        )}

        <GroupProfileOverviewPanel
          group={group}
          isDarkMode={isDarkMode}
          isLeader={isLeader}
          compact
          onOpenProfileConfig={onOpenProfileConfig}
          profileEditLocked={profileEditLocked}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 animate-in fade-in duration-300 ${fontClass}`}>
      {successMsg ? (
        <div className={`flex items-center gap-2 rounded-[22px] border px-4 py-3 text-sm ${isDarkMode ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          <Check className="h-4 w-4" />
          {successMsg}
        </div>
      ) : null}

      {errorMsg ? (
        <div className={`flex items-center gap-2 rounded-[22px] border px-4 py-3 text-sm ${isDarkMode ? 'border-red-400/20 bg-red-400/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
          <AlertTriangle className="h-4 w-4" />
          {errorMsg}
        </div>
      ) : null}

      <section className={`relative overflow-hidden rounded-[30px] border p-6 lg:p-7 ${shellClass}`}>
        <div
          className={`pointer-events-none absolute inset-0 ${
            isDarkMode
              ? 'bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_32%),radial-gradient(circle_at_80%_18%,rgba(34,197,94,0.12),transparent_18%),radial-gradient(circle_at_12%_18%,rgba(6,182,212,0.14),transparent_22%)]'
              : 'bg-[linear-gradient(135deg,rgba(255,255,255,0.76),transparent_32%),radial-gradient(circle_at_80%_18%,rgba(34,197,94,0.10),transparent_18%),radial-gradient(circle_at_12%_18%,rgba(6,182,212,0.10),transparent_22%)]'
          }`}
        />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${isDarkMode ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-700'}`}>
                {currentLang === 'en' ? 'Governance deck' : 'Boong quản trị'}
              </span>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${isDarkMode ? 'border-white/10 bg-white/[0.05] text-slate-200' : 'border-white/80 bg-white/80 text-slate-700'}`}>
                {currentLang === 'en' ? 'Identity and guardrails' : 'Nhận diện và quy chuẩn'}
              </span>
            </div>

            <h2 className={`mt-4 text-3xl font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {currentLang === 'en' ? 'Shape the room without breaking the rhythm' : 'Tinh chỉnh không gian mà vẫn giữ đúng nhịp vận hành'}
            </h2>
            <p className={`mt-3 max-w-3xl text-sm leading-6 ${subtleTextClass}`}>
              {currentLang === 'en'
                ? 'This surface is for naming the collective, clarifying its purpose, and protecting the lifecycle of the workspace.'
                : 'Đây là nơi định danh nhóm, làm rõ mục đích hoạt động và giữ các quyết định quan trọng của không gian học tập thật có kiểm soát.'}
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {governanceSignals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div key={signal.label} className={`rounded-[24px] border p-4 ${softCardClass}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${signal.tone}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>
                        {signal.label}
                      </span>
                    </div>
                    <p className={`mt-4 ${signal.isText ? 'text-xl' : 'text-2xl'} font-black tracking-[-0.04em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {signal.value}
                    </p>
                    <p className={`mt-2 text-sm ${subtleTextClass}`}>
                      {signal.note}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="xl:w-[320px] xl:flex-none">
            <div className={`rounded-[26px] border p-5 ${softCardClass}`}>
              <div className="flex items-center gap-2">
                <Sparkles className={`h-4 w-4 ${isDarkMode ? 'text-cyan-200' : 'text-cyan-700'}`} />
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>
                  {currentLang === 'en' ? 'Control note' : 'Ghi chú điều phối'}
                </p>
              </div>
              <p className={`mt-4 text-sm leading-6 ${subtleTextClass}`}>
                {isLeader
                  ? (currentLang === 'en'
                    ? 'Edit only what improves clarity. The best group settings feel invisible because everyone understands the room instantly.'
                    : 'Chỉ thay đổi những gì giúp nhóm rõ ràng hơn. Một cấu hình tốt là khi mọi người hiểu không gian này gần như ngay lập tức.')
                  : (currentLang === 'en'
                    ? 'You can review how the group is configured here, while structural edits stay with the leader.'
                    : 'Bạn có thể theo dõi cấu hình nhóm tại đây, còn các thay đổi cấu trúc vẫn thuộc quyền của trưởng nhóm.')}
              </p>

              <div className={`mt-5 rounded-[22px] border px-4 py-4 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-white/80 bg-white'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>
                  {currentLang === 'en' ? 'Workspace fingerprint' : 'Dấu vân tay không gian'}
                </p>
                <p className={`mt-3 break-all text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  #{group?.workspaceId || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <GroupProfileOverviewPanel
        group={group}
        isDarkMode={isDarkMode}
        isLeader={isLeader}
        onOpenProfileConfig={onOpenProfileConfig}
        profileEditLocked={profileEditLocked}
      />

      {/* Group Visibility Card – full mode */}
      {isLeader && (
        <section className={`rounded-[30px] border p-6 ${shellClass}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl ${
                isPublic
                  ? (isDarkMode ? 'bg-emerald-400/10 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                  : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
              }`}>
                {isPublic ? <Globe className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </span>
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  {currentLang === 'en' ? 'Group Visibility' : 'Chế độ hiển thị nhóm'}
                </p>
                <h3 className={`mt-1.5 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {isPublic
                    ? (currentLang === 'en' ? 'Public — open to discovery' : 'Công khai — mọi người có thể tìm thấy')
                    : (currentLang === 'en' ? 'Private — invite only' : 'Riêng tư — chỉ được mời')}
                </h3>
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isPublic
                    ? (currentLang === 'en'
                      ? 'Anyone can discover this group and request to join.'
                      : 'Mọi người có thể tìm thấy và yêu cầu tham gia nhóm này.')
                    : (currentLang === 'en'
                      ? 'Only members with a direct invitation can access this group.'
                      : 'Chỉ thành viên có lời mời trực tiếp mới có thể truy cập nhóm này.')}
                </p>
                {visibilityMsg && (
                  <p className={`mt-2 text-sm font-medium ${isPublic ? 'text-emerald-500' : (isDarkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                    {visibilityMsg}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold border ${
                isPublic
                  ? (isDarkMode ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700')
                  : (isDarkMode ? 'border-white/10 bg-white/[0.05] text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-600')
              }`}>
                {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {isPublic ? (currentLang === 'en' ? 'Public' : 'Công khai') : (currentLang === 'en' ? 'Private' : 'Riêng tư')}
              </span>
              <button
                type="button"
                onClick={handleToggleVisibility}
                disabled={visibilityLoading}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                  isPublic ? 'bg-emerald-500' : (isDarkMode ? 'bg-slate-600' : 'bg-slate-300')
                }`}
                role="switch"
                aria-checked={isPublic}
              >
                {visibilityLoading
                  ? <span className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-3 w-3 text-white animate-spin" /></span>
                  : <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPublic ? 'translate-x-5' : 'translate-x-0'}`} />}
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className={`rounded-[30px] border p-6 ${shellClass}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className={`h-5 w-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
              <div>
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {t('groupManage.settings.groupInfo')}
                </h3>
                <p className={`mt-1 text-sm ${subtleTextClass}`}>
                  {currentLang === 'en' ? 'Name and identity markers' : 'Tên gọi và các dấu hiệu nhận diện'}
                </p>
              </div>
            </div>

            {isLeader && !isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                  isDarkMode
                    ? 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.10]'
                    : 'border-white bg-white text-slate-700 hover:bg-white'
                }`}
              >
                <Pencil className="h-4 w-4" />
                {t('groupManage.settings.edit')}
              </button>
            ) : null}
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('home.group.groupName')}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  className={inputClass}
                  placeholder={t('home.group.groupNamePlaceholder')}
                />
              ) : (
                <div className={`rounded-[22px] border px-4 py-3 ${softCardClass}`}>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {group?.groupName || '—'}
                  </p>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCancel}
                  className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                    isDarkMode ? 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-white bg-white text-slate-700 hover:bg-white'
                  }`}
                >
                  {t('home.group.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 transition-all hover:bg-cyan-700 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t('groupManage.settings.save')}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className={`rounded-[30px] border p-6 ${shellClass}`}>
            <div className="flex items-center gap-2">
              <Settings className={`h-5 w-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
              <div>
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentLang === 'en' ? 'Guardrails' : 'Hàng rào vận hành'}
                </h3>
                <p className={`mt-1 text-sm ${subtleTextClass}`}>
                  {currentLang === 'en' ? 'Stable metadata that frames how the group is understood' : 'Các dữ liệu ổn định định nghĩa cách mọi người hiểu về nhóm'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className={`rounded-[22px] border p-4 ${softCardClass}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>
                  {t('groupManage.dashboard.topic')}
                </p>
                <p className={`mt-3 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {group?.topicName || '—'}
                </p>
              </div>

              <div className={`rounded-[22px] border p-4 ${softCardClass}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>
                  {t('groupManage.settings.subject')}
                </p>
                <p className={`mt-3 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {group?.subjectName || '—'}
                </p>
              </div>

              <div className={`rounded-[22px] border p-4 ${softCardClass}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${eyebrowClass}`}>
                  {currentLang === 'en' ? 'Change authority' : 'Quyền thay đổi'}
                </p>
                <p className={`mt-3 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {isLeader ? t('home.group.leader') : t('home.group.member')}
                </p>
                <p className={`mt-2 text-sm ${subtleTextClass}`}>
                  {isLeader
                    ? (currentLang === 'en' ? 'You can rename, reposition, or remove this group.' : 'Bạn có thể đổi tên, tinh chỉnh hoặc xóa nhóm này.')
                    : t('groupManage.settings.leaderOnly')}
                </p>
              </div>
            </div>
          </div>

          {isLeader ? (
            <div className={`rounded-[30px] border p-6 ${isDarkMode ? 'border-red-400/20 bg-red-500/10 text-white' : 'border-red-200 bg-red-50/80 text-slate-900'}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-red-400/10 text-red-200' : 'bg-red-100 text-red-700'}`}>
                  <Trash2 className="h-5 w-5" />
                </span>
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDarkMode ? 'text-red-200/80' : 'text-red-600'}`}>
                    {t('groupManage.settings.dangerZone')}
                  </p>
                  <h3 className={`mt-2 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-red-800'}`}>
                    {currentLang === 'en' ? 'Retire this group carefully' : 'Kết thúc nhóm này một cách có kiểm soát'}
                  </h3>
                  <p className={`mt-3 text-sm leading-6 ${isDarkMode ? 'text-red-100/85' : 'text-red-700'}`}>
                    {t('groupManage.settings.deleteWarning')}
                  </p>
                </div>
              </div>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`mt-5 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                    isDarkMode ? 'border-red-300/25 bg-red-400/10 text-red-100 hover:bg-red-400/15' : 'border-red-200 bg-white text-red-700 hover:bg-red-50'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  {t('groupManage.settings.deleteGroup')}
                </button>
              ) : (
                <div className={`mt-5 rounded-[24px] border p-5 ${isDarkMode ? 'border-red-300/15 bg-black/20' : 'border-red-200 bg-white'}`}>
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-red-100' : 'text-red-700'}`}>
                    {t('groupManage.settings.deleteConfirm')}
                  </p>
                  <p className={`mt-2 text-sm leading-6 ${isDarkMode ? 'text-red-100/80' : 'text-slate-600'}`}>
                    {currentLang === 'en'
                      ? <>Type <span className="font-bold">{confirmationPhrase}</span> to confirm permanent removal.</>
                      : <>Nhập <span className="font-bold">{confirmationPhrase}</span> để xác nhận xóa vĩnh viễn.</>}
                  </p>

                  <input
                    type="text"
                    value={deleteConfirmationInput}
                    onChange={(event) => setDeleteConfirmationInput(event.target.value)}
                    className={`mt-4 w-full rounded-[18px] border px-4 py-3 text-sm outline-none transition-all ${
                      isDarkMode
                        ? 'border-red-300/15 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-red-300/30'
                        : 'border-red-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-red-300'
                    }`}
                    placeholder={confirmationPhrase}
                  />

                  <div className="mt-5 flex flex-wrap justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmationInput('');
                      }}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                        isDarkMode ? 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.10]' : 'border-gray-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t('home.group.cancel')}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleteConfirmationInput !== confirmationPhrase || deleting}
                      className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {t('groupManage.settings.confirmDelete')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`rounded-[30px] border p-6 text-center ${shellClass}`}>
              <ShieldCheck className={`mx-auto h-10 w-10 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />
              <p className={`mt-4 text-base font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {currentLang === 'en' ? 'Leader-only controls' : 'Khu vực dành cho trưởng nhóm'}
              </p>
              <p className={`mt-2 text-sm leading-6 ${subtleTextClass}`}>
                {t('groupManage.settings.leaderOnly')}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default GroupSettingsTab;
