'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { sendMediaMessage } from '@/lib/actions/messages';
import { uploadCustomerPhoto } from '@/lib/actions/customer-photos';
import { Button } from '@/components/ui/button';

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface CustomerPhoto {
  id: string;
  url: string;
  sendRef: string;
  created_at: string;
  direction: 'inbound' | 'outbound' | null;
  source: 'saved' | 'message';
}

interface CustomerPhotoGalleryProps {
  customerId: string;
  photos: CustomerPhoto[];
}

function getUploadErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Failed to upload photo';
  }

  const message = error.message.toLowerCase();
  if (
    message.includes('body exceeded') ||
    message.includes('body size') ||
    message.includes('413') ||
    message.includes('entity too large')
  ) {
    return 'Photo is too large to upload. Please use a smaller image (10 MB max).';
  }

  return error.message || 'Failed to upload photo';
}

/**
 * Displays customer MMS photos and allows re-sending any photo via SMS.
 */
export function CustomerPhotoGallery({
  customerId,
  photos,
}: CustomerPhotoGalleryProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sendingPhotoId, setSendingPhotoId] = useState<string | null>(null);

  async function handleUpload() {
    if (!selectedFile || isUploading) return;
    if (selectedFile.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.error('Photo is too large. Please choose an image 10 MB or smaller.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set('customer_id', customerId);
      formData.set('photo', selectedFile);

      const result = await uploadCustomerPhoto(formData);
      if (!result.success) {
        toast.error(result.error || 'Failed to upload photo');
        return;
      }

      toast.success('Photo saved to customer');
      setSelectedFile(null);
      router.refresh();
    } catch (error) {
      toast.error(getUploadErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleResend(photoId: string, sendRef: string) {
    if (sendingPhotoId) return;

    setSendingPhotoId(photoId);
    try {
      const result = await sendMediaMessage(customerId, sendRef);
      if (!result.success) {
        toast.error(result.error || 'Failed to send photo');
        return;
      }

      toast.success('Photo sent to customer');
      router.refresh();
    } catch {
      toast.error('Failed to send photo');
    } finally {
      setSendingPhotoId(null);
    }
  }

  if (photos.length === 0 && !selectedFile) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border bg-card p-4">
          <label className="mb-2 block text-sm font-medium">Upload Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="block w-full text-sm"
            disabled={isUploading}
          />
          <Button
            type="button"
            className="mt-3"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Save Photo
          </Button>
        </div>
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          No customer photos yet. Upload one here, or incoming MMS photos will appear automatically.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-4">
        <label className="mb-2 block text-sm font-medium">Upload Photo</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          className="block w-full text-sm"
          disabled={isUploading}
        />
        <Button
          type="button"
          className="mt-3"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Save Photo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {photos.map((photo) => {
          const isSending = sendingPhotoId === photo.id;
          const sourceLabel =
            photo.source === 'saved'
              ? 'saved'
              : photo.direction
                ? `msg:${photo.direction}`
                : 'message';
          return (
            <div key={photo.id} className="rounded-lg border bg-card p-3">
              <a href={photo.url} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt="Customer attachment"
                  className="h-48 w-full rounded object-cover"
                />
              </a>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(photo.created_at).toLocaleDateString()} • {sourceLabel}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleResend(photo.id, photo.sendRef)}
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
