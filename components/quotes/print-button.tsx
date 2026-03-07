'use client';

import { Printer } from 'lucide-react';

/**
 * PrintButton Component
 *
 * Client component that triggers browser print dialog.
 * Works on mobile (Save to PDF) and desktop (Print/PDF).
 */
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100"
    >
      <Printer className="h-4 w-4" />
      Print / Save PDF
    </button>
  );
}
