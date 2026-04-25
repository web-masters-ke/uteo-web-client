"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import {
  certificatesService,
  type Certificate,
} from "@/lib/services/certificates";

function formatGrade(grade?: number | string): string {
  if (grade == null || grade === "") return "—";
  const n = typeof grade === "string" ? parseFloat(grade) : grade;
  if (Number.isNaN(n)) return String(grade);
  return `${n.toFixed(1)}%`;
}

function deriveLetter(grade?: number | string, existing?: string): string {
  if (existing) return existing;
  const n = typeof grade === "string" ? parseFloat(grade) : grade ?? 0;
  if (Number.isNaN(n)) return "—";
  if (n >= 85) return "A";
  if (n >= 70) return "B";
  if (n >= 55) return "C";
  if (n >= 40) return "D";
  return "F";
}

export default function CertificateDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const { addToast } = useToast();

  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await certificatesService.getById(id);
      setCert(data);
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to load certificate");
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  async function handleShare() {
    if (!cert) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://uteo.co.ke";
    const url = `${origin}/verify/${cert.verificationCode}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${cert.course?.title} — Uteo Certificate`,
          text: `Verify my certificate: ${cert.certificateNumber}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        addToast("success", "Verification link copied to clipboard");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        addToast("success", "Verification link copied to clipboard");
      } catch {
        addToast("error", "Could not copy link");
      }
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-[60vh] bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Certificate not found
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          This certificate may have been revoked or you don&apos;t have access.
        </p>
        <Link
          href="/certificates"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#192C67] text-white font-semibold rounded-lg hover:bg-[#162d4a] text-sm"
        >
          Back to My Certificates
        </Link>
      </div>
    );
  }

  const instructor = cert.course?.instructor;
  const instructorName = instructor
    ? `${instructor.firstName ?? ""} ${instructor.lastName ?? ""}`.trim()
    : "Instructor";
  const studentName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Student";
  const isRevoked = cert.status === "REVOKED" || !!cert.revokedAt;
  const verifyUrl = `uteo.co.ke/verify/${cert.verificationCode}`;
  const letter = deriveLetter(cert.finalGrade, cert.letterGrade);

  return (
    <>
      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .cert-page {
            box-shadow: none !important;
            border: 0 !important;
          }
          @page {
            size: A4 landscape;
            margin: 0.5cm;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print max-w-5xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/certificates"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#192C67] dark:hover:text-[#5b8bc7]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All certificates
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            Share
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-[#192C67] text-white hover:bg-[#162d4a]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* Revoked banner */}
      {isRevoked && (
        <div className="no-print max-w-5xl mx-auto mb-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          This certificate has been revoked and is no longer valid.
        </div>
      )}

      {/* Certificate — decorative border card */}
      <div className="max-w-5xl mx-auto">
        <div
          className="cert-page relative bg-white text-gray-900 rounded-xl shadow-xl overflow-hidden"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #fdfdfd 0%, #ffffff 50%, #f6f8fc 100%)",
          }}
        >
          {/* Outer ornamental border */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-3 border-[3px] border-[#192C67] rounded-lg" />
            <div className="absolute inset-5 border border-[#F77B0F]/60 rounded-md" />
            {/* corner flourishes */}
            <div className="absolute top-3 left-3 h-10 w-10 border-t-[5px] border-l-[5px] border-[#F77B0F] rounded-tl-lg" />
            <div className="absolute top-3 right-3 h-10 w-10 border-t-[5px] border-r-[5px] border-[#F77B0F] rounded-tr-lg" />
            <div className="absolute bottom-3 left-3 h-10 w-10 border-b-[5px] border-l-[5px] border-[#F77B0F] rounded-bl-lg" />
            <div className="absolute bottom-3 right-3 h-10 w-10 border-b-[5px] border-r-[5px] border-[#F77B0F] rounded-br-lg" />
          </div>

          <div className="relative px-8 sm:px-14 py-12 sm:py-16">
            {/* Crest / Logo */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-[#192C67] flex items-center justify-center text-white font-black text-xl">
                  SS
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#192C67]">
                    Uteo
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">
                    Uteo
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-[11px] font-bold uppercase tracking-[0.4em] text-[#F77B0F]">
              Official Document
            </p>

            <h1 className="text-center mt-4 text-3xl sm:text-5xl font-black tracking-tight text-[#192C67]">
              Certificate of Completion
            </h1>

            <p className="text-center mt-8 text-sm sm:text-base text-gray-500">
              This is to certify that
            </p>

            <p className="text-center mt-3 text-3xl sm:text-5xl font-black text-gray-900">
              {studentName || "—"}
            </p>

            <div className="mx-auto my-4 h-px w-40 bg-[#F77B0F]" />

            <p className="text-center text-sm sm:text-base text-gray-500 max-w-3xl mx-auto leading-relaxed">
              has successfully completed the course
            </p>

            <p className="text-center mt-2 text-xl sm:text-3xl font-bold text-gray-900">
              {cert.course?.title}
            </p>

            {cert.course?.category && (
              <p className="text-center mt-1 text-xs uppercase tracking-widest text-gray-400">
                {cert.course.category}
              </p>
            )}

            {/* Meta row */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto text-center">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400">
                  Instructor
                </p>
                <p className="mt-1 text-sm font-bold text-gray-800">{instructorName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400">
                  Final Grade
                </p>
                <p className="mt-1 text-sm font-bold text-gray-800">
                  <span className="text-[#192C67]">{letter}</span>
                  <span className="ml-2 text-gray-600">{formatGrade(cert.finalGrade)}</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400">
                  Issued
                </p>
                <p className="mt-1 text-sm font-bold text-gray-800">
                  {formatDate(cert.issuedAt)}
                </p>
              </div>
            </div>

            {/* Signatures row */}
            <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-10 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="italic font-serif text-xl text-gray-800">
                  {instructorName}
                </div>
                <div className="mt-1 h-px bg-gray-300" />
                <p className="mt-2 text-[11px] uppercase tracking-widest text-gray-500">
                  Course Instructor
                </p>
              </div>
              <div className="text-center">
                <div className="italic font-serif text-xl text-gray-800">Uteo</div>
                <div className="mt-1 h-px bg-gray-300" />
                <p className="mt-2 text-[11px] uppercase tracking-widest text-gray-500">
                  Platform Authority
                </p>
              </div>
            </div>

            {/* Footer — cert number + verification */}
            <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400">
                  Certificate Number
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-gray-800">
                  {cert.certificateNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-gray-400">
                  Verify this certificate
                </p>
                <p className="mt-1 font-mono text-xs text-[#192C67] break-all">
                  {verifyUrl}
                </p>
                <p className="mt-1 text-[10px] text-gray-400">
                  Code: <span className="font-mono">{cert.verificationCode}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary info (not in print) */}
        <div className="no-print mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            Verification details
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Certificate number</dt>
              <dd className="font-mono text-gray-900 dark:text-gray-100">
                {cert.certificateNumber}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Verification code</dt>
              <dd className="font-mono text-gray-900 dark:text-gray-100">
                {cert.verificationCode}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Issued</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {formatDate(cert.issuedAt)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Status</dt>
              <dd>
                {isRevoked ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    Revoked
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    Active
                  </span>
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
            Employers and verifiers can visit{" "}
            <span className="font-mono text-[#192C67] dark:text-white/70">{verifyUrl}</span>{" "}
            to confirm this certificate&apos;s authenticity.
          </p>
        </div>
      </div>
    </>
  );
}
