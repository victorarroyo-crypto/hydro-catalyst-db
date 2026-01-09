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
  Globe,
  Radio,
  Lightbulb,
  Database,
  Rocket,
  Wrench,
  Tag,
  GraduationCap,
  Bot,
  MessageSquare,
  History,
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
  { title: 'Consultar Tecnologías', url: '/technologies', icon: Search },
  { title: 'Estudios', url: '/studies', icon: GraduationCap },
  { title: 'Mis Proyectos', url: '/projects', icon: FolderOpen },
  { title: 'Favoritos', url: '/favorites', icon: Star },
];

const scoutingSubItems = [
  { title: 'Cola de Revisión', url: '/scouting', icon: Radar },
  { title: 'Nuevo Scouting', url: '/scouting/new', icon: Rocket },
  { title: 'Monitor', url: '/scouting-monitor', icon: Radio },
];

const advisorSubItems = [
  { title: 'Chat', url: '/advisor/chat', icon: MessageSquare },
  { title: 'Mi Dashboard', url: '/advisor/dashboard', icon: LayoutDashboard },
  { title: 'Historial', url: '/advisor/history', icon: History },
];

const internalNavItems = [
  { title: 'Centro de Supervisión', url: '/quality-control', icon: ShieldCheck },
  { title: 'Taxonomía', url: '/taxonomy-admin', icon: Tag },
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

  const isActive = (path: string) => location.pathname === path;
  const isKnowledgeBaseActive = location.pathname === '/knowledge-base';
  const isAiToolActive = aiToolsItems.some((item) => location.pathname === item.url);
  const isAuditActive = auditSubItems.some((item) => location.pathname === item.url);
  const isScoutingActive = scoutingSubItems.some((item) => location.pathname === item.url);
  const isAdvisorActive = advisorSubItems.some((item) => location.pathname === item.url);

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

              {/* Scouting Submenu */}
              <Collapsible
                open={scoutingOpen}
                onOpenChange={setScoutingOpen}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(
                        'transition-all duration-200 w-full',
                        isScoutingActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <Radar className="w-5 h-5" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Scouting</span>
                          <ChevronDown className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            scoutingOpen && "rotate-180"
                          )} />
                        </>
                      )}
                    </SidebarMenuButton>
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
                {internalNavItems.map((item) => (
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

                {/* Knowledge Base Submenu */}
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
              {settingsItems.map((item) => (
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
