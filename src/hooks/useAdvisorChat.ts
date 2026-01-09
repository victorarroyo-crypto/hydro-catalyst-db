import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  Message, 
  ChatResponse, 
  AttachmentInfo, 
  MessageMetadata,
  Source 
} from '@/types/advisorChat';

const RAILWAY_API_URL = 'https://watertech-scouting-production.up.railway.app';

export function useAdvisorChat(userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, string>>(new Map()); // id -> base64

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
        created_at: msg.created_at || new Date().toISOString(),
      })));
      setChatId(existingChatId);
    }
  }, [userId]);

  const addAttachment = useCallback(async (files: File[]) => {
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Convert to base64 for sending to API
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setUploadedFiles(prev => new Map(prev).set(id, base64));
      };
      reader.readAsDataURL(file);
      
      const attachment: AttachmentInfo = {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
      };
      
      setAttachments(prev => [...prev, attachment]);
    }
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
    setUploadedFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
    setUploadedFiles(new Map());
  }, []);

  const sendMessage = useCallback(async (message: string, model: string = 'gpt-4o-mini') => {
    if (!userId || (!message.trim() && attachments.length === 0)) return;

    setIsLoading(true);

    // Prepare attachments data
    const attachmentsData = attachments.map(att => ({
      id: att.id,
      name: att.name,
      type: att.type,
      size: att.size,
      data: uploadedFiles.get(att.id) || '',
    }));

    // Add user message optimistically
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Clear attachments after adding to message
    clearAttachments();

    try {
      const response = await fetch(`${RAILWAY_API_URL}/api/advisor/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message,
          chat_id: chatId,
          model,
          attachments: attachmentsData.length > 0 ? attachmentsData : undefined,
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
        metadata: data.metadata,
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
  }, [userId, chatId, attachments, uploadedFiles, clearAttachments]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setChatId(null);
    clearAttachments();
  }, [clearAttachments]);

  return {
    messages,
    isLoading,
    chatId,
    creditsRemaining,
    attachments,
    sendMessage,
    loadChat,
    startNewChat,
    addAttachment,
    removeAttachment,
  };
}
