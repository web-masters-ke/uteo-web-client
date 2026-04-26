'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface ChatMessage { role: 'user' | 'assistant'; content: string; }

const TABS = ['Career Chat', 'Interview Prep'] as const;
type Tab = typeof TABS[number];

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

function TextareaField({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
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

const QUICK_STARTERS = [
  'How do I negotiate a higher salary?',
  'How should I prepare for a technical interview?',
  'How do I write a strong cover letter?',
  'What should I do if I have gaps in my CV?',
];

// ── Career Chat Tab ───────────────────────────────────────────────────────────
function CareerChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    const userMsg: ChatMessage = { role: 'user', content };
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
    <div className="flex flex-col" style={{ minHeight: 420 }}>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Ask Claude for career advice — CV tips, interview prep, salary negotiation, and more.</p>
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1" style={{ maxHeight: 360 }}>
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center h-28 text-center">
              <div className="w-10 h-10 rounded-full bg-[#F77B0F]/10 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-[#F77B0F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400 dark:text-gray-500">Your AI career advisor is ready — try one of these:</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_STARTERS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:border-[#F77B0F] hover:text-[#F77B0F] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => {
            const isError = m.role === 'assistant' && m.content.toLowerCase().includes('could not reach');
            return (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
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
          placeholder="Ask about your career, CV, interviews, salary…"
          disabled={loading}
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#F77B0F] focus:ring-1 focus:ring-[#F77B0F] disabled:opacity-50"
        />
        <button
          onClick={() => send()}
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

// ── Interview Prep Tab ────────────────────────────────────────────────────────
function InterviewPrepTab() {
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
      <p className="text-sm text-gray-500 dark:text-gray-400">Practice before your interview. Enter the role you're applying for and Claude will generate realistic questions to prepare with.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Role You're Applying For" value={jobTitle} onChange={setJobTitle} placeholder="e.g. Product Manager" required />
        <InputField label="Key Skills (comma-separated)" value={skills} onChange={setSkills} placeholder="e.g. SQL, Figma, Agile" />
      </div>
      <TextareaField label="Notes (industry, company type, etc.)" value={notes} onChange={setNotes} placeholder="e.g. Early-stage startup, fintech..." rows={2} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end">
        <RunButton onClick={run} loading={loading} disabled={!jobTitle.trim()} label="Generate Practice Questions" />
      </div>
      {questions.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{questions.length} Practice Questions</p>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JobSeekerAiToolsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Career Chat');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.replace('/login?redirect=/jobs/ai-tools'); }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || !isAuthenticated) {
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
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#F77B0F] text-[#F77B0F]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'Career Chat' && <CareerChatTab />}
          {activeTab === 'Interview Prep' && <InterviewPrepTab />}
        </div>
      </div>
    </div>
  );
}
