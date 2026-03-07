'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  KeyRound,
  MessageSquare,
  RefreshCw,
  Server,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  loadSetupWizardSnapshot,
  saveSetupWizardAction,
} from '@/lib/actions/setup-wizard';
import type {
  SetupWizardProviderFields,
  SetupWizardProfileFields,
  SetupWizardSnapshot,
  WizardMode,
} from '@/lib/setup-wizard/types';

interface WebSetupWizardProps {
  initialSnapshot: SetupWizardSnapshot;
}

const secretFieldHelp =
  'Leave blank to keep the currently saved value.';

function statusText(saved: boolean): string {
  return saved ? 'Saved' : 'Missing';
}

export function WebSetupWizard({ initialSnapshot }: WebSetupWizardProps) {
  const [snapshot, setSnapshot] = useState<SetupWizardSnapshot>(initialSnapshot);
  const [mode, setMode] = useState<WizardMode>('full');
  const [profile, setProfile] = useState<SetupWizardProfileFields>(initialSnapshot.profile);
  const [providers, setProviders] = useState<SetupWizardProviderFields>(
    initialSnapshot.providers
  );
  const [saveMessage, setSaveMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, startSave] = useTransition();
  const [isRefreshing, startRefresh] = useTransition();

  const groupedChecks = useMemo(() => {
    return {
      core: snapshot.checks.filter((check) => check.group === 'Core App'),
      twilio: snapshot.checks.filter((check) => check.group === 'Twilio SMS'),
      payments: snapshot.checks.filter((check) => check.group === 'Payments'),
    };
  }, [snapshot.checks]);

  const allChecksReady = snapshot.checks.every((check) => check.ready);
  const paymentsEnabled = providers.paymentProvider === 'square';

  function updateProfileField<K extends keyof SetupWizardProfileFields>(
    key: K,
    value: SetupWizardProfileFields[K]
  ) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function updateProviderField<K extends keyof SetupWizardProviderFields>(
    key: K,
    value: SetupWizardProviderFields[K]
  ) {
    setProviders((prev) => ({ ...prev, [key]: value }));
  }

  function refreshSnapshot() {
    setSaveMessage('');
    setErrorMessage('');

    startRefresh(async () => {
      const result = await loadSetupWizardSnapshot();
      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setSnapshot(result.data);
      setProfile(result.data.profile);
      setProviders(result.data.providers);
      setSaveMessage('Latest values loaded from project files.');
    });
  }

  function saveWizard() {
    setSaveMessage('');
    setErrorMessage('');

    startSave(async () => {
      const result = await saveSetupWizardAction({
        mode,
        profile,
        providers,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setSnapshot(result.data);
      setProfile(result.data.profile);
      setProviders(result.data.providers);
      setSaveMessage(
        mode === 'doctor'
          ? 'Project Doctor completed. Files updated.'
          : 'Full setup saved. Files updated.'
      );
    });
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-3xl font-black tracking-tight md:text-4xl">
              Easy Setup Wizard
            </CardTitle>
            <CardDescription className="text-base md:text-lg">
              Big buttons. Clear steps. No coding required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              This page updates your project config files:
              {' '}
              <code>config/business-profile.json</code>,
              {' '}
              <code>.env.local</code>,
              {' '}
              and
              {' '}
              <code>{snapshot.onboardingStatusPath}</code>.
            </p>
            <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed md:text-base">
              <p className="font-semibold">What this software does:</p>
              <p className="mt-2 text-muted-foreground">
                Handles customer texts, quotes, invoices, and payment links in one place.
                You connect Supabase, Twilio, Vercel, and optional Square payments.
              </p>
            </div>
            {!snapshot.editable && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                <p className="flex items-center gap-2 font-semibold text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  Editing is locked
                </p>
                <p className="mt-1 text-amber-200">{snapshot.editableReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-xl font-extrabold">Step 1: Choose Mode</CardTitle>
            <CardDescription>
              Full Setup = business + provider settings. Project Doctor = provider settings only.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('full')}
              className={`rounded-xl border-2 p-5 text-left transition ${
                mode === 'full'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <p className="text-lg font-extrabold">1) Full Setup</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Best for first-time install.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode('doctor')}
              className={`rounded-xl border-2 p-5 text-left transition ${
                mode === 'doctor'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <p className="text-lg font-extrabold">2) Project Doctor</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Best for fixing broken API keys later.
              </p>
            </button>
          </CardContent>
        </Card>

        {mode === 'full' && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-xl font-extrabold">Step 2: Business Basics</CardTitle>
              <CardDescription>
                These fields control your branding and landing page text.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field
                label="Business Name"
                value={profile.companyName}
                onChange={(value) => updateProfileField('companyName', value)}
              />
              <Field
                label="Short Name (Header)"
                value={profile.companyShortName}
                onChange={(value) => updateProfileField('companyShortName', value)}
              />
              <Field
                label="Owner Display Name"
                value={profile.ownerDisplayName}
                onChange={(value) => updateProfileField('ownerDisplayName', value)}
              />
              <Field
                label="Service Type"
                value={profile.industryDescription}
                onChange={(value) => updateProfileField('industryDescription', value)}
              />
              <Field
                label="Tagline"
                value={profile.tagline}
                onChange={(value) => updateProfileField('tagline', value)}
              />
              <Field
                label="Service Area Label"
                value={profile.serviceAreaLabel}
                onChange={(value) => updateProfileField('serviceAreaLabel', value)}
              />
              <Field
                label="City"
                value={profile.serviceAreaCity}
                onChange={(value) => updateProfileField('serviceAreaCity', value)}
              />
              <Field
                label="State/Region"
                value={profile.serviceAreaRegion}
                onChange={(value) => updateProfileField('serviceAreaRegion', value)}
              />
              <Field
                label="Country Code"
                value={profile.serviceAreaCountry}
                onChange={(value) => updateProfileField('serviceAreaCountry', value)}
              />
            </CardContent>
          </Card>
        )}

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-xl font-extrabold">
              {mode === 'doctor' ? 'Step 2: Provider Keys (Project Doctor)' : 'Step 3: Provider Keys'}
            </CardTitle>
            <CardDescription>
                Supabase, Twilio, Vercel, and optional payment settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <p className="mb-2 text-sm font-semibold">Payment Provider</p>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => updateProviderField('paymentProvider', 'square')}
                  className={`rounded-lg border-2 p-4 text-left ${
                    paymentsEnabled ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <p className="font-bold">Square</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enable pay-by-link invoices with Square checkout.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => updateProviderField('paymentProvider', 'none')}
                  className={`rounded-lg border-2 p-4 text-left ${
                    !paymentsEnabled ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <p className="font-bold">None</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Run the app without online payment links for now.
                  </p>
                </button>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <Field
                label="Public Website URL (NEXT_PUBLIC_SITE_URL)"
                value={providers.websiteUrl}
                onChange={(value) => updateProviderField('websiteUrl', value)}
              />
              <Field
                label="Admin Emails (ALLOWED_EMAILS, comma-separated)"
                value={providers.allowedEmailsCsv}
                onChange={(value) => updateProviderField('allowedEmailsCsv', value)}
              />
              <Field
                label="Text Number (TWILIO_PHONE_NUMBER)"
                value={providers.smsPhoneE164}
                onChange={(value) => updateProviderField('smsPhoneE164', value)}
              />
              <Field
                label="Call Number (BUSINESS_PHONE_NUMBER)"
                value={providers.callPhoneE164}
                onChange={(value) => updateProviderField('callPhoneE164', value)}
              />
              <Field
                label="Admin Alert Number (ADMIN_PHONE_NUMBER)"
                value={providers.adminPhoneE164}
                onChange={(value) => updateProviderField('adminPhoneE164', value)}
              />
              <Field
                label="Supabase URL (NEXT_PUBLIC_SUPABASE_URL)"
                value={providers.supabaseUrl}
                onChange={(value) => updateProviderField('supabaseUrl', value)}
              />
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <SecretField
                label={`Supabase Anon Key (${statusText(snapshot.secretStatus.supabaseAnonKeySaved)})`}
                value={providers.supabaseAnonKey}
                onChange={(value) => updateProviderField('supabaseAnonKey', value)}
              />
              <SecretField
                label={`Supabase Service Role Key (${statusText(snapshot.secretStatus.supabaseServiceRoleKeySaved)})`}
                value={providers.supabaseServiceRoleKey}
                onChange={(value) => updateProviderField('supabaseServiceRoleKey', value)}
              />
              <SecretField
                label={`Twilio Account SID (${statusText(snapshot.secretStatus.twilioAccountSidSaved)})`}
                value={providers.twilioAccountSid}
                onChange={(value) => updateProviderField('twilioAccountSid', value)}
              />
              <SecretField
                label={`Twilio Auth Token (${statusText(snapshot.secretStatus.twilioAuthTokenSaved)})`}
                value={providers.twilioAuthToken}
                onChange={(value) => updateProviderField('twilioAuthToken', value)}
              />
              <SecretField
                label={`Cron Secret (${statusText(snapshot.secretStatus.cronSecretSaved)})`}
                value={providers.cronSecret}
                onChange={(value) => updateProviderField('cronSecret', value)}
              />
              {paymentsEnabled && (
                <>
                  <SecretField
                    label={`Square Access Token (${statusText(snapshot.secretStatus.squareAccessTokenSaved)})`}
                    value={providers.squareAccessToken}
                    onChange={(value) => updateProviderField('squareAccessToken', value)}
                  />
                  <Field
                    label={`Square Location ID (${statusText(snapshot.secretStatus.squareLocationIdSaved)})`}
                    value={providers.squareLocationId}
                    onChange={(value) => updateProviderField('squareLocationId', value)}
                  />
                  <SecretField
                    label={`Square Webhook Signature Key (${statusText(snapshot.secretStatus.squareWebhookSignatureKeySaved)})`}
                    value={providers.squareWebhookSignatureKey}
                    onChange={(value) => updateProviderField('squareWebhookSignatureKey', value)}
                  />
                </>
              )}
            </section>

            {paymentsEnabled ? (
              <section>
                <p className="mb-2 text-sm font-semibold">Square Environment</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateProviderField('squareEnvironment', 'production')}
                    className={`rounded-lg border-2 p-4 text-left ${
                      providers.squareEnvironment === 'production'
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                  >
                    <p className="font-bold">Production</p>
                    <p className="mt-1 text-xs text-muted-foreground">Real customer payments</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProviderField('squareEnvironment', 'sandbox')}
                    className={`rounded-lg border-2 p-4 text-left ${
                      providers.squareEnvironment === 'sandbox'
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                  >
                    <p className="font-bold">Sandbox</p>
                    <p className="mt-1 text-xs text-muted-foreground">Test payments only</p>
                  </button>
                </div>
              </section>
            ) : (
              <section className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                Online payment links are disabled. You can enable Square later by switching the
                payment provider above.
              </section>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-xl font-extrabold">
              {mode === 'doctor' ? 'Step 3: Run Project Doctor' : 'Step 4: Save Setup'}
            </CardTitle>
            <CardDescription>
              Save your changes, then check the status panel below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={saveWizard}
                disabled={!snapshot.editable || isSaving}
                size="lg"
                className="h-14 flex-1 text-base font-extrabold"
              >
                <Wrench className="h-5 w-5" />
                {isSaving
                  ? 'Saving...'
                  : mode === 'doctor'
                    ? 'Run Project Doctor'
                    : 'Save Full Setup'}
              </Button>
              <Button
                onClick={refreshSnapshot}
                disabled={isRefreshing}
                size="lg"
                variant="outline"
                className="h-14 flex-1 text-base font-bold"
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh From Files
              </Button>
            </div>

            {saveMessage && (
              <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {saveMessage}
              </p>
            )}
            {errorMessage && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-extrabold">
              {allChecksReady ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              )}
              Setup Health Check
            </CardTitle>
            <CardDescription>
              Green means saved. TODO means you still need to fill that key.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <CheckGroup title="Core App" icon={<Server className="h-4 w-4" />} items={groupedChecks.core} />
            <CheckGroup title="Twilio SMS" icon={<MessageSquare className="h-4 w-4" />} items={groupedChecks.twilio} />
            <CheckGroup
              title={paymentsEnabled ? 'Payments (Square)' : 'Payments'}
              icon={<CreditCard className="h-4 w-4" />}
              items={groupedChecks.payments}
            />
            <p className="text-xs text-muted-foreground">
              Latest status file: <code>{snapshot.onboardingStatusPath}</code>
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <KeyRound className="h-4 w-4" />
              API Key Safety
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Secrets are never shown back in the form after save.</p>
            <p>{secretFieldHelp}</p>
            <p>Never commit <code>.env.local</code> to git.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 text-base"
      />
    </label>
  );
}

function SecretField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <Input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={secretFieldHelp}
        className="h-12 text-base"
      />
    </label>
  );
}

function CheckGroup({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: SetupWizardSnapshot['checks'];
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-bold">
        {icon}
        {title}
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-md border p-2">
            <span className="text-sm">{item.label}</span>
            <span className={`text-xs font-semibold ${item.ready ? 'text-emerald-400' : 'text-amber-400'}`}>
              {item.ready ? 'OK' : 'TODO'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
