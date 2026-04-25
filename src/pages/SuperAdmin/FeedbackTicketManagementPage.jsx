import FeedbackTicketManagementPanel from '@/pages/SuperAdmin/Components/FeedbackTicketManagementPanel';
import { useDarkMode } from '@/hooks/useDarkMode';

function FeedbackTicketManagementPage() {
  const { isDarkMode } = useDarkMode();

  return <FeedbackTicketManagementPanel isDarkMode={isDarkMode} />;
}

export default FeedbackTicketManagementPage;
