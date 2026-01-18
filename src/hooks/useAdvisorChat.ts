import { useState, useCallback } from 'react';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import type { Message, Source } from '@/types/advisorChat';

export function useAdvisorChat(userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);

  const loadChat = useCallback(async (existingChatId: string) => {
    if (!userId) return;

    const { data } = await externalSupabase
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
        created_at: msg.created_at || new Date().toISOString(),
      })));
      setChatId(existingChatId);
    }
  }, [userId]);

  const sendMessage = useCallback(async (message: string, model: string = 'deepseek') => {
    if (!userId || !message.trim()) return;
    
    setIsLoading(true);
    
    // Añadir mensaje del usuario
    setMessages(prev => [...prev, { 
      id: `user-${Date.now()}`,
      role: 'user' as const, 
      content: message,
      created_at: new Date().toISOString()
    }]);
    
    // Añadir mensaje vacío del asistente
    setMessages(prev => [...prev, { 
      id: `assistant-${Date.now()}`,
      role: 'assistant' as const, 
      content: '',
      created_at: new Date().toISOString()
    }]);
    
    try {
      const response = await fetch(
        'https://watertech-scouting-production.up.railway.app/api/advisor/chat/stream',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            message: message,
            chat_id: chatId || undefined,
            model: model
          })
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.substring(6));
              if (json.content) {
                fullResponse += json.content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { 
                    ...updated[updated.length - 1],
                    content: fullResponse 
                  };
                  return updated;
                });
              }
              // Capturar chat_id si viene del servidor
              if (json.chat_id && !chatId) {
                setChatId(json.chat_id);
              }
              // Capturar créditos restantes
              if (json.credits_remaining !== undefined) {
                setCreditsRemaining(json.credits_remaining);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      // Eliminar mensajes temporales en caso de error
      setMessages(prev => prev.slice(0, -2));
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
