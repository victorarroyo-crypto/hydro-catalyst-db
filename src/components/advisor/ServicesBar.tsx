import { Button } from "@/components/ui/button";
import { 
  Briefcase,
  PlusCircle, 
} from "lucide-react";

interface Service {
  id: 'comparador' | 'checklist' | 'ficha' | 'presupuesto';
  icon: React.ReactNode;
  label: string;
  credits: number;
  description: string;
}

const SERVICES: Service[] = [
  { 
    id: 'presupuesto', 
    icon: <Briefcase className="w-4 h-4" />, 
    label: 'Presupuesto', 
    credits: 0,
    description: 'Solicitar consultoría'
  },
];

interface ServicesBarProps {
  onServiceClick: (serviceId: 'comparador' | 'checklist' | 'ficha' | 'presupuesto') => void;
  userCredits: number;
  onNewChat?: () => void;
}

export const ServicesBar = ({ onServiceClick, userCredits, onNewChat }: ServicesBarProps) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b overflow-x-auto">
      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap mr-1">
        Servicios:
      </span>
      {SERVICES.map(service => {
        const hasCredits = userCredits >= service.credits || service.credits === 0;
        
        return (
          <Button
            key={service.id}
            variant="outline"
            size="sm"
            onClick={() => onServiceClick(service.id)}
            disabled={!hasCredits}
            className={`flex items-center gap-2 whitespace-nowrap text-xs h-8
              ${hasCredits 
                ? 'hover:bg-primary/10 hover:border-primary/30' 
                : 'opacity-50 cursor-not-allowed'}
            `}
            title={service.description}
          >
            {service.icon}
            <span className="hidden sm:inline">{service.label}</span>
            <span className="text-[10px] text-muted-foreground">
              {service.credits > 0 ? `${service.credits}cr` : '✨'}
            </span>
          </Button>
        );
      })}
      
      {/* New Chat button */}
      {onNewChat && (
        <Button
          variant="outline"
          size="sm"
          onClick={onNewChat}
          className="flex items-center gap-1.5 whitespace-nowrap text-xs h-8 hover:bg-primary/10 hover:border-primary/30"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Chat</span>
        </Button>
      )}
    </div>
  );
};

export { SERVICES };
