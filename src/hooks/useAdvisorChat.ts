import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const RAILWAY_API_URL = 'https://watertech-scouting-production.up.railway.app';

interface Source {
  nombre: string;
  proveedor: string;
  trl: number;
  similarity: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  credits_used?: number;
  created_at: string;
}

interface ChatResponse {
  response: string;
  chat_id: string;
  credits_used: number;
  credits_remaining: number;
  sources: Source[];
}

export function useAdvisorChat(userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);

  const loadChat = useCallback(async (existingChatId: string) => {
    if (!userId) return;

    const { data } = await supabase
      .from('advisor_messages')
      .select('*')
      .eq('chat_id', existingChatId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        sources: (msg.sources as unknown as Source[]) || undefined,
        credits_used: msg.credits_used ? Number(msg.credits_used) : undefined,
        created_at: msg.created_at,
      })));
      setChatId(existingChatId);
    }
  }, [userId]);

  const sendMessage = useCallback(async (message: string, model: string = 'gpt-4o-mini') => {
    if (!userId || !message.trim()) return;

    setIsLoading(true);

    // Add user message optimistically
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await fetch(`${RAILWAY_API_URL}/api/advisor/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message,
          chat_id: chatId,
          model,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al enviar mensaje');
      }

      const data: ChatResponse = await response.json();

      // Update chat ID if new
      if (!chatId) {
        setChatId(data.chat_id);
      }

      // Update credits
      setCreditsRemaining(data.credits_remaining);

      // Add assistant message
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        credits_used: data.credits_used,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

    } catch (error) {
      console.error('Chat error:', error);
      // Remove optimistic message and add error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [userId, chatId]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setChatId(null);
  }, []);

  return {
    messages,
    isLoading,
    chatId,
    creditsRemaining,
    sendMessage,
    loadChat,
    startNewChat,
  };
}
