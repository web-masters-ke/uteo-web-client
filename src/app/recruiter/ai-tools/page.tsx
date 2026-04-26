'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface ChatMessage { role: 'user' | 'assistant'; content: string; }

const TABS = ['Interview Questions', 'Candidate Insight', 'Job Enhancer', 'Career Chat'] as const;
type Tab = typeof TABS[number];

// ── Helpers ───────────────────────────────────────────────────────────────────
function InputField({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F]"
      />
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder, rows = 3, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F] resize-none"
      />
    </div>
  );
}

function Spinner() {
  return <svg className="animate-spin w-4 h-4 text-[#F77B0F]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>;
}

function RunButton({ onClick, loading, disabled, label = 'Run' }: { onClick: () => void; loading: boolean; disabled?: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="flex items-center gap-1.5 text-sm font-semibold text-[#F77B0F] hover:underline disabled:opacity-40 transition-opacity"
    >
      {loading ? <Spinner /> : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {loading ? 'Running…' : label}
    </button>
  );
}

// ── Interview Questions Tab ───────────────────────────────────────────────────
function InterviewQuestionsTab() {
  const [jobTitle, setJobTitle] = useState('');
  const [skills, setSkills] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [error, setError] = useState('');

  const run = async () => {
    if (!jobTitle.trim()) return;
    setLoading(true);
    setQuestions([]);
    setError('');
    try {
      const payload: any = { jobTitle: jobTitle.trim() };
      if (skills.trim()) payload.skills = skills.split(',').map((s) => s.trim()).filter(Boolean);
      if (notes.trim()) payload.notes = notes.trim();
      const res = await api.post('/ai/interview-questions', payload);
      const raw = res.data?.data ?? res.data;
      const list: string[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.questions)
        ? raw.questions
        : typeof raw === 'string'
        ? raw.split('\n').filter(Boolean)
        : [];
      setQuestions(list.length ? list : ['No questions returned — try again.']);
    } catch {
      setError('Could not generate questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">Generate tailored interview questions for any role. Claude analyzes the job requirements and candidate context.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Job Title" value={jobTitle} onChange={setJobTitle} placeholder="e.g. Senior Software Engineer" required />
        <InputField label="Skills (comma-separated)" value={skills} onChange={setSkills} placeholder="e.g. React, TypeScript, Node.js" />
      </div>
      <TextareaField label="Notes / Context" value={notes} onChange={setNotes} placeholder="Any specific context or requirements..." rows={2} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end">
        <RunButton onClick={run} loading={loading} disabled={!jobTitle.trim()} label="Generate Questions" />
      </div>
      {questions.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{questions.length} Questions Generated</p>
          {questions.map((q, i) => (
            <div key={i} className="flex gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <p className="text-sm text-gray-700 dark:text-gray-300">{q}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Candidate Insight Tab ─────────────────────────────────────────────────────
function CandidateInsightTab() {
  const [candidateName, setCandidateName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [skills, setSkills] = useState('');
  const [matchedSkills, setMatchedSkills] = useState('');
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState('');
  const [ran, setRan] = useState(false);

  const run = async () => {
    if (!candidateName.trim() || !jobTitle.trim()) return;
    setLoading(true);
    setInsight('');
    setRan(false);
    try {
      const payload: any = { candidateName: candidateName.trim(), jobTitle: jobTitle.trim() };
      if (skills.trim()) payload.skills = skills.split(',').map((s) => s.trim()).filter(Boolean);
      if (matchedSkills.trim()) payload.matchedSkills = matchedSkills.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await api.post('/ai/candidate-insight', payload);
      const raw = res.data?.data ?? res.data;
      const text = typeof raw === 'string' ? raw : (raw?.insight ?? raw?.text ?? raw?.message ?? (raw ? JSON.stringify(raw) : ''));
      setInsight(text || 'No insight generated. Please try again.');
    } catch {
      setInsight('Could not generate insight — check backend connectivity.');
    } finally {
      setLoading(false);
      setRan(true);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">Get a one-line AI summary of a candidate's fit for a specific role — useful when shortlisting.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Candidate Name" value={candidateName} onChange={setCandidateName} placeholder="e.g. Jane Doe" required />
        <InputField label="Job Title" value={jobTitle} onChange={setJobTitle} placeholder="e.g. Product Manager" required />
        <InputField label="Candidate Skills (comma-separated)" value={skills} onChange={setSkills} placeholder="e.g. SQL, Python, Strategy" />
        <InputField label="Matched Skills (comma-separated)" value={matchedSkills} onChange={setMatchedSkills} placeholder="Skills that match this role" />
      </div>
      <div className="flex justify-end">
        <RunButton onClick={run} loading={loading} disabled={!candidateName.trim() || !jobTitle.trim()} label="Generate Insight" />
      </div>
      {ran && (
        <div className="p-4 rounded-xl border border-[#F77B0F]/25 bg-[#F77B0F]/5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-[#F77B0F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.636 6.364l.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-xs font-semibold text-[#F77B0F]">AI Insight — {candidateName} for {jobTitle}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{insight}</p>
        </div>
      )}
    </div>
  );
}

// ── Job Enhancer Tab ──────────────────────────────────────────────────────────
function JobEnhancerTab() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title?: string; description?: string; tags?: string[]; unchanged?: boolean } | null>(null);

  const run = async () => {
    if (!title.trim() || !description.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/ai/enhance-job', { title: title.trim(), description: description.trim() });
      const raw = res.data?.data ?? res.data;
      if (typeof raw === 'string') {
        setResult({ description: raw, unchanged: raw.trim() === description.trim() });
      } else {
        const enhanced = raw?.description ?? raw?.enhancedDescription ?? raw?.content ?? '';
        setResult({
          title: raw?.title ?? raw?.enhancedTitle,
          description: enhanced,
          tags: Array.isArray(raw?.tags) ? raw.tags : [],
          unchanged: enhanced.trim() === description.trim(),
        });
      }
    } catch {
      setResult({ unchanged: true, description: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">Paste a draft job description and Claude will rewrite it to be more compelling, inclusive, and specific — and extract skill tags.</p>
      <InputField label="Job Title" value={title} onChange={setTitle} placeholder="e.g. Backend Engineer (Node.js)" required />
      <TextareaField label="Job Description" value={description} onChange={setDescription} placeholder="Paste your draft job description here..." rows={5} required />
      <div className="flex justify-end">
        <RunButton onClick={run} loading={loading} disabled={!title.trim() || !description.trim()} label="Enhance Job Post" />
      </div>
      {result && (
        result.unchanged ? (
          <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-400">
            AI enhancement unavailable right now — the description was returned unchanged. The Anthropic API key may need to be configured.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {result.title && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Enhanced Title</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{result.title}</p>
              </div>
            )}
            {result.description && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Enhanced Description</p>
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{result.description}</div>
              </div>
            )}
            {result.tags && result.tags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Skill Tags</p>
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-[#F77B0F]/10 text-[#F77B0F] text-xs font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

// ── Career Chat Tab ───────────────────────────────────────────────────────────
function CareerChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/ai/career-advice', { messages: next });
      const raw = res.data?.data ?? res.data;
      const reply = typeof raw === 'string' ? raw : (raw?.message ?? raw?.content ?? raw?.advice ?? JSON.stringify(raw));
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Could not reach the AI right now. Please try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col" style={{ minHeight: 400 }}>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Chat with Claude about career paths, hiring strategies, salary benchmarks, or how to attract top talent.</p>
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1" style={{ maxHeight: 340 }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <div className="w-10 h-10 rounded-full bg-[#F77B0F]/10 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#F77B0F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">Ask Claude about hiring strategies, salary ranges, or career advice for your candidates.</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isError = m.role === 'assistant' && (m.content.toLowerCase().includes('hit a snag') || m.content.toLowerCase().includes('could not reach'));
            return (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-[#F77B0F] text-white rounded-br-sm'
                    : isError
                    ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-bl-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            );
          })
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Claude about hiring, careers, or talent…"
          disabled={loading}
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F] disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-xl bg-[#F77B0F] text-white text-sm font-semibold hover:bg-[#F77B0F]/90 disabled:opacity-40 transition-opacity"
        >
          Send
        </button>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecruiterAiToolsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isRecruiter = (user as any)?.role === 'TRAINER' || (user as any)?.role === 'RECRUITER' || (user as any)?.role === 'EMPLOYER';
  const [activeTab, setActiveTab] = useState<Tab>('Interview Questions');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.replace('/login?redirect=/recruiter/ai-tools'); return; }
    if (!authLoading && isAuthenticated && !isRecruiter) { router.replace('/feed'); }
  }, [isAuthenticated, authLoading, isRecruiter, router]);

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tab panel */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#F77B0F] text-[#F77B0F]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'Interview Questions' && <InterviewQuestionsTab />}
          {activeTab === 'Candidate Insight' && <CandidateInsightTab />}
          {activeTab === 'Job Enhancer' && <JobEnhancerTab />}
          {activeTab === 'Career Chat' && <CareerChatTab />}
        </div>
      </div>
    </div>
  );
}
