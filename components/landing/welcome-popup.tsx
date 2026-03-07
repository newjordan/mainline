'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  ChevronLeft,
  ChevronRight,
  User,
  ShieldCheck,
  Award,
  Handshake,
} from 'lucide-react';

const STORAGE_KEY = 'mainline-welcome-seen';

/** Compact trust signal data (mirrors trust-signals.tsx but inline for the popup) */
const trustItems = [
  { icon: User, label: 'One tech, one contact' },
  { icon: ShieldCheck, label: 'No upsell scripts' },
  { icon: Award, label: 'Tech-owned & operated' },
  { icon: Handshake, label: 'Clear quotes up front' },
];

type FlowScreen = {
  src: string;
  label: string;
  title?: string;
  description?: string;
};

/** Every screenshot in the app flow, in order */
const mobileFlowScreens: FlowScreen[] = [
  {
    src: '/images/gallery/mobile/01-public-home-mobile.png',
    label: 'Landing Page',
    title: 'Landing Page',
    description:
      'Connect with customers who need your services using simple information and a clear text call to action.',
  },
  {
    src: '/images/gallery/mobile/03-dashboard-home-mobile.png',
    label: 'Dashboard',
    title: 'Dashboard',
    description:
      'Numbers that text in are automatically added to the system and a customer profile is created.',
  },
  {
    src: '/images/gallery/mobile/04-customers-mobile.png',
    label: 'Customers',
    title: 'Customers',
    description:
      'Customers can send images and discuss problems through text message or by calling.',
  },
  {
    src: '/images/gallery/mobile/05-auto-reply-mobile.png',
    label: 'Auto-Reply',
    title: 'Auto-Reply',
    description:
      'Respond to customers with a thumb-friendly, one-click auto-response template system plus full conversation capability.',
  },
  {
    src: '/images/gallery/mobile/06-template-dropdown-mobile.png',
    label: 'Templates',
    title: 'Templates',
    description:
      'Templates include arrival scheduling, analysis, quoting, and invoicing.',
  },
  {
    src: '/images/gallery/mobile/07-quotes-tabs-mobile.png',
    label: 'Quotes',
    title: 'Quotes',
    description:
      'Quotes are generated per issue and per customer, then linked to an automated text system to keep things one-click and thumb-friendly for both contractor and customer, including status notifications for efficiency.',
  },
  {
    src: '/images/gallery/mobile/08-invoices-tabs-mobile.png',
    label: 'Invoices',
    title: 'Invoices',
    description:
      'Invoices can be created on their own or generated from quote approval to create a streamlined one-click path all the way through payment.',
  },
  {
    src: '/images/gallery/mobile/09-photo-gallery-mobile.png',
    label: 'Photos',
    title: 'Photos',
    description:
      'Each customer profile has a photo log where contractors can take photos and send them back and forth privately with the customer. It also serves as a log for contracting work.',
  },
  {
    src: '/images/gallery/mobile/10-quote-detail-mobile.png',
    label: 'Progress Tracking',
    title: 'Progress Tracking',
    description:
      'Quotes and invoices are tracked, and a status notification stays visible so the contractor always knows the state of the customer\'s issue.',
  },
  {
    src: '/images/gallery/mobile/11-quote-create-mobile.png',
    label: 'Create Quote',
    title: 'Create Quote',
    description:
      'A simple thumb-friendly interface creates a unique quote per issue, then sends it to the customer for approval.',
  },
  {
    src: '/images/gallery/mobile/12-invoice-detail-mobile.png',
    label: 'Invoice Details',
    title: 'Invoice Details',
    description:
      'Invoice details can be built from quote approvals and adjusted before sending, so the final bill stays accurate and easy to review.',
  },
  {
    src: '/images/gallery/mobile/13-invoice-create-mobile.png',
    label: 'Invoicing',
    title: 'Invoicing',
    description:
      'Invoice details are built from quote approvals with options for adjustments, then a unique invoice ID is created and sent through the configured payment provider.',
  },
  {
    src: '/images/gallery/mobile/14-search-results-mobile.png',
    label: 'Search',
    title: 'Search',
    description:
      'Search works across all categories, with all data held within each customer profile.',
  },
  {
    src: '/images/gallery/mobile/15-quote-accepted-mobile.png',
    label: 'Quote Accepted',
    title: 'Quote Accepted',
    description:
      'A “Reply Yes” text-based automated quote system gives the contractor a clear record that the customer approved the work.',
  },
  {
    src: '/images/gallery/mobile/16-invoice-send-confirm-mobile.png',
    label: 'Send Invoice',
    title: 'Send Invoice',
    description:
      'Quotes and invoices can be sent conveniently through text or email.',
  },
  {
    src: '/images/gallery/mobile/17-invoice-complete-mobile.png',
    label: 'Invoice Notifications',
    title: 'Invoice Notifications',
    description:
      'Activity tracking lets you know when you have been paid.',
  },
  {
    src: '/images/gallery/mobile/18-quote-document-mobile.png',
    label: 'Quote Form',
    title: 'Quote Form',
    description:
      'Unique documents are auto-created per customer with relevant info, producing easy-to-read and easy-to-approve quotes with all branding included.',
  },
  {
    src: '/images/gallery/mobile/19-invoice-document-mobile.png',
    label: 'Invoice Form',
    title: 'Invoice Form',
    description:
      'Unique documents are auto-created per customer with relevant info, producing easy-to-pay invoices with all branding included and final payment through standard payment providers.',
  },
  {
    src: '/images/gallery/mobile/20-add-customer-mobile.png',
    label: 'Add Customer',
    title: 'Add Customer',
    description:
      'An easy add-customer system allows for rapid human-to-human satisfaction.',
  },
];

