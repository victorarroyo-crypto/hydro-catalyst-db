import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Technologies from "./pages/Technologies";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Favorites from "./pages/Favorites";
import Scouting from "./pages/Scouting";
import ScoutingNew from "./pages/ScoutingNew";
import Settings from "./pages/Settings";
import QualityControl from "./pages/QualityControl";
import Trends from "./pages/Trends";
import CaseStudies from "./pages/CaseStudies";
import Statistics from "./pages/Statistics";
import TaxonomyAdmin from "./pages/TaxonomyAdmin";
import TaxonomyAudit from "./pages/TaxonomyAudit";
import KnowledgeBase from "./pages/KnowledgeBase";
import AIClassification from "./pages/AIClassification";
import AISearch from "./pages/AISearch";
import AIModels from "./pages/AIModels";
import AIUsageDashboard from "./pages/AIUsageDashboard";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import NotFound from "./pages/NotFound";
import DatabaseAudit from "./pages/DatabaseAudit";
import AdminDbAudit from "./pages/AdminDbAudit";
import ScoutingMonitor from "./pages/ScoutingMonitor";
import AdminScoutingJobs from "./pages/AdminScoutingJobs";
import Studies from "./pages/Studies";
import StudyDetail from "./pages/StudyDetail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - cache retained
      refetchOnWindowFocus: false, // Don't refetch on every tab switch
      retry: 2, // Retry failed requests twice
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/technologies" element={<Technologies />} />
              <Route path="/scouting" element={<Scouting />} />
              <Route path="/scouting/new" element={<ScoutingNew />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/studies" element={<Studies />} />
              <Route path="/studies/:studyId" element={<StudyDetail />} />
              <Route path="/quality-control" element={<QualityControl />} />
              <Route path="/reviews" element={<QualityControl />} />
              <Route path="/trends" element={<Trends />} />
              <Route path="/case-studies" element={<CaseStudies />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/knowledge-base" element={<KnowledgeBase />} />
              <Route path="/ai-classification" element={<AIClassification />} />
              <Route path="/ai-search" element={<AISearch />} />
              <Route path="/ai-usage" element={<AIUsageDashboard />} />
              <Route path="/ai-models" element={<AIModels />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/taxonomy-admin" element={<TaxonomyAdmin />} />
              <Route path="/taxonomy-audit" element={<TaxonomyAudit />} />
              <Route path="/database-audit" element={<DatabaseAudit />} />
              <Route path="/admin/db-audit" element={<AdminDbAudit />} />
              <Route path="/scouting-monitor" element={<ScoutingMonitor />} />
              <Route path="/admin/scouting-jobs" element={<AdminScoutingJobs />} />
            </Route>
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
