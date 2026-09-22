import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { MessageCircle, X } from "lucide-react";

import { PublicaAiChat } from "@/components/ai/PublicaAiChat";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function FloatingAiLauncher() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname.startsWith("/ai-assistant") || pathname.startsWith("/auth")) return null;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 h-12 rounded-full px-5 shadow-lg"
        aria-label="Open Publica AI"
      >
        {open ? <X className="mr-2 h-4 w-4" /> : <MessageCircle className="mr-2 h-4 w-4" />}
        Publica AI
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display">Publica AI</SheetTitle>
            <SheetDescription>Your digital public-service guide</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 px-4 pb-4">
            <PublicaAiChat compact />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
