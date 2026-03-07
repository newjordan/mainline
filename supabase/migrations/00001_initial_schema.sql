-- Migration: Initial public baseline schema
-- Purpose: Clean fresh-install schema for the public MainLine repo

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_quote_short_ref()
RETURNS TRIGGER AS $$
BEGIN
  NEW.short_ref := 'Q-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  name text,
  address text,
  unit_info text,
  sms_consent boolean DEFAULT false NOT NULL,
  sms_consent_at timestamptz,
  conversation_stage text DEFAULT 'open' NOT NULL CHECK (conversation_stage IN (
    'awaiting_problem',
    'awaiting_name',
    'awaiting_address',
    'awaiting_unit',
    'intake_complete',
    'open'
  )),
  additional_addresses text[] NOT NULL DEFAULT '{}',
  email text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body text NOT NULL,
  media_urls text[],
  twilio_sid text,
  status text DEFAULT 'sent' NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'undelivered')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  description text NOT NULL,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_cents integer NOT NULL,
  status text DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  google_doc_url text,
  version integer DEFAULT 1 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  accepted_at timestamptz,
  parent_quote_id uuid REFERENCES quotes(id),
  superseded_at timestamptz,
  short_ref text UNIQUE NOT NULL,
  confirmation_code text,
  archived_at timestamptz,
  completed_at timestamptz,
  service_address text
);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  status text DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  stripe_payment_link text,
  stripe_payment_id text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  adjustment_note text,
  job_description text,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz,
  archived_at timestamptz,
  service_address text
);

CREATE TABLE webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(provider, event_id)
);

CREATE TABLE message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  body text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE quote_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT quote_access_tokens_token_length CHECK (char_length(token) >= 32)
);

CREATE TABLE quote_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_type text NOT NULL,
  actor_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT quote_audit_log_event_type_check CHECK (event_type IN (
    'created', 'updated', 'sent', 'resent', 'viewed', 'accepted', 'rejected', 'superseded', 'expired'
  )),
  CONSTRAINT quote_audit_log_actor_type_check CHECK (actor_type IN ('admin', 'customer', 'system'))
);

CREATE TABLE customer_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  url text NOT NULL,
  file_path text NOT NULL UNIQUE,
  file_name text,
  content_type text,
  size_bytes integer,
  source text NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'inbound_message', 'outbound_message')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE OR REPLACE FUNCTION generate_quote_confirmation_code()
RETURNS text AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := LPAD((1000 + FLOOR(RANDOM() * 9000))::integer::text, 4, '0');

    SELECT EXISTS(
      SELECT 1 FROM quotes
      WHERE confirmation_code = new_code
        AND status = 'sent'
        AND superseded_at IS NULL
    ) INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX idx_customers_sms_consent ON customers (sms_consent) WHERE sms_consent = true;
CREATE INDEX idx_customers_conversation_stage ON customers (conversation_stage);
CREATE INDEX idx_customers_email ON customers (email);
CREATE INDEX idx_customers_name_trgm ON customers USING gin (coalesce(name, '') gin_trgm_ops);
CREATE INDEX idx_customers_phone_trgm ON customers USING gin (phone_number gin_trgm_ops);

CREATE INDEX idx_messages_customer_id ON messages (customer_id);
CREATE INDEX idx_messages_created_at ON messages (created_at DESC);
CREATE INDEX idx_messages_customer_created ON messages (customer_id, created_at DESC);

CREATE INDEX idx_quotes_customer_id ON quotes (customer_id);
CREATE INDEX idx_quotes_status ON quotes (status);
CREATE INDEX idx_quotes_customer_status ON quotes (customer_id, status);
CREATE INDEX idx_quotes_parent_quote_id ON quotes (parent_quote_id);
CREATE INDEX idx_quotes_confirmation_code ON quotes (confirmation_code)
  WHERE status = 'sent' AND confirmation_code IS NOT NULL;
CREATE INDEX idx_quotes_archived_at ON quotes (archived_at);
CREATE INDEX idx_quotes_completed_at ON quotes (completed_at);
CREATE INDEX idx_quotes_active_feed_created_at ON quotes (created_at DESC)
  WHERE superseded_at IS NULL AND archived_at IS NULL;
CREATE INDEX idx_quotes_customer_feed_created_at ON quotes (customer_id, created_at DESC);
CREATE INDEX idx_quotes_short_ref_trgm ON quotes USING gin (short_ref gin_trgm_ops);

