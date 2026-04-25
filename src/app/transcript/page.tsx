"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { formatDate, getInitials } from "@/lib/utils";
import {
  transcriptService,
  type Transcript,
  type TranscriptCourse,
} from "@/lib/services/transcript";

/* ─── helpers ─── */
function fmt(g?: number | null) {
  if (g == null) return "—";
  return `${Number(g).toFixed(1)}%`;
}

function letterColor(l?: string | null) {
  if (!l) return "text-gray-400";
  const u = l.toUpperCase();
  if (u.startsWith("A")) return "text-emerald-600 dark:text-emerald-400";
  if (u.startsWith("B")) return "text-blue-600 dark:text-blue-400";
  if (u.startsWith("C")) return "text-amber-600 dark:text-amber-400";
  if (u.startsWith("D")) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function gpaColor(gpa: number) {
  if (gpa >= 3.7) return "text-emerald-600";
  if (gpa >= 3.0) return "text-blue-600";
  if (gpa >= 2.0) return "text-amber-600";
  return "text-red-600";
}

function gpaLabel(gpa: number) {
  if (gpa >= 3.7) return "Distinction";
  if (gpa >= 3.3) return "High Merit";
  if (gpa >= 3.0) return "Merit";
  if (gpa >= 2.0) return "Pass";
  return "Below Pass";
}

/* ─── Official Seal SVG ─── */
function OfficialSeal({ size = 96 }: { size?: number }) {
  const r = size / 2;
  const innerR = r * 0.72;
  const textR = r * 0.84;
  const label = "UTEO · OFFICIAL · VERIFIED ·";
  const chars = label.split("");
  const angleStep = 360 / chars.length;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {/* outer ring */}
      <circle cx={r} cy={r} r={r - 2} fill="none" stroke="#192C67" strokeWidth="2" />
      <circle cx={r} cy={r} r={r - 5} fill="none" stroke="#192C67" strokeWidth="0.5" />
      {/* inner fill */}
      <circle cx={r} cy={r} r={innerR} fill="#192C67" />
      {/* shield / star inner mark */}
      <path
        d={`M${r} ${r - innerR * 0.45} L${r + innerR * 0.25} ${r - innerR * 0.1} L${r + innerR * 0.18} ${r + innerR * 0.35} L${r} ${r + innerR * 0.25} L${r - innerR * 0.18} ${r + innerR * 0.35} L${r - innerR * 0.25} ${r - innerR * 0.1} Z`}
        fill="none" stroke="#F77B0F" strokeWidth="1.5"
      />
      {/* checkmark */}
      <path d={`M${r - innerR * 0.12} ${r + 0.02 * innerR} l${innerR * 0.12} ${innerR * 0.14} l${innerR * 0.22} ${-innerR * 0.22}`}
        fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* circular text */}
      {chars.map((ch, i) => {
        const angle = (i * angleStep - 90) * (Math.PI / 180);
        const x = r + textR * Math.cos(angle);
        const y = r + textR * Math.sin(angle);
        const rot = i * angleStep;
        return (
          <text key={i} x={x} y={y}
            fontSize={size * 0.075}
            fill="#192C67"
            fontWeight="700"
            fontFamily="monospace"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${rot}, ${x}, ${y})`}
          >{ch}</text>
        );
      })}
    </svg>
  );
}

/* ─── Page ─── */
export default function TranscriptPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [data, setData] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const t = await transcriptService.getMine();
      setData(t);
    } catch (e: any) {
      addToast("error", e?.response?.data?.message || "Failed to load transcript");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrint = () => window.print();

  const courses: TranscriptCourse[] = data?.courses || [];
  const studentName = data?.user
    ? `${data.user.firstName ?? ""} ${data.user.lastName ?? ""}`.trim()
    : "Student";
  const gpa = data?.summary.cgpa ?? 0;
  const today = new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      {/* ── Print styles ── */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-doc {
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
            border-radius: 0 !important;
            margin: 0 !important;
          }
          .print-watermark { opacity: 0.04 !important; }
          @page { size: A4; margin: 1.2cm; }
        }
      `}</style>

      {/* ── Hero — background image, no colour fill ── */}
      <div className="no-print relative -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-10 overflow-hidden min-h-[220px] flex items-end px-6 lg:px-10 py-10"
        style={{ backgroundImage: "url(/images/notifications-hero.jpg)", backgroundSize: "cover", backgroundPosition: "center 30%" }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative z-10 flex items-end justify-between w-full max-w-5xl">
          <div>
            <p className="text-[#F77B0F] text-xs font-bold uppercase tracking-[0.25em] mb-2">Academic Record</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white">Official Transcript</h1>
            <p className="text-white/65 text-sm mt-1.5 max-w-sm">
              Verified academic record — shareable with employers and institutions.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <button onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#192C67] text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile print button ── */}
      <div className="no-print sm:hidden mb-6">
        <button onClick={handlePrint}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#192C67] text-white text-sm font-bold rounded-xl">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save PDF
        </button>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse max-w-4xl mx-auto">
          <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        </div>
      ) : !data ? (
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500">Could not load transcript. Please try again.</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">

          {/* ══════════════════════════════════════════
              THE DOCUMENT
          ══════════════════════════════════════════ */}
          <div className="print-doc relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-gray-300/50 dark:shadow-black/40 overflow-hidden border border-gray-200 dark:border-gray-700">

            {/* Diagonal watermark */}
            <div className="print-watermark absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.035] dark:opacity-[0.025]">
              <p className="text-[120px] font-black text-[#192C67] whitespace-nowrap"
                style={{ transform: "rotate(-35deg)", letterSpacing: "0.15em" }}>
                OFFICIAL
              </p>
            </div>

            {/* ── Institution header ── */}
            <div className="relative">
              {/* top accent bar */}
              <div className="h-2 bg-gradient-to-r from-[#192C67] via-[#F77B0F] to-[#192C67]" />

              <div className="px-8 sm:px-12 pt-8 pb-6 flex items-start justify-between gap-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  {/* Logo mark */}
                  <div className="w-14 h-14 rounded-xl bg-[#192C67] flex items-center justify-center shrink-0">
                    <svg className="w-8 h-8 text-white" viewBox="0 0 32 32" fill="currentColor">
                      <path d="M16 2L4 8v8c0 7.18 5.16 13.9 12 15.93C22.84 29.9 28 23.18 28 16V8L16 2zm-1 18.59l-4-4L12.41 15 15 17.59 19.59 13 21 14.41l-6 6.18z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xl font-black text-[#192C67] dark:text-white tracking-tight">Uteo</p>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Professional Training Platform</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Nairobi, Kenya · uteo.co.ke</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#192C67] dark:text-white/70">Official Academic Transcript</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Date Issued: {today}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Record ID: TRN-{data.user.id?.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
            </div>

            {/* ── Student identity block ── */}
            <div className="px-8 sm:px-12 py-7 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-xl bg-[#192C67]/10 dark:bg-[#192C67]/30 flex items-center justify-center text-[#192C67] dark:text-white/70 font-black text-2xl shrink-0 overflow-hidden border-2 border-[#192C67]/20">
                {data.user.avatarUrl
                  ? <img src={data.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  : getInitials(data.user.firstName, data.user.lastName)
                }
              </div>

              {/* Student info */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Student</p>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">{studentName}</h2>
                {data.user.email && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{data.user.email}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-gray-500 dark:text-gray-400">
                  <span><span className="font-bold text-gray-700 dark:text-gray-300">Enrolled:</span> {data.summary.totalCoursesEnrolled} course{data.summary.totalCoursesEnrolled !== 1 ? "s" : ""}</span>
                  <span><span className="font-bold text-gray-700 dark:text-gray-300">Completed:</span> {data.summary.totalCoursesCompleted}</span>
                  <span><span className="font-bold text-gray-700 dark:text-gray-300">Certificates:</span> {data.summary.totalCertificates}</span>
                </div>
              </div>

              {/* GPA block */}
              <div className="shrink-0 flex flex-col items-center sm:items-end gap-2">
                <div className="text-center sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Cumulative GPA</p>
                  <p className={`text-6xl font-black tabular-nums mt-1 ${gpaColor(gpa)}`}>
                    {gpa.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">out of 4.00</p>
                  <p className={`text-sm font-bold mt-1 ${gpaColor(gpa)}`}>{gpaLabel(gpa)}</p>
                </div>
                <OfficialSeal size={72} />
              </div>
            </div>

            {/* ── Course record ── */}
            <div className="px-8 sm:px-12 py-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Academic Course Record
                </p>
                <p className="text-[10px] text-gray-400">{courses.length} entr{courses.length === 1 ? "y" : "ies"}</p>
              </div>

              {courses.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No course enrolments on record.</p>
                  <Link href="/courses" className="inline-flex items-center gap-2 px-4 py-2 bg-[#192C67] text-white text-sm font-semibold rounded-lg">
                    Browse Courses
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b-2 border-[#192C67]/20 dark:border-[#192C67]/40">
                        <th className="pb-2 pr-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Course Title</th>
                        <th className="pb-2 px-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hidden md:table-cell">Instructor</th>
                        <th className="pb-2 px-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hidden lg:table-cell">Enrolled</th>
                        <th className="pb-2 px-3 text-right text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Score</th>
                        <th className="pb-2 px-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Grade</th>
                        <th className="pb-2 px-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hidden sm:table-cell">Milestones</th>
                        <th className="pb-2 pl-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Certificate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((c, i) => (
                        <tr key={c.enrollmentId}
                          className={`border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-[#192C67]/3 dark:hover:bg-[#192C67]/10 ${i === courses.length - 1 ? "border-b-0" : ""}`}>
                          <td className="py-3 pr-4">
                            <Link href={`/courses/${c.courseId}`}
                              className="font-semibold text-gray-900 dark:text-white hover:text-[#192C67] dark:hover:text-[#5b8bc7] transition-colors line-clamp-1">
                              {c.title}
                            </Link>
                            {c.category && (
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5">{c.category}</p>
                            )}
                          </td>
                          <td className="py-3 px-3 text-xs text-gray-600 dark:text-gray-300 hidden md:table-cell whitespace-nowrap">
                            {c.instructorName || "—"}
                          </td>
                          <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400 hidden lg:table-cell whitespace-nowrap">
                            {formatDate(c.enrolledAt)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-sm text-gray-800 dark:text-gray-200 tabular-nums whitespace-nowrap">
                            {fmt(c.finalGrade)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {c.letterGrade && c.letterGrade !== "N/A" ? (
                              <span className={`font-black text-sm tabular-nums ${letterColor(c.letterGrade)}`}>
                                {c.letterGrade}
                              </span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center hidden sm:table-cell">
                            {c.milestoneCount > 0 ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <div className="flex gap-0.5">
                                  {Array.from({ length: Math.min(c.milestoneCount, 8) }).map((_, j) => (
                                    <div key={j}
                                      className={`w-2 h-2 rounded-full ${j < c.passedMilestones ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"}`}
                                    />
                                  ))}
                                  {c.milestoneCount > 8 && <span className="text-[9px] text-gray-400 ml-0.5">+{c.milestoneCount - 8}</span>}
                                </div>
                                <span className="text-[10px] text-gray-400 tabular-nums">{c.passedMilestones}/{c.milestoneCount}</span>
                              </div>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 pl-3">
                            {c.certificateId ? (
                              <Link href={`/certificates/${c.certificateId}`}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold font-mono hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors whitespace-nowrap">
                                <svg className="w-2.5 h-2.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {c.certificateNumber?.replace("SKS-CERT-", "") || "View"}
                              </Link>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600 text-[10px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── GPA key ── */}
            {courses.some(c => c.finalGrade != null) && (
              <div className="px-8 sm:px-12 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Grading Scale</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400">
                  {[["A","90–100","4.0"],["A-","85–89","3.7"],["B+","80–84","3.3"],["B","75–79","3.0"],["B-","70–74","2.7"],["C+","65–69","2.3"],["C","60–64","2.0"],["F","<50","0.0"]].map(([l,r,p]) => (
                    <span key={l}><span className="font-black text-gray-700 dark:text-gray-300">{l}</span> {r} ({p})</span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Official footer ── */}
            <div className="px-8 sm:px-12 py-6 border-t border-gray-200 dark:border-gray-700 bg-[#192C67]/3 dark:bg-[#192C67]/10">
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div className="max-w-lg">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#192C67] dark:text-white/70 mb-1.5">
                    Verification Statement
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    This transcript is an official academic record issued by Uteo, a professional training
                    platform registered in Kenya. All certificates referenced herein are independently verifiable.
                    Employers and institutions may verify individual certificates at{" "}
                    <span className="font-mono font-semibold text-[#192C67] dark:text-white/70">
                      uteo.co.ke/verify/&lt;code&gt;
                    </span>
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                    Generated: {today} · This document is valid without a physical signature when verified online.
                  </p>
                </div>

                {/* Signature area */}
                <div className="shrink-0 text-center">
                  <div className="w-40 border-b-2 border-[#192C67]/40 dark:border-[#192C67]/60 mb-1 pb-1">
                    <p className="font-black text-[#192C67] dark:text-white/70 text-sm italic" style={{ fontFamily: "Georgia, serif" }}>
                      Uteo Platform
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Authorised Issuer</p>
                  <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-0.5">Digital Record — No Physical Signature Required</p>
                </div>
              </div>
            </div>

            {/* bottom accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-[#192C67] via-[#F77B0F] to-[#192C67]" />
          </div>

          {/* ── Actions below doc (screen only) ── */}
          <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-3">
            <Link href="/certificates"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#192C67] dark:text-white/70 hover:underline">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              View all certificates
            </Link>
            <button onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#192C67] text-white text-sm font-bold rounded-xl hover:bg-[#14234f] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>
          </div>

        </div>
      )}
    </>
  );
}
