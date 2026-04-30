import type { Metadata } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.uteo.ai/api/v1';
const SITE_URL = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://uteo.ai';

interface JobMeta {
  id: string;
  title: string;
  description?: string;
  posterUrl?: string | null;
  location?: string | null;
  jobType?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  company?: { name?: string; logoUrl?: string | null };
}

async function fetchJob(id: string): Promise<JobMeta | null> {
  try {
    const r = await fetch(`${API_URL}/jobs/${id}`, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    const body = await r.json();
    return body?.data ?? body ?? null;
  } catch {
    return null;
  }
}

function formatSalary(j: JobMeta): string | null {
  if (!j.salaryMin && !j.salaryMax) return null;
  const cur = j.currency || 'KES';
  const fmt = (n?: number | null) => n ? `${cur} ${(n / 1000).toFixed(0)}k` : '';
  if (j.salaryMin && j.salaryMax) return `${fmt(j.salaryMin)}–${fmt(j.salaryMax)}`;
  return fmt(j.salaryMin || j.salaryMax);
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const job = await fetchJob(params.id);
  if (!job) return { title: 'Job · Uteo' };

  const company = job.company?.name || 'A company';
  const title = `${company} is hiring: ${job.title}`;
  const salary = formatSalary(job);
  const bits = [job.location, job.jobType?.replace(/_/g, ' ').toLowerCase(), salary].filter(Boolean);
  const description = `${bits.join(' · ')}${bits.length ? ' · ' : ''}Apply on Uteo — your dream job finds you.`;

  // Prefer the per-job poster, fall back to company logo, then site default
  const ogImage = job.posterUrl || job.company?.logoUrl || `${SITE_URL}/og-default.png`;

  const url = `${SITE_URL}/jobs/${job.id}`;

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'Uteo',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${company} — ${job.title}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    alternates: { canonical: url },
  };
}

export default function JobLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