CREATE INDEX idx_invoices_customer_id ON invoices (customer_id);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_invoices_customer_status ON invoices (customer_id, status);
CREATE INDEX idx_invoices_quote_id ON invoices (quote_id);
CREATE INDEX idx_invoices_completed_at ON invoices (completed_at);
CREATE INDEX idx_invoices_archived_at ON invoices (archived_at);
CREATE INDEX idx_invoices_active_feed_created_at ON invoices (created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX idx_invoices_customer_feed_created_at ON invoices (customer_id, created_at DESC);
CREATE INDEX idx_invoices_id_trgm ON invoices USING gin ((id::text) gin_trgm_ops);

CREATE INDEX idx_message_templates_is_active ON message_templates (is_active) WHERE is_active = true;

CREATE INDEX idx_quote_access_tokens_token ON quote_access_tokens (token) WHERE revoked_at IS NULL;
CREATE INDEX idx_quote_access_tokens_quote_id ON quote_access_tokens (quote_id);

CREATE INDEX idx_quote_audit_log_quote_id ON quote_audit_log (quote_id);
CREATE INDEX idx_quote_audit_log_created_at ON quote_audit_log (created_at DESC);
CREATE INDEX idx_quote_audit_log_event_type ON quote_audit_log (event_type);

CREATE INDEX idx_customer_photos_customer_id ON customer_photos (customer_id);
CREATE INDEX idx_customer_photos_created_at ON customer_photos (created_at DESC);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER quotes_generate_short_ref
  BEFORE INSERT ON quotes
  FOR EACH ROW
  WHEN (NEW.short_ref IS NULL)
  EXECUTE FUNCTION generate_quote_short_ref();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER customer_photos_updated_at
  BEFORE UPDATE ON customer_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on customers"
  ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access on messages"
  ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access on quotes"
  ON quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access on invoices"
  ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access on message_templates"
  ON message_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin read access on quote_audit_log"
  ON quote_audit_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin full access on customer_photos"
  ON customer_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE customers IS 'Customer records for the service business, created from inbound SMS';
COMMENT ON COLUMN customers.phone_number IS 'E.164 format phone number, unique identifier for customer contact';
COMMENT ON COLUMN customers.address IS 'Primary billing address for customer profile';
COMMENT ON COLUMN customers.unit_info IS 'Equipment/service information provided by customer';
COMMENT ON COLUMN customers.sms_consent IS 'Whether customer has opted in to receive SMS messages';
COMMENT ON COLUMN customers.sms_consent_at IS 'Timestamp when customer opted in or out';
COMMENT ON COLUMN customers.conversation_stage IS 'Guided intake flow stage for dashboard-driven customer intake';
COMMENT ON COLUMN customers.additional_addresses IS 'Additional customer addresses (secondary properties, locations, or sites)';
COMMENT ON COLUMN customers.email IS 'Optional customer email used for receipts and communication records';

COMMENT ON TABLE messages IS 'SMS/MMS message history for customer conversations';
COMMENT ON COLUMN messages.direction IS 'Message direction: inbound (from customer) or outbound (to customer)';
COMMENT ON COLUMN messages.body IS 'Message text content';
COMMENT ON COLUMN messages.media_urls IS 'Array of URLs for MMS media attachments (photos). Twilio supports up to 10 per message.';
COMMENT ON COLUMN messages.twilio_sid IS 'Twilio message SID for tracking and debugging';
COMMENT ON COLUMN messages.status IS 'Delivery status from Twilio: queued, sent, delivered, failed, undelivered';

COMMENT ON TABLE quotes IS 'Service quotes linked to Google Docs';
COMMENT ON COLUMN quotes.line_items IS 'JSONB array of quote line items: [{description, amount_cents}]';
COMMENT ON COLUMN quotes.total_cents IS 'Total quote amount in cents to avoid floating point issues';
COMMENT ON COLUMN quotes.status IS 'Quote lifecycle: draft -> sent -> accepted/rejected';
COMMENT ON COLUMN quotes.google_doc_url IS 'URL to generated Google Doc for customer viewing';
COMMENT ON COLUMN quotes.version IS 'Quote version number for revision tracking';
COMMENT ON COLUMN quotes.accepted_at IS 'Timestamp when customer accepted the quote';
COMMENT ON COLUMN quotes.parent_quote_id IS 'References the previous version of this quote (NULL for v1)';
COMMENT ON COLUMN quotes.superseded_at IS 'Timestamp when this quote was replaced by a newer version';
COMMENT ON COLUMN quotes.short_ref IS 'Human-readable reference like Q-1A2B3C for SMS and display';
COMMENT ON COLUMN quotes.confirmation_code IS '4-digit code for SMS acceptance (e.g. reply YES 1234)';
COMMENT ON COLUMN quotes.archived_at IS 'Timestamp when quote was archived from active operations views';
COMMENT ON COLUMN quotes.completed_at IS 'Timestamp when associated job/work was marked complete';
COMMENT ON COLUMN quotes.service_address IS 'Service location for this quote; may differ from customer billing address';
COMMENT ON FUNCTION generate_quote_confirmation_code() IS 'Generates unique 4-digit code among active sent quotes';

COMMENT ON TABLE invoices IS 'Payment invoices generated from accepted quotes';
COMMENT ON COLUMN invoices.quote_id IS 'Reference to source quote (NULL if invoice created directly)';
COMMENT ON COLUMN invoices.amount_cents IS 'Invoice amount in cents to avoid floating point issues';
COMMENT ON COLUMN invoices.status IS 'Invoice lifecycle: draft -> sent -> paid/overdue';
COMMENT ON COLUMN invoices.stripe_payment_link IS 'Column storing the payment link URL from the active provider';
COMMENT ON COLUMN invoices.stripe_payment_id IS 'Column storing the provider payment reference or payment ID';
COMMENT ON COLUMN invoices.sent_at IS 'Timestamp when invoice was sent to customer via SMS';
COMMENT ON COLUMN invoices.paid_at IS 'Timestamp when payment was confirmed by a payment webhook';
COMMENT ON COLUMN invoices.adjustment_note IS 'Optional note explaining final invoice amount adjustments or invoice-specific details';
COMMENT ON COLUMN invoices.job_description IS 'Optional customer-facing job summary for the invoice';
COMMENT ON COLUMN invoices.line_items IS 'Optional JSONB array of invoice line items: [{description, amount_cents}]';
COMMENT ON COLUMN invoices.completed_at IS 'Timestamp when the associated job/work was marked complete';
COMMENT ON COLUMN invoices.archived_at IS 'Timestamp when invoice was archived from active operational views';
COMMENT ON COLUMN invoices.service_address IS 'Service location for this invoice; may differ from customer billing address';

COMMENT ON TABLE webhook_events IS 'Webhook idempotency tracking - prevents duplicate processing';
COMMENT ON COLUMN webhook_events.provider IS 'Webhook source: twilio, square, etc.';
COMMENT ON COLUMN webhook_events.event_id IS 'Unique event ID from provider (MessageSid, Square event ID, etc.)';
COMMENT ON COLUMN webhook_events.event_type IS 'Type of event: message.received, payment.completed, etc.';
COMMENT ON COLUMN webhook_events.processed_at IS 'When the webhook was successfully processed';

COMMENT ON TABLE message_templates IS 'Reusable SMS message templates for quick responses';
COMMENT ON COLUMN message_templates.name IS 'Template name for admin display';
COMMENT ON COLUMN message_templates.body IS 'Template message body with optional placeholders';
COMMENT ON COLUMN message_templates.is_active IS 'Whether template is available for use';

COMMENT ON TABLE quote_access_tokens IS 'Secure access tokens for public quote URLs. Tokens are 64-char hex strings that expire after 30 days.';
COMMENT ON COLUMN quote_access_tokens.token IS 'Cryptographically secure 64-character hex token';
COMMENT ON COLUMN quote_access_tokens.expires_at IS 'Token expiration (default 30 days from creation)';
COMMENT ON COLUMN quote_access_tokens.revoked_at IS 'Set when quote is superseded or manually revoked';

COMMENT ON TABLE quote_audit_log IS 'Immutable audit trail of all quote operations for compliance and debugging';
COMMENT ON COLUMN quote_audit_log.event_type IS 'Type of event: created, updated, sent, resent, viewed, accepted, rejected, superseded, expired';
COMMENT ON COLUMN quote_audit_log.actor_type IS 'Who performed the action: admin, customer, or system';
COMMENT ON COLUMN quote_audit_log.actor_id IS 'Identifier for actor (customer_id, admin name, or process name)';
COMMENT ON COLUMN quote_audit_log.metadata IS 'Additional context (confirmation_code, message_sid, parent_quote_id, etc.)';

COMMENT ON TABLE customer_photos IS 'Saved customer photos for field documentation and resend workflows';
COMMENT ON COLUMN customer_photos.url IS 'Internal media reference (customer-media://path). Signed URLs are generated per request.';
COMMENT ON COLUMN customer_photos.file_path IS 'Supabase storage path in customer-media bucket';
COMMENT ON COLUMN customer_photos.source IS 'upload (dashboard) or captured from inbound/outbound MMS';

INSERT INTO message_templates (name, body, is_active) VALUES
  ('New Customer Welcome', 'Thanks for reaching out! Can you describe the issue you''re experiencing and provide your address?', true),
  ('Quote Sent', 'Hi! I''ve sent you a quote for the work we discussed. You can view it here: {{quote_url}}. Reply YES to accept.', true),
  ('Quote Accepted', 'Great! Your quote has been accepted. I''ll be in touch to schedule the work.', true),
  ('Invoice Sent', 'Your invoice is ready! You can pay securely here: {{payment_url}}. Thank you for your business!', true),
  ('Payment Received', 'Payment received - thank you! Please let me know if you have any questions.', true),
  ('Schedule Confirmation', 'You''re scheduled for {{date}}. I''ll reach out the day before to confirm. Thanks!', true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-media', 'customer-media', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;