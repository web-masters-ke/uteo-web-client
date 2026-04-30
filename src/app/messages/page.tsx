'use client';

import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, extractItems, api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import type { Conversation, ChatMessage, User } from '@/lib/types';
import { formatRelative, cn, truncate, getInitials } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/LoadingSkeleton';
import Modal from '@/components/ui/Modal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// ─── emoji data ────────────────────────────────────────────────────
const EMOJI_GROUPS = [
  {
    label: 'Smileys',
    emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😋','😛','😜','🤪','😎','🤩','🥳','😏','😒','😔','😢','😭','😤','😠','🤬','🥺','😱','🤗','🤔','🙄','😬','🤐','😴','🤢','🤮','🤧','🤒','🤕'],
  },
  {
    label: 'Hands',
    emojis: ['👍','👎','👋','✋','🤚','🖐','🖖','👌','🤌','✌️','🤞','🤙','👈','👉','👆','👇','☝️','👏','🙌','🙏','💪','✍️','🤝'],
  },
  {
    label: 'Objects',
    emojis: ['❤️','🔥','✅','❌','⭐','💫','🎯','🎉','🎊','🏆','🥇','💡','📌','🚀','💎','🌟','⚡','🌈','🎶','🎵','🎤','💯','🧠','💬','📎','🔗','💻','📱','🕐','📅'],
  },
];

// ─── helpers ────────────────────────────────────────────────────────
function AvatarCircle({ name, size = 'sm' }: { name: string | null | undefined; size?: 'sm' | 'md' }) {
  const letters = (name || '?').trim().split(' ').slice(0, 2).map((p) => p?.[0] || '').join('').toUpperCase() || '?';
  const sz = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  return (
    <div className={`inline-flex flex-shrink-0 items-center justify-center rounded-full bg-[#F77B0F] font-medium text-white ${sz}`}>
      {letters || '?'}
    </div>
  );
}

