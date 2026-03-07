import type { Message } from '@/lib/database.types';
import { formatRelativeTime } from '@/lib/utils/format-date';
import { Check, CheckCheck, AlertCircle, Clock } from 'lucide-react';

interface MessageThreadProps {
  messages: Message[];
}

/**
 * Message thread component for conversation history
 * Displays messages chronologically with direction-based styling
 *
 * Features:
 * - Inbound: left-aligned, muted background
 * - Outbound: right-aligned, primary background
 * - Timestamps on each message
 * - Delivery status indicators for outbound
 * - Media/photo display
 * - Failed message styling
 */
export function MessageThread({ messages }: MessageThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No messages yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound';
  const isFailed = message.status === 'failed' || message.status === 'undelivered';

  return (
    <div
      className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isOutbound
            ? isFailed
              ? 'bg-destructive/20 text-destructive-foreground'
              : 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        {/* Message body */}
        <p className="whitespace-pre-wrap break-words">{message.body}</p>

        {/* Media attachments */}
        {message.media_urls && message.media_urls.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.media_urls.map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Attachment ${index + 1}`}
                  width={200}
                  height={150}
                  className="max-h-48 w-auto rounded border"
                />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Timestamp and status */}
      <div
        className={`mt-1 flex items-center gap-1 text-xs text-muted-foreground ${
          isOutbound ? 'flex-row-reverse' : ''
        }`}
      >
        <span>{formatRelativeTime(message.created_at)}</span>
        {isOutbound && <StatusIndicator status={message.status} />}
      </div>
    </div>
  );
}

function StatusIndicator({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'queued':
      return <Clock className="h-3 w-3" />;
    case 'sent':
      return <Check className="h-3 w-3" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3" />;
    case 'failed':
    case 'undelivered':
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    default:
      return null;
  }
}
