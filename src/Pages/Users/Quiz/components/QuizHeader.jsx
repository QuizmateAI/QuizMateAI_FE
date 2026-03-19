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
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackClick} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </Button>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 hidden sm:block truncate max-w-[200px] md:max-w-xs">{title}</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full shrink-0">
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
              <Button variant="ghost" size="icon" className="rounded-full shrink-0">
                <Globe className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => changeLanguage('en')}>{t('workspace.quiz.header.english', 'English')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('vi')}>{t('workspace.quiz.header.vietnamese', 'Tiếng Việt')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="rounded-full shrink-0">
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </Button>
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