const desktopFlowScreens: FlowScreen[] = mobileFlowScreens.map((screen) => ({
  ...screen,
  src: screen.src
    .replace('/images/gallery/mobile/', '/images/gallery/desktop/')
    .replace(/-mobile\.png$/, '-desktop.png'),
}));

interface PreviewCarouselProps {
  title: string;
  description: string;
  device: 'mobile' | 'desktop';
  screens: FlowScreen[];
  activeIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onSelect: (index: number) => void;
}

function PreviewCarousel({
  title,
  description,
  device,
  screens,
  activeIndex,
  onNext,
  onPrevious,
  onSelect,
}: PreviewCarouselProps) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const activeScreen = screens[activeIndex] ?? screens[0];
  const frameClassName =
    device === 'mobile'
      ? 'aspect-[9/19] max-w-[20rem] sm:max-w-[23rem]'
      : 'aspect-[16/10] max-w-4xl';
  const imageSizes =
    device === 'mobile'
      ? '(max-width: 640px) 84vw, 368px'
      : '(max-width: 640px) 92vw, (max-width: 1200px) 80vw, 960px';
  const mobileSideButtonClassName =
    'absolute top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-blue-200 bg-white/95 text-blue-700 shadow-lg backdrop-blur-sm transition hover:scale-[1.03] hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 active:scale-95';

  function handlePreviewClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    onNext();
  }

  function handleTouchStart(event: React.TouchEvent<HTMLButtonElement>) {
    const touch = event.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLButtonElement>) {
    if (touchStartX.current === null || touchStartY.current === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    const swipeThreshold = 40;

    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    suppressClickRef.current = true;

    if (deltaX < 0) {
      onNext();
      return;
    }

    onPrevious();
  }

  function handleTouchCancel() {
    touchStartX.current = null;
    touchStartY.current = null;
  }

  return (
    <section className="mt-8 rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <h3 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            {activeScreen?.title ?? title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600 sm:text-[15px]">
            {activeScreen?.description ?? description}
          </p>
        </div>
        <div className="inline-flex w-fit shrink-0 items-center self-start rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          Screen {activeIndex + 1} of {screens.length}
        </div>
      </div>

      <div
        className={`mt-4 ${device === 'mobile' ? 'mx-auto max-w-[27rem] px-10 sm:max-w-[31rem] sm:px-16' : ''}`}
      >
        <div className={device === 'mobile' ? 'relative' : ''}>
          {device === 'mobile' && (
            <>
              <button
                type="button"
                onClick={onPrevious}
                className={`${mobileSideButtonClassName} left-0`}
                aria-label="Show previous mobile preview"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onNext}
                className={`${mobileSideButtonClassName} right-0`}
                aria-label="Show next mobile preview"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handlePreviewClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            className="block w-full touch-pan-y select-none text-left"
            aria-label={`Show next ${device} preview`}
          >
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
              >
                {screens.map((screen) => (
                  <div key={screen.src} className="w-full shrink-0 basis-full">
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className={`relative flex w-full items-center justify-center overflow-hidden rounded-[1.5rem] border border-gray-200 bg-gray-100 shadow-xl ${frameClassName}`}
                      >
                        <Image
                          src={screen.src}
                          alt={screen.label}
                          fill
                          sizes={imageSizes}
                          className="object-contain p-2 sm:p-3"
                          priority={activeIndex === 0}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </button>
        </div>
      </div>

      <div
        className={`mt-4 ${
          device === 'desktop'
            ? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
            : 'flex justify-center'
        }`}
      >
        {device === 'desktop' ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevious}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {screens.map((screen, index) => (
            <button
              key={screen.src}
              type="button"
              onClick={() => onSelect(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === activeIndex ? 'w-8 bg-blue-600' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to ${screen.label}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Call this from anywhere to re-open the popup */
export const WELCOME_POPUP_EVENT = 'mainline:open-welcome';

export function WelcomePopup() {
  const [open, setOpen] = useState(false);
  const [mobileScreenIndex, setMobileScreenIndex] = useState(0);
  const [desktopScreenIndex, setDesktopScreenIndex] = useState(0);

  function openPopup() {
    setMobileScreenIndex(0);
    setDesktopScreenIndex(0);
    setOpen(true);
  }

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        openPopup();
      }
    } catch {
      // SSR or storage blocked — don't show
    }
  }, []);

  // Listen for re-open event
  useEffect(() => {
    const handler = () => openPopup();
    window.addEventListener(WELCOME_POPUP_EVENT, handler);
    return () => window.removeEventListener(WELCOME_POPUP_EVENT, handler);
  }, []);

  function showPreviousScreen(current: number, total: number) {
    return (current - 1 + total) % total;
  }

  function showNextScreen(current: number, total: number) {
    return (current + 1) % total;
  }

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="relative mx-auto my-6 w-[96vw] max-w-5xl rounded-2xl bg-white shadow-2xl sm:my-10">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 rounded-full bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-5 pb-8 pt-8 sm:px-8 sm:pt-10">
          {/* ── Header ── */}
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            For developers &amp; business owners
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            What does MainLine actually do?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
            MainLine is a mobile-first back-office platform for solo contractors and small field
            service teams. Below is the full application flow — from the customer&apos;s first text
            to a closed-out invoice.
          </p>

          {/* ── Trust signals row ── */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <Icon className="h-4 w-4 shrink-0 text-blue-600" />
                  <span className="text-xs font-medium text-gray-700">{item.label}</span>
                </div>
              );
            })}
          </div>

          <PreviewCarousel
            title="Phone-first field flow"
            description="A larger mobile preview of the full app story. Tap the phone frame or use Next to move through the mobile screens one by one."
            device="mobile"
            screens={mobileFlowScreens}
            activeIndex={mobileScreenIndex}
            onNext={() =>
              setMobileScreenIndex((current) => showNextScreen(current, mobileFlowScreens.length))
            }
            onPrevious={() =>
              setMobileScreenIndex((current) =>
                showPreviousScreen(current, mobileFlowScreens.length)
              )
            }
            onSelect={setMobileScreenIndex}
          />

          <PreviewCarousel
            title="Desktop workspace"
            description="The same workflow on a wider canvas. This preview advances independently, so you can click through desktop views at your own pace."
            device="desktop"
            screens={desktopFlowScreens}
            activeIndex={desktopScreenIndex}
            onNext={() =>
              setDesktopScreenIndex((current) => showNextScreen(current, desktopFlowScreens.length))
            }
            onPrevious={() =>
              setDesktopScreenIndex((current) =>
                showPreviousScreen(current, desktopFlowScreens.length)
              )
            }
            onSelect={setDesktopScreenIndex}
          />

          {/* ── CTA ── */}
          <div className="mt-8 flex flex-col items-center gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-center">
            <button
              onClick={dismiss}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              Got it — explore the site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
