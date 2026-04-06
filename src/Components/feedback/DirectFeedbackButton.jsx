import { useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import FeedbackSubmitDialog from '@/Components/feedback/FeedbackSubmitDialog';

function DirectFeedbackButton({
  targetType,
  targetId,
  label = 'Feedback',
  className = '',
  variant = 'outline',
  size = 'sm',
  isDarkMode = false,
  onSubmitted,
  title = '',
  description = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  if (targetId == null || targetId === '') {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={className}
      >
        <MessageSquareText className="h-4 w-4" />
        <span>{label}</span>
      </Button>

      <FeedbackSubmitDialog
        open={open}
        onOpenChange={setOpen}
        targetType={targetType}
        targetId={targetId}
        isDarkMode={isDarkMode}
        onSubmitted={onSubmitted}
        title={title}
        description={description}
      />
    </>
  );
}

export default DirectFeedbackButton;
