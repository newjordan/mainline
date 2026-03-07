'use client';

import { useState, useEffect, useRef } from 'react';
import type { Message, ConversationStage } from '@/lib/database.types';
import { getMessages } from '@/lib/actions/messages';
import { sendQuickReply } from '@/lib/actions/messages';
import { getQuickRepliesForStage } from '@/lib/constants/conversation-flow';
import { MessageThread } from '@/components/shared/message-thread';
import { MessageComposer } from '@/components/forms/message-composer';
import { QuickReplies } from '@/components/shared/quick-replies';

interface ConversationSectionProps {
  customerId: string;
  initialMessages: Message[];
  conversationStage: ConversationStage;
}

/**
 * Conversation Section
 *
 * Client component that handles:
 * - Message thread display
 * - Quick reply buttons for guided intake
 * - Message composer
 * - Refreshing messages after send
 * - Auto-scroll to bottom
 */
export function ConversationSection({
  customerId,
  initialMessages,
  conversationStage,
}: ConversationSectionProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [stage, setStage] = useState(conversationStage);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Determine last message direction for quick reply visibility
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastDirection = lastMessage?.direction ?? null;

  // Get contextual quick replies
  const quickReplies = getQuickRepliesForStage(stage, lastDirection);

  async function refreshMessages() {
    setRefreshError(null);
    const result = await getMessages(customerId);
    if (result.success) {
      setMessages(result.data);
    } else {
      setRefreshError('Could not refresh messages. Please reload the page.');
    }
  }

  async function handleQuickReply(body: string, nextStage: ConversationStage) {
    const result = await sendQuickReply(customerId, body, nextStage);
    if (result.success) {
      setStage(nextStage);
      await refreshMessages();
    }
  }

  return (
    <div className="flex flex-col">
      {/* Message thread with scroll */}
      <div
        ref={scrollRef}
        className="max-h-[52vh] overflow-y-auto rounded-lg border bg-card p-4 sm:max-h-[400px]"
      >
        <MessageThread messages={messages} />
      </div>

      {/* Refresh error notification */}
      {refreshError && (
        <div className="mt-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
          {refreshError}
        </div>
      )}

      {/* Quick replies for guided intake */}
      {quickReplies.length > 0 && (
        <div className="mt-3">
          <QuickReplies
            replies={quickReplies}
            onSend={handleQuickReply}
          />
        </div>
      )}

      {/* Message composer */}
      <div className="mt-4">
        <MessageComposer
          customerId={customerId}
          onMessageSent={refreshMessages}
        />
      </div>
    </div>
  );
}
