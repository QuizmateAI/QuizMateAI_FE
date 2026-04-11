import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import FeedbackSubmitDialog from '@/Components/feedback/FeedbackSubmitDialog';
import { getPendingFeedbackRequests } from '@/api/FeedbackAPI';
import { getCurrentUser, isAuthenticated } from '@/api/Authentication';
import { unwrapApiList } from '@/Utils/apiResponse';

const AUTO_PROMPT_TARGET_TYPES = new Set(['WORKSPACE', 'SYSTEM_MILESTONE']);
const BLOCKED_PREFIXES = ['/login', '/register', '/forgot-password', '/pricing', '/payments', '/admin', '/super-admin'];

function shouldBlockAutoPrompt(pathname) {
  if (!pathname) {
    return true;
  }

  if (pathname.startsWith('/feedbacks')) {
    return true;
  }

  if (BLOCKED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return pathname.startsWith('/quizzes/practice/') || pathname.startsWith('/quizzes/exams/');
}

function FeedbackAutoPrompt() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const currentUser = useMemo(() => getCurrentUser(), [location.pathname]);
  const canAutoPrompt = isAuthenticated()
    && currentUser?.role === 'USER'
    && !shouldBlockAutoPrompt(location.pathname || '');

  useEffect(() => {
    if (!canAutoPrompt || hasAutoOpened) {
      return undefined;
    }

    let cancelled = false;

    const loadPendingRequest = async () => {
      try {
        const response = await getPendingFeedbackRequests();
        if (cancelled) {
          return;
        }

        const pendingRequests = unwrapApiList(response);
        const scheduledRequest = pendingRequests.find((request) =>
          AUTO_PROMPT_TARGET_TYPES.has(String(request?.targetType || '').toUpperCase()),
        );

        if (scheduledRequest) {
          setActiveRequest(scheduledRequest);
          setOpen(true);
          setHasAutoOpened(true);
        }
      } catch {
        // ignore auto prompt failures
      }
    };

    loadPendingRequest();

    return () => {
      cancelled = true;
    };
  }, [canAutoPrompt, hasAutoOpened]);

  if (!canAutoPrompt || !activeRequest) {
    return null;
  }

  return (
    <FeedbackSubmitDialog
      open={open}
      onOpenChange={setOpen}
      request={activeRequest}
      allowDismiss
      onSubmitted={() => {
        setActiveRequest(null);
        setOpen(false);
      }}
      onDismissed={() => {
        setActiveRequest(null);
        setOpen(false);
      }}
    />
  );
}

export default FeedbackAutoPrompt;
