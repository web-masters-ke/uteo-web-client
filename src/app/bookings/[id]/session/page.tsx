'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { bookingService } from '@/lib/services/bookings';
import {
  breakoutRoomsService,
  buildJaasUrl,
  BreakoutRoom,
  BreakoutParticipant,
} from '@/lib/services/breakoutRooms';
import type { Booking } from '@/lib/types';

/* ───────────────────────── helpers ───────────────────────── */

function statusChipClass(status: BreakoutRoom['status']) {
  return status === 'OPEN'
    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
    : 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
}

function pName(p: BreakoutParticipant): string {
  return `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'User';
}

function flattenRooms(parents: BreakoutRoom[]): BreakoutRoom[] {
  const out: BreakoutRoom[] = [];
  for (const p of parents) {
    out.push(p);
    (p.breakouts || []).forEach((b) => out.push({ ...b, parentId: p.id }));
  }
  return out;
}

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function nextGroupName(existingCount: number): string {
  return `Group ${ALPHA[existingCount] ?? existingCount + 1}`;
}

/* ───────────────────────── page ───────────────────────── */

export default function SessionRoomHopperPage() {
  const { id: bookingId } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRoomId = searchParams.get('room');
  const { user } = useAuth();
  const { addToast } = useToast();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookingLoading, setBookingLoading] = useState(true);

  const [roomsLoading, setRoomsLoading] = useState(true);
  const [parentRooms, setParentRooms] = useState<BreakoutRoom[]>([]);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<'rooms' | 'assign'>('rooms');

  // Breakout assignment banner (client side — shown when trainer assigns them mid-session)
  const [assignedBreakout, setAssignedBreakout] = useState<BreakoutRoom | null>(null);
  const knownBreakoutIdsRef = useRef<Set<string>>(new Set());
  const roomsInitializedRef = useRef(false);

  // Provision rooms panel (trainer — shown when no rooms exist yet)
  const [provisionCount, setProvisionCount] = useState(3);
  const [provisionBusy, setProvisionBusy] = useState(false);

  // Create-breakout modal (trainer — quick single room creation from Rooms tab)
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createParticipants, setCreateParticipants] = useState<string[]>([]);
  const [createHost, setCreateHost] = useState<string>('');
  const [busy, setBusy] = useState(false);

  // Per-participant assignment busy state (spinner per userId)
  const [assignBusy, setAssignBusy] = useState<Record<string, boolean>>({});

  // JaaS signed token (prevents client from joining as host/moderator)
  const [jaasToken, setJaasToken] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  /* ─── fetch booking + JaaS token in parallel ─── */
  useEffect(() => {
    let cancelled = false;
    setBookingLoading(true);
    Promise.all([
      bookingService.getById(bookingId),
      bookingService.getJaasToken(bookingId).catch(() => null), // non-fatal
    ]).then(([b, tokenRes]) => {
      if (cancelled) return;
      setBooking(b);
      if (tokenRes?.token) setJaasToken(tokenRes.token);
    }).catch(() => {
      if (!cancelled) addToast('error', 'Failed to load booking');
    }).finally(() => {
      if (!cancelled) setBookingLoading(false);
    });
    return () => { cancelled = true; };
  }, [bookingId, addToast]);

  /* ─── fetch + poll rooms ─── */
  const loadRooms = useCallback(async (silent = false) => {
    if (!silent) setRoomsLoading(true);
    try {
      const data = await breakoutRoomsService.listByBooking(bookingId);
      const rooms: BreakoutRoom[] = data?.parentRooms || [];
      setParentRooms(rooms);

      // Detect newly assigned breakout (client only, skip on initial load)
      if (user?.role !== 'TRAINER' && user) {
        const mainRoom = rooms[0];
        const bkts: BreakoutRoom[] = mainRoom?.breakouts || [];
        bkts.forEach((b) => {
          const amIIn = b.participants.some((p) => p.id === user.id);
          if (amIIn && !knownBreakoutIdsRef.current.has(b.id) && roomsInitializedRef.current) {
            setAssignedBreakout(b);
          }
          knownBreakoutIdsRef.current.add(b.id);
        });
        roomsInitializedRef.current = true;
      }
    } catch (e: any) {
      if (!silent) addToast('error', e?.response?.data?.message || 'Failed to load rooms');
    } finally {
      if (!silent) setRoomsLoading(false);
    }
  }, [bookingId, addToast, user]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    const timer = setInterval(() => loadRooms(true), 15_000);
    return () => clearInterval(timer);
  }, [loadRooms]);

  /* ─── derived data ─── */
  const parent = parentRooms[0] || null;
  const breakouts: BreakoutRoom[] = parent?.breakouts || [];
  const allRooms = useMemo(() => flattenRooms(parentRooms), [parentRooms]);

  const currentRoom: BreakoutRoom | null = useMemo(() => {
    if (!parent) return null;
    const target = selectedRoomId ?? requestedRoomId ?? parent.id;
    return allRooms.find((r) => r.id === target) || parent;
  }, [parent, allRooms, selectedRoomId, requestedRoomId]);

  const parentOfCurrent: BreakoutRoom | null = useMemo(() => {
    if (!currentRoom || !parent) return null;
    if (currentRoom.id === parent.id) return null;
    return parent;
  }, [currentRoom, parent]);

  const isTrainer =
    user?.role === 'TRAINER' ||
    (!!booking && !!user && user.id === (booking as any).trainerId);

  /* ─── sync selected room when query-param changes ─── */
  useEffect(() => {
    if (!parent) return;
    const target = requestedRoomId || parent.id;
    const exists = allRooms.some((r) => r.id === target);
    setSelectedRoomId(exists ? target : parent.id);
  }, [parent, requestedRoomId, allRooms]);

  /* ─── access check ─── */
  const isParticipantOfCurrent = useMemo(() => {
    if (!currentRoom || !user) return false;
    if (isTrainer) return true;
    return currentRoom.participants.some((p) => p.id === user.id);
  }, [currentRoom, user, isTrainer]);

  /* ─── JaaS URL ─── */
  const dn = useMemo(() => {
    if (!user) return undefined;
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || undefined;
  }, [user]);

  const jaasUrl = useMemo(() => {
    if (!currentRoom) return '';
    return buildJaasUrl(currentRoom.jaasRoomName, dn, jaasToken ?? undefined);
  }, [currentRoom, dn, jaasToken]);

  /* ─── participant assignment derived data (trainer only) ─── */
  // Map each non-trainer participant in main room → which breakout they're in (if any)
  const { unassigned, assignedMap } = useMemo(() => {
    if (!parent) return { unassigned: [] as BreakoutParticipant[], assignedMap: new Map<string, string>() };
    const map = new Map<string, string>(); // userId → breakoutRoomId
    breakouts.forEach((b) => {
      b.participants.forEach((p) => {
        if (!map.has(p.id)) map.set(p.id, b.id); // first breakout wins
      });
    });
    // Non-trainer participants in main room who aren't in any breakout
    const unassignedList = parent.participants.filter(
      (p) => p.id !== user?.id && !map.has(p.id),
    );
    return { unassigned: unassignedList, assignedMap: map };
  }, [parent, breakouts, user?.id]);

  /* ─── room switching ─── */
  const switchRoom = useCallback((roomId: string) => {
    if (!parent) return;
    if (roomId === selectedRoomId) return;
    setSwitching(true);
    const target = roomId === parent.id ? `?room=${parent.id}` : `?room=${roomId}`;
    router.replace(`/bookings/${bookingId}/session${target}`, { scroll: false });
    setSelectedRoomId(roomId);
    setTimeout(() => setSwitching(false), 1000);
  }, [parent, selectedRoomId, bookingId, router]);

  /* ─── provision rooms ─── */
  const handleProvision = async () => {
    setProvisionBusy(true);
    try {
      await breakoutRoomsService.provisionRooms(bookingId, provisionCount);
      addToast('success', `${provisionCount} breakout rooms created`);
      await loadRooms();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Failed to provision rooms');
    } finally {
      setProvisionBusy(false);
    }
  };

  /* ─── assign participant to a room ─── */
  const handleAssign = async (participantId: string, toRoomId: string | null) => {
    setAssignBusy((prev) => ({ ...prev, [participantId]: true }));
    try {
      const fromRoomId = assignedMap.get(participantId);
      if (toRoomId === null) {
        // Unassign: remove from current breakout
        if (fromRoomId) {
          await breakoutRoomsService.updateParticipants(fromRoomId, { remove: [participantId] });
        }
      } else {
        await breakoutRoomsService.moveParticipant(toRoomId, participantId, fromRoomId);
      }
      await loadRooms(true);
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Failed to assign participant');
    } finally {
      setAssignBusy((prev) => ({ ...prev, [participantId]: false }));
    }
  };

  /* ─── auto-distribute unassigned across open breakouts ─── */
  const handleAutoDistribute = async () => {
    const openBreakouts = breakouts.filter((b) => b.status === 'OPEN');
    if (!openBreakouts.length) {
      addToast('error', 'No open breakout rooms to distribute into');
      return;
    }
    // Shuffle unassigned for fairness
    const shuffled = [...unassigned].sort(() => Math.random() - 0.5);
    setBusy(true);
    try {
      // Build batch: map of roomId → [userIds to add]
      const batch = new Map<string, string[]>();
      openBreakouts.forEach((b) => batch.set(b.id, []));
      shuffled.forEach((p, i) => {
        const room = openBreakouts[i % openBreakouts.length];
        batch.get(room.id)!.push(p.id);
      });
      await Promise.all(
        Array.from(batch.entries()).map(([roomId, ids]) =>
          ids.length ? breakoutRoomsService.updateParticipants(roomId, { add: ids }) : Promise.resolve(),
        ),
      );
      addToast('success', `Distributed ${shuffled.length} participants across ${openBreakouts.length} rooms`);
      await loadRooms(true);
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Auto-distribute failed');
    } finally {
      setBusy(false);
    }
  };

  /* ─── create single breakout (quick add from Rooms tab) ─── */
  const parentParticipants: BreakoutParticipant[] = parent?.participants || [];
  const alreadyInBreakout = useMemo(() => {
    const set = new Set<string>();
    breakouts.forEach((b) => b.participants.forEach((p) => set.add(p.id)));
    return set;
  }, [breakouts]);

  const submitCreate = async () => {
    if (!createName.trim() || createParticipants.length === 0) {
      addToast('error', 'Enter a room name and select at least one participant');
      return;
    }
    setBusy(true);
    try {
      await breakoutRoomsService.create(bookingId, {
        name: createName.trim(),
        participantUserIds: createParticipants,
        hostUserId: createHost || undefined,
      });
      addToast('success', 'Breakout room created');
      setCreateOpen(false);
      setCreateName('');
      setCreateParticipants([]);
      setCreateHost('');
      loadRooms();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Failed to create breakout');
    } finally {
      setBusy(false);
    }
  };

  const toggleInArray = (arr: string[], setter: (v: string[]) => void, pid: string) => {
    if (arr.includes(pid)) setter(arr.filter((x) => x !== pid));
    else setter([...arr, pid]);
  };

  /* ─── exit ─── */
  const leaveSession = () => router.push(`/bookings/${bookingId}`);

  /* ───────────────────────── guards ───────────────────────── */

  if (bookingLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B1020] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B1020] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-white mb-2">Booking not found</h1>
          <p className="text-sm text-white/60 mb-6">This booking may have been removed or you no longer have access.</p>
          <Link href="/bookings" className="inline-flex items-center gap-2 px-4 py-2 bg-[#F77B0F] text-white rounded-lg text-sm font-semibold">Back to Bookings</Link>
        </div>
      </div>
    );
  }

  if (booking.sessionType !== 'VIRTUAL' && booking.sessionType !== 'HYBRID') {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B1020] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-white mb-2">This booking is in-person</h1>
          <p className="text-sm text-white/60 mb-6">No video session — refer to the booking overview for the meeting location.</p>
          <Link href={`/bookings/${bookingId}`} className="inline-flex items-center gap-2 px-4 py-2 bg-[#192C67] text-white rounded-lg text-sm font-semibold">Back to Booking</Link>
        </div>
      </div>
    );
  }

  if (roomsLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B1020] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent" />
      </div>
    );
  }

  // No room provisioned — trainer sees setup wizard; client sees waiting state
  if (!parent || !currentRoom) {
    if (isTrainer) {
      return (
        <div className="fixed inset-0 z-50 bg-[#0B1020] flex items-center justify-center px-6">
          <div className="max-w-sm w-full">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[#F77B0F]/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-[#F77B0F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white text-center mb-1">Set up your session rooms</h1>
            <p className="text-sm text-white/50 text-center mb-6">
              No rooms provisioned yet. Choose how many breakout groups you need — a Main Room will be created automatically.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-3">
                  Number of breakout rooms: <span className="text-[#F77B0F] text-sm">{provisionCount}</span>
                </label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setProvisionCount((c) => Math.max(1, c - 1))}
                    className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 font-bold text-lg flex items-center justify-center">−</button>
                  <div className="flex-1 flex gap-1">
                    {[1,2,3,4,5,6].map((n) => (
                      <button key={n} onClick={() => setProvisionCount(n)}
                        className={cn('flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors',
                          provisionCount === n ? 'bg-[#F77B0F] text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                        )}>{n}</button>
                    ))}
                  </div>
                  <button onClick={() => setProvisionCount((c) => Math.min(10, c + 1))}
                    className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 font-bold text-lg flex items-center justify-center">+</button>
                </div>
              </div>

              <div className="text-xs text-white/40 space-y-1">
                {Array.from({ length: provisionCount }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#192C67] text-white text-[10px] font-bold flex items-center justify-center">{ALPHA[i]}</span>
                    <span>Group {ALPHA[i]}</span>
                  </div>
                ))}
              </div>

              <button onClick={handleProvision} disabled={provisionBusy}
                className="w-full py-3 text-sm font-bold rounded-xl bg-[#F77B0F] text-white hover:bg-[#e36d04] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {provisionBusy ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Setting up rooms…</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>Create {provisionCount} Breakout Room{provisionCount > 1 ? 's' : ''}</>
                )}
              </button>
            </div>

            <div className="mt-4 text-center">
              <Link href={`/bookings/${bookingId}`} className="text-xs text-white/40 hover:text-white/70 transition-colors">← Back to booking details</Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 bg-[#0B1020] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Session not ready yet</h1>
          <p className="text-sm text-white/60 mb-6">Your trainer is setting up the session rooms. This page will refresh automatically.</p>
          <Link href={`/bookings/${bookingId}`} className="inline-flex items-center gap-2 px-4 py-2 bg-[#192C67] text-white rounded-lg text-sm font-semibold">Back to Booking</Link>
        </div>
      </div>
    );
  }

  // Client not in the requested room
  if (!isParticipantOfCurrent) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B1020] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-white mb-2">You&apos;re not in this room</h1>
          <p className="text-sm text-white/60 mb-6">
            You haven&apos;t been added to <b>{currentRoom.name}</b>. Ask your trainer to assign you.
          </p>
          <div className="flex items-center justify-center gap-2">
            {parent && (
              <button onClick={() => switchRoom(parent.id)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#F77B0F] text-white rounded-lg text-sm font-semibold">
                Go to Main Room
              </button>
            )}
            <Link href={`/bookings/${bookingId}`} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-semibold">
              Back to Booking
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ───────────────────────── main render ───────────────────────── */

  const inBreakout = currentRoom.id !== parent.id;
  const totalParticipantsInSession = parent.participants.filter((p) => p.id !== user?.id).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1020] text-white flex flex-col">

      {/* ── Top bar ─── */}
      <header className="flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-white/10 bg-[#0B1020]/90 backdrop-blur-sm z-20">
        <button onClick={leaveSession} title="Back to booking"
          className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm sm:text-base font-semibold truncate">{currentRoom.name}</h1>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', statusChipClass(currentRoom.status))}>
              {currentRoom.status}
            </span>
            {inBreakout && (
              <span className="text-[10px] text-white/40">Breakout</span>
            )}
          </div>
          {parentOfCurrent && (
            <p className="text-[11px] text-white/40 truncate">of {parentOfCurrent.name}</p>
          )}
        </div>

        {/* Drawer toggle with unassigned badge */}
        <button onClick={() => setDrawerOpen((o) => !o)}
          className={cn(
            'relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors',
            drawerOpen ? 'bg-[#F77B0F] text-white hover:bg-[#e36d04]' : 'bg-white/10 text-white hover:bg-white/20',
          )}
          title="Toggle rooms panel">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          Rooms ({1 + breakouts.length})
          {isTrainer && unassigned.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center">
              {unassigned.length}
            </span>
          )}
        </button>
      </header>

      {/* ── Body ─── */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Iframe stage */}
        <div className="relative flex-1 bg-black">
          {jaasUrl && (
            <iframe
              key={currentRoom.id}
              ref={iframeRef}
              src={jaasUrl}
              title={`Session: ${currentRoom.name}`}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          )}
          {switching && (
            <div className="absolute inset-0 bg-[#0B1020]/85 backdrop-blur-sm flex flex-col items-center justify-center z-30">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent mb-3" />
              <p className="text-sm font-medium text-white/80">Switching rooms…</p>
              <p className="text-xs text-white/50 mt-1">{currentRoom.name}</p>
            </div>
          )}
        </div>

        {/* ── Drawer ─── */}
        <aside className={cn(
          'shrink-0 border-l border-white/10 bg-[#0F1630] transition-all duration-300 overflow-hidden flex flex-col',
          drawerOpen ? 'w-[360px]' : 'w-0',
        )}>
          {/* Drawer header + tabs */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 gap-2">
            <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
              <button onClick={() => setDrawerTab('rooms')}
                className={cn('px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                  drawerTab === 'rooms' ? 'bg-[#192C67] text-white' : 'text-white/50 hover:text-white')}>
                Rooms
              </button>
              {isTrainer && (
                <button onClick={() => setDrawerTab('assign')}
                  className={cn('relative px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                    drawerTab === 'assign' ? 'bg-[#F77B0F] text-white' : 'text-white/50 hover:text-white')}>
                  Assign
                  {unassigned.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] font-bold flex items-center justify-center">
                      {unassigned.length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Action button changes per tab */}
            {isTrainer && drawerTab === 'rooms' && parent.status === 'OPEN' && (
              <button onClick={() => {
                setCreateName(nextGroupName(breakouts.length));
                setCreateParticipants([]);
                setCreateHost('');
                setCreateOpen(true);
              }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-[#F77B0F] text-white hover:bg-[#e36d04]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add
              </button>
            )}

            {isTrainer && drawerTab === 'assign' && unassigned.length > 0 && (
              <button onClick={handleAutoDistribute} disabled={busy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Auto-fill
              </button>
            )}
          </div>

          {/* ── Rooms Tab ─── */}
          {drawerTab === 'rooms' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <RoomCard
                room={parent}
                isMain
                isCurrent={currentRoom.id === parent.id}
                canJoin
                onJoin={() => switchRoom(parent.id)}
                isTrainer={isTrainer}
                currentUserId={user?.id}
                onRemoveParticipant={null}
              />

              {breakouts.length === 0 ? (
                <div className="border border-dashed border-white/15 rounded-xl p-4 text-center">
                  <p className="text-xs text-white/40">No breakout rooms yet.</p>
                  {isTrainer && (
                    <button onClick={() => {
                      setCreateName(nextGroupName(0));
                      setCreateOpen(true);
                    }} className="mt-2 text-xs text-[#F77B0F] hover:underline">
                      Create first breakout →
                    </button>
                  )}
                </div>
              ) : (
                <div className="pl-3 border-l border-white/10 space-y-2">
                  {breakouts.map((b) => {
                    const amIInRoom = !!user && b.participants.some((p) => p.id === user.id);
                    const canJoin = (amIInRoom || isTrainer) && b.status === 'OPEN';
                    return (
                      <RoomCard
                        key={b.id}
                        room={b}
                        isMain={false}
                        isCurrent={currentRoom.id === b.id}
                        canJoin={canJoin}
                        onJoin={() => switchRoom(b.id)}
                        isTrainer={isTrainer}
                        currentUserId={user?.id}
                        onRemoveParticipant={isTrainer ? (pid) => handleAssign(pid, null) : null}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Assign Tab (trainer only) ─── */}
          {isTrainer && drawerTab === 'assign' && (
            <div className="flex-1 overflow-y-auto">
              {/* Summary bar */}
              <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/50">
                  {totalParticipantsInSession} participant{totalParticipantsInSession !== 1 ? 's' : ''} in session
                </span>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-red-400 font-semibold">{unassigned.length} unassigned</span>
                  <span className="text-green-400 font-semibold">{assignedMap.size} assigned</span>
                </div>
              </div>

              <div className="p-3 space-y-4">
                {/* Unassigned section */}
                {unassigned.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-red-400/80 mb-2 px-1">
                      Unassigned ({unassigned.length})
                    </p>
                    <div className="space-y-1.5">
                      {unassigned.map((p) => (
                        <ParticipantAssignRow
                          key={p.id}
                          participant={p}
                          currentRoomId={null}
                          breakouts={breakouts}
                          onAssign={(toRoomId) => handleAssign(p.id, toRoomId)}
                          busy={!!assignBusy[p.id]}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Assigned section — grouped by room */}
                {breakouts.map((b) => {
                  const assignedHere = b.participants.filter(
                    (p) => p.id !== user?.id && assignedMap.get(p.id) === b.id,
                  );
                  if (!assignedHere.length) return null;
                  return (
                    <div key={b.id}>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className={cn('w-2 h-2 rounded-full', b.status === 'OPEN' ? 'bg-green-400' : 'bg-gray-500')} />
                        <p className="text-[10px] uppercase tracking-wider font-bold text-white/50 truncate flex-1">{b.name}</p>
                        <span className="text-[10px] text-white/30">{assignedHere.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {assignedHere.map((p) => (
                          <ParticipantAssignRow
                            key={p.id}
                            participant={p}
                            currentRoomId={b.id}
                            breakouts={breakouts}
                            onAssign={(toRoomId) => handleAssign(p.id, toRoomId)}
                            busy={!!assignBusy[p.id]}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {totalParticipantsInSession === 0 && (
                  <p className="text-xs text-white/30 text-center py-6">
                    No other participants in this session yet.
                  </p>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Breakout assignment banner (client) ─── */}
      {assignedBreakout && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#192C67] border border-[#F77B0F]/60 shadow-xl shadow-black/40 text-white">
            <svg className="w-5 h-5 shrink-0 text-[#F77B0F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87V15.13a1 1 0 01-1.447.9L15 14M3 8.5A1.5 1.5 0 014.5 7h8A1.5 1.5 0 0114 8.5v7A1.5 1.5 0 0112.5 17h-8A1.5 1.5 0 013 15.5v-7z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">
                You&apos;ve been moved to <span className="text-[#F77B0F]">{assignedBreakout.name}</span>
              </p>
              <p className="text-[10px] text-white/60">Your trainer assigned you a breakout room</p>
            </div>
            <button
              onClick={() => { switchRoom(assignedBreakout.id); setAssignedBreakout(null); }}
              className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#F77B0F] text-white hover:bg-[#e36d04] transition-colors">
              Join
            </button>
            <button onClick={() => setAssignedBreakout(null)}
              className="shrink-0 p-1 rounded text-white/50 hover:text-white transition-colors" title="Dismiss">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom action bar ─── */}
      <footer className="h-16 border-t border-white/10 bg-[#0B1020]/90 backdrop-blur-sm flex items-center justify-center gap-3 px-4">
        {inBreakout && (
          <button onClick={() => switchRoom(parent.id)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#F77B0F] text-white hover:bg-[#e36d04] transition-colors shadow-lg shadow-[#F77B0F]/20">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Main Room
          </button>
        )}
        <button onClick={leaveSession}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-red-500/90 text-white hover:bg-red-500 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Leave Session
        </button>
      </footer>

      {/* ── Create breakout modal ─── */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Breakout Room" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Room Name *</label>
            <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. Group A — Discussion"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67] outline-none"
              maxLength={120} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Participants *</label>
            {parentParticipants.length === 0 ? (
              <p className="text-xs text-gray-500">No participants available.</p>
            ) : (
              <div className="max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                {parentParticipants
                  .filter((p) => p.id !== parent?.hostId)
                  .map((p) => {
                    const checked = createParticipants.includes(p.id);
                    const alreadyIn = alreadyInBreakout.has(p.id);
                    return (
                      <label key={p.id} className={cn('flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700', alreadyIn && 'opacity-60')}>
                        <input type="checkbox" checked={checked}
                          onChange={() => toggleInArray(createParticipants, setCreateParticipants, p.id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#192C67] focus:ring-[#192C67]" />
                        <Avatar src={p.avatar || p.avatarUrl} firstName={p.firstName || '?'} lastName={p.lastName || ''} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{pName(p)}</p>
                          {alreadyIn && <p className="text-[10px] text-[#F77B0F]">Already in another breakout</p>}
                        </div>
                      </label>
                    );
                  })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Host (optional)</label>
            <select value={createHost} onChange={(e) => setCreateHost(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67] outline-none">
              <option value="">— None (trainer hosts) —</option>
              {createParticipants.map((id) => {
                const p = parentParticipants.find((x) => x.id === id);
                if (!p) return null;
                return <option key={id} value={id}>{pName(p)}</option>;
              })}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button onClick={submitCreate} disabled={busy || !createName.trim() || createParticipants.length === 0}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#F77B0F] text-white hover:bg-[#e36d04] disabled:opacity-50">
              {busy ? 'Creating…' : 'Create Breakout'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ───────────────────────── RoomCard ───────────────────────── */

function RoomCard({
  room,
  isMain,
  isCurrent,
  canJoin,
  onJoin,
  isTrainer,
  currentUserId,
  onRemoveParticipant,
}: {
  room: BreakoutRoom;
  isMain: boolean;
  isCurrent: boolean;
  canJoin: boolean;
  onJoin: () => void;
  isTrainer: boolean;
  currentUserId?: string;
  onRemoveParticipant: ((userId: string) => void) | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const nonTrainerParticipants = room.participants.filter((p) => p.id !== currentUserId);

  return (
    <div className={cn(
      'rounded-xl border transition-colors',
      isCurrent ? 'border-[#F77B0F] bg-[#F77B0F]/10' : 'border-white/10 bg-white/5 hover:bg-white/8',
    )}>
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isMain && <span className="text-[9px] uppercase tracking-wider font-bold text-[#8ba6d8]">Main</span>}
            <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full', statusChipClass(room.status))}>
              {room.status}
            </span>
          </div>
          <p className="text-sm font-semibold text-white truncate mt-0.5">{room.name}</p>

          {/* Participant avatar strip */}
          <div className="flex items-center mt-2 gap-1 flex-wrap">
            {room.participants.slice(0, 5).map((p) => (
              <div key={p.id} title={pName(p)} className="relative group">
                <Avatar src={p.avatar || p.avatarUrl} firstName={p.firstName || '?'} lastName={p.lastName || ''} size="sm" />
                {!isMain && isTrainer && onRemoveParticipant && p.id !== currentUserId && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveParticipant(p.id); }}
                    title={`Remove ${pName(p)}`}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold items-center justify-center hidden group-hover:flex"
                  >×</button>
                )}
              </div>
            ))}
            {room.participants.length > 5 && (
              <span className="text-[10px] text-white/40">+{room.participants.length - 5}</span>
            )}
            {room.participants.length === 0 && (
              <span className="text-[10px] text-white/30">Empty</span>
            )}
          </div>
        </div>

        <button
          onClick={onJoin}
          disabled={isCurrent || !canJoin || room.status !== 'OPEN'}
          className={cn(
            'shrink-0 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors',
            isCurrent ? 'bg-[#F77B0F]/30 text-[#F77B0F] cursor-default'
              : canJoin && room.status === 'OPEN' ? 'bg-[#192C67] text-white hover:bg-[#14234f]'
              : 'bg-white/10 text-white/40 cursor-not-allowed',
          )}
        >
          {isCurrent ? 'Here' : 'Join'}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── ParticipantAssignRow ───────────────────────── */

function ParticipantAssignRow({
  participant,
  currentRoomId,
  breakouts,
  onAssign,
  busy,
}: {
  participant: BreakoutParticipant;
  currentRoomId: string | null;
  breakouts: BreakoutRoom[];
  onAssign: (toRoomId: string | null) => void;
  busy: boolean;
}) {
  const openBreakouts = breakouts.filter((b) => b.status === 'OPEN');

  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
      <Avatar
        src={participant.avatar || participant.avatarUrl}
        firstName={participant.firstName || '?'}
        lastName={participant.lastName || ''}
        size="sm"
      />
      <p className="text-xs font-medium text-white truncate flex-1">{pName(participant)}</p>

      {busy ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#F77B0F] border-t-transparent shrink-0" />
      ) : (
        <select
          value={currentRoomId ?? ''}
          onChange={(e) => onAssign(e.target.value || null)}
          className="shrink-0 text-[11px] font-semibold bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[#F77B0F] cursor-pointer max-w-[110px]"
        >
          <option value="">Unassigned</option>
          {openBreakouts.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
