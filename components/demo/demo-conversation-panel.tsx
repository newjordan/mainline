'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getQuickRepliesForStage } from '@/lib/constants/conversation-flow';
import type { ConversationStage, Message } from '@/lib/database.types';
import { demoTemplateMessages } from '@/lib/demo/demo-data';
import { MessageThread } from '@/components/shared/message-thread';
import { Button } from '@/components/ui/button';

interface DemoConversationPanelProps {
  customerId: string;
  initialMessages: Message[];
  initialStage: ConversationStage;
}

type DemoTab = 'auto-reply' | 'templates';

function buildOutboundMessage(customerId: string, body: string): Message {
  const timestamp = new Date().toISOString();
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  return {
    id: `demo-out-${unique}`,
    customer_id: customerId,
    direction: 'outbound',
    body,
    media_urls: null,
    twilio_sid: `SMDEMO${unique.slice(0, 8).toUpperCase()}`,
    status: 'sent',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function buildInboundAck(customerId: string): Message {
  const timestamp = new Date().toISOString();
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  return {
    id: `demo-in-${unique}`,
    customer_id: customerId,
    direction: 'inbound',
    body: 'Thanks, that helps. Please keep me posted on next steps.',
    media_urls: null,
    twilio_sid: `SMDEMO${unique.slice(0, 8).toUpperCase()}`,
    status: 'delivered',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function DemoConversationPanel({
  customerId,
  initialMessages,
  initialStage,
}: DemoConversationPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [stage, setStage] = useState<ConversationStage>(initialStage);
  const [activeTab, setActiveTab] = useState<DemoTab>('auto-reply');
  const [draft, setDraft] = useState('');
  const threadContainerRef = useRef<HTMLDivElement>(null);

  const lastDirection = messages[messages.length - 1]?.direction ?? null;
  const quickReplies = useMemo(
    () => getQuickRepliesForStage(stage, lastDirection),
    [stage, lastDirection]
  );

  useEffect(() => {
    const container = threadContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const sendMessage = (body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;

    const outbound = buildOutboundMessage(customerId, trimmed);
    const inboundAck = buildInboundAck(customerId);
    setMessages((current) => [...current, outbound, inboundAck]);
    setDraft('');
    toast.success('Reply queued and customer acknowledged (simulated)');
  };

  const sendQuickReply = (body: string, nextStage: ConversationStage) => {
    sendMessage(body);
    setStage(nextStage);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3">
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('auto-reply')}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              activeTab === 'auto-reply'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Auto-Reply
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              activeTab === 'templates'
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Templates
          </button>
        </div>

        {activeTab === 'auto-reply' ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Tap a quick reply to simulate sending a guided response.
            </p>
            {quickReplies.length === 0 ? (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                No quick replies for the current stage yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {quickReplies.map((reply) => (
                  <button
                    key={reply.label}
                    type="button"
                    onClick={() => sendQuickReply(reply.body, reply.nextStage)}
                    className="w-full rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-left text-sm hover:bg-primary/10"
                  >
                    <p className="font-semibold text-primary">{reply.label}</p>
                    <p className="text-muted-foreground">{reply.body}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Pick a template to preload the composer.
            </p>
            {demoTemplateMessages.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setDraft(template.body)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <p className="font-medium">{template.name}</p>
                <p className="truncate text-xs text-muted-foreground">{template.body}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={threadContainerRef}
        className="max-h-[52vh] overflow-y-auto rounded-lg border bg-card p-4 sm:max-h-[420px]"
      >
        <MessageThread messages={messages} />
      </div>

      <div className="rounded-lg border bg-card p-3">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Demo Composer
        </label>
        <textarea
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message and press send..."
          className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="mt-2 flex justify-end">
          <Button type="button" onClick={() => sendMessage(draft)}>
            Send (Simulated)
          </Button>
        </div>
      </div>
    </div>
  );
}
