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
        className="flex items-center gap-2 whitespace-nowrap text-sm h-9 text-white shadow-md hover:shadow-lg transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, #307177 0%, #32b4cd 50%, #8cb63c 100%)',
        }}
      >
        <Phone className="w-4 h-4" />
        <span className="font-semibold">Pide tu Presupuesto</span>
        <Badge className="bg-[#ffa720] text-white text-[10px] px-1.5 py-0 hover:bg-[#ffa720]/90 border-0">
          Gratis
        </Badge>
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
