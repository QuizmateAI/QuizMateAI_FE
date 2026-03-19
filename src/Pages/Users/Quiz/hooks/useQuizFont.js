import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'quizmate.quizDisplayFont';

export const QUIZ_FONT_OPTIONS = [
  {
    key: 'beVietnamPro',
    family: '"Be Vietnam Pro", "Poppins", sans-serif',
    labelKey: 'workspace.quiz.header.fontBeVietnamPro',
    defaultLabel: 'Be Vietnam Pro',
  },
  {
    key: 'poppins',
    family: '"Poppins", sans-serif',
    labelKey: 'workspace.quiz.header.fontPoppins',
    defaultLabel: 'Poppins',
  },
  {
    key: 'nunito',
    family: '"Nunito", sans-serif',
    labelKey: 'workspace.quiz.header.fontNunito',
    defaultLabel: 'Nunito',
  },
  {
    key: 'robotoSlab',
    family: '"Roboto Slab", serif',
    labelKey: 'workspace.quiz.header.fontRobotoSlab',
    defaultLabel: 'Roboto Slab',
  },
  {
    key: 'merriweather',
    family: '"Merriweather", serif',
    labelKey: 'workspace.quiz.header.fontMerriweather',
    defaultLabel: 'Merriweather',
  },
  {
    key: 'tangerine',
    family: '"Tangerine", serif',
    labelKey: 'workspace.quiz.header.fontTangerine',
    defaultLabel: 'Tangerine',
  },
];

const DEFAULT_FONT_KEY = 'beVietnamPro';

export function useQuizFont() {
  const [selectedFont, setSelectedFont] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_FONT_KEY;

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && QUIZ_FONT_OPTIONS.some((option) => option.key === saved)) {
      return saved;
    }

    return DEFAULT_FONT_KEY;
  });

  const selectedOption = useMemo(
    () => QUIZ_FONT_OPTIONS.find((option) => option.key === selectedFont) || QUIZ_FONT_OPTIONS[0],
    [selectedFont],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.style.setProperty('--quiz-display-font', selectedOption.family);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, selectedOption.key);
    }
  }, [selectedOption]);

  return {
    selectedFont,
    setSelectedFont,
    fontOptions: QUIZ_FONT_OPTIONS,
    selectedFontFamily: selectedOption.family,
  };
}
