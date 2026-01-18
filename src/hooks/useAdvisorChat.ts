import { useState, useCallback } from 'react';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import type { 
  Message, 
  AttachmentInfo, 
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
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [streamingContent, setStreamingContent] = useState<string>('');

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
      setPendingFiles(prev => ({ ...prev, [id]: file }));
      
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
      const newFiles = { ...prev };
      delete newFiles[id];
      return newFiles;
    });
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
    setPendingFiles({});
  }, []);

  // SSE Streaming sendMessage
  const sendMessage = useCallback(async (message: string, model: string = 'deepseek') => {
    if (!userId || (!message.trim() && attachments.length === 0)) return;

    setIsLoading(true);
    setStreamingContent('');

    // Get pending files to upload
    const filesToUpload: File[] = [];
    for (const att of attachments) {
      const file = pendingFiles[att.id];
      if (file) {
        filesToUpload.push(file);
      }
    }

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

    // Create placeholder for assistant response
    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantPlaceholder]);

    try {
      // 1. Upload files to Storage and get signed URLs
      let uploadedAttachments: UploadedAttachment[] = [];
      if (filesToUpload.length > 0) {
        console.log(`Subiendo ${filesToUpload.length} archivos a Storage...`);
        uploadedAttachments = await uploadAllAttachments(filesToUpload, userId);
        console.log(`Subidos ${uploadedAttachments.length} archivos con URLs firmadas`);
      }

      // 2. Send to Railway API with streaming endpoint
      const response = await fetch(`${RAILWAY_API_URL}/api/advisor/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          chat_id: chatId,
          model,
          user_id: userId,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.detail?.message || error.detail || error.error || error.message || 'Error al enviar mensaje';
        console.error('Railway API Error:', error);
        throw new Error(errorMessage);
      }

      // 3. Process SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let newChatId = chatId;
      let creditsUsed: number | undefined;
      let sources: Source[] | undefined;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Handle different event types
              if (data.content) {
                accumulatedContent += data.content;
                setStreamingContent(accumulatedContent);
                // Update the assistant message in real-time
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMsgId 
                    ? { ...msg, content: accumulatedContent }
                    : msg
                ));
              }
              
              if (data.chat_id && !newChatId) {
                newChatId = data.chat_id;
                setChatId(data.chat_id);
              }
              
              if (data.credits_used !== undefined) {
                creditsUsed = data.credits_used;
              }
              
              if (data.credits_remaining !== undefined) {
                setCreditsRemaining(data.credits_remaining);
              }
              
              if (data.sources) {
                sources = data.sources;
              }
              
              if (data.done) {
                // Final update with all metadata
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMsgId 
                    ? { 
                        ...msg, 
                        content: accumulatedContent,
                        credits_used: creditsUsed,
                        sources: sources,
                      }
                    : msg
                ));
                setIsLoading(false);
              }
            } catch (parseError) {
              // Skip malformed JSON lines
              console.warn('Failed to parse SSE line:', line);
            }
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      // Remove placeholder messages and add error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id && m.id !== assistantMsgId));
      setStreamingContent('');
      throw error;
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [userId, chatId, attachments, pendingFiles, clearAttachments]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setChatId(null);
    setStreamingContent('');
    clearAttachments();
  }, [clearAttachments]);

  return {
    messages,
    isLoading,
    chatId,
    creditsRemaining,
    attachments,
    streamingContent,
    sendMessage,
    loadChat,
    startNewChat,
    addAttachment,
    removeAttachment,
  };
}