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
import AdminKBSync from "./pages/AdminKBSync";
import AdminLLMCosts from "./pages/AdminLLMCosts";
import Studies from "./pages/Studies";
import StudyDetail from "./pages/StudyDetail";
import ConsultoriaList from "./pages/consultoria/ConsultoriaList";
import ConsultoriaNuevo from "./pages/consultoria/ConsultoriaNuevo";
import ConsultoriaDetalle from "./pages/consultoria/ConsultoriaDetalle";
import ConsultoriaDiagnostico from "./pages/consultoria/ConsultoriaDiagnostico";
import ConsultoriaDocumentos from "./pages/consultoria/ConsultoriaDocumentos";
import ScenarioDesignerPage from "./pages/consultoria/ScenarioDesignerPage";

import ProjectBriefingPage from "./pages/consultoria/ProjectBriefingPage";
import ProjectResearchPage from "./pages/consultoria/ProjectResearchPage";
import EntitiesListPage from "./pages/consultoria/EntitiesListPage";
import AdvisorLanding from "./pages/advisor/AdvisorLanding";
import AdvisorAuth from "./pages/advisor/AdvisorAuth";
import AdvisorChat from "./pages/advisor/AdvisorChat";
import AdvisorDashboard from "./pages/advisor/AdvisorDashboard";
import AdvisorHistory from "./pages/advisor/AdvisorHistory";
import AdvisorPricing from "./pages/advisor/AdvisorPricing";
import { AdvisorAuthProvider } from "./contexts/AdvisorAuthContext";

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
              <Route path="/consultoria" element={<ConsultoriaList />} />
              <Route path="/consultoria/nuevo" element={<ConsultoriaNuevo />} />
              
              <Route path="/consultoria/projects/:projectId/briefing" element={<ProjectBriefingPage />} />
              <Route path="/consultoria/projects/:projectId/research" element={<ProjectResearchPage />} />
              <Route path="/consultoria/:id" element={<ConsultoriaDetalle />} />
              <Route path="/consultoria/:id/entities" element={<EntitiesListPage />} />
              <Route path="/consultoria/:id/diagnostico" element={<ConsultoriaDiagnostico />} />
              <Route path="/consultoria/:id/documentos" element={<ConsultoriaDocumentos />} />
              <Route path="/consultoria/:id/scenarios/designer" element={<ScenarioDesignerPage />} />
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
              <Route path="/admin/kb-sync" element={<AdminKBSync />} />
              <Route path="/admin/llm-costs" element={<AdminLLMCosts />} />
            </Route>
            {/* AI Advisor Routes - Public */}
            <Route path="/advisor" element={<AdvisorLanding />} />
            <Route path="/advisor/auth" element={
              <AdvisorAuthProvider>
                <AdvisorAuth />
              </AdvisorAuthProvider>
            } />
            <Route path="/advisor/pricing" element={<AdvisorPricing />} />
            
            {/* AI Advisor Routes - Protected with AdvisorAuthProvider */}
            <Route path="/advisor/chat" element={
              <AdvisorAuthProvider>
                <AdvisorChat />
              </AdvisorAuthProvider>
            } />
            <Route path="/advisor/dashboard" element={
              <AdvisorAuthProvider>
                <AdvisorDashboard />
              </AdvisorAuthProvider>
            } />
            <Route path="/advisor/history" element={
              <AdvisorAuthProvider>
                <AdvisorHistory />
              </AdvisorAuthProvider>
            } />
            
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
