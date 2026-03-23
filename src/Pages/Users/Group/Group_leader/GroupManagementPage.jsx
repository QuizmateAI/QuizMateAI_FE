import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigateWithLoading } from '@/hooks/useNavigateWithLoading';

// Redirect to the main GroupWorkspacePage with ?section=dashboard
// This page is kept for backwards compatibility
function GroupManagementPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigateWithLoading();

  useEffect(() => {
    navigate(`/group-workspace/${workspaceId}?section=dashboard`, { replace: true });
  }, [workspaceId, navigate]);

  return null;
}

export default GroupManagementPage;
