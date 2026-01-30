import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdvisorUsageGuide } from './AdvisorUsageGuide';

interface AdvisorUsageGuideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeepMode: boolean;
}

export function AdvisorUsageGuideSheet({ open, onOpenChange, isDeepMode }: AdvisorUsageGuideSheetProps) {
  const isMobile = useIsMobile();

  // Mobile: use full-screen Dialog
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2 border-b">
            <DialogTitle className="text-center" style={{ color: '#307177' }}>
              Guía de uso del Advisor
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(90vh-80px)] px-4 py-4">
            <AdvisorUsageGuide isDeepMode={isDeepMode} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop: use Sheet sliding from right
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[460px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle style={{ color: '#307177' }}>
            Guía de uso del Advisor
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)] px-6 py-4">
          <AdvisorUsageGuide isDeepMode={isDeepMode} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
