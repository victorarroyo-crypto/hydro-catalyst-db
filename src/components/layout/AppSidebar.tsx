import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  FolderOpen,
  Star,
  Settings,
  LogOut,
  Droplets,
  ShieldCheck,
  TrendingUp,
  BookOpen,
  Library,
  Sparkles,
  Brain,
  Cpu,
  ChevronDown,
} from 'lucide-react';
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
  { title: 'Mis Proyectos', url: '/projects', icon: FolderOpen },
  { title: 'Favoritos', url: '/favorites', icon: Star },
];

const internalNavItems = [
  { title: 'Centro de Supervisión', url: '/quality-control', icon: ShieldCheck },
  { title: 'Tendencias', url: '/trends', icon: TrendingUp },
  { title: 'Casos de Estudio', url: '/case-studies', icon: BookOpen },
  { title: 'Base de Conocimiento', url: '/knowledge-base', icon: Library },
];

const aiToolsItems = [
  { title: 'Clasificación IA', url: '/ai-classification', icon: Brain },
  { title: 'Búsqueda con IA', url: '/ai-search', icon: Sparkles },
  { title: 'Modelos IA', url: '/ai-models', icon: Cpu },
];

const settingsItems = [
  { title: 'Configuración', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [aiToolsOpen, setAiToolsOpen] = useState(
    aiToolsItems.some((item) => location.pathname === item.url)
  );

  const isActive = (path: string) => location.pathname === path;
  const isAiToolActive = aiToolsItems.some((item) => location.pathname === item.url);

  return (
    <Sidebar className={cn('border-r-0', collapsed ? 'w-16' : 'w-64')} collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <Droplets className="w-6 h-6 text-sidebar-primary" />
          </div>
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
