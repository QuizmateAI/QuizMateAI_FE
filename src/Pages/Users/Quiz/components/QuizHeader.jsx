import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Moon, Sun, Globe, Type } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/Components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu';
import { useQuizFont } from '../hooks/useQuizFont';

export default function QuizHeader({ onBack, title, showConfirm, confirmTitle, confirmDescription }) {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { i18n, t } = useTranslation();
  const { selectedFont, setSelectedFont, fontOptions } = useQuizFont();
  const [showDialog, setShowDialog] = useState(false);

  const handleBackClick = () => {
    if (showConfirm) {
      setShowDialog(true);
    } else {
      onBack();
    }
  };

  const handleConfirmBack = () => {
    setShowDialog(false);
    onBack(true);
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/92 backdrop-blur dark:border-slate-800 dark:bg-slate-950/88">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackClick}
              className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
              aria-label={t('workspace.quiz.header.back', 'Go back')}
            >
              <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </Button>
            <div className="min-w-0">
              <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block dark:text-slate-500">
                {t('workspace.quiz.header.sessionLabel', 'Quiz session')}
              </p>
              <h2 className="truncate text-lg font-semibold text-slate-800 dark:text-slate-100 sm:max-w-[320px] md:max-w-xl">{title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50/90 px-2 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl shrink-0" aria-label={t('workspace.quiz.header.font', 'Change font')}>
                  <Type className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
                {fontOptions.map((fontOption) => (
                  <DropdownMenuItem
                    key={fontOption.key}
                    onClick={() => setSelectedFont(fontOption.key)}
                    className={selectedFont === fontOption.key ? 'bg-slate-100 dark:bg-slate-800' : ''}
                  >
                    <span style={{ fontFamily: fontOption.family }}>
                      {t(fontOption.labelKey, fontOption.defaultLabel)}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl shrink-0" aria-label={t('workspace.quiz.header.language', 'Change language')}>
                  <Globe className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => changeLanguage('en')}>{t('workspace.quiz.header.english', 'English')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage('vi')}>{t('workspace.quiz.header.vietnamese', 'Tiếng Việt')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="rounded-xl shrink-0" aria-label={t('workspace.quiz.header.theme', 'Toggle theme')}>
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTitle || t('workspace.quiz.header.confirmBackTitle', 'Are you sure?')}</DialogTitle>
            <DialogDescription>
              {confirmDescription || t('workspace.quiz.header.confirmBackDescription', 'Any unsaved progress might be lost.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{t('workspace.quiz.header.cancel', 'Cancel')}</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmBack}>
              {t('workspace.quiz.header.confirm', 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
