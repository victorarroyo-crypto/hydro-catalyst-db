import { useState } from "react";
import { toast } from "sonner";

const RAILWAY_URL = "https://watertech-scouting-production.up.railway.app";

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
      const response = await fetch(
        `${RAILWAY_URL}/api/advisor/service/${serviceType}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            chat_id: chatId,
            ...params
          })
        }
      );
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        
        if (response.status === 402) {
          toast.error(`Créditos insuficientes. Necesitas ${error.detail?.required || '?'} créditos.`);
          return null;
        }
        
        throw new Error(error.detail || 'Error en el servicio');
      }
      
      const data: ServiceResponse = await response.json();
      
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
