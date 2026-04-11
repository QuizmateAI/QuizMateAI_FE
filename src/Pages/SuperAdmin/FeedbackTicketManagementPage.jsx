import FeedbackTicketManagementPanel from '@/Pages/SuperAdmin/Components/FeedbackTicketManagementPanel';
import { useDarkMode } from '@/hooks/useDarkMode';

function FeedbackTicketManagementPage() {
  const { isDarkMode } = useDarkMode();

  return <FeedbackTicketManagementPanel isDarkMode={isDarkMode} />;
}

export default FeedbackTicketManagementPage;
