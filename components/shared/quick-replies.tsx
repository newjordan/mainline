'use client';

import { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import type { QuickReply } from '@/lib/constants/conversation-flow';
import type { ConversationStage } from '@/lib/database.types';

interface QuickRepliesProps {
  replies: QuickReply[];
  onSend: (body: string, nextStage: ConversationStage) => Promise<void>;
}

/**
 * Quick reply buttons for guided intake flow
 *
 * Big, thumb-friendly tap targets that send a message
 * and advance the conversation stage in one action.
 */
export function QuickReplies({ replies, onSend }: QuickRepliesProps) {
  const [sendingIndex, setSendingIndex] = useState<number | null>(null);

  if (replies.length === 0) return null;

  async function handleTap(reply: QuickReply, index: number) {
    if (sendingIndex !== null) return; // prevent double-tap
    setSendingIndex(index);
    try {
      await onSend(reply.body, reply.nextStage);
    } finally {
      setSendingIndex(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Zap className="h-3 w-3" />
        Quick replies
      </div>
      <div className="flex flex-col gap-2">
        {replies.map((reply, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleTap(reply, index)}
            disabled={sendingIndex !== null}
            className="group relative w-full rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/10 active:bg-primary/20 disabled:opacity-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-primary">
                  {reply.label}
                </div>
                <div className="mt-0.5 text-sm text-foreground">
                  {reply.body}
                </div>
              </div>
              {sendingIndex === index && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
