"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import {
  certificatesService,
  type Certificate,
} from "@/lib/services/certificates";

const UNSPLASH_FALLBACKS = [
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
];

function gradeChipColor(grade?: number | string): string {
  const n = typeof grade === "string" ? parseFloat(grade) : grade ?? 0;
  if (n >= 85) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (n >= 70) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (n >= 55) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function formatGrade(grade?: number | string): string {
  if (grade == null || grade === "") return "—";
  const n = typeof grade === "string" ? parseFloat(grade) : grade;
  if (Number.isNaN(n)) return String(grade);
  return `${n.toFixed(1)}%`;
}

export default function MyCertificatesPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await certificatesService.listMy(page, 12);
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to load certificates");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      {/* Hero */}
      <section className="relative h-[36vh] min-h-[280px] flex items-end pb-10 overflow-hidden -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-8">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=4096&q=100"
            alt="Certificates"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 w-full">
          <p className="text-[13px] font-bold uppercase tracking-[0.25em] text-white/60 mb-3">
            Your achievements
          </p>
          <h1 className="text-4xl lg:text-6xl font-black text-white">My Certificates</h1>
          <p className="mt-3 text-base lg:text-lg text-white/80 max-w-2xl">
            All certificates you&apos;ve earned by completing courses on Uteo. Share them with employers or save a print copy.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {total} certificate{total === 1 ? "" : "s"}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
            >
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
              <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
              <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            No certificates yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            Complete a course to earn a Uteo certificate. It&apos;s shareable, verifiable, and yours to keep.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#192C67] text-white font-semibold rounded-lg hover:bg-[#162d4a] text-sm"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((c, idx) => {
            const instructor = c.course?.instructor;
            const instructorName = instructor
              ? `${instructor.firstName ?? ""} ${instructor.lastName ?? ""}`.trim()
              : "";
            const isRevoked = c.status === "REVOKED" || !!c.revokedAt;
            const meta = (c as any).metadata || {};
            const letterGrade = c.letterGrade || meta.letterGrade;
            const bannerImg = c.course?.thumbnail || UNSPLASH_FALLBACKS[idx % UNSPLASH_FALLBACKS.length];
            return (
              <Link
                key={c.id}
                href={`/certificates/${c.id}`}
                className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-[#192C67] dark:hover:border-[#5b8bc7] transition-all"
              >
                <div className="relative h-32 overflow-hidden">
                  <img
                    src={bannerImg}
                    alt=""
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#192C67]/90 via-[#192C67]/60 to-transparent" />
                  <div className="absolute top-3 right-3">
                    {isRevoked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500 text-white">
                        Revoked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500 text-white">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-4 right-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1">
                      Certificate of Completion
                    </p>
                    <p className="font-mono text-xs text-white/90 truncate">
                      {c.certificateNumber}
                    </p>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base line-clamp-2 min-h-[3rem]">
                    {c.course?.title || "Untitled Course"}
                  </h3>
                  {instructorName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      by {instructorName}
                    </p>
                  )}
                  {c.course?.category && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 uppercase tracking-wider">
                      {c.course.category}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${gradeChipColor(
                        c.finalGrade,
                      )}`}
                    >
                      {letterGrade && <span className="mr-1.5 font-black">{letterGrade}</span>}
                      {formatGrade(c.finalGrade)}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {formatDate(c.issuedAt)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-[11px] text-gray-400">View certificate</span>
                    <svg
                      className="w-4 h-4 text-[#192C67] dark:text-white/70 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && items.length > 0 && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
