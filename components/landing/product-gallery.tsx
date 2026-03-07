import Image from 'next/image';
import { ImageIcon, Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProductGalleryItem = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  imageSrc?: string;
  imageAlt?: string;
  assetHint?: string;
};

export interface ProductGalleryProps {
  title: string;
  description: string;
  device: 'mobile' | 'desktop';
  items: ProductGalleryItem[];
}

const deviceConfig = {
  mobile: {
    label: 'Mobile',
    icon: Smartphone,
    frameClassName: 'aspect-[9/19]',
    imageSizes: '(max-width: 768px) 100vw, 33vw',
  },
  desktop: {
    label: 'Desktop',
    icon: Monitor,
    frameClassName: 'aspect-[16/10]',
    imageSizes: '(max-width: 768px) 100vw, 50vw',
  },
} as const;

export function ProductGallery({ title, description, device, items }: ProductGalleryProps) {
  const config = deviceConfig[device];
  const DeviceIcon = config.icon;

  return (
    <section className="rounded-3xl border border-border/70 bg-card/85 p-6 shadow-xl backdrop-blur-sm md:p-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <DeviceIcon className="h-3.5 w-3.5" />
            {config.label} view
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{description}</p>
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">
          Technician workflow snapshots
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm">
            <div
              className={cn(
                'relative overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40',
                config.frameClassName
              )}
            >
              {item.imageSrc ? (
                <Image
                  src={item.imageSrc}
                  alt={item.imageAlt ?? item.title}
                  fill
                  sizes={config.imageSizes}
                  className="object-cover object-top"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Screen preview</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      This view sits inside the technician story from first contact through closeout.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                  {config.label}
                </span>
                {item.tags.map((tag) => (
                  <span
                    key={`${item.id}-${tag}`}
                    className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
