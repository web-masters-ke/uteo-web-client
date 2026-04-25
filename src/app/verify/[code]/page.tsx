"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import {
  certificatesService,
  type CertificateVerification,
} from "@/lib/services/certificates";

function formatGrade(grade?: number | string): string {
  if (grade == null || grade === "") return "—";
  const n = typeof grade === "string" ? parseFloat(grade) : grade;
  if (Number.isNaN(n)) return String(grade);
  return `${n.toFixed(1)}%`;
}

export default function VerifyCertificatePage() {
  const { code } = useParams() as { code: string };
  const [data, setData] = useState<CertificateVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await certificatesService.verify(code);
      setData(res);
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setData({ valid: false });
      } else {
        setError(e?.response?.data?.message || "Failed to verify certificate");
      }
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isValid = !!data?.valid;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-[#0a0f1a] dark:via-[#0D1942] dark:to-[#0a0f1a]">
      {/* Minimal header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0D1942]/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#192C67] flex items-center justify-center text-white font-black">
              SS
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-[#192C67] dark:text-white">
                SkillSasa
              </p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Certificate Verification
              </p>
            </div>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-[#192C67] dark:hover:text-[#5b8bc7]"
          >
            skillsasa.co.ke
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-16">
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse mb-4" />
            <div className="h-6 w-48 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
            <div className="h-4 w-72 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-200 dark:border-red-900 p-10 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-4">
              <svg
                className="h-7 w-7 text-red-600 dark:text-red-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Verification error
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        ) : (
          <div
            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-t-8 overflow-hidden ${
              isValid
                ? "border-emerald-500 border-x border-b border-gray-200 dark:border-gray-700"
                : "border-red-500 border-x border-b border-gray-200 dark:border-gray-700"
            }`}
          >
            <div className="p-8 sm:p-10">
              <div className="flex items-start gap-5">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
                    isValid
                      ? "bg-emerald-100 dark:bg-emerald-900/40"
                      : "bg-red-100 dark:bg-red-900/40"
                  }`}
                >
                  {isValid ? (
                    <svg
                      className="h-8 w-8 text-emerald-600 dark:text-emerald-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg
                      className="h-8 w-8 text-red-600 dark:text-red-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-[11px] font-bold uppercase tracking-widest ${
                      isValid ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {isValid ? "Verified Certificate" : "Not a valid certificate"}
                  </p>
                  <h1 className="mt-1 text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                    {isValid
                      ? "This certificate is authentic"
                      : "We couldn't verify this code"}
                  </h1>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {isValid
                      ? "Issued by SkillSasa — the Professional Trainers Association of Kenya."
                      : data?.reason ||
                        "The verification code is invalid, expired, or the certificate has been revoked."}
                  </p>
                </div>
              </div>

              {isValid && data && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <Row label="Student" value={data.studentName || "—"} bold />
                  <Row label="Course" value={data.courseTitle || "—"} bold />
                  <Row label="Instructor" value={data.instructorName || "—"} />
                  <Row
                    label="Final grade"
                    value={
                      <>
                        {data.letterGrade && (
                          <span className="mr-2 inline-block px-2 py-0.5 text-[11px] font-bold bg-[#192C67]/10 text-[#192C67] dark:bg-[#192C67]/30 dark:text-[#a5bce0] rounded">
                            {data.letterGrade}
                          </span>
                        )}
                        {formatGrade(data.finalGrade)}
                      </>
                    }
                  />
                  <Row label="Issued" value={formatDate(data.issuedAt)} />
                  <Row
                    label="Certificate no."
                    value={
                      <span className="font-mono text-xs">
                        {data.certificateNumber || "—"}
                      </span>
                    }
                  />
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-[11px] uppercase tracking-widest text-gray-400 text-center">
                Verification code: <span className="font-mono">{code}</span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 px-8 py-5 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Looking for more SkillSasa programs?{" "}
                <Link
                  href="/courses"
                  className="font-semibold text-[#192C67] dark:text-[#5b8bc7] hover:underline"
                >
                  Browse courses
                </Link>
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="py-10 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} SkillSasa. Professional Trainers Association of Kenya.
      </footer>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-gray-400">{label}</p>
      <p
        className={`mt-1 text-sm ${
          bold ? "font-bold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
