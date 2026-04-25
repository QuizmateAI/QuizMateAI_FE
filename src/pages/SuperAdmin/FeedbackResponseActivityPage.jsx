import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FeedbackResponseActivityPanel from '@/pages/SuperAdmin/Components/FeedbackResponseActivityPanel';
import { getManagementFeedbackForms } from '@/api/FeedbackAPI';
import { useToast } from '@/context/ToastContext';
import { useDarkMode } from '@/hooks/useDarkMode';
import { unwrapApiList } from '@/utils/apiResponse';
import { getErrorMessage } from '@/utils/getErrorMessage';

function FeedbackResponseActivityPage() {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const { showError } = useToast();
  const [forms, setForms] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadForms = async () => {
      try {
        const response = await getManagementFeedbackForms();
        if (!cancelled) {
          setForms(unwrapApiList(response));
        }
      } catch (error) {
        if (!cancelled) {
          showError(getErrorMessage(t, error));
          setForms([]);
        }
      }
    };

    loadForms();

    return () => {
      cancelled = true;
    };
  }, [showError, t]);

  return <FeedbackResponseActivityPanel forms={forms} isDarkMode={isDarkMode} />;
}

export default FeedbackResponseActivityPage;
