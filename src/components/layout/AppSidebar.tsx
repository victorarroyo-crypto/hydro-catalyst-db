import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Radar,
  FolderOpen,
  Star,
  Settings,
  LogOut,
  ShieldCheck,
  TrendingUp,
  BookOpen,
  Library,
  Sparkles,
  Brain,
  Cpu,
  ChevronDown,
  BarChart3,
  FileText,
  Building2,
  Calculator,
  Globe,
  Radio,
  Lightbulb,
  ClipboardList,
  Database,
  Rocket,
  Wrench,
  Tag,
  GraduationCap,
  Bot,
  MessageSquare,
  History,
  FolderTree,
  Download,
  PieChart,
  ClipboardCheck,
  Clock,
  FlaskConical,
  Droplets,
} from 'lucide-react';
import vandarumSymbolBlue from '@/assets/vandarum-symbol-blue.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
];

const bdTechnologiesSubItems = [
  { title: 'Catálogo', url: '/technologies', icon: Search },
];

const projectsSubItems = [
  { title: 'Scouting Completo', url: '/studies', icon: GraduationCap },
  { title: 'Scouting', url: '/projects', icon: FolderOpen },
];

const consultoriaSubItems = [
  { title: 'Mis Proyectos', url: '/consultoria', icon: FolderOpen },
  { title: 'Nuevo Proyecto', url: '/consultoria/nuevo', icon: Rocket },
];

const aguaIndustrialSubItems = [
  { title: 'Nuevo Análisis', url: '/cost-consulting/new', icon: Rocket },
  { title: 'Proveedores', url: '/cost-consulting/suppliers', icon: Building2 },
  { title: 'Benchmarks', url: '/cost-consulting/benchmarks', icon: BarChart3 },
  { title: 'Gestión Proveedores', url: '/cost-consulting/admin/suppliers', icon: ShieldCheck },
  { title: 'Gestión Benchmarks', url: '/cost-consulting/admin/benchmarks', icon: ShieldCheck },
];

const costConsultingSubItems = [
  { title: 'Químicos', url: '/quimicos', icon: FlaskConical },
];

const costConsultingAdminSubItems: typeof costConsultingSubItems = [];

const scoutingSubItems = [
  { title: 'Cola de Revisión', url: '/scouting', icon: Radar },
  { title: 'Nueva Búsqueda', url: '/scouting/new', icon: Rocket },
  { title: 'Monitor', url: '/scouting-monitor', icon: Radio },
];

const advisorSubItems = [
  { title: 'Chat', url: '/advisor/chat', icon: MessageSquare },
  { title: 'Mi Dashboard', url: '/advisor/dashboard', icon: LayoutDashboard },
  { title: 'Historial', url: '/advisor/history', icon: History },
];

const supervisionSubItems = [
  { title: 'Control de Calidad BD', url: '/data-quality', icon: Database },
];

const taxonomySubItems = [
  { title: 'Vista Jerárquica', url: '/taxonomy-admin', icon: FolderTree },
  { title: 'Estadísticas', url: '/taxonomy-admin?view=stats', icon: PieChart },
  { title: 'Exportar Documentación', url: '/taxonomy-admin?view=export', icon: Download },
];

const knowledgeBaseItems = [
  { title: 'Documentos Técnicos', url: '/knowledge-base?section=documents', icon: FileText },
  { title: 'Fuentes de Scouting', url: '/knowledge-base?section=sources', icon: Globe },
  { title: 'Casos de Estudio', url: '/knowledge-base?section=cases', icon: BookOpen },
  { title: 'Tendencias', url: '/knowledge-base?section=trends', icon: Lightbulb },
];

const aiToolsItems = [
  { title: 'Clasificación IA', url: '/ai-classification', icon: Brain },
  { title: 'Búsqueda con IA', url: '/ai-search', icon: Sparkles },
  { title: 'Dashboard Uso', url: '/ai-usage', icon: BarChart3 },
  { title: 'Modelos IA', url: '/ai-models', icon: Cpu },
];

const settingsItems = [
  { title: 'Configuración', url: '/settings', icon: Settings },
  { title: 'Costes API', url: '/settings/api-costs', icon: BarChart3 },
];

