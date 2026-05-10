import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
  SuperAdminPage,
  SuperAdminPageHeader,
} from './Components/SuperAdminSurface';
import SystemAnalysisModelPanel from './Components/SystemAnalysisModelPanel';

const AI_MODELS_QUERY_KEY = ['superadmin', 'ai-models', 'openai-active'];
const SYSTEM_SETTINGS_QUERY_KEY = ['admin', 'systemSettings'];

export default function SystemAnalysisModelManagement() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const queryClient = useQueryClient();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: AI_MODELS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: SYSTEM_SETTINGS_QUERY_KEY });
  };

  return (
    <SuperAdminPage className={fontClass}>
      <SuperAdminPageHeader
        eyebrow="AI Governance"
        title={t('aiModels.systemAnalysis.title', 'Model AI cho phân tích hệ thống')}
        description={t(
          'aiModels.systemAnalysis.subtitle',
          'Chọn 1 model OpenAI dùng chung cho các tính năng phân tích nội bộ. Đổi model sẽ áp dụng tức thì cho toàn hệ thống, không cần restart.'
        )}
        actions={(
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="h-10 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={t('aiModels.refresh', 'Refresh')}
            title={t('aiModels.refresh', 'Refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      />

      <SystemAnalysisModelPanel isDarkMode={isDarkMode} />
    </SuperAdminPage>
  );
}
