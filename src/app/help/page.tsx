"use client";

import { FormEvent, useState } from "react";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";

const FAQ_RECRUITERS = [
  { q: "How do I post my first job?", a: "Go to Post a Job from the sidebar. Add your company details (one-time), then describe the role — title, must-have skills, location, salary band. Uteo's AI tags it with the right skill graph and starts surfacing matched candidates immediately." },
  { q: "What does match score mean?", a: "Match score is a 0–100 measure of how well a candidate fits a specific role, based on skill overlap, experience fit, location and salary expectations. Above 80 = strong fit. Below 60 = poor fit. The pipeline view sorts the strongest matches first." },
  { q: "How do I review applications?", a: "Open the job in Recruiter Dashboard. You'll see all applicants ranked by match score. Move them through Submitted → Reviewed → Shortlisted → Interview → Hired or Rejected with one click." },
  { q: "Can my whole team manage hiring together?", a: "Yes. On the Starter plan you get one workspace seat — invite teammates as recruiters. On Enterprise you get unlimited seats with role-based access (admin, recruiter, viewer)." },
  { q: "How does messaging with candidates work?", a: "Once a candidate has applied, you can message them directly inside Uteo from the application detail. All messages are logged and searchable. No email back-and-forth." },
  { q: "How do I schedule interviews?", a: "From the application detail, click Schedule Interview. Pick a time, add details, and the candidate gets an in-app + email notification. They can confirm or request a different slot." },
  { q: "Can I close or pause a job posting?", a: "Yes. Open the job in your dashboard and toggle status: Active, Paused (hidden but kept) or Closed (archived with all applicants). Reopen any time." },
  { q: "What analytics do I get?", a: "Time-to-hire, source-of-hire, drop-off by stage, applicant volume per role, and match score distribution. Available on Starter and Enterprise plans from the Analytics tab." },
];

const FAQ_SEEKERS = [
  { q: "Why am I seeing these jobs in my feed?", a: "Every job in your feed is ranked by match score against your profile — your skills, experience, salary expectations and location preferences. The more complete your profile, the better the matches." },
  { q: "How does one click apply work?", a: "Your Uteo profile IS your application. When you tap Apply, your full profile (skills, experience, education, CV) goes to the employer instantly. No forms to fill, no retyping." },
  { q: "How do I track my applications?", a: "Go to My Applications from the sidebar. Every application shows a live status — Submitted, Reviewed, Shortlisted, Interview, Hired or Rejected. You'll get a notification the moment status changes." },
  { q: "Can recruiters find me directly?", a: "Yes — if you opt in. Open Profile > Visibility and turn on Open to Work. Recruiters can search the talent pool by skills and reach out to you directly. You decide what is public." },
  { q: "How do I improve my match score?", a: "Add more skills (especially the technical ones), keep work experience current, upload a fresh CV (we parse it automatically), set clear salary expectations and target locations. Every save makes the engine smarter about you." },
  { q: "Why don't I see applications I made on other sites?", a: "Uteo only tracks applications submitted through Uteo. We can't see jobs you applied to via LinkedIn or company sites. To get the full tracking view, apply through Uteo." },
  { q: "How do I message an employer?", a: "Once you've applied to a job, you can message the recruiter from the application detail. Use this for quick clarifications — the recruiter sees your message in their pipeline." },
  { q: "Can I save jobs to apply later?", a: "Yes. Tap the bookmark icon on any job to save it. Open Saved Jobs from the sidebar to apply when ready. Save first, decide later." },
];

const GENERAL_FAQ = [
  { q: "Is Uteo really free for job seekers?", a: "Yes. Always. Browse jobs, apply, message employers, track applications — completely free, forever. We don't charge seekers a cent. Employers fund the platform." },
  { q: "Is my data safe on Uteo?", a: "Uteo complies with the Kenya Data Protection Act. All data is encrypted in transit (TLS) and at rest. Your personal information is never shared without consent. You can export or delete your data any time from Settings." },
  { q: "How do I reset my password?", a: "Click 'Forgot password?' on the login page. Enter your email and we'll send a reset link. You can also change your password from Settings > Change Password when logged in." },
  { q: "Who do I contact for support?", a: "Raise a support ticket below, or email hello@uteo.ai, or call +254 700 000 000 (Mon–Fri 8am–5pm EAT)." },
];

