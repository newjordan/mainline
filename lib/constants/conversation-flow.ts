import type { ConversationStage } from '@/lib/database.types';

/**
 * Guided intake conversation flow
 *
 * After opt-in, the customer is walked through a natural intake:
 *   1. "What's going on?" (auto-sent on opt-in)
 *   2. Customer describes problem → tech acknowledges + asks name
 *   3. Customer gives name → tech asks address
 *   4. Customer gives address → tech asks unit type
 *   5. Customer gives unit info → tech wraps up
 *
 * Quick replies appear when the last message is inbound (customer responded)
 * and the stage indicates we're still gathering info.
 * Technician taps one → message sends + stage advances.
 */

export type QuickReply = {
  /** Button label (short, fits on mobile) */
  label: string;
  /** Full message body sent to customer */
  body: string;
  /** Stage to set after sending */
  nextStage: ConversationStage;
};

export type StageConfig = {
  /** What we're waiting for the customer to provide */
  waitingFor: string;
  /** Quick replies the tech can tap after customer responds */
  quickReplies: QuickReply[];
};

/**
 * Quick reply options per conversation stage
 *
 * These appear when the customer's last message is inbound,
 * meaning they've responded and it's the tech's turn.
 */
export const CONVERSATION_FLOW: Record<string, StageConfig> = {
  awaiting_problem: {
    waitingFor: 'problem description',
    quickReplies: [
      {
        label: 'Acknowledge + ask name',
        body: "That sounds frustrating — we can definitely help with that. Who am I texting with?",
        nextStage: 'awaiting_name',
      },
      {
        label: 'Common issue + ask name',
        body: "We see that a lot, we'll get it taken care of. What's your name?",
        nextStage: 'awaiting_name',
      },
      {
        label: 'Quick + ask name',
        body: "Got it, we'll get that sorted out. What name should I put on the account?",
        nextStage: 'awaiting_name',
      },
    ],
  },

  awaiting_name: {
    waitingFor: 'name',
    quickReplies: [
      {
        label: 'Greet + ask address',
        body: "Nice to meet you! What's the service address?",
        nextStage: 'awaiting_address',
      },
      {
        label: 'Friendly + ask address',
        body: "Hey, great to connect! What address are we heading to?",
        nextStage: 'awaiting_address',
      },
    ],
  },

  awaiting_address: {
    waitingFor: 'service address',
    quickReplies: [
      {
        label: 'Confirm + ask equipment',
        body: "Got it! What equipment, system, or fixture needs service?",
        nextStage: 'awaiting_unit',
      },
      {
        label: 'Quick + ask equipment',
        body: 'Perfect. What type of service is needed, and on what equipment?',
        nextStage: 'awaiting_unit',
      },
    ],
  },

  awaiting_unit: {
    waitingFor: 'equipment details',
    quickReplies: [
      {
        label: 'Wrap up + next steps',
        body: "Thanks for all that! Let me look into this and I'll get back to you with a plan.",
        nextStage: 'intake_complete',
      },
      {
        label: "Quote coming",
        body: "Got it — I'll put together some options and text you back shortly.",
        nextStage: 'intake_complete',
      },
      {
        label: 'Schedule offer',
        body: "Sounds good! We can probably get out there soon. I'll check the schedule and follow up.",
        nextStage: 'intake_complete',
      },
    ],
  },
};

/**
 * Get quick replies for the current conversation state.
 * Returns replies only when the last message is inbound (customer responded)
 * and we're in a guided intake stage.
 */
export function getQuickRepliesForStage(
  stage: ConversationStage,
  lastMessageDirection: 'inbound' | 'outbound' | null
): QuickReply[] {
  // Only show quick replies when customer just responded
  if (lastMessageDirection !== 'inbound') return [];

  // Only show during guided intake stages
  const config = CONVERSATION_FLOW[stage];
  if (!config) return [];

  return config.quickReplies;
}
