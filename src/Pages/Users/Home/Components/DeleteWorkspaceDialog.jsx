import React, { useState } from 'react';
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
import { Loader2, AlertTriangle } from 'lucide-react';

// Dialog xác nhận xóa workspace
function DeleteWorkspaceDialog({ open, onOpenChange, workspace, onDelete, isDarkMode }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!workspace) return;
    console.log('[DELETE] workspace object:', JSON.stringify(workspace, null, 2));
    console.log('[DELETE] workspaceId:', workspace.workspaceId, typeof workspace.workspaceId);
    setSubmitting(true);
    try {
      await onDelete(workspace.workspaceId);
      onOpenChange(false);
    } catch (err) {
      console.error('[DELETE] Error:', err);
      console.error('[DELETE] Error message:', err?.message);
      console.error('[DELETE] Error data:', err?.data);
      // Lỗi được xử lý ở component cha
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[420px] ${fontClass} ${
          isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isDarkMode ? 'bg-red-950/50' : 'bg-red-50'
            }`}>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <DialogTitle className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                {t('home.workspace.deleteTitle')}
              </DialogTitle>
              <DialogDescription className={`mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('home.workspace.deleteDesc')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {workspace && (
          <div className={`rounded-lg p-3 mt-2 ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-gray-50 border border-gray-200'}`}>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('home.workspace.confirmDeleteName')}: <span className="text-red-500">{workspace.displayTitle ?? workspace.title ?? workspace.name ?? t('home.workspace.untitledTitle')}</span>
            </p>
            {workspace.topic && (
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {workspace.topic.title} — {workspace.subject?.title}
              </p>
            )}
          </div>
        )}

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
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="rounded-full bg-red-600 hover:bg-red-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('home.workspace.deleting')}
              </>
            ) : (
              t('home.workspace.delete')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteWorkspaceDialog;