const auditSubItems = [
  { title: '1. Auditoría de Schema', url: '/database-audit' },
  { title: '2. Sincronizar BDs', url: '/admin/db-audit' },
  { title: '3. Scouting Jobs', url: '/admin/scouting-jobs', icon: Wrench },
  { title: '4. Auditoría Taxonomía', url: '/taxonomy-audit', icon: Database },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [aiToolsOpen, setAiToolsOpen] = useState(
    aiToolsItems.some((item) => location.pathname === item.url)
  );
  const [knowledgeBaseOpen, setKnowledgeBaseOpen] = useState(
    location.pathname === '/knowledge-base'
  );
  const [auditOpen, setAuditOpen] = useState(
    auditSubItems.some((item) => location.pathname === item.url)
  );
  const [scoutingOpen, setScoutingOpen] = useState(
    scoutingSubItems.some((item) => location.pathname === item.url)
  );
  const [advisorOpen, setAdvisorOpen] = useState(
    advisorSubItems.some((item) => location.pathname.startsWith('/advisor'))
  );
  const [projectsOpen, setProjectsOpen] = useState(
    projectsSubItems.some((item) => location.pathname === item.url || location.pathname.startsWith('/studies/'))
  );
  const [consultoriaOpen, setConsultoriaOpen] = useState(
    consultoriaSubItems.some((item) => location.pathname === item.url || location.pathname.startsWith('/consultoria'))
  );
  const isAguaIndustrialRoute = location.pathname.startsWith('/cost-consulting');
  const [costConsultingOpen, setCostConsultingOpen] = useState(
    isAguaIndustrialRoute || location.pathname.startsWith('/quimicos')
  );
  const [aguaIndustrialOpen, setAguaIndustrialOpen] = useState(isAguaIndustrialRoute);
  const [taxonomyOpen, setTaxonomyOpen] = useState(
    location.pathname === '/taxonomy-admin'
  );
  const [bdTechOpen, setBdTechOpen] = useState(
    location.pathname === '/technologies' || location.pathname.startsWith('/scouting')
  );
  const [scoutingNestedOpen, setScoutingNestedOpen] = useState(
    location.pathname.startsWith('/scouting')
  );
  const [settingsOpen, setSettingsOpen] = useState(
    settingsItems.some((item) => location.pathname === item.url)
  );

  const isActive = (path: string) => location.pathname === path;
  const isActiveWithSearch = (path: string) => {
    const [basePath, search] = path.split('?');
    if (search) {
      return location.pathname === basePath && location.search.includes(search);
    }
    return location.pathname === basePath && !location.search;
  };
  const isKnowledgeBaseActive = location.pathname === '/knowledge-base';
  const isAiToolActive = aiToolsItems.some((item) => location.pathname === item.url);
  const isAuditActive = auditSubItems.some((item) => location.pathname === item.url);
  const isScoutingActive = scoutingSubItems.some((item) => location.pathname === item.url);
  const isAdvisorActive = advisorSubItems.some((item) => location.pathname === item.url);
  const isProjectsActive = projectsSubItems.some((item) => location.pathname === item.url || location.pathname.startsWith('/studies/'));
  const isConsultoriaActive = consultoriaSubItems.some((item) => location.pathname === item.url || location.pathname.startsWith('/consultoria'));
  const isCostConsultingActive = location.pathname.startsWith('/cost-consulting') || location.pathname.startsWith('/quimicos');
  const isTaxonomyActive = location.pathname === '/taxonomy-admin';
  const isBdTechActive = location.pathname === '/technologies' || location.pathname.startsWith('/scouting');
  const isSettingsActive = settingsItems.some((item) => location.pathname === item.url);

  return (
    <Sidebar className={cn('border-r-0', collapsed ? 'w-16' : 'w-64')} collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img src={vandarumSymbolBlue} alt="Vandarum" className="h-10 w-auto" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold text-sidebar-foreground">
                Vandarum
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                Water Tech Hub
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs tracking-wider px-3 mb-2">
            {!collapsed && 'Principal'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={cn(
                      'transition-all duration-200',
                      isActive(item.url)
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                    )}
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* BD Tecnologías Submenu */}
              <Collapsible
                open={bdTechOpen}
                onOpenChange={setBdTechOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        'transition-all duration-200 w-full',
                        isBdTechActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <Database className="w-5 h-5" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">BD Tecnologías</span>
                          <ChevronDown className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            bdTechOpen && "rotate-180"
                          )} />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {bdTechnologiesSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActiveWithSearch(item.url)}
                            className={cn(
                              'transition-all duration-200',
                              isActiveWithSearch(item.url)
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                            )}
                          >
                            <Link to={item.url} className="flex items-center gap-2">
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      {/* Nuevas Tecnologías - nested collapsible */}
                      <SidebarMenuSubItem>
                        <Collapsible open={scoutingNestedOpen} onOpenChange={setScoutingNestedOpen}>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton
                              className={cn(
                                'transition-all duration-200 cursor-pointer h-auto min-h-[2rem] py-1.5',
                                isScoutingActive
                                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                              )}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Radar className="w-4 h-4" />
                                <span className="flex-1 text-left">Nuevas Tecnologías</span>
                                <ChevronDown className={cn(
                                  "w-3 h-3 transition-transform duration-200",
                                  scoutingNestedOpen && "rotate-180"
                                )} />
                              </div>
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {scoutingSubItems.map((item) => (
                                <SidebarMenuSubItem key={item.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isActive(item.url)}
                                    className={cn(
                                      'transition-all duration-200',
                                      isActive(item.url)
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                                    )}
                                  >
                                    <Link to={item.url} className="flex items-center gap-2">
                                      <item.icon className="w-4 h-4" />
                                      <span>{item.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </Collapsible>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Proyectos Submenu */}
              <Collapsible
                open={projectsOpen}
                onOpenChange={setProjectsOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        'transition-all duration-200 w-full',
                        isProjectsActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <FolderOpen className="w-5 h-5" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Tec Scouting</span>
                          <ChevronDown className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            projectsOpen && "rotate-180"
                          )} />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {projectsSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive(item.url) || location.pathname.startsWith(item.url + '/')}
                            className={cn(
                              'transition-all duration-200',
                              (isActive(item.url) || location.pathname.startsWith(item.url + '/'))
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                            )}
                          >
                            <Link to={item.url} className="flex items-center gap-2">
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Consultoría Submenu */}
              <Collapsible
                open={consultoriaOpen}
                onOpenChange={setConsultoriaOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        'transition-all duration-200 w-full',
                        isConsultoriaActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <ClipboardList className="w-5 h-5" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Consultoría</span>
                          <ChevronDown className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            consultoriaOpen && "rotate-180"
                          )} />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {consultoriaSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive(item.url) || location.pathname.startsWith(item.url + '/')}
                            className={cn(
                              'transition-all duration-200',
                              (isActive(item.url) || location.pathname.startsWith(item.url + '/'))
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                            )}
                          >
                            <Link to={item.url} className="flex items-center gap-2">
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Consultoría de Costes Submenu */}
              <Collapsible
                open={costConsultingOpen}
                onOpenChange={setCostConsultingOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        'transition-all duration-200 w-full',
                        isCostConsultingActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <Calculator className="w-5 h-5" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Consultoría de Costes</span>
                          <ChevronDown className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            costConsultingOpen && "rotate-180"
                          )} />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {/* Agua Industrial - nested collapsible */}
                      <SidebarMenuSubItem>
                        <Collapsible open={aguaIndustrialOpen} onOpenChange={setAguaIndustrialOpen}>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton
                              className={cn(
                                'transition-all duration-200 cursor-pointer',
                                isAguaIndustrialRoute
                                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                              )}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Droplets className="w-4 h-4" />
                                <span className="flex-1 text-left">Agua Industrial</span>
                                <ChevronDown className={cn(
                                  "w-3 h-3 transition-transform duration-200",
                                  aguaIndustrialOpen && "rotate-180"
                                )} />
                              </div>
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {aguaIndustrialSubItems.map((item) => (
                                <SidebarMenuSubItem key={item.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isActive(item.url) || location.pathname.startsWith(item.url + '/')}
                                    className={cn(
                                      'transition-all duration-200',
                                      (isActive(item.url) || location.pathname.startsWith(item.url + '/'))
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                                    )}
                                  >
                                    <Link to={item.url} className="flex items-center gap-2">
                                      <item.icon className="w-4 h-4" />
                                      <span>{item.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </Collapsible>
                      </SidebarMenuSubItem>
                      {/* Other items like Químicos */}
                      {costConsultingSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive(item.url) || location.pathname.startsWith(item.url + '/')}
                            className={cn(
                              'transition-all duration-200',
                              (isActive(item.url) || location.pathname.startsWith(item.url + '/'))
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                            )}
                          >
                            <Link to={item.url} className="flex items-center gap-2">
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>


              {/* AI Advisor Submenu */}
              <Collapsible
                open={advisorOpen}
                onOpenChange={setAdvisorOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        'transition-all duration-200 w-full',
                        isAdvisorActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <Bot className="w-5 h-5" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">AI Advisor</span>
                          <ChevronDown className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            advisorOpen && "rotate-180"
                          )} />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {advisorSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive(item.url)}
                            className={cn(
                              'transition-all duration-200',
                              isActive(item.url)
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                            )}
                          >
                            <Link to={item.url} className="flex items-center gap-2">
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Internal Navigation - Only for admin/supervisor/analyst */}
        {profile?.role && ['admin', 'supervisor', 'analyst'].includes(profile.role) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs tracking-wider px-3 mb-2">
              {!collapsed && 'Interno'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Centro de Supervisión Submenu */}
                <Collapsible
                  open={true}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={cn(
                        'transition-all duration-200 w-full',
                        (isActive('/quality-control') || isActive('/data-quality'))
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <ShieldCheck className="w-5 h-5" />
                      {!collapsed && <span className="flex-1 text-left">Centro de Supervisión</span>}
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {supervisionSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive(item.url)}
                            className={cn(
                              'transition-all duration-200',
                              isActive(item.url)
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                            )}
                          >
                            <Link to={item.url} className="flex items-center gap-2">
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </Collapsible>

                {/* Taxonomy Submenu */}
                <Collapsible
                  open={taxonomyOpen}
                  onOpenChange={setTaxonomyOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={cn(
                          'transition-all duration-200 w-full',
                          isTaxonomyActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )}
                      >
                        <Tag className="w-5 h-5" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">Taxonomía 3 Niveles</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 transition-transform duration-200",
                              taxonomyOpen && "rotate-180"
                            )} />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {taxonomySubItems.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname + location.search === item.url || (item.url === '/taxonomy-admin' && location.pathname === '/taxonomy-admin' && !location.search)}
                              className={cn(
                                'transition-all duration-200',
                                (location.pathname + location.search === item.url || (item.url === '/taxonomy-admin' && location.pathname === '/taxonomy-admin' && !location.search))
                                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                              )}
                            >
                              <Link to={item.url} className="flex items-center gap-2">
                                <item.icon className="w-4 h-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                <Collapsible
                  open={knowledgeBaseOpen}
                  onOpenChange={setKnowledgeBaseOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={cn(
                          'transition-all duration-200 w-full',
                          isKnowledgeBaseActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )}
                      >
                        <Library className="w-5 h-5" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">Base de Conocimiento</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 transition-transform duration-200",
                              knowledgeBaseOpen && "rotate-180"
                            )} />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {knowledgeBaseItems.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location.pathname + location.search === item.url}
                              className={cn(
                                'transition-all duration-200',
                                location.pathname + location.search === item.url
                                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                              )}
                            >
                              <Link to={item.url} className="flex items-center gap-2">
                                <item.icon className="w-4 h-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                {/* AI Tools Submenu */}
                <Collapsible
                  open={aiToolsOpen}
                  onOpenChange={setAiToolsOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={cn(
                          'transition-all duration-200 w-full',
                          isAiToolActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )}
                      >
                        <Sparkles className="w-5 h-5" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">Herramientas IA</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 transition-transform duration-200",
                              aiToolsOpen && "rotate-180"
                            )} />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {aiToolsItems.map((item) => (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(item.url)}
                              className={cn(
                                'transition-all duration-200',
                                isActive(item.url)
                                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                              )}
                            >
                              <Link to={item.url} className="flex items-center gap-2">
                                <item.icon className="w-4 h-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs tracking-wider px-3 mb-2">
            {!collapsed && 'Sistema'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Settings Submenu */}
              <Collapsible
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        'transition-all duration-200 w-full',
                        isSettingsActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <Settings className="w-5 h-5" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Configuración</span>
                          <ChevronDown
                            className={cn(
                              'w-4 h-4 transition-transform duration-200',
                              settingsOpen && 'rotate-180'
                            )}
                          />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {settingsItems.map((item) => (
                        <SidebarMenuSubItem key={item.url}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isActive(item.url)}
                            className={cn(
                              'transition-all duration-200',
                              isActive(item.url)
                                ? 'bg-sidebar-accent/50 text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                            )}
                          >
                            <Link to={item.url} className="flex items-center gap-2">
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              
              {/* Auditoría BD dropdown - solo para admins */}
              {profile?.role === 'admin' && (
                <Collapsible open={auditOpen} onOpenChange={setAuditOpen}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={cn(
                          'transition-all duration-200 w-full',
                          isAuditActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )}
                      >
                        <Database className="w-5 h-5" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">Auditoría BD</span>
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 transition-transform duration-200',
                                auditOpen && 'rotate-180'
                              )}
                            />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {auditSubItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(subItem.url)}
                              className={cn(
                                'transition-all duration-200',
                                isActive(subItem.url)
                                  ? 'bg-sidebar-accent/50 text-sidebar-accent-foreground'
                                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                              )}
                            >
                              <Link to={subItem.url}>{subItem.title}</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={signOut}
                  className="text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  {!collapsed && <span>Cerrar sesión</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!collapsed && profile && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-semibold text-sidebar-accent-foreground">
                {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-sidebar-foreground truncate">
                {profile.full_name || 'Usuario'}
              </span>
              <span className="text-xs text-sidebar-foreground/60 capitalize">
                {profile.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
