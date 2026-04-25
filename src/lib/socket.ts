"use client";

// WebSocket is fully DISABLED — the backend does not have a Socket.IO gateway.
// All exports are no-ops so the rest of the app compiles without errors.

export function getSocket(): null {
  return null;
}

export function disconnectSocket() {}

export type RealtimeEvent =
  | { type: "booking.created"; payload: { bookingId: string } }
  | {
      type: "booking.status_changed";
      payload: { bookingId: string; status: string };
    }
  | {
      type: "conversation.message";
      payload: {
        conversationId: string;
        messageId: string;
        body: string;
        senderName: string;
        senderId: string;
      };
    }
  | { type: "review.created"; payload: { reviewId: string; trainerId: string } }
  | { type: "wallet.updated"; payload: { balance: number } }
  | {
      type: "notification";
      payload: { id: string; title: string; body?: string };
    };

export function onRealtime(
  _handler: (event: RealtimeEvent) => void
): () => void {
  return () => {};
}

export function subscribeToUserRoom(_userId: string) {}
