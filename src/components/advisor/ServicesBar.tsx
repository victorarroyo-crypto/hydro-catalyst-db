import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase,
  PlusCircle,
  Sparkles,
  Phone,
} from "lucide-react";

interface ServicesBarProps {
  onServiceClick: (serviceId: 'comparador' | 'checklist' | 'ficha' | 'presupuesto') => void;
  userCredits: number;
  onNewChat?: () => void;
}

export const ServicesBar = ({ onServiceClick, userCredits, onNewChat }: ServicesBarProps) => {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 border-b">
      {/* Left side - New Chat */}
      <div className="flex items-center gap-2">
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
        
        <Badge variant="outline" className="text-[10px] px-2 py-1 bg-[#307177]/10 border-[#307177]/30 text-[#307177] hidden md:flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          IA especializada en agua industrial
        </Badge>
      </div>

      {/* Right side - CTA Presupuesto */}
      <Button
        onClick={() => onServiceClick('presupuesto')}
        size="lg"
        className="flex items-center gap-2 whitespace-nowrap text-base h-11 text-white shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-white/20"
        style={{
          background: 'linear-gradient(135deg, #ffa720 0%, #ff8c00 100%)',
        }}
      >
        <Phone className="w-5 h-5" />
        <span className="font-bold">Pide tu Presupuesto</span>
      </Button>
    </div>
  );
};

export const SERVICES = [
  { 
    id: 'presupuesto' as const, 
    icon: <Briefcase className="w-4 h-4" />, 
    label: 'Presupuesto', 
    credits: 0,
    description: 'Solicitar consultoría'
  },
];
