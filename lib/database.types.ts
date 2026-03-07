/**
 * Supabase Database Types
 *
 * This file contains TypeScript types for the database schema.
 * Manually created to match migrations in supabase/migrations/
 *
 * IMPORTANT: Regenerate this file after connecting to Supabase:
 * supabase gen types typescript --project-id <id> > lib/database.types.ts
 *
 * Or for local development:
 * supabase gen types typescript --local > lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          phone_number: string;
          email: string | null;
          name: string | null;
          address: string | null;
          additional_addresses: string[];
          unit_info: string | null;
          sms_consent: boolean;
          sms_consent_at: string | null;
          conversation_stage: ConversationStage;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone_number: string;
          email?: string | null;
          name?: string | null;
          address?: string | null;
          additional_addresses?: string[];
          unit_info?: string | null;
          sms_consent?: boolean;
          sms_consent_at?: string | null;
          conversation_stage?: ConversationStage;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone_number?: string;
          email?: string | null;
          name?: string | null;
          address?: string | null;
          additional_addresses?: string[];
          unit_info?: string | null;
          sms_consent?: boolean;
          sms_consent_at?: string | null;
          conversation_stage?: ConversationStage;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      customer_photos: {
        Row: {
          id: string;
          customer_id: string;
          url: string;
          file_path: string;
          file_name: string | null;
          content_type: string | null;
          size_bytes: number | null;
          source: 'upload' | 'inbound_message' | 'outbound_message';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          url: string;
          file_path: string;
          file_name?: string | null;
          content_type?: string | null;
          size_bytes?: number | null;
          source?: 'upload' | 'inbound_message' | 'outbound_message';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          url?: string;
          file_path?: string;
          file_name?: string | null;
          content_type?: string | null;
          size_bytes?: number | null;
          source?: 'upload' | 'inbound_message' | 'outbound_message';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customer_photos_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          customer_id: string;
          direction: 'inbound' | 'outbound';
          body: string;
          media_urls: string[] | null;
          twilio_sid: string | null;
          status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          direction: 'inbound' | 'outbound';
          body: string;
          media_urls?: string[] | null;
          twilio_sid?: string | null;
          status?: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          direction?: 'inbound' | 'outbound';
          body?: string;
          media_urls?: string[] | null;
          twilio_sid?: string | null;
          status?: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      quotes: {
        Row: {
          id: string;
          customer_id: string;
          description: string;
          service_address: string | null;
          line_items: Json;
          total_cents: number;
          status: 'draft' | 'sent' | 'accepted' | 'rejected';
          google_doc_url: string | null;
          version: number;
          created_at: string;
          updated_at: string;
          accepted_at: string | null;
          archived_at: string | null;
          completed_at: string | null;
          // New versioning columns
          parent_quote_id: string | null;
          superseded_at: string | null;
          short_ref: string;
          confirmation_code: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          description: string;
          service_address?: string | null;
          line_items?: Json;
          total_cents: number;
          status?: 'draft' | 'sent' | 'accepted' | 'rejected';
          google_doc_url?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
          accepted_at?: string | null;
          archived_at?: string | null;
          completed_at?: string | null;
          parent_quote_id?: string | null;
          superseded_at?: string | null;
          short_ref?: string;
          confirmation_code?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string;
          description?: string;
          service_address?: string | null;
          line_items?: Json;
          total_cents?: number;
          status?: 'draft' | 'sent' | 'accepted' | 'rejected';
          google_doc_url?: string | null;
          version?: number;
          created_at?: string;
          updated_at?: string;
          accepted_at?: string | null;
          archived_at?: string | null;
          completed_at?: string | null;
          parent_quote_id?: string | null;
          superseded_at?: string | null;
          short_ref?: string;
          confirmation_code?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'quotes_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotes_parent_quote_id_fkey';
            columns: ['parent_quote_id'];
            isOneToOne: false;
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
        ];
      };
      quote_access_tokens: {
        Row: {
          id: string;
          quote_id: string;
          token: string;
          expires_at: string;
          created_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          quote_id: string;
          token: string;
          expires_at: string;
          created_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          quote_id?: string;
          token?: string;
          expires_at?: string;
          created_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_access_tokens_quote_id_fkey';
            columns: ['quote_id'];
            isOneToOne: false;
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
        ];
      };
      quote_audit_log: {
        Row: {
          id: string;
          quote_id: string;
          event_type: QuoteAuditEventType;
          actor_type: QuoteAuditActorType;
          actor_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          event_type: QuoteAuditEventType;
          actor_type: QuoteAuditActorType;
          actor_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          event_type?: QuoteAuditEventType;
          actor_type?: QuoteAuditActorType;
          actor_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_audit_log_quote_id_fkey';
            columns: ['quote_id'];
            isOneToOne: false;
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          quote_id: string | null;
          customer_id: string;
          amount_cents: number;
          adjustment_note: string | null;
          job_description: string | null;
          line_items: Json;
          status: 'draft' | 'sent' | 'paid' | 'overdue';
          stripe_payment_link: string | null;
          stripe_payment_id: string | null;
          sent_at: string | null;
          paid_at: string | null;
          completed_at: string | null;
          archived_at: string | null;
          service_address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quote_id?: string | null;
          customer_id: string;
          amount_cents: number;
          adjustment_note?: string | null;
          job_description?: string | null;
          line_items?: Json;
          status?: 'draft' | 'sent' | 'paid' | 'overdue';
          stripe_payment_link?: string | null;
          stripe_payment_id?: string | null;
          sent_at?: string | null;
          paid_at?: string | null;
          completed_at?: string | null;
          archived_at?: string | null;
          service_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string | null;
          customer_id?: string;
          amount_cents?: number;
          adjustment_note?: string | null;
          job_description?: string | null;
          line_items?: Json;
          status?: 'draft' | 'sent' | 'paid' | 'overdue';
          stripe_payment_link?: string | null;
          stripe_payment_id?: string | null;
          sent_at?: string | null;
          paid_at?: string | null;
          completed_at?: string | null;
          archived_at?: string | null;
          service_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_quote_id_fkey';
            columns: ['quote_id'];
            isOneToOne: false;
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
        ];
      };
      webhook_events: {
        Row: {
          id: string;
          provider: string;
          event_id: string;
          event_type: string;
          processed_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          event_id: string;
          event_type: string;
          processed_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          event_id?: string;
          event_type?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
      message_templates: {
        Row: {
          id: string;
          name: string;
          body: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          body: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          body?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// =============================================================================
// Convenience Type Aliases
// =============================================================================

// Table row types (for reading data)
export type Customer = Database['public']['Tables']['customers']['Row'];
export type CustomerPhoto = Database['public']['Tables']['customer_photos']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Quote = Database['public']['Tables']['quotes']['Row'];
export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type WebhookEvent =
  Database['public']['Tables']['webhook_events']['Row'];
export type MessageTemplate =
  Database['public']['Tables']['message_templates']['Row'];

// Insert types (for creating records)
export type CustomerInsert =
  Database['public']['Tables']['customers']['Insert'];
export type CustomerPhotoInsert =
  Database['public']['Tables']['customer_photos']['Insert'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert'];
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type WebhookEventInsert =
  Database['public']['Tables']['webhook_events']['Insert'];
export type MessageTemplateInsert =
  Database['public']['Tables']['message_templates']['Insert'];

// Update types (for updating records)
export type CustomerUpdate =
  Database['public']['Tables']['customers']['Update'];
export type CustomerPhotoUpdate =
  Database['public']['Tables']['customer_photos']['Update'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];
export type QuoteUpdate = Database['public']['Tables']['quotes']['Update'];
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];
export type WebhookEventUpdate =
  Database['public']['Tables']['webhook_events']['Update'];
export type MessageTemplateUpdate =
  Database['public']['Tables']['message_templates']['Update'];

// =============================================================================
// Domain Types for Business Logic
// =============================================================================

// Quote line item structure (stored as JSONB)
export type QuoteLineItem = {
  description: string;
  amount_cents: number;
};

// Invoice line item structure (stored as JSONB)
export type InvoiceLineItem = {
  description: string;
  amount_cents: number;
};

// Message direction literal type
export type MessageDirection = 'inbound' | 'outbound';

// Message status literal type (Twilio delivery statuses)
export type MessageStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'undelivered';

// Quote status literal type
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

// Invoice status literal type
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

// Webhook provider literal type
export type WebhookProvider = 'twilio' | 'square';

// Conversation intake stage
export type ConversationStage =
  | 'awaiting_problem'
  | 'awaiting_name'
  | 'awaiting_address'
  | 'awaiting_unit'
  | 'intake_complete'
  | 'open';

// =============================================================================
// Quote Security & Audit Types
// =============================================================================

// Quote access token types
export type QuoteAccessToken =
  Database['public']['Tables']['quote_access_tokens']['Row'];
export type QuoteAccessTokenInsert =
  Database['public']['Tables']['quote_access_tokens']['Insert'];
export type QuoteAccessTokenUpdate =
  Database['public']['Tables']['quote_access_tokens']['Update'];

// Quote audit log types
export type QuoteAuditLog =
  Database['public']['Tables']['quote_audit_log']['Row'];
export type QuoteAuditLogInsert =
  Database['public']['Tables']['quote_audit_log']['Insert'];

// Audit event types (what happened)
export type QuoteAuditEventType =
  | 'created'
  | 'updated'
  | 'sent'
  | 'resent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'superseded'
  | 'expired';

// Audit actor types (who did it)
export type QuoteAuditActorType = 'admin' | 'customer' | 'system';
