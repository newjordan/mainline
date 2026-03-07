/**
 * Generic result type for server actions
 * Provides type-safe success/error handling
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Helper to create a success result
 */
export function success<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

/**
 * Helper to create an error result
 */
export function failure<T>(error: string): ActionResult<T> {
  return { success: false, error };
}

// Re-export database types for convenience
export type {
  Customer,
  Message,
  Quote,
  Invoice,
  WebhookEvent,
  MessageTemplate,
  QuoteLineItem,
  MessageDirection,
  MessageStatus,
  QuoteStatus,
  InvoiceStatus,
} from '@/lib/database.types';
