import { apiGet, apiPost, apiPatch } from '../api';

export type BreakoutStatus = 'OPEN' | 'CLOSED';

export interface BreakoutParticipant {
  id: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  role?: string;
  email?: string;
}

export interface BreakoutRoom {
  id: string;
  bookingId?: string;
  parentId?: string | null;
  name: string;
  jaasRoomName: string;
  status: BreakoutStatus;
  hostId?: string | null;
  host?: BreakoutParticipant | null;
  participants: BreakoutParticipant[];
  breakouts?: BreakoutRoom[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BreakoutTree {
  parentRooms: BreakoutRoom[];
}

export const breakoutRoomsService = {
  /** Fetch the full breakout-room tree for a booking. */
  async listByBooking(bookingId: string): Promise<BreakoutTree> {
    return apiGet<BreakoutTree>(`/bookings/${bookingId}/breakout-rooms`);
  },

  /** Create a breakout room (trainer only). */
  async create(
    bookingId: string,
    body: { name: string; participantUserIds: string[]; hostUserId?: string },
  ): Promise<BreakoutRoom> {
    return apiPost<BreakoutRoom>(`/bookings/${bookingId}/breakout-rooms`, body);
  },

  /** Add/remove participants (host/trainer). */
  async updateParticipants(
    roomId: string,
    body: { add?: string[]; remove?: string[] },
  ): Promise<BreakoutRoom> {
    return apiPatch<BreakoutRoom>(`/breakout-rooms/${roomId}/participants`, body);
  },

  /** Close a breakout room. */
  async close(roomId: string): Promise<BreakoutRoom> {
    return apiPost<BreakoutRoom>(`/breakout-rooms/${roomId}/close`);
  },

  /** Reopen a closed breakout room. */
  async reopen(roomId: string): Promise<BreakoutRoom> {
    return apiPost<BreakoutRoom>(`/breakout-rooms/${roomId}/reopen`);
  },

  /** Assign a new host to a breakout room (trainer only). */
  async assignHost(roomId: string, hostUserId: string): Promise<BreakoutRoom> {
    return apiPost<BreakoutRoom>(`/breakout-rooms/${roomId}/host`, { hostUserId });
  },

  /**
   * Atomically move a participant to toRoomId, optionally removing them from fromRoomId.
   * Passing fromRoomId = undefined just adds the user to the target without removing elsewhere.
   */
  async moveParticipant(
    toRoomId: string,
    participantUserId: string,
    fromRoomId?: string,
  ): Promise<BreakoutRoom> {
    return apiPatch<BreakoutRoom>(`/breakout-rooms/${toRoomId}/move-participant`, {
      userId: participantUserId,
      fromRoomId,
    });
  },

  /**
   * Provision N breakout rooms for a booking (creates main room if absent).
   * Returns the full updated room tree.
   */
  async provisionRooms(
    bookingId: string,
    count: number,
    names?: string[],
  ): Promise<{ parentRooms: BreakoutRoom[]; provisioned: number }> {
    return apiPost(`/bookings/${bookingId}/provision-rooms`, { count, names });
  },
};

/**
 * Build a secure video meeting URL for a given room.
 * When a signed JWT is supplied the user's moderator flag comes from the token,
 * preventing clients from joining as hosts.
 */
export function buildJaasUrl(jaasRoomName: string, displayName?: string, jwt?: string): string {
  const appId = process.env.NEXT_PUBLIC_JAAS_APP_ID;
  const base = appId
    ? `https://8x8.vc/${appId}/${encodeURIComponent(jaasRoomName)}`
    : `https://meet.jit.si/${encodeURIComponent(jaasRoomName)}`;

  const jwtParam = jwt ? `?jwt=${jwt}` : '';
  const fragment = displayName ? `#userInfo.displayName="${encodeURIComponent(displayName)}"` : '';
  return `${base}${jwtParam}${fragment}`;
}
