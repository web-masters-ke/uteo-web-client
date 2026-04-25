import { apiGet, apiPost, apiPatch } from "../api";
import type { Conversation, Message, SendMessagePayload, Paginated } from "../types";

export const chatService = {
  getConversations: async (): Promise<Conversation[]> => apiGet("/conversations"),
  getMessages: async (conversationId: string, params?: { page?: number; limit?: number }): Promise<Paginated<Message>> => apiGet(`/conversations/${conversationId}/messages`, { params }),
  sendMessage: async (payload: SendMessagePayload): Promise<Message> => {
    // Backend expects POST /conversations/:id/messages with { content }
    const { conversationId, body, content, ...rest } = payload as any;
    const messageContent = content || body;
    if (conversationId) {
      return apiPost(`/conversations/${conversationId}/messages`, { content: messageContent, ...rest });
    }
    // Fallback: if no conversationId, create conversation first
    return apiPost("/conversations", { content: messageContent, ...rest });
  },
  markAsRead: async (messageId: string): Promise<void> => {
    // Backend: PATCH /conversations/messages/:id/read
    await apiPatch(`/conversations/messages/${messageId}/read`);
  },
  createOrGetConversation: async (participantId: string): Promise<Conversation> => {
    return apiPost("/conversations", { participantId });
  },
  searchUsers: async (query: string): Promise<{ id: string; firstName: string; lastName: string; avatarUrl?: string }[]> => {
    try {
      return await apiGet("/users", { params: { search: query } });
    } catch {
      return [];
    }
  },
};
