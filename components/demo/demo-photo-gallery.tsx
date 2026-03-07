'use client';

import { useState } from 'react';
import { Loader2, Send, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { DemoPhoto } from '@/lib/demo/demo-data';
import { Button } from '@/components/ui/button';

interface DemoPhotoGalleryProps {
  photos: DemoPhoto[];
}

/**
 * Simulated photo library for demo mode.
 * Shows how per-customer photo sets can be saved and re-sent.
 */
export function DemoPhotoGallery({ photos }: DemoPhotoGalleryProps) {
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [sendingPhotoId, setSendingPhotoId] = useState<string | null>(null);

  const handleSimulatedSave = async () => {
    if (!selectedFileName || isSaving) return;
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    toast.success('Photo saved (simulated)');
    setSelectedFileName('');
    setIsSaving(false);
  };

  const handleSimulatedSend = async (photoId: string) => {
    if (sendingPhotoId) return;
    setSendingPhotoId(photoId);
    await new Promise((resolve) => setTimeout(resolve, 350));
    toast.success('Photo sent to customer (simulated)');
    setSendingPhotoId(null);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Simulated media library. Each customer keeps their own photo set.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm"
            onChange={(event) =>
              setSelectedFileName(event.target.files?.[0]?.name ?? '')
            }
            disabled={isSaving}
          />
          <Button
            type="button"
            onClick={handleSimulatedSave}
            disabled={!selectedFileName || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Save (Simulated)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {photos.map((photo) => {
          const isSending = sendingPhotoId === photo.id;
          return (
            <div key={photo.id} className="rounded-lg border bg-card p-3">
              <a href={photo.url} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.label}
                  className="h-44 w-full rounded object-cover"
                />
              </a>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{photo.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {photo.source} • {new Date(photo.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSimulatedSend(photo.id)}
                  disabled={isSending}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

