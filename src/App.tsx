import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import { RosterProvider } from "@/lib/roster";
import { installAudioUnlock } from "@/lib/voice";
import { useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  // iOS only lets a page play sound after a tap; the first tap anywhere primes the voice layer.
  useEffect(() => installAudioUnlock(), []);
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RosterProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </RosterProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