function fmtTimer(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// ─── emoji picker ────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-14 right-12 z-50 w-72 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="flex border-b border-gray-100 px-1 pt-1 dark:border-gray-800">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.label}
            onClick={() => setTab(i)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors',
              tab === i ? 'border-b-2 border-[#F77B0F] text-[#F77B0F]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto p-2">
        {EMOJI_GROUPS[tab].emojis.map((e) => (
          <button
            key={e}
            onClick={() => onSelect(e)}
            className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── message body with link + minimal-HTML rendering ───────────────
// Notifications send messages containing simple <b>/<strong>/<i>/<em> tags
// (intended for email HTML). Render them as styled spans, leave everything else as text.
function renderInline(text: string, isMe: boolean): React.ReactNode[] {
  // 1. Split on simple inline tags. Capture tag + content.
  const TAG_RE = /<(b|strong|i|em)>([\s\S]*?)<\/\1>/gi;
  const URL_RE = /(https?:\/\/[^\s<]+)/g;

  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  const pushText = (s: string) => {
    if (!s) return;
    // Within a plain text run, also split on URLs
    const subParts = s.split(URL_RE);
    for (const p of subParts) {
      if (URL_RE.test(p)) {
        out.push(
          <a
            key={key++}
            href={p}
            target="_blank"
            rel="noopener noreferrer"
            className={isMe ? 'underline text-white/90 hover:text-white' : 'underline text-[#F77B0F] hover:text-[#F77B0F] dark:text-[#F77B0F]/80'}
          >
            {p}
          </a>,
        );
      } else if (p) {
        out.push(<span key={key++}>{p}</span>);
      }
    }
  };

  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(text)) !== null) {
    pushText(text.slice(lastIndex, m.index));
    const tag = m[1].toLowerCase();
    const inner = m[2];
    const Cmp = tag === 'i' || tag === 'em' ? 'em' : 'strong';
    out.push(<Cmp key={key++} className="font-semibold">{inner}</Cmp>);
    lastIndex = m.index + m[0].length;
  }
  pushText(text.slice(lastIndex));
  return out;
}

function MessageBody({ text, isMe }: { text: string; isMe: boolean }) {
  return <div>{renderInline(text, isMe)}</div>;
}

// ─── new conversation modal ────────────────────────────────────────
function NewConversationModal({
  onClose, onCreate, userRole,
}: {
  onClose: () => void;
  onCreate: (conv: Conversation) => void;
  userRole?: string;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ id: string; firstName: string; lastName: string; avatarUrl?: string; role?: string; specialization?: string }[]>([]);
  const [selected, setSelected] = useState<typeof results[0] | null>(null);
  const [creating, setCreating] = useState(false);
  const [searching, setSearching] = useState(false);

  // Job seekers see recruiters first; recruiters see all candidates
  const searchRole = userRole === 'CLIENT' ? 'TRAINER' : undefined;

  // Load suggested users on open (no typing required)
  useEffect(() => {
    (async () => {
      try {
        const params: any = { limit: 10 };
        if (searchRole) params.role = searchRole;
        const res = await apiGet<any[]>('/users', { params });
        setResults(extractItems(res));
      } catch { /* ignore */ }
    })();
  }, [searchRole]);

  useEffect(() => {
    if (search.length < 2) {
      // Reload suggestions when search cleared
      (async () => {
        try {
          const params: any = { limit: 10 };
          if (searchRole) params.role = searchRole;
          const res = await apiGet<any[]>('/users', { params });
          setResults(extractItems(res));
        } catch { /* ignore */ }
      })();
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const params: any = { search };
        if (searchRole) params.role = searchRole;
        const res = await apiGet<any[]>('/users', { params });
        setResults(extractItems(res));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchRole]);

  const create = async () => {
    if (!selected) return;
    setCreating(true);
    try {
      const conv = await apiPost<Conversation>('/conversations', {
        participantIds: [selected.id],
        type: 'DIRECT',
      });
      onCreate(conv);
      onClose();
    } catch {
      // Optimistic fallback
      const mock: Conversation = {
        id: `conv-${Date.now()}`,
        title: `${selected.firstName} ${selected.lastName}`,
        type: 'DIRECT',
        participants: [{ id: selected.id, name: `${selected.firstName} ${selected.lastName}`, firstName: selected.firstName, lastName: selected.lastName, avatarUrl: selected.avatarUrl }],
        unread: 0,
      };
      onCreate(mock);
      onClose();
    } finally { setCreating(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="New Conversation" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {userRole === 'CLIENT' ? 'Search for a recruiter or employer' : 'Search for a candidate or recruiter'}
          </label>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F77B0F] outline-none"
          />
        </div>

        {selected && (
          <div className="flex items-center gap-2 bg-[#F77B0F]/10 dark:bg-[#192C67]/20 rounded-lg px-3 py-2">
            <AvatarCircle name={`${selected.firstName} ${selected.lastName}`} size="sm" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">{selected.firstName} {selected.lastName}</span>
            <button onClick={() => setSelected(null)} className="ml-auto text-gray-400 hover:text-red-500 text-sm">x</button>
          </div>
        )}

        <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800">
          {searching && <p className="py-4 text-center text-xs text-gray-400">Searching...</p>}
          {!searching && results.length === 0 && search.length >= 2 && (
            <p className="py-4 text-center text-xs text-gray-400">No users found.</p>
          )}
          {!searching && search.length < 2 && (
            <p className="py-4 text-center text-xs text-gray-400">Type at least 2 characters to search.</p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <AvatarCircle name={`${r.firstName} ${r.lastName}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-white">{r.firstName} {r.lastName}</p>
                  {r.role && <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${r.role === 'TRAINER' ? 'bg-[#F77B0F]/15 text-[#F77B0F] dark:bg-[#192C67]/30 dark:text-[#F77B0F]/80' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>{r.role === 'TRAINER' ? 'Recruiter' : 'Job Seeker'}</span>}
                </div>
                {(r as any).specialization && <p className="text-[10px] text-gray-400 truncate">{(r as any).specialization}</p>}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            Cancel
          </button>
          <button
            onClick={create}
            disabled={!selected || creating}
            className="px-4 py-2 text-sm font-medium text-white bg-[#F77B0F] rounded-lg hover:bg-[#e06a0d] disabled:opacity-40"
          >
            {creating ? 'Creating...' : 'Start Conversation'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── voice note player ────────────────────────────────────────────
function VoicePlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl bg-[#F77B0F]/10 px-3 py-2 dark:bg-[#192C67]/30">
      <audio
        ref={audioRef}
        src={url}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onTimeUpdate={() => setProgress(audioRef.current ? (audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100 : 0)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button onClick={toggle} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F77B0F] text-white">
        {playing ? (
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <div className="flex-1">
        <div className="h-1 w-full rounded-full bg-[#F77B0F]/20 dark:bg-[#192C67]">
          <div className="h-1 rounded-full bg-[#F77B0F] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-0.5 text-[10px] text-[#F77B0F]">
          {duration > 0 && isFinite(duration) ? fmtTimer(Math.ceil(duration)) : 'Voice note'}
        </p>
      </div>
    </div>
  );
}

// ─── typing indicator ──────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-gray-100 dark:bg-gray-700 px-4 py-2.5">
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// ─── online status dot ─────────────────────────────────────────────
function OnlineStatusDot({ isOnline }: { isOnline: boolean }) {
  return (
    <span className={cn(
      'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-900',
      isOnline ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600',
    )} />
  );
}

// ─── message normalizer ───────────────────────────────────────────
function normalizeMessages(raw: any[]): any[] {
  return raw.map((m: any) => ({
    ...m,
    senderName: m.sender ? `${m.sender.firstName} ${m.sender.lastName}` : m.senderName ?? m.senderId,
    body: m.body ?? m.content ?? '',
    type: m.type ?? m.messageType ?? 'TEXT',
    attachmentUrl: m.attachmentUrl ?? m.fileUrl ?? null,
  }));
}

function sortChrono(msgs: any[]) {
  if (msgs.length > 1 && msgs[0].createdAt > msgs[msgs.length - 1].createdAt) return [...msgs].reverse();
  return msgs;
}

// ─── main page ────────────────────────────────────────────────────
export default function MessagesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const skipNextScrollRef = useRef(false);

  // Voice recording state
  type VoiceState = 'idle' | 'recording' | 'preview';
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [recSeconds, setRecSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // File attachment state
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Typing indicator state
  const [remoteTyping, setRemoteTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pagination state
  const [msgTotal, setMsgTotal] = useState(0);
  const [msgPage, setMsgPage] = useState(1);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const myId = useMemo(() => user?.id ?? 'me', [user]);

  // ── load conversations ─────────────────────────────────────────
  const initialLoadDone = useRef(false);
  const load = useCallback(async () => {
    // First load shows the spinner; subsequent polls don't toggle loading
    // (toggling on every poll caused a brief skeleton flash every 10s).
    if (!initialLoadDone.current) setLoading(true);
    try {
      const data = await apiGet<Conversation[]>('/conversations');
      const convs = extractItems<any>(data).map((c: any) => ({
        id: c.id,
        title: c.title ?? 'Conversation',
        type: c.type === 'GROUP' ? 'GROUP' as const : 'DIRECT' as const,
        bookingId: c.bookingId,
        participants: (c.participants ?? []).map((p: any) => ({
          id: p.user?.id ?? p.userId ?? p.id,
          name: p.user ? `${p.user.firstName} ${p.user.lastName}` : p.name ?? p.firstName ? `${p.firstName} ${p.lastName}` : 'Unknown',
          firstName: p.user?.firstName ?? p.firstName,
          lastName: p.user?.lastName ?? p.lastName,
          avatarUrl: p.user?.avatarUrl ?? p.avatarUrl,
          role: p.user?.role ?? p.role,
        })),
        lastMessage: c.messages?.[0]?.body ?? c.messages?.[0]?.content ?? c.lastMessage,
        lastMessageAt: c.messages?.[0]?.createdAt ?? c.lastMessageAt ?? c.updatedAt,
        unread: c.unread ?? c.unreadCount ?? 0,
      }));
      // Only update state if conversation content actually changed. The
      // 10-second poll otherwise creates a new array reference on every
      // tick and causes the entire chat panel to re-render — the visible
      // "shaking" the user reported.
      setConversations((prev) => {
        if (prev.length === convs.length) {
          let identical = true;
          for (let i = 0; i < convs.length; i++) {
            const a = prev[i];
            const b = convs[i];
            if (
              !a || a.id !== b.id ||
              a.lastMessage !== b.lastMessage ||
              a.lastMessageAt !== b.lastMessageAt ||
              a.unread !== b.unread ||
              a.title !== b.title
            ) { identical = false; break; }
          }
          if (identical) return prev;
        }
        return convs;
      });
    } catch {
      // Don't toast on every failed poll — only the first load surfaces an error
      if (!initialLoadDone.current) addToast('error', 'Failed to load conversations');
    } finally {
      if (!initialLoadDone.current) {
        setLoading(false);
        initialLoadDone.current = true;
      }
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  // Re-poll conversation list every 10 s for fresh unread counts
  useEffect(() => {
    const iv = setInterval(() => load(), 10_000);
    return () => clearInterval(iv);
  }, [load]);

  // Track if we already handled the URL param
  const [urlHandled, setUrlHandled] = useState(false);

  // Auto-open conversation from URL params (?userId=xxx) — ALWAYS takes priority
  useEffect(() => {
    if (loading || urlHandled) return;
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('userId');
    if (!targetUserId) {
      // No URL param — restore last active conversation
      if (!activeId) {
        const saved = sessionStorage.getItem('uteo-chat-active');
        if (saved && conversations.find((c) => c.id === saved)) {
          setActiveId(saved);
        }
      }
      setUrlHandled(true);
      return;
    }
    // URL param exists — find or create conversation with this specific person
    const existing = conversations.find((c) =>
      c.participants?.some((p: any) => {
        const pid = p.user?.id ?? p.userId ?? p.id;
        return pid === targetUserId;
      })
    );
    if (existing) {
      setActiveId(existing.id);
      window.history.replaceState({}, '', '/messages');
      setUrlHandled(true);
    } else {
      // Create new conversation
      (async () => {
        try {
          const conv = await apiPost<any>('/conversations', {
            type: 'DIRECT',
            participantIds: [targetUserId],
          });
          await load();
          setActiveId(conv.id);
          window.history.replaceState({}, '', '/messages');
        } catch {
          addToast('error', 'Could not start conversation');
        }
        setUrlHandled(true);
      })();
    }
  }, [loading, conversations, urlHandled, load, addToast]);

  // cleanup voice recording on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [audioPreviewUrl]);

  const active = conversations.find((c) => c.id === activeId);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeId) return;
    setMessagesLoading(true);
    setMessages([]);
    setMsgPage(1);
    setMsgTotal(0);
    (async () => {
      try {
        const data = await apiGet<any>(`/conversations/${activeId}/messages`, { params: { limit: 50 } });
        const chrono = sortChrono(normalizeMessages(extractItems<any>(data)));
        setMessages(chrono);
        setMsgTotal((data as any)?.total ?? chrono.length);
      } catch { setMessages([]); }
      finally { setMessagesLoading(false); }
    })();
  }, [activeId]);

  // Poll for new messages every 5 s when a conversation is open
  useEffect(() => {
    if (!activeId) return;
    const poll = async () => {
      try {
        const data = await apiGet<any>(`/conversations/${activeId}/messages`, { params: { limit: 20 } });
        const incoming = normalizeMessages(extractItems<any>(data));
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m: any) => m.id));
          const fresh = incoming.filter((m: any) => !existingIds.has(m.id) && !String(m.id).startsWith('msg-'));
          if (fresh.length === 0) return prev;
          return [...prev, ...sortChrono(fresh)];
        });
      } catch { /* silent */ }
    };
    const iv = setInterval(poll, 5_000);
    return () => clearInterval(iv);
  }, [activeId]);

  // Auto-scroll — scroll only the messages container, not the window
  useEffect(() => {
    if (skipNextScrollRef.current) { skipNextScrollRef.current = false; return; }
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Filtered conversations
  const filtered = useMemo(
    () => conversations.filter((c) => !q || c.title.toLowerCase().includes(q.toLowerCase()) ||
      c.participants.some((p) => p.name?.toLowerCase().includes(q.toLowerCase()))),
    [conversations, q],
  );

  const bookingChats = filtered.filter((c) => !!c.bookingId);
  const directChats = filtered.filter((c) => !c.bookingId && c.type !== 'GROUP');
  const groupChats = filtered.filter((c) => !c.bookingId && c.type === 'GROUP');

  const selectConversation = (id: string) => {
    setActiveId(id);
    sessionStorage.setItem('uteo-chat-active', id);
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, unread: 0, unreadCount: 0 } : c));
    setShowEmoji(false);
    cancelVoice();
  };

  // Auto-resize textarea
  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  // ── send text message ─────────────────────────────────────────────
  const send = async () => {
    if (!draft.trim() || !activeId || sendingRef.current) return;
    sendingRef.current = true;
    const body = draft.trim();
    setDraft('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setSending(true);
    const tempMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: activeId,
      senderId: myId,
      senderName: 'You',
      body,
      content: body,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setConversations((prev) => prev.map((c) => c.id === activeId ? { ...c, lastMessage: body, lastMessageAt: new Date().toISOString() } : c));
    try {
      await apiPost(`/conversations/${activeId}/messages`, { content: body });
    } catch { /* keep optimistic */ }
    finally { setSending(false); sendingRef.current = false; }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // ── voice note recording ──────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl(url);
        setVoiceState('preview');
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setRecSeconds(0);
      setVoiceState('recording');
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      addToast('error', 'Microphone permission denied or not available.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mediaRecorderRef.current?.stop();
  };

  const cancelVoice = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setVoiceState('idle');
    setRecSeconds(0);
  };

  // ── load older messages (pagination) ─────────────────────────────
  const loadOlderMessages = useCallback(async () => {
    if (!activeId || loadingOlder) return;
    setLoadingOlder(true);
    skipNextScrollRef.current = true; // don't yank user back to bottom when prepending
    try {
      const next = msgPage + 1;
      const data = await apiGet<any>(`/conversations/${activeId}/messages`, { params: { limit: 50, page: next } });
      const older = sortChrono(normalizeMessages(extractItems<any>(data)));
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m: any) => m.id));
        return [...older.filter((m: any) => !existingIds.has(m.id)), ...prev];
      });
      setMsgPage(next);
    } catch { skipNextScrollRef.current = false; }
    finally { setLoadingOlder(false); }
  }, [activeId, msgPage, loadingOlder]);

  const sendVoiceNote = () => {
    if (!audioBlob || !activeId) return;
    const blob = audioBlob;
    const blobUrl = audioPreviewUrl!;
    const convId = activeId;

    // Clear recording UI immediately
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setVoiceState('idle');
    setRecSeconds(0);

    // Upload first, then create message with real URL so it persists on reload
    const tempId = `msg-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId, conversationId: convId, senderId: myId,
      senderName: 'You', body: 'Voice note', type: 'VOICE_NOTE',
      attachmentUrl: blobUrl, uploading: true, createdAt: new Date().toISOString(),
    } as any]);
    setConversations((prev) => prev.map((c) => c.id === convId
      ? { ...c, lastMessage: 'Voice note', lastMessageAt: new Date().toISOString() }
      : c));

    (async () => {
      try {
        const formData = new FormData();
        formData.append('file', blob, 'voice-note.webm');
        const res = await api.post(`/media/upload`, formData);
        const uploadedUrl: string = res.data?.data?.url ?? res.data?.url ?? '';
        if (!uploadedUrl) throw new Error('No URL from upload');

        const saved = await apiPost<any>(`/conversations/${convId}/messages`, {
          content: 'Voice note', messageType: 'VOICE_NOTE', fileUrl: uploadedUrl,
        });
        const serverMsgId = saved?.id ?? null;

        setMessages((prev) => prev.map((m: any) =>
          m.id === tempId
            ? { ...m, id: serverMsgId ?? tempId, attachmentUrl: uploadedUrl, uploading: false }
            : m));
        setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
      } catch {
        // Upload failed — keep blob URL in current session, mark as not uploading
        setMessages((prev) => prev.map((m: any) =>
          m.id === tempId ? { ...m, uploading: false } : m));
      }
    })();
  };

  // ── send file attachment ──────────────────────────────────────────
  const sendFile = async (file: File) => {
    if (!activeId) return;
    const isImage = file.type.startsWith('image/');
    const convId = activeId;

    // Read image as base64 data URL — never expires, no ERR_FILE_NOT_FOUND
    let localPreview: string | null = null;
    if (isImage) {
      localPreview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    }

    // Show optimistic immediately with local preview
    const tempId = `msg-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId, conversationId: convId, senderId: myId, senderName: 'You',
      body: file.name, type: isImage ? 'IMAGE' : 'FILE',
      attachmentUrl: localPreview || null, uploading: true,
      createdAt: new Date().toISOString(),
    } as any]);
    setConversations((prev) => prev.map((c) => c.id === convId
      ? { ...c, lastMessage: isImage ? 'Image' : file.name, lastMessageAt: new Date().toISOString() }
      : c,
    ));

    // Upload to S3 first, then create message with real URL in one shot (no PATCH needed)
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      const res = await api.post(`/media/upload`, formData);
      const uploadedUrl: string = res.data?.data?.url ?? res.data?.url ?? '';
      if (!uploadedUrl) throw new Error('No URL from upload');

      const saved = await apiPost<any>(`/conversations/${convId}/messages`, {
        content: file.name,
        messageType: isImage ? 'IMAGE' : 'FILE',
        fileUrl: uploadedUrl,
      });
      const serverMsgId = saved?.id ?? null;

      setMessages((prev) => prev.map((m: any) =>
        m.id === tempId
          ? { ...m, id: serverMsgId ?? tempId, attachmentUrl: uploadedUrl, uploading: false }
          : m));
    } catch {
      setMessages((prev) => prev.map((m: any) =>
        m.id === tempId ? { ...m, uploading: false } : m));
    }
  };

  // ── helper: get display name for conversation ─────────────────────
  const getConvDisplayName = (conv: Conversation): string => {
    if (conv.type === 'GROUP') return conv.title;
    const other = conv.participants.find((p) => p.id !== myId) ?? conv.participants[0];
    return other?.name ?? (other?.firstName ? `${other.firstName} ${other.lastName}` : conv.title);
  };

  const getConvFirmName = (conv: Conversation): string | null => {
    const other = conv.participants.find((p) => p.id !== myId) ?? conv.participants[0];
    return (other as any)?.firmName ?? (other as any)?.trainerProfile?.firmName ?? (other as any)?.organization ?? null;
  };

  const getMyFirmName = (): string | null => {
    return (user as any)?.firmName ?? (user as any)?.trainerProfile?.firmName ?? (user as any)?.organization ?? null;
  };

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find((p) => p.id !== myId) ?? conv.participants[0];
  };

  // ── render ─────────────────────────────────────────────────────────
  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8"><ListSkeleton /></div>;

  const ConvRow = ({ c }: { c: Conversation }) => {
    const isGroup = c.type === 'GROUP';
    const isBooking = !!c.bookingId;
    const other = !isGroup && !isBooking ? getOtherParticipant(c) : null;
    const displayName = getConvDisplayName(c);

    return (
      <button
        onClick={() => selectConversation(c.id)}
        className={cn(
          'w-full border-b border-gray-50 px-3 py-2.5 text-left transition hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-gray-800/60',
          activeId === c.id && 'bg-[#F77B0F]/60 dark:bg-[#192C67]/20',
        )}
      >
        <div className="flex items-center gap-2.5">
          {isGroup ? (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
          ) : isBooking ? (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          ) : (
            <div className="relative flex-shrink-0">
              <AvatarCircle name={displayName} />
              <OnlineStatusDot isOnline={false} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{displayName}</p>
              <div className="flex flex-shrink-0 items-center gap-1">
                {(c.unread ?? 0) > 0 && (
                  <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#F77B0F] px-1 text-[10px] font-bold text-white">
                    {c.unread}
                  </span>
                )}
                <span className="text-[10px] text-gray-400">{formatRelative(c.lastMessageAt)}</span>
              </div>
            </div>
            {getConvFirmName(c) && (
              <p className="truncate text-[10px] text-secondary-600 dark:text-secondary-400 font-medium">{getConvFirmName(c)}</p>
            )}
            {activeId === c.id && remoteTyping ? (
              <p className="mt-0.5 truncate text-xs text-[#F77B0F] italic">typing...</p>
            ) : (
              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                {typeof c.lastMessage === 'string'
                  ? truncate(c.lastMessage, 40)
                  : (isGroup ? `${c.participants.length} members` : 'No messages yet')}
              </p>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
          {conversations.reduce((sum, c) => sum + (c.unread ?? 0), 0) > 0 && (
            <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[#F77B0F] px-1.5 text-xs font-bold text-white">
              {conversations.reduce((sum, c) => sum + (c.unread ?? 0), 0)}
            </span>
          )}
        </div>
        {user?.role !== 'CLIENT' && (
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#F77B0F] rounded-lg hover:bg-[#e06a0d] transition-colors"
          >
            New Message
          </button>
        )}
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description={
            user?.role === 'CLIENT'
              ? 'Apply for a job and a conversation with the recruiter will open automatically.'
              : 'Start a conversation with a job seeker.'
          }
          action={user?.role !== 'CLIENT' ? { label: 'New Conversation', onClick: () => setShowNewModal(true) } : undefined}
        />
      ) : (
        <div className="flex bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: '75vh' }}>

          {/* ── Left: conversation list ── */}
          <div className={cn(
            'w-full md:w-80 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col overflow-hidden',
            activeId ? 'hidden md:flex' : 'flex',
          )}>
            {/* Search */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
              <input
                type="text"
                placeholder="Search conversations..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#F77B0F] outline-none"
              />
              {user?.role !== 'CLIENT' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNewModal(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:border-[#F77B0F]/50 hover:bg-[#F77B0F]/10 hover:text-[#F77B0F] dark:border-gray-700 dark:text-gray-400 dark:hover:border-[#F77B0F] dark:hover:text-[#F77B0F]/80"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    New Message
                  </button>
                </div>
              )}
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {directChats.length > 0 && (
                <>
                  <div className="px-3 pb-1 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Direct Messages</p>
                  </div>
                  {directChats.map((c) => <ConvRow key={c.id} c={c} />)}
                </>
              )}
              {bookingChats.length > 0 && (
                <>
                  <div className="px-3 pb-1 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Interview Chats</p>
                  </div>
                  {bookingChats.map((c) => <ConvRow key={c.id} c={c} />)}
                </>
              )}
              {groupChats.length > 0 && (
                <>
                  <div className="px-3 pb-1 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Group Chats</p>
                  </div>
                  {groupChats.map((c) => <ConvRow key={c.id} c={c} />)}
                </>
              )}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <svg className="h-8 w-8 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-xs text-gray-400">No conversations found.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: message thread ── */}
          <div className={cn('flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900', !activeId ? 'hidden md:flex' : 'flex')}>
            {active ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActiveId(null)} className="md:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    {active.type === 'GROUP' ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="relative">
                        <AvatarCircle name={getConvDisplayName(active)} size="md" />
                        <OnlineStatusDot isOnline={false} />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{getConvDisplayName(active)}</p>
                        {getConvFirmName(active) && (
                          <span className="px-2 py-0.5 rounded-full bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-400 text-[10px] font-bold">{getConvFirmName(active)}</span>
                        )}
                      </div>
                      {active.type === 'GROUP' ? (
                        <p className="text-[10px] text-gray-400">
                          {active.participants.length} member{active.participants.length !== 1 ? 's' : ''} - {active.participants.slice(0, 3).map((p) => p.name ?? p.firstName).join(', ')}{active.participants.length > 3 ? ` +${active.participants.length - 3}` : ''}
                        </p>
                      ) : (
                        <p className="flex items-center gap-1 text-[10px] text-gray-400">
                          {(() => {
                            const other = getOtherParticipant(active);
                            const roleLabel = other?.role === 'TRAINER' ? 'Recruiter' : other?.role === 'CLIENT' ? 'Job Seeker' : other?.role ?? 'Offline';
                            return roleLabel;
                          })()}
                        </p>
                      )}
                    </div>
                  </div>
                  {active.bookingId && (
                    <button
                      onClick={() => router.push(`/bookings/${active.bookingId}`)}
                      className="text-xs text-[#F77B0F] hover:text-[#F77B0F] font-medium"
                    >
                      View Interview
                    </button>
                  )}
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
                  {/* Load older messages */}
                  {!messagesLoading && msgTotal > messages.length && (
                    <div className="flex justify-center pb-2">
                      <button
                        onClick={loadOlderMessages}
                        disabled={loadingOlder}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                      >
                        {loadingOlder
                          ? <span className="h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent" />
                          : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>}
                        {loadingOlder ? 'Loading...' : `Load older (${msgTotal - messages.length} more)`}
                      </button>
                    </div>
                  )}
                  {messagesLoading && (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-6 h-6 border-2 border-[#F77B0F] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {!messagesLoading && messages.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
                    </div>
                  )}
                  {messages.map((m) => {
                    const isMe = m.senderId === myId || m.senderId === 'me';
                    const msgType = (m as any).type ?? 'TEXT';
                    const attachUrl = (m as any).attachmentUrl ?? null;
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[72%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <p className="mb-1 text-[10px] text-gray-400">
                            {!isMe && <span className="mr-1 font-medium text-gray-500">{m.senderName}</span>}
                            {!isMe && (m as any).senderFirm && (
                              <span className="mr-1 px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-400 text-[9px] font-bold">{(m as any).senderFirm}</span>
                            )}
                            {isMe && getMyFirmName() && (
                              <span className="mr-1 px-1.5 py-0.5 rounded bg-[#F77B0F]/15 dark:bg-[#192C67]/30 text-[#F77B0F] dark:text-[#F77B0F]/80 text-[9px] font-bold">{getMyFirmName()}</span>
                            )}
                            {formatRelative(m.createdAt)}
                          </p>
                          {msgType === 'VOICE_NOTE' && attachUrl ? (
                            <VoicePlayer url={attachUrl} />
                          ) : msgType === 'VOICE_NOTE' && !attachUrl ? (
                            <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2 text-xs text-gray-400">
                              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" /></svg>
                              {(m as any).uploading ? 'Uploading audio…' : 'Audio unavailable'}
                            </div>
                          ) : msgType === 'IMAGE' && attachUrl ? (
                            <div className="relative">
                              <img
                                src={attachUrl}
                                alt={m.body ?? 'image'}
                                className="max-w-[260px] rounded-2xl object-cover shadow-sm"
                                style={{ maxHeight: 200 }}
                              />
                              {(m as any).uploading && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
                                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                </div>
                              )}
                            </div>
                          ) : msgType === 'IMAGE' && !attachUrl ? (
                            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 px-3.5 py-2 text-xs text-gray-400" style={{ minWidth: 140 }}>
                              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {(m as any).uploading ? 'Uploading image…' : 'Image unavailable'}
                            </div>
                          ) : msgType === 'FILE' && attachUrl ? (
                            <a
                              href={attachUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                'flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm',
                                isMe ? 'bg-[#F77B0F] text-white' : 'bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-200',
                              )}
                            >
                              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              {m.body ?? 'File'}
                            </a>
                          ) : (
                            <div className={cn(
                              'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                              isMe
                                ? 'rounded-br-sm bg-[#F77B0F] text-white'
                                : 'rounded-bl-sm bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-200',
                            )}>
                              <MessageBody text={m.body ?? m.content ?? ''} isMe={isMe} />
                            </div>
                          )}
                          {isMe && (() => {
                            const isRead = (m as any).isRead === true;
                            return (
                              <span className={`mt-0.5 text-[9px] flex items-center gap-0.5 ${isRead ? 'text-[#F77B0F]' : 'text-gray-300 dark:text-gray-600'}`}>
                                {isRead ? (
                                  <span title="Read">&#10003;&#10003;</span>
                                ) : (
                                  <span className="text-gray-400" title="Delivered">&#10003;&#10003;</span>
                                )}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                  {remoteTyping && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>

                {/* ── Input area ── */}
                <div className="relative border-t border-gray-200 bg-white px-3 pb-3 pt-2 dark:border-gray-700 dark:bg-gray-800">
                  {showEmoji && (
                    <EmojiPicker
                      onSelect={(emoji) => {
                        setDraft((prev) => prev + emoji);
                        textareaRef.current?.focus();
                      }}
                      onClose={() => setShowEmoji(false)}
                    />
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.docx,.xlsx,.csv,.zip"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) sendFile(file);
                      e.target.value = '';
                    }}
                  />

                  {voiceState === 'idle' && (
                    <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-2 py-1.5 focus-within:border-[#F77B0F] focus-within:ring-2 focus-within:ring-[#F77B0F]/10 dark:border-gray-600 dark:bg-gray-700 dark:focus-within:border-[#F77B0F]">
                      {/* attach button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={fileUploading}
                        title="Attach file"
                        className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-white hover:text-gray-600 disabled:opacity-40 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                      >
                        {fileUploading ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-[#F77B0F]" />
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        )}
                      </button>

                      {/* mic button */}
                      <button
                        type="button"
                        onClick={startRecording}
                        title="Voice note"
                        className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-white hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </button>

                      {/* textarea */}
                      <textarea
                        ref={textareaRef}
                        value={draft}
                        onChange={(e) => { setDraft(e.target.value); resizeTextarea(); }}
                        onKeyDown={onKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="max-h-[120px] flex-1 resize-none bg-transparent py-1.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
                        style={{ overflowY: 'auto' }}
                      />

                      {/* emoji + send */}
                      <div className="mb-0.5 flex flex-shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowEmoji((v) => !v)}
                          title="Emoji"
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:bg-white hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-300',
                            showEmoji && 'bg-white text-[#F77B0F] dark:bg-gray-600',
                          )}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={send}
                          disabled={!draft.trim() || sending}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F77B0F] text-white transition hover:bg-[#e06a0d] disabled:opacity-30"
                          title="Send (Enter)"
                        >
                          {sending ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <svg className="h-4 w-4 translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="mt-1.5 text-center text-[10px] text-gray-400 dark:text-gray-600">
                    Enter to send -- Shift+Enter for new line
                  </p>

                  {voiceState === 'recording' && (
                    <div className="flex items-center gap-3 p-3">
                      <button onClick={cancelVoice} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:text-red-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="flex flex-1 items-center gap-2">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                        <span className="text-sm font-medium text-red-500">Recording {fmtTimer(recSeconds)}</span>
                        <div className="flex flex-1 items-center gap-0.5">
                          {Array.from({ length: 20 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-1 rounded-full bg-[#F77B0F] opacity-60"
                              style={{ height: `${8 + Math.sin(Date.now() / 200 + i) * 6}px`, transition: 'height 0.1s' }}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={stopRecording}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" rx="1" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {voiceState === 'preview' && audioPreviewUrl && (
                    <div className="flex items-center gap-3 p-3">
                      <button onClick={cancelVoice} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:text-red-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <div className="flex-1">
                        <VoicePlayer url={audioPreviewUrl} />
                      </div>
                      <button
                        onClick={sendVoiceNote}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F77B0F] text-white hover:bg-[#e06a0d]"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <svg className="h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm text-gray-400">Select a conversation to start messaging</p>
                {user?.role !== 'CLIENT' && (
                  <button
                    onClick={() => setShowNewModal(true)}
                    className="px-4 py-2 text-sm font-medium text-[#F77B0F] border border-[#F77B0F]/30 rounded-lg hover:bg-[#F77B0F]/10 dark:text-[#F77B0F]/80 dark:border-[#F77B0F] dark:hover:bg-[#192C67]/20"
                  >
                    New Conversation
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showNewModal && (
        <NewConversationModal
          userRole={user?.role}
          onClose={() => setShowNewModal(false)}
          onCreate={(conv) => {
            setConversations((prev) => [conv, ...prev]);
            setActiveId(conv.id);
            sessionStorage.setItem('uteo-chat-active', conv.id);
          }}
        />
      )}
    </div>
  );
}