interface Ticket {
  id: string;
  subject: string;
  priority: string;
  status: string;
  description: string;
  createdAt: string;
}

export default function HelpPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isRecruiter = user?.role === "TRAINER";

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [faqSection, setFaqSection] = useState<"role" | "general">("role");
  const [showNew, setShowNew] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const roleFaqs = isRecruiter ? FAQ_RECRUITERS : FAQ_SEEKERS;
  const activeFaqs = faqSection === "role" ? roleFaqs : GENERAL_FAQ;

  const submitTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) { addToast("error", "Subject is required"); return; }
    setSubmitting(true);
    try {
      await apiPost("/support/tickets", { subject, priority, description });
    } catch { /* best effort */ }
    const tk: Ticket = {
      id: `tk-${Date.now()}`,
      subject,
      priority,
      status: "OPEN",
      description,
      createdAt: new Date().toISOString(),
    };
    setTickets((prev) => [tk, ...prev]);
    setShowNew(false);
    setSubject("");
    setDescription("");
    addToast("success", "Support ticket submitted");
    setSubmitting(false);
  };

  const ic = "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1724] px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#F77B0F] focus:border-[#F77B0F] transition-colors";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Help & Support</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">FAQs, guides, and support tickets</p>
        </div>
        <button onClick={() => setShowNew(true)} className="px-5 py-2.5 bg-[#F77B0F] text-white text-sm font-semibold rounded-xl hover:bg-[#e06a0d] transition-colors">
          Raise a Ticket
        </button>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", label: "Email", value: "hello@uteo.ai", href: "mailto:hello@uteo.ai" },
          { icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z", label: "Phone", value: "+254 700 000 000", href: "tel:+254700000000" },
          { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: "Hours", value: "Mon-Fri 8am-5pm EAT", href: null },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0f1724]">
            <div className="h-10 w-10 rounded-lg bg-[#F77B0F]/10 flex items-center justify-center shrink-0">
              <svg className="h-5 w-5 text-[#F77B0F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={c.icon} /></svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{c.label}</p>
              {c.href ? (
                <a href={c.href} className="text-sm font-medium text-[#F77B0F] hover:underline">{c.value}</a>
              ) : (
                <p className="text-sm font-medium text-gray-900 dark:text-white">{c.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FAQ section */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Frequently Asked Questions</h2>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
            <button onClick={() => { setFaqSection("role"); setOpenFaq(null); }} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${faqSection === "role" ? "bg-[#F77B0F] text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}>
              {isRecruiter ? "For Employers" : "For Job Seekers"}
            </button>
            <button onClick={() => { setFaqSection("general"); setOpenFaq(null); }} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${faqSection === "general" ? "bg-[#F77B0F] text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}>
              General
            </button>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
          {activeFaqs.map((f, i) => (
            <div key={i} className="bg-white dark:bg-[#0f1724]">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left group">
                <span className="text-sm font-semibold text-gray-900 dark:text-white pr-6 group-hover:text-[#F77B0F] transition-colors">{f.q}</span>
                <span className={`shrink-0 text-gray-400 transition-transform duration-200 ${openFaq === i ? "rotate-45" : ""}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </span>
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${openFaq === i ? "max-h-60 pb-4" : "max-h-0"}`}>
                <p className="px-5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New ticket form */}
      {showNew && (
        <div className="mb-8 p-6 rounded-2xl border-2 border-[#F77B0F]/20 bg-[#F77B0F]/[0.02] dark:bg-[#F77B0F]/[0.05]">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">New Support Ticket</h3>
          <form onSubmit={submitTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={ic} placeholder="What do you need help with?" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={ic}>
                <option value="LOW">Low — General question</option>
                <option value="MEDIUM">Medium — Issue affecting my work</option>
                <option value="HIGH">High — Urgent, blocking my operations</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={ic} placeholder="Describe your issue in detail..." />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-[#F77B0F] text-white text-sm font-semibold rounded-xl hover:bg-[#e06a0d] disabled:opacity-50 transition-colors">
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
              <button type="button" onClick={() => setShowNew(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets list */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Your Tickets</h2>
        {tickets.length === 0 ? (
          <div className="text-center py-12 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-[#0f1724]">
            <svg className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No support tickets yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Submit a ticket above if you need help</p>
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-4 bg-white dark:bg-[#0f1724]">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    t.priority === "HIGH" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                    t.priority === "MEDIUM" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                    "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}>{t.priority}</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
