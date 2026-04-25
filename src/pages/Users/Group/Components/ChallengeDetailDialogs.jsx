import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getScheduleValidationIssues } from '@/lib/challengeSchedule';
import ChallengeScheduleFields from './ChallengeScheduleFields';

function ChallengeDetailDialogs({
  actionLoading,
  cancelDialogOpen,
  editDescription,
  editDialogOpen,
  editEndDate,
  editEndTime,
  editScheduleIssues,
  editStartDate,
  editStartTime,
  editTitle,
  finishDialogOpen,
  handleCancelConfirm,
  handleFinishConfirm,
  handleSaveChallengeEdit,
  isDarkMode,
  setCancelDialogOpen,
  setEditDescription,
  setEditDialogOpen,
  setEditEndDate,
  setEditEndTime,
  setEditStartDate,
  setEditStartTime,
  setEditTitle,
  setFinishDialogOpen,
  t,
}) {
  return (
    <>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent
          hideClose={false}
          className={
            isDarkMode
              ? 'border-slate-700 bg-slate-900 text-slate-100 sm:max-w-lg'
              : 'sm:max-w-lg'
          }
        >
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : undefined}>
              {t('groupWorkspace.challenge.editDialogTitle')}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : undefined}>
              {t('groupWorkspace.challenge.editDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className={`mb-1 block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('groupWorkspace.challenge.editTitleLabel')}
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  isDarkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-gray-200 bg-white'
                }`}
                maxLength={200}
              />
            </div>
            <div>
              <label className={`mb-1 block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {t('groupWorkspace.challenge.editDescriptionLabel')}
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  isDarkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-gray-200 bg-white'
                }`}
              />
            </div>
            <ChallengeScheduleFields
              isDarkMode={isDarkMode}
              startDate={editStartDate}
              startTime={editStartTime}
              endDate={editEndDate}
              endTime={editEndTime}
              onStartDateChange={setEditStartDate}
              onStartTimeChange={setEditStartTime}
              onEndDateChange={setEditEndDate}
              onEndTimeChange={setEditEndTime}
              validationIssues={editScheduleIssues}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className={isDarkMode ? 'border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800' : ''}
              onClick={() => setEditDialogOpen(false)}
            >
              {t('groupWorkspace.challenge.cancelDialogBack')}
            </Button>
            <Button
              type="button"
              onClick={handleSaveChallengeEdit}
              disabled={
                !!actionLoading
                || !editTitle.trim()
                || getScheduleValidationIssues(editStartDate, editStartTime, editEndDate, editEndTime).length > 0
              }
            >
              {actionLoading === 'edit' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('groupWorkspace.challenge.editSave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent
          hideClose={false}
          className={
            isDarkMode
              ? 'border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md'
              : 'sm:max-w-md'
          }
        >
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : undefined}>
              {t('groupWorkspace.challenge.cancelDialogTitle')}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : undefined}>
              {t('groupWorkspace.challenge.cancelDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className={isDarkMode ? 'border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800' : ''}
              onClick={() => setCancelDialogOpen(false)}
            >
              {t('groupWorkspace.challenge.cancelDialogBack')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={!!actionLoading}
            >
              {actionLoading === 'cancel' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('groupWorkspace.challenge.cancelDialogConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={finishDialogOpen} onOpenChange={setFinishDialogOpen}>
        <DialogContent
          hideClose={false}
          className={
            isDarkMode
              ? 'border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md'
              : 'sm:max-w-md'
          }
        >
          <DialogHeader>
            <DialogTitle className={isDarkMode ? 'text-white' : undefined}>
              {t('groupWorkspace.challenge.finishDialogTitle', 'Kết thúc challenge ngay?')}
            </DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-slate-400' : undefined}>
              {t(
                'groupWorkspace.challenge.finishDialogDescription',
                'Những người chưa nộp bài sẽ bị auto-submit với kết quả hiện tại, ranking được chốt và challenge chuyển sang trạng thái kết thúc. Không thể hoàn tác.',
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className={isDarkMode ? 'border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800' : ''}
              onClick={() => setFinishDialogOpen(false)}
            >
              {t('groupWorkspace.challenge.finishDialogBack', 'Đóng')}
            </Button>
            <Button
              type="button"
              onClick={handleFinishConfirm}
              disabled={!!actionLoading}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {actionLoading === 'manualFinish' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('groupWorkspace.challenge.finishDialogConfirm', 'Kết thúc ngay')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ChallengeDetailDialogs;
