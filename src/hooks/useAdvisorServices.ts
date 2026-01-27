import { useState } from "react";
import { toast } from "sonner";
import { callAdvisorProxy } from "@/lib/advisorProxy";

interface ServiceResponse {
  success: boolean;
  service_id: string;
  service_type: string;
  message: string;
  result?: unknown;
  download_url?: string;
  credits_used: number;
  credits_remaining: number;
}

type ServiceType = 'comparador' | 'checklist' | 'ficha' | 'presupuesto';

export const useAdvisorServices = (
  userId: string | undefined,
  chatId: string | null,
  onServiceComplete: () => void,
  _onCreditsUpdated: (credits: number) => void
) => {
  const [isLoading, setIsLoading] = useState(false);

  const callService = async <T extends object>(
    serviceType: ServiceType,
    params: T
  ): Promise<ServiceResponse | null> => {
    if (!userId) {
      toast.error('Usuario no autenticado');
      return null;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error, status } = await callAdvisorProxy<ServiceResponse>({
        endpoint: `/api/advisor/service/${serviceType}`,
        method: 'POST',
        payload: {
          user_id: userId,
          chat_id: chatId,
          ...params
        },
      });
      
      if (error) {
        if (status === 402) {
          const errorData = data as { detail?: { required?: number } } | null;
          toast.error(`Créditos insuficientes. Necesitas ${errorData?.detail?.required || '?'} créditos.`);
          return null;
        }
        
        throw new Error(error);
      }
      
      if (!data) {
        throw new Error('No response data');
      }
      
      // Notify completion to refetch data
      onServiceComplete();
      
      toast.success(`Servicio completado. ${data.credits_used > 0 ? `Se han usado ${data.credits_used} créditos.` : ''}`);
      
      return data;
      
    } catch (error) {
      console.error('Service error:', error);
      toast.error(error instanceof Error ? error.message : 'Error procesando el servicio');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    callService,
    isLoading
  };
};
