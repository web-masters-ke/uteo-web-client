'use client';

import { useState, useEffect, useRef } from 'react';
import { getSignedDownloadUrl } from '@/lib/s3-url';

interface SmartImgProps {
  src?: string | null;
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  fallback?: React.ReactNode;
}

/**
 * Renders an img tag that gracefully handles private S3 URLs.
 * First attempt uses the raw URL (works immediately for public objects).
 * If the request returns a 403/error, we fetch a short-lived signed URL
 * via /media/:key and retry silently — no broken-image flash.
 */
export default function SmartImg({ src, alt = '', className, loading = 'lazy', fallback }: SmartImgProps) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(src ?? null);
  const [failed, setFailed] = useState(false);
  const retried = useRef(false);

  useEffect(() => {
    retried.current = false;
    setFailed(false);
    setDisplaySrc(src ?? null);
  }, [src]);

  const handleError = async () => {
    if (retried.current || !src) { setFailed(true); return; }
    retried.current = true;
    const signed = await getSignedDownloadUrl(src);
    if (signed) {
      setDisplaySrc(signed);
    } else {
      setFailed(true);
    }
  };

  if (failed || !displaySrc) return fallback ? <>{fallback}</> : null;

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={handleError}
    />
  );
}
