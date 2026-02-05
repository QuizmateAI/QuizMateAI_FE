import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import en from './locales/en.json';
import vi from './locales/vi.json';

// Lấy ngôn ngữ đã lưu từ localStorage hoặc mặc định là tiếng Việt
const savedLanguage = localStorage.getItem('app_language') || 'vi';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi }
    },
    lng: savedLanguage, // Ngôn ngữ mặc định
    fallbackLng: 'vi', // Ngôn ngữ dự phòng
    interpolation: {
      escapeValue: false // React đã tự escape XSS
    }
  });

// Lưu ngôn ngữ vào localStorage khi thay đổi
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('app_language', lng);
});

export default i18n;
