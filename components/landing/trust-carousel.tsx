'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { trustSignals } from './trust-signals';

/**
 * TrustCarousel Component
 *
 * Featured carousel display of trust signals. Auto-advances every 5 seconds.
 * Users can manually navigate with arrows or dots.
 * Mobile-first: full-width cards with prominent messaging.
 */
export function TrustCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % trustSignals.length);
  }, []);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + trustSignals.length) % trustSignals.length);
  }, []);

  const goToSlide = (index: number) => {
    setActiveIndex(index);
  };

  // Auto-advance every 5 seconds unless paused
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const currentSignal = trustSignals[activeIndex];
  const Icon = currentSignal.icon;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Main Card */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-lg">
        {/* Navigation Arrows - Desktop */}
        <button
          onClick={prevSlide}
          className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-md backdrop-blur-sm transition-all hover:bg-background hover:scale-110 md:block"
          aria-label="Previous"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-md backdrop-blur-sm transition-all hover:bg-background hover:scale-110 md:block"
          aria-label="Next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="px-6 py-8 md:px-12 md:py-10">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>

            {/* Headline */}
            <h3 className="mb-3 text-xl font-bold md:text-2xl lg:text-3xl">
              {currentSignal.headline}
            </h3>

            {/* Description */}
            <p className="max-w-md text-base text-muted-foreground md:text-lg leading-relaxed">
              {currentSignal.description}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((activeIndex + 1) / trustSignals.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="mt-4 flex justify-center gap-2">
        {trustSignals.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === activeIndex
                ? 'w-6 bg-primary'
                : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Mobile Swipe Hint */}
      <p className="mt-2 text-center text-xs text-muted-foreground/50 md:hidden">
        Tap arrows or swipe to see more
      </p>

      {/* Mobile Navigation Arrows */}
      <div className="mt-3 flex justify-center gap-4 md:hidden">
        <button
          onClick={prevSlide}
          className="rounded-full bg-muted p-3 transition-colors hover:bg-muted/80 active:scale-95"
          aria-label="Previous"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={nextSlide}
          className="rounded-full bg-muted p-3 transition-colors hover:bg-muted/80 active:scale-95"
          aria-label="Next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
