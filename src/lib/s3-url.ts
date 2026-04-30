import { apiGet } from './api';

/**
 * Convert a stored S3/MinIO public URL into a short-lived signed URL.
 * Stored URLs look like:
 *   https://s3.wasaachat.com/uteo-storage/uteo/resumes/abc.docx
 *   https://uteo-storage.s3.us-east-1.amazonaws.com/uteo/resumes/abc.docx
 *
 * The bucket is private, so the raw URL returns AccessDenied. We extract the
 * object key and ask the backend for a signed GET URL via /media/:key(*).
 */
export function extractS3Key(url: string): string | null {
  try {
    const u = new URL(url);
    // path-style (MinIO): /uteo-storage/uteo/resumes/abc.docx -> strip /uteo-storage/
    // virtual-host (AWS): /uteo/resumes/abc.docx -> already the key
    const parts = u.pathname.replace(/^\//, '').split('/');
    if (parts.length === 0) return null;
    // Heuristic: if first segment is the bucket name, drop it
    if (parts[0] === 'uteo-storage' || parts[0] === 'universal-storage-account3-2026') {
      return parts.slice(1).join('/');
    }
    return parts.join('/');
  } catch {
    return null;
  }
}

export async function getSignedDownloadUrl(rawUrl: string): Promise<string | null> {
  const key = extractS3Key(rawUrl);
  if (!key) return null;
  try {
    const res = await apiGet<{ url: string; key: string }>(`/media/${key}`);
    return res?.url ?? null;
  } catch {
    return null;
  }
}

/** Open a private S3 file in a new tab via a freshly-signed URL. */
export async function openSignedFile(rawUrl: string): Promise<boolean> {
  const signed = await getSignedDownloadUrl(rawUrl);
  if (!signed) return false;
  window.open(signed, '_blank', 'noopener,noreferrer');
  return true;
}
