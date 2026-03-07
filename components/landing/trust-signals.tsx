import { ShieldCheck, Award, Handshake, User, type LucideIcon } from 'lucide-react';

export interface TrustSignal {
  id: string;
  icon: LucideIcon;
  headline: string;
  description: string;
}

const trustSignals: TrustSignal[] = [
  {
    id: 'one-technician',
    icon: User,
    headline: 'One technician. One point of contact.',
    description:
      'You deal with the same person from diagnosis to final walkthrough — no hand-offs, no runaround.',
  },
  {
    id: 'no-upselling',
    icon: ShieldCheck,
    headline: 'Straight answers, no upsell scripts.',
    description:
      'We tell you what we found, what it costs, and what can wait. No pressure, no surprise line items.',
  },
  {
    id: 'real-experience',
    icon: Award,
    headline: 'Technician-owned and operated.',
    description:
      'No corporate overhead, no call center. You are texting and talking directly with the person doing the work.',
  },
  {
    id: 'honest-service',
    icon: Handshake,
    headline: 'Clear quotes before any work begins.',
    description:
      'You will see the scope and price up front. Nothing starts until you approve it.',
  },
];

export { trustSignals };

/**
 * TrustSignals Component (Grid Layout)
 *
 * Displays trust signals with Lucide icons to build visitor confidence.
 * Responsive: stacked on mobile, 2-column on tablet, 4-column on desktop.
 */
export function TrustSignals() {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
      {trustSignals.map((signal) => {
        const Icon = signal.icon;
        return (
          <div key={signal.id} className="text-center">
            <div className="mb-3 flex justify-center">
              <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">{signal.headline}</h3>
            <p className="text-sm text-muted-foreground">{signal.description}</p>
          </div>
        );
      })}
    </div>
  );
}
