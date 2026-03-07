'use client';

import { Info } from 'lucide-react';
import { WELCOME_POPUP_EVENT } from './welcome-popup';

/**
 * Small floating button that re-opens the welcome popup.
 * Sits in the top-right corner of the landing page so returning
 * visitors (or the developer themselves) can always get back to it.
 */
export function WelcomeTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(WELCOME_POPUP_EVENT))}
      className="fixed right-4 top-4 z-50 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-gray-900 hover:shadow-md"
      aria-label="Learn about MainLine software"
    >
      <Info className="h-3.5 w-3.5" />
      What is this?
    </button>
  );
}

