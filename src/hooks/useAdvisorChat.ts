import { useState, useCallback } from 'react';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import type { 
  Message, 
  ChatResponse, 
  AttachmentInfo, 
  MessageMetadata,
  Source 
} from '@/types/advisorChat';

const RAILWAY_API_URL = 'https://watertech-scouting-production.up.railway.app';

// Attachment upload limits and validation
const ATTACHMENT_LIMITS = {
  MAX_FILES: 5,
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_EXTENSIONS: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'xlsx', 'xls', 'csv', 'txt']
};

interface UploadedAttachment {
  url: string;
  name: string;
  type: string;
}

// Upload single file to Storage and get signed URL
async function uploadAndGetSignedUrl(
  file: File,
  userId: string
): Promise<UploadedAttachment | null> {
  try {
    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ATTACHMENT_LIMITS.ALLOWED_EXTENSIONS.includes(ext)) {
      console.warn(`Tipo no permitido: ${file.name}`);
      return null;
    }

    // Validate size
    if (file.size > ATTACHMENT_LIMITS.MAX_SIZE_BYTES) {
      console.warn(`Archivo muy grande: ${file.name}`);
      return null;
    }

    // Generate unique path (same pattern as KB)
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `advisor/${userId}/${timestamp}_${safeName}`;

    // Upload to Storage
    const { data, error } = await externalSupabase.storage
      .from('knowledge-docs')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error subiendo archivo:', error);
      return null;
    }

    // Generate signed URL (valid 4 hours, same as KB)
    const { data: signedData, error: signedError } = await externalSupabase.storage
      .from('knowledge-docs')
      .createSignedUrl(filePath, 4 * 60 * 60); // 4 hours

    if (signedError || !signedData?.signedUrl) {
      console.error('Error generando URL firmada:', signedError);
      return null;
    }

    return {
      url: signedData.signedUrl,
      name: file.name,
      type: file.type
    };
  } catch (error) {
    console.error('Error en upload:', error);
    return null;
  }
}

// Upload multiple files sequentially
async function uploadAllAttachments(
  files: File[],
  userId: string
): Promise<UploadedAttachment[]> {
  const uploaded: UploadedAttachment[] = [];

  // Limit quantity
  const filesToProcess = files.slice(0, ATTACHMENT_LIMITS.MAX_FILES);

  // Upload sequentially (don't saturate)
  for (const file of filesToProcess) {
    const result = await uploadAndGetSignedUrl(file, userId);
    if (result) {
      uploaded.push(result);
    }
  }

  return uploaded;
}

export function useAdvisorChat(userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [pendingFiles, setPendingFiles] = useState<Map<string, File>>(new Map()); // id -> File

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

  const addAttachment = useCallback(async (files: File[]) => {
    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Store the file for later upload
      setPendingFiles(prev => new Map(prev).set(id, file));
      
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
    setPendingFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
    setPendingFiles(new Map());
  }, []);

  const sendMessage = useCallback(async (message: string, model: string = 'gpt-4o-mini') => {
    if (!userId || (!message.trim() && attachments.length === 0)) return;

    setIsLoading(true);

    // Get pending files to upload
    const filesToUpload: File[] = [];
    for (const att of attachments) {
      const file = pendingFiles.get(att.id);
      if (file) {
        filesToUpload.push(file);
      }
    }

    // Add user message optimistically (with attachment info for display)
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Clear attachments after adding to message
    const attachmentsCopy = [...attachments];
    clearAttachments();

    try {
      // 1. Upload files to Storage and get signed URLs
      let uploadedAttachments: UploadedAttachment[] = [];
      if (filesToUpload.length > 0) {
        console.log(`Subiendo ${filesToUpload.length} archivos a Storage...`);
        uploadedAttachments = await uploadAllAttachments(filesToUpload, userId);
        console.log(`Subidos ${uploadedAttachments.length} archivos con URLs firmadas`);
      }

      // 2. Send to Railway API with URLs (not base64)
      const response = await fetch(`${RAILWAY_API_URL}/api/advisor/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message,
          chat_id: chatId,
          model,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.detail?.message || error.detail || error.error || error.message || 'Error al enviar mensaje';
        console.error('Railway API Error:', error);
        throw new Error(errorMessage);
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
  }, [userId, chatId, attachments, pendingFiles, clearAttachments]);

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