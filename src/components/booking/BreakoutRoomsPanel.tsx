'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import {
  breakoutRoomsService,
  BreakoutRoom,
  BreakoutParticipant,
} from '@/lib/services/breakoutRooms';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Booking } from '@/lib/types';

interface Props {
  booking: Booking;
}

function statusChipClass(status: BreakoutRoom['status']) {
  return status === 'OPEN'
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
}

function displayName(p: BreakoutParticipant): string {
  return `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'User';
}

export default function BreakoutRoomsPanel({ booking }: Props) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const isTrainer = user?.role === 'TRAINER' || user?.id === booking.trainerId;

  const [loading, setLoading] = useState(true);
  const [parentRooms, setParentRooms] = useState<BreakoutRoom[]>([]);
  const [busy, setBusy] = useState(false);

  // Create-breakout modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createParent, setCreateParent] = useState<BreakoutRoom | null>(null);
  const [createName, setCreateName] = useState('');
  const [createParticipants, setCreateParticipants] = useState<string[]>([]);
  const [createHost, setCreateHost] = useState<string>('');

  // Manage-participants modal
  const [manageOpen, setManageOpen] = useState(false);
  const [manageRoom, setManageRoom] = useState<BreakoutRoom | null>(null);
  const [manageToAdd, setManageToAdd] = useState<string[]>([]);
  const [manageToRemove, setManageToRemove] = useState<string[]>([]);

  // Assign-host dropdown state (per room id)
  const [hostDropdownFor, setHostDropdownFor] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await breakoutRoomsService.listByBooking(booking.id);
      setParentRooms(data?.parentRooms || []);
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Failed to load breakout rooms');
    } finally {
      setLoading(false);
    }
  }, [booking.id, addToast]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const parent = parentRooms[0] || null;
  const breakouts: BreakoutRoom[] = parent?.breakouts || [];

  // All known people we could place into a breakout (parent room participants).
  const parentParticipants: BreakoutParticipant[] = parent?.participants || [];

  // Who is still "available" to add to a new breakout (not already in one).
  const alreadyInBreakout = useMemo(() => {
    const set = new Set<string>();
    breakouts.forEach((b) => b.participants.forEach((p) => set.add(p.id)));
    return set;
  }, [breakouts]);

  // In-app room URL (handled by /bookings/[id]/session).
  const roomHopperUrl = (roomId: string) =>
    `/bookings/${booking.id}/session?room=${roomId}`;

  // ── Create breakout ───────────────────────────────────────────────
  const openCreateModal = (parentRoom: BreakoutRoom) => {
    setCreateParent(parentRoom);
    setCreateName('');
    setCreateParticipants([]);
    setCreateHost('');
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!createName.trim() || createParticipants.length === 0) {
      addToast('error', 'Enter a room name and select at least one participant');
      return;
    }
    setBusy(true);
    try {
      await breakoutRoomsService.create(booking.id, {
        name: createName.trim(),
        participantUserIds: createParticipants,
        hostUserId: createHost || undefined,
      });
      addToast('success', 'Breakout room created');
      setCreateOpen(false);
      loadRooms();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Failed to create breakout');
    } finally {
      setBusy(false);
    }
  };

  // ── Close / reopen ────────────────────────────────────────────────
  const handleClose = async (room: BreakoutRoom) => {
    setBusy(true);
    try {
      await breakoutRoomsService.close(room.id);
      addToast('success', 'Breakout closed');
      loadRooms();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Failed to close breakout');
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async (room: BreakoutRoom) => {
    setBusy(true);
    try {
      await breakoutRoomsService.reopen(room.id);
      addToast('success', 'Breakout reopened');
      loadRooms();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Failed to reopen breakout');
    } finally {
      setBusy(false);
    }
  };

  // ── Manage participants ───────────────────────────────────────────
  const openManageModal = (room: BreakoutRoom) => {
    setManageRoom(room);
    setManageToAdd([]);
    setManageToRemove([]);
    setManageOpen(true);
  };

  const submitManage = async () => {
    if (!manageRoom) return;
    if (manageToAdd.length === 0 && manageToRemove.length === 0) {
      setManageOpen(false);
      return;
    }
    setBusy(true);
    try {
      await breakoutRoomsService.updateParticipants(manageRoom.id, {
        add: manageToAdd.length ? manageToAdd : undefined,
        remove: manageToRemove.length ? manageToRemove : undefined,
      });
      addToast('success', 'Participants updated');
      setManageOpen(false);
      loadRooms();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Failed to update participants');
    } finally {
      setBusy(false);
    }
  };

  // ── Assign host ────────────────────────────────────────────────────
  const handleAssignHost = async (room: BreakoutRoom, hostUserId: string) => {
    setBusy(true);
    try {
      await breakoutRoomsService.assignHost(room.id, hostUserId);
      addToast('success', 'Host assigned');
      setHostDropdownFor(null);
      loadRooms();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Failed to assign host');
    } finally {
      setBusy(false);
    }
  };

  const toggleInArray = (arr: string[], setter: (v: string[]) => void, id: string) => {
    if (arr.includes(id)) setter(arr.filter((x) => x !== id));
    else setter([...arr, id]);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#F77B0F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
          Session Rooms
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No session room has been provisioned for this booking yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-[#F77B0F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            Session Rooms
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Main room and breakout groups for this session
          </p>
        </div>
        {isTrainer && parent.status === 'OPEN' && (
          <button
            onClick={() => openCreateModal(parent)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#F77B0F] text-white hover:bg-[#e36d04] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Breakout
          </button>
        )}
      </div>

      {/* ── Parent / main room ───────────────────────────────── */}
      <div className="p-4 rounded-xl border border-[#192C67]/20 bg-[#192C67]/5 dark:bg-[#192C67]/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#192C67] dark:text-[#8ba6d8]">
                Main Room
              </span>
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', statusChipClass(parent.status))}>
                {parent.status}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{parent.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {parent.participants.length} participant{parent.participants.length === 1 ? '' : 's'}
            </p>

            {/* Avatar strip */}
            <div className="flex items-center mt-3 -space-x-2">
              {parent.participants.slice(0, 6).map((p) => (
                <div key={p.id} className="ring-2 ring-white dark:ring-gray-800 rounded-full">
                  <Avatar
                    src={p.avatar || p.avatarUrl}
                    firstName={p.firstName || '?'}
                    lastName={p.lastName || ''}
                    size="sm"
                  />
                </div>
              ))}
              {parent.participants.length > 6 && (
                <div className="ring-2 ring-white dark:ring-gray-800 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold text-gray-600 dark:text-gray-300 flex items-center justify-center">
                  +{parent.participants.length - 6}
                </div>
              )}
            </div>
          </div>

          {parent.status === 'OPEN' ? (
            <Link
              href={roomHopperUrl(parent.id)}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#192C67] text-white hover:bg-[#14234f] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
              Join
            </Link>
          ) : (
            <button
              disabled
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#192C67] text-white opacity-50 cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
              Join
            </button>
          )}
        </div>
      </div>

      {/* ── Breakouts ────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Breakout Rooms ({breakouts.length})
          </h3>
        </div>

        {breakouts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No breakout rooms yet.{isTrainer ? ' Create one to split participants into smaller groups.' : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {breakouts.map((b) => {
              const amIInRoom = !!user && b.participants.some((p) => p.id === user.id);
              const canManage =
                isTrainer || (user?.id && b.hostId === user.id);

              return (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{b.name}</p>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', statusChipClass(b.status))}>
                          {b.status}
                        </span>
                        {b.host && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F77B0F]/10 text-[#F77B0F]">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.5L10 14.8 5.1 17.2l.9-5.5L2 7.8 7.5 7z" /></svg>
                            Host: {b.host.firstName} {b.host.lastName || ''}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center mt-2 -space-x-2">
                        {b.participants.slice(0, 6).map((p) => (
                          <div key={p.id} className="ring-2 ring-white dark:ring-gray-800 rounded-full" title={displayName(p)}>
                            <Avatar
                              src={p.avatar || p.avatarUrl}
                              firstName={p.firstName || '?'}
                              lastName={p.lastName || ''}
                              size="sm"
                            />
                          </div>
                        ))}
                        {b.participants.length > 6 && (
                          <div className="ring-2 ring-white dark:ring-gray-800 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold text-gray-600 dark:text-gray-300 flex items-center justify-center">
                            +{b.participants.length - 6}
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        {b.participants.length} participant{b.participants.length === 1 ? '' : 's'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {(amIInRoom || isTrainer) && b.status === 'OPEN' && (
                        <Link
                          href={roomHopperUrl(b.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#192C67] text-white hover:bg-[#14234f] transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                          </svg>
                          Join
                        </Link>
                      )}

                      {canManage && (
                        <>
                          {b.status === 'OPEN' ? (
                            <button
                              onClick={() => handleClose(b)}
                              disabled={busy}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                              Close
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReopen(b)}
                              disabled={busy}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#F77B0F]/50 text-[#F77B0F] hover:bg-[#F77B0F]/10 disabled:opacity-50"
                            >
                              Reopen
                            </button>
                          )}

                          <button
                            onClick={() => openManageModal(b)}
                            disabled={busy}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                          >
                            Manage
                          </button>
                        </>
                      )}

                      {isTrainer && (
                        <div className="relative">
                          <button
                            onClick={() => setHostDropdownFor(hostDropdownFor === b.id ? null : b.id)}
                            disabled={busy}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                          >
                            Assign Host
                          </button>
                          {hostDropdownFor === b.id && (
                            <div className="absolute right-0 z-10 mt-1 w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                              {b.participants.length === 0 ? (
                                <p className="p-3 text-xs text-gray-500">No participants to promote.</p>
                              ) : (
                                b.participants.map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => handleAssignHost(b, p.id)}
                                    className={cn(
                                      'w-full flex items-center gap-2 p-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700',
                                      b.hostId === p.id && 'bg-[#F77B0F]/10',
                                    )}
                                  >
                                    <Avatar
                                      src={p.avatar || p.avatarUrl}
                                      firstName={p.firstName || '?'}
                                      lastName={p.lastName || ''}
                                      size="sm"
                                    />
                                    <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                      {displayName(p)}
                                    </span>
                                    {b.hostId === p.id && (
                                      <span className="ml-auto text-[10px] font-semibold text-[#F77B0F]">HOST</span>
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create breakout modal ────────────────────────────── */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Breakout Room"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Room Name *
            </label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. Group A - Discussion"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67] outline-none"
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Participants *
            </label>
            {parentParticipants.length === 0 ? (
              <p className="text-xs text-gray-500">No participants available.</p>
            ) : (
              <div className="max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                {parentParticipants
                  .filter((p) => p.id !== createParent?.hostId) // trainer already hosts parent
                  .map((p) => {
                    const checked = createParticipants.includes(p.id);
                    const alreadyIn = alreadyInBreakout.has(p.id);
                    return (
                      <label
                        key={p.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700',
                          alreadyIn && 'opacity-60',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleInArray(createParticipants, setCreateParticipants, p.id)
                          }
                          className="h-4 w-4 rounded border-gray-300 text-[#192C67] focus:ring-[#192C67]"
                        />
                        <Avatar
                          src={p.avatar || p.avatarUrl}
                          firstName={p.firstName || '?'}
                          lastName={p.lastName || ''}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {displayName(p)}
                          </p>
                          {alreadyIn && (
                            <p className="text-[10px] text-[#F77B0F]">Already in another breakout</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Host (optional)
            </label>
            <select
              value={createHost}
              onChange={(e) => setCreateHost(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#192C67] outline-none"
            >
              <option value="">— None (trainer hosts) —</option>
              {createParticipants.map((id) => {
                const p = parentParticipants.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <option key={id} value={id}>
                    {displayName(p)}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={submitCreate}
              disabled={busy || !createName.trim() || createParticipants.length === 0}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#F77B0F] text-white hover:bg-[#e36d04] disabled:opacity-50"
            >
              {busy ? 'Creating...' : 'Create Breakout'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Manage participants modal ───────────────────────── */}
      <Modal
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        title={manageRoom ? `Manage: ${manageRoom.name}` : 'Manage Participants'}
        size="md"
      >
        {manageRoom && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Currently in this room
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                {manageRoom.participants.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">Empty</p>
                ) : (
                  manageRoom.participants.map((p) => {
                    const markedRemove = manageToRemove.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={markedRemove}
                          onChange={() => toggleInArray(manageToRemove, setManageToRemove, p.id)}
                          className="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                        />
                        <Avatar
                          src={p.avatar || p.avatarUrl}
                          firstName={p.firstName || '?'}
                          lastName={p.lastName || ''}
                          size="sm"
                        />
                        <span className="text-sm text-gray-900 dark:text-white truncate flex-1">
                          {displayName(p)}
                        </span>
                        {markedRemove && <span className="text-[10px] text-red-500 font-semibold">REMOVE</span>}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Add from main room
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                {parentParticipants
                  .filter((p) => !manageRoom.participants.some((x) => x.id === p.id))
                  .map((p) => {
                    const markedAdd = manageToAdd.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={markedAdd}
                          onChange={() => toggleInArray(manageToAdd, setManageToAdd, p.id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#192C67] focus:ring-[#192C67]"
                        />
                        <Avatar
                          src={p.avatar || p.avatarUrl}
                          firstName={p.firstName || '?'}
                          lastName={p.lastName || ''}
                          size="sm"
                        />
                        <span className="text-sm text-gray-900 dark:text-white truncate flex-1">
                          {displayName(p)}
                        </span>
                        {markedAdd && <span className="text-[10px] text-[#192C67] dark:text-[#8ba6d8] font-semibold">ADD</span>}
                      </label>
                    );
                  })}
                {parentParticipants.filter(
                  (p) => !manageRoom.participants.some((x) => x.id === p.id),
                ).length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-2">
                    Everyone from the main room is already in this breakout.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setManageOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={submitManage}
                disabled={busy || (manageToAdd.length === 0 && manageToRemove.length === 0)}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#192C67] text-white hover:bg-[#14234f] disabled:opacity-50"
              >
                {busy ? 'Saving...' : 'Apply Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
