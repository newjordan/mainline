import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { WebSetupWizard } from '@/components/setup/web-setup-wizard';
import { getSetupWizardSnapshot } from '@/lib/setup-wizard/manager';
import { isSetupWizardWebEnabled } from '@/lib/setup-wizard/web-access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Easy Setup Wizard',
  description: 'Beginner-friendly setup and Project Doctor for provider keys.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SetupWizardPage() {
  if (!isSetupWizardWebEnabled()) {
    redirect('/auth/login');
  }

  const snapshot = getSetupWizardSnapshot();
  return <WebSetupWizard initialSnapshot={snapshot} />;
}
