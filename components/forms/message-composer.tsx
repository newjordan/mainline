'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, ChevronDown } from 'lucide-react';
import { sendMessage } from '@/lib/actions/messages';
import { getTemplates } from '@/lib/actions/templates';
import type { MessageTemplate } from '@/lib/database.types';
import { Button } from '@/components/ui/button';

interface MessageComposerProps {
  customerId: string;
  onMessageSent?: () => void;
}

/**
 * Message Composer Component
 *
 * Features:
 * - Textarea with auto-resize
 * - Send button (disabled when empty)
 * - Template selector dropdown
 * - Enter to send, Shift+Enter for newline
 * - Loading state during send
 * - Error display
 */
export function MessageComposer({
  customerId,
  onMessageSent,
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load templates on mount
  useEffect(() => {
    async function loadTemplates() {
      const result = await getTemplates();
      if (result.success) {
        setTemplates(result.data);
      }
    }
    loadTemplates();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowTemplates(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [message]);

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setError(null);

    const result = await sendMessage(customerId, trimmed);

    if (!result.success) {
      setError(result.error);
      setIsSending(false);
      return;
    }

    // Clear message and notify parent
    setMessage('');
    setIsSending(false);
    onMessageSent?.();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function selectTemplate(template: MessageTemplate) {
    setMessage(template.body);
    setShowTemplates(false);
    textareaRef.current?.focus();
  }

  const canSend = message.trim().length > 0 && !isSending;

  return (
    <div className="space-y-2">
      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {/* Template selector */}
        {templates.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              className="h-9 shrink-0"
            >
              Templates
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {showTemplates && (
              <div className="absolute bottom-full left-0 z-10 mb-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-1 shadow-lg">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => selectTemplate(template)}
                    className="w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {template.body}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message input */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isSending}
            rows={1}
            className="w-full resize-none rounded-lg border bg-background px-3 py-2 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          {/* Send button inside textarea */}
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={!canSend}
            className="absolute bottom-1.5 right-1.5 h-7 w-7"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
