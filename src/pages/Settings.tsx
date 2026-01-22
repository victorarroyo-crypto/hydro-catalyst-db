import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { InviteUsersSection } from '@/components/settings/InviteUsersSection';
import { AuditLogSection } from '@/components/settings/AuditLogSection';
import { ExportDataSection } from '@/components/settings/ExportDataSection';
import { AIModelSettings } from '@/components/settings/AIModelSettings';
import { DownloadChromeExtension } from '@/components/settings/DownloadChromeExtension';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateDatabaseDocumentation } from '@/lib/generateDatabaseDocumentation';
import { generateScoutingWebhookDocumentation } from '@/lib/generateScoutingWebhookDocumentation';
import { generateTaxonomyDocumentation } from '@/lib/generateTaxonomyDocumentation';
import { generateModulesDocumentation } from '@/lib/generateModulesDocumentation';
import { generateStudyArchitectureDoc } from '@/lib/generateStudyArchitectureDoc';
import { generateComprehensiveAuditDocument } from '@/lib/generateComprehensiveAuditDoc';
import { downloadDatabaseSchemaMarkdown } from '@/lib/generateDatabaseSchemaDoc';
import { 
  User, Mail, Shield, Calendar, Tag, ArrowRight, Settings as SettingsIcon, 
  CloudUpload, Loader2, Database, GitCompare, CheckCircle, AlertCircle, XCircle,
  Users, Crown, Eye, Edit, Briefcase, Building, Star, RefreshCw, Key, Sun, Moon,
  Info, ExternalLink, FileText, HelpCircle, Trash2, BookOpen, Download, Webhook
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTheme } from 'next-themes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ComparisonResult {
  table: string;
  localCount: number;
  externalCount: number;
  difference: number;
  status: 'synced' | 'out_of_sync' | 'error';
  missingInExternal?: string[];
  missingInLocal?: string[];
}

interface ComparisonResponse {
  success: boolean;
  summary: {
    totalTables: number;
    syncedTables: number;
    outOfSyncTables: number;
    errorTables: number;
    timestamp: string;
  };
  results: ComparisonResult[];
}

interface UserWithRole {
  user_id: string;
  role: string;
  full_name: string | null;
  email?: string;
  created_at: string;
}

const ROLE_INFO = {
  admin: {
    label: 'Administrador',
    icon: Crown,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    description: 'Control total del sistema',
    permissions: [
      'Gestionar usuarios y roles',
      'Acceso completo a todas las tecnologías',
      'Aprobar/rechazar ediciones',
      'Gestionar taxonomías',
      'Sincronización con base externa',
      'Eliminar cualquier registro',
    ],
  },
  supervisor: {
    label: 'Supervisor',
    icon: Eye,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    description: 'Supervisión y aprobación',
    permissions: [
      'Ver todas las tecnologías',
      'Aprobar/rechazar ediciones de analistas',
      'Editar tecnologías',
      'Gestionar proyectos',
      'Ver casos de estudio y tendencias',
    ],
  },
  analyst: {
    label: 'Analista',
    icon: Edit,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'Creación y edición de contenido',
    permissions: [
      'Crear nuevas tecnologías',
      'Editar tecnologías existentes',
      'Proponer cambios (requieren aprobación)',
      'Clasificar tecnologías con IA',
      'Mover a casos de estudio/tendencias',
    ],
  },
  client_enterprise: {
    label: 'Cliente Enterprise',
    icon: Building,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: 'Acceso empresarial completo',
    permissions: [
      'Ver todas las tecnologías',
      'Crear y gestionar proyectos ilimitados',
      'Búsqueda avanzada con IA',
      'Exportar fichas tecnológicas',
      'Acceso a estadísticas completas',
    ],
  },
  client_professional: {
    label: 'Cliente Profesional',
    icon: Star,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    description: 'Acceso profesional',
    permissions: [
      'Ver todas las tecnologías',
      'Crear hasta 10 proyectos',
      'Búsqueda con IA',
      'Exportar fichas tecnológicas',
      'Favoritos ilimitados',
    ],
  },
  client_basic: {
    label: 'Cliente Básico',
    icon: Briefcase,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    description: 'Acceso de lectura',
    permissions: [
      'Ver tecnologías publicadas',
      'Crear hasta 3 proyectos',
      'Guardar favoritos (máx. 50)',
      'Ver detalles básicos',
    ],
  },
};

const APP_VERSION = '1.0.0';
const SUPPORT_EMAIL = 'soporte@vandarum.com';

const Settings: React.FC = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const isAdmin = profile?.role === 'admin';
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResponse | null>(null);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Profile edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(profile?.full_name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  
  // Audit document generation state
  const [isGeneratingAudit, setIsGeneratingAudit] = useState(false);

  // Load users for admin
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      // First get all user roles
      const { data: rolesData, error: rolesError } = await externalSupabase
        .from('user_roles')
        .select('user_id, role')
        .order('role');

      if (rolesError) throw rolesError;

      // Then get profiles for those users
      const userIds = (rolesData || []).map(r => r.user_id);
      const { data: profilesData, error: profilesError } = await externalSupabase
        .from('profiles')
        .select('user_id, full_name, created_at')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Merge the data
      const profilesMap = new Map((profilesData || []).map((p: { user_id: string; full_name: string | null; created_at: string }) => [p.user_id, p]));
      
      const formattedUsers: UserWithRole[] = (rolesData || []).map((r) => {
        const profile = profilesMap.get(r.user_id);
        return {
          user_id: r.user_id,
          role: r.role,
          full_name: profile?.full_name || null,
          created_at: profile?.created_at || '',
        };
      });

      setUsers(formattedUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId);
    try {
      // Cast to the expected type for Supabase
      const roleValue = newRole as "admin" | "supervisor" | "analyst" | "client_basic" | "client_professional" | "client_enterprise";
      
      // Update user_roles table
      const { error: roleError } = await externalSupabase
        .from('user_roles')
        .update({ role: roleValue })
        .eq('user_id', userId);

      if (roleError) throw roleError;

      // Also update profiles table for consistency
      const { error: profileError } = await externalSupabase
        .from('profiles')
        .update({ role: roleValue })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, role: newRole } : u
      ));

      toast({
        title: 'Rol actualizado',
        description: `El usuario ahora tiene el rol de ${ROLE_INFO[newRole as keyof typeof ROLE_INFO]?.label || newRole}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error al actualizar rol',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    setDeletingUserId(userId);
    try {
      // Delete from user_roles first
      const { error: roleError } = await externalSupabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;

      // Delete from profiles
      const { error: profileError } = await externalSupabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Note: The actual auth user can only be deleted via Supabase Admin API
      // This removes the user from the application's role/profile system
      
      // Update local state
      setUsers(prev => prev.filter(u => u.user_id !== userId));

      toast({
        title: 'Usuario eliminado',
        description: `${userName || 'El usuario'} ha sido eliminado del sistema`,
      });
    } catch (error: any) {
      toast({
        title: 'Error al eliminar usuario',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Las contraseñas no coinciden',
        description: 'Por favor, verifica que ambas contraseñas sean iguales',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Contraseña muy corta',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await externalSupabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Contraseña actualizada',
        description: 'Tu contraseña ha sido cambiada exitosamente',
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: 'Error al cambiar contraseña',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast({
        title: 'Nombre requerido',
        description: 'Por favor, introduce un nombre válido',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingName(true);
    try {
      const { error } = await externalSupabase
        .from('profiles')
        .update({ full_name: editedName.trim() })
        .eq('user_id', user?.id);

      if (error) throw error;

      // Log the action
      await externalSupabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'UPDATE_PROFILE',
        entity_type: 'profile',
        details: { field: 'full_name', new_value: editedName.trim() },
      });

      toast({
        title: 'Nombre actualizado',
        description: 'Tu nombre ha sido cambiado correctamente',
      });

      setIsEditingName(false);
      // Reload the page to get fresh profile data
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Error al actualizar nombre',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleBulkSync = async () => {
    setIsBulkSyncing(true);
    try {
      const { data, error } = await externalSupabase.functions.invoke('bulk-sync-to-external', {
        body: {},
      });

      if (error) throw error;

      const results = data.results || {};
      const totalSynced = Object.values(results).reduce((sum: number, r: any) => sum + (r.synced || 0), 0);
      const hasErrors = Object.values(results).some((r: any) => r.errors?.length > 0);

      toast({
        title: hasErrors ? 'Sincronización con advertencias' : 'Sincronización completada',
        description: `Total sincronizado: ${totalSynced} registros
• Tecnologías: ${results.technologies?.synced || 0}
• Casos de Estudio: ${results.casos_de_estudio?.synced || 0}
• Tendencias: ${results.technological_trends?.synced || 0}
• Proyectos: ${results.projects?.synced || 0}
• Taxonomías: ${(results.taxonomy_tipos?.synced || 0) + (results.taxonomy_subcategorias?.synced || 0) + (results.taxonomy_sectores?.synced || 0)}`,
        variant: hasErrors ? 'destructive' : 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Error de sincronización',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsBulkSyncing(false);
    }
  };

  const handleCompareDBs = async () => {
    setIsComparing(true);
    setComparisonResults(null);
    try {
      const { data, error } = await externalSupabase.functions.invoke('compare-databases', {
        body: { detailed: true },
      });

      if (error) throw error;

      setComparisonResults(data as ComparisonResponse);

      const allSynced = data.summary.outOfSyncTables === 0 && data.summary.errorTables === 0;

      toast({
        title: allSynced ? 'Bases de datos sincronizadas' : 'Diferencias encontradas',
        description: `${data.summary.syncedTables}/${data.summary.totalTables} tablas sincronizadas`,
        variant: allSynced ? 'default' : 'destructive',
      });
    } catch (error: any) {
      toast({
        title: 'Error al comparar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">
          Configuración
        </h1>
        <p className="text-muted-foreground">
          Gestiona tu perfil y preferencias
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del perfil
            </CardTitle>
            <CardDescription>
              Tu información personal en la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              {isEditingName ? (
                <div className="flex gap-2">
                  <Input 
                    value={editedName} 
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleSaveName}
                    disabled={isSavingName}
                  >
                    {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setIsEditingName(false);
                      setEditedName(profile?.full_name || '');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input value={profile?.full_name || ''} disabled className="flex-1" />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setEditedName(profile?.full_name || '');
                      setIsEditingName(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <Input value={user?.email || ''} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <Badge variant="secondary" className="capitalize">
                  {profile?.role?.replace('_', ' ') || 'Usuario'}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Miembro desde</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : '—'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security - Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Seguridad
            </CardTitle>
            <CardDescription>
              Cambia tu contraseña de acceso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button 
              onClick={handlePasswordChange}
              disabled={isChangingPassword || !newPassword || !confirmPassword}
              className="w-full"
            >
              {isChangingPassword ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Key className="w-4 h-4 mr-2" />
              )}
              {isChangingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
            </Button>
          </CardContent>
        </Card>

        {/* Appearance - Theme Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Apariencia
            </CardTitle>
            <CardDescription>
              Personaliza el aspecto de la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Tema de la interfaz</p>
                <p className="text-sm text-muted-foreground">
                  {theme === 'dark' ? 'Modo oscuro activado' : theme === 'light' ? 'Modo claro activado' : 'Siguiendo el sistema'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="w-4 h-4" />
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="w-4 h-4" />
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                >
                  Auto
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Access Levels Info - Visible to all users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Niveles de Acceso
            </CardTitle>
            <CardDescription>
              Descripción de los diferentes roles y sus permisos en la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {Object.entries(ROLE_INFO).map(([roleKey, roleData]) => {
                const IconComponent = roleData.icon;
                const isCurrentRole = profile?.role === roleKey;
                return (
                  <AccordionItem key={roleKey} value={roleKey}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${roleData.bgColor}`}>
                          <IconComponent className={`w-4 h-4 ${roleData.color}`} />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{roleData.label}</span>
                            {isCurrentRole && (
                              <Badge variant="outline" className="text-xs">Tu rol</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-normal">
                            {roleData.description}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2 pl-12">
                        {roleData.permissions.map((permission, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                            {permission}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        {/* Admin Section */}
        {isAdmin && (
          <>
            {/* User Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Gestión de Usuarios
                </CardTitle>
                <CardDescription>
                  Administra los roles de los usuarios del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadUsers}
                    disabled={isLoadingUsers}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>

                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay usuarios registrados
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Rol Actual</TableHead>
                          <TableHead>Cambiar Rol</TableHead>
                          <TableHead className="w-[80px]">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => {
                          const roleInfo = ROLE_INFO[u.role as keyof typeof ROLE_INFO];
                          const IconComponent = roleInfo?.icon || User;
                          const isCurrentUser = u.user_id === user?.id;
                          
                          return (
                            <TableRow key={u.user_id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {u.full_name || 'Sin nombre'}
                                  </span>
                                  {isCurrentUser && (
                                    <Badge variant="outline" className="text-xs">Tú</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Desde {new Date(u.created_at).toLocaleDateString('es-ES')}
                                </p>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded ${roleInfo?.bgColor || 'bg-gray-100'}`}>
                                    <IconComponent className={`w-3 h-3 ${roleInfo?.color || 'text-gray-500'}`} />
                                  </div>
                                  <span className="text-sm">{roleInfo?.label || u.role}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={u.role}
                                  onValueChange={(value) => handleRoleChange(u.user_id, value)}
                                  disabled={updatingUserId === u.user_id || isCurrentUser}
                                >
                                  <SelectTrigger className="w-[160px]">
                                    {updatingUserId === u.user_id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <SelectValue />
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(ROLE_INFO).map(([key, info]) => (
                                      <SelectItem key={key} value={key}>
                                        <div className="flex items-center gap-2">
                                          <info.icon className={`w-3 h-3 ${info.color}`} />
                                          {info.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {!isCurrentUser && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        disabled={deletingUserId === u.user_id}
                                      >
                                        {deletingUserId === u.user_id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción eliminará a <strong>{u.full_name || 'este usuario'}</strong> del sistema.
                                          El usuario perderá todos sus permisos y acceso a la plataforma.
                                          Esta acción no se puede deshacer.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteUser(u.user_id, u.full_name || '')}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Eliminar usuario
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Model Settings */}
            <AIModelSettings />

            {/* Invite Users */}
            <InviteUsersSection />

            {/* Audit Log */}
            <AuditLogSection />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Sincronización Externa
                </CardTitle>
                <CardDescription>
                  Sincroniza todos los datos con la base de datos externa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleBulkSync}
                  disabled={isBulkSyncing}
                  className="w-full"
                >
                  {isBulkSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4 mr-2" />
                  )}
                  {isBulkSyncing ? 'Sincronizando todo...' : 'Sincronizar TODO a base externa'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Sincroniza tecnologías, casos de estudio, tendencias, proyectos y taxonomías
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="w-5 h-5" />
                  Comparar Bases de Datos
                </CardTitle>
                <CardDescription>
                  Verifica que los datos estén sincronizados entre ambas bases
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleCompareDBs}
                  disabled={isComparing}
                  variant="outline"
                  className="w-full"
                >
                  {isComparing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <GitCompare className="w-4 h-4 mr-2" />
                  )}
                  {isComparing ? 'Comparando...' : 'Comparar bases de datos'}
                </Button>

                {comparisonResults && (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Última comparación:</span>
                      <span className="text-xs">
                        {new Date(comparisonResults.summary.timestamp).toLocaleString('es-ES')}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {comparisonResults.results.map((result) => (
                        <div 
                          key={result.table} 
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                        >
                          <div className="flex items-center gap-2">
                            {result.status === 'synced' && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            {result.status === 'out_of_sync' && (
                              <AlertCircle className="w-4 h-4 text-yellow-500" />
                            )}
                            {result.status === 'error' && (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="font-medium text-sm">{result.table}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Local: {result.localCount}</span>
                            <span>Externa: {result.externalCount}</span>
                            {result.difference > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                Δ {result.difference}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {comparisonResults.summary.outOfSyncTables > 0 && (
                      <p className="text-xs text-yellow-600">
                        Hay tablas desincronizadas. Considera ejecutar una sincronización completa.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  Administración
                </CardTitle>
                <CardDescription>
                  Herramientas de administración del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link to="/taxonomy-admin">
                    <span className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Gestión de Taxonomía
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Documentación Técnica
                </CardTitle>
                <CardDescription>
                  Descarga la documentación completa de la arquitectura del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={async () => {
                    toast({
                      title: 'Generando documento...',
                      description: 'Por favor espera mientras se genera el Word',
                    });
                    try {
                      await generateDatabaseDocumentation();
                      toast({
                        title: 'Documento generado',
                        description: 'La documentación se ha descargado correctamente',
                      });
                    } catch (error: any) {
                      toast({
                        title: 'Error al generar documento',
                        description: error.message,
                        variant: 'destructive',
                      });
                    }
                  }}
                  variant="outline" 
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Descargar Arquitectura de Base de Datos
                  </span>
                  <FileText className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={async () => {
                    toast({
                      title: 'Generando documento...',
                      description: 'Por favor espera mientras se genera el Word',
                    });
                    try {
                      await generateScoutingWebhookDocumentation();
                      toast({
                        title: 'Documento generado',
                        description: 'La guía de integración se ha descargado correctamente',
                      });
                    } catch (error: any) {
                      toast({
                        title: 'Error al generar documento',
                        description: error.message,
                        variant: 'destructive',
                      });
                    }
                  }}
                  variant="outline" 
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Webhook className="w-4 h-4" />
                    Guía de Integración Webhook Scouting
                  </span>
                  <FileText className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={async () => {
                    toast({
                      title: 'Generando documento de taxonomía...',
                      description: 'Analizando base de datos y generando informe',
                    });
                    try {
                      await generateTaxonomyDocumentation();
                      toast({
                        title: 'Documento generado',
                        description: 'El análisis de taxonomía se ha descargado correctamente',
                      });
                    } catch (error: any) {
                      toast({
                        title: 'Error al generar documento',
                        description: error.message,
                        variant: 'destructive',
                      });
                    }
                  }}
                  variant="outline" 
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Análisis de Taxonomía
                  </span>
                  <FileText className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={async () => {
                    toast({
                      title: 'Generando informe de módulos...',
                      description: 'Compilando información del sistema',
                    });
                    try {
                      await generateModulesDocumentation();
                      toast({
                        title: 'Documento generado',
                        description: 'El informe de módulos se ha descargado correctamente',
                      });
                    } catch (error: any) {
                      toast({
                        title: 'Error al generar documento',
                        description: error.message,
                        variant: 'destructive',
                      });
                    }
                  }}
                  variant="outline" 
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Informe de Módulos y Pantallas
                  </span>
                  <FileText className="w-4 h-4" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  Incluye: catálogo de tipos/subcategorías/sectores, análisis de brechas, subcategorías pendientes de mapeo y recomendaciones
                </p>
                <Button 
                  onClick={async () => {
                    toast({
                      title: 'Generando arquitectura de estudios...',
                      description: 'Documentando tablas, webhooks y componentes',
                    });
                    try {
                      await generateStudyArchitectureDoc();
                      toast({
                        title: 'Documento generado',
                        description: 'La arquitectura del módulo de estudios se ha descargado',
                      });
                    } catch (error: any) {
                      toast({
                        title: 'Error al generar documento',
                        description: error.message,
                        variant: 'destructive',
                      });
                    }
                  }}
                  variant="outline" 
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Arquitectura Módulo Estudios
                  </span>
                  <FileText className="w-4 h-4" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  Incluye: schema de tablas, flujo de datos, webhook events, componentes React y hooks
                </p>
                <Button 
                  onClick={async () => {
                    if (isGeneratingAudit) return;
                    setIsGeneratingAudit(true);
                    toast({
                      title: 'Generando auditoría completa...',
                      description: 'Este proceso puede tardar unos segundos',
                    });
                    try {
                      console.log('[Audit] Iniciando generación de documento...');
                      await generateComprehensiveAuditDocument();
                      console.log('[Audit] Documento generado exitosamente');
                      toast({
                        title: 'Auditoría generada',
                        description: 'El documento completo de auditoría se ha descargado',
                      });
                    } catch (error: any) {
                      console.error('[Audit] Error:', error);
                      toast({
                        title: 'Error al generar auditoría',
                        description: error.message || 'Error desconocido al generar el documento',
                        variant: 'destructive',
                      });
                    } finally {
                      setIsGeneratingAudit(false);
                    }
                  }}
                  disabled={isGeneratingAudit}
                  variant="outline" 
                  className="w-full justify-between bg-primary/5 border-primary/20 hover:bg-primary/10"
                >
                  <span className="flex items-center gap-2">
                    {isGeneratingAudit ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : (
                      <Database className="w-4 h-4 text-primary" />
                    )}
                    <span className="font-medium">
                      {isGeneratingAudit ? 'Generando documento...' : 'Auditoría Completa de Arquitectura'}
                    </span>
                  </span>
                  <FileText className="w-4 h-4" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  Incluye: 40 tablas, foreign keys, funciones DB, edge functions, estado de sincronización, roles y workflows
                </p>
                
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium mb-2">📄 Formato Markdown</p>
                  <Button 
                    onClick={async () => {
                      toast({
                        title: 'Generando documento Markdown...',
                        description: 'Compilando schema completo de base de datos',
                      });
                      try {
                        await downloadDatabaseSchemaMarkdown();
                        toast({
                          title: 'Documento generado',
                          description: 'El schema completo se ha descargado en formato .md',
                        });
                      } catch (error: any) {
                        toast({
                          title: 'Error al generar documento',
                          description: error.message,
                          variant: 'destructive',
                        });
                      }
                    }}
                    variant="outline" 
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Schema Completo (Markdown)
                    </span>
                    <FileText className="w-4 h-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    44 tablas documentadas, ~480 campos, funciones DB y enums - formato .md descargable
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Chrome Extension Download */}
            <DownloadChromeExtension />
          </>
        )}

        {/* App Info & Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Información de la Aplicación
            </CardTitle>
            <CardDescription>
              Detalles de la versión y contacto de soporte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Versión</p>
                <p className="font-medium">{APP_VERSION}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Última actualización</p>
                <p className="font-medium">Enero 2026</p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Soporte:</span>
                <a 
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-primary hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Data - Available to all users */}
        <ExportDataSection />

        {/* Legal Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Legal
            </CardTitle>
            <CardDescription>
              Documentos legales y políticas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a 
              href="/terms" 
              target="_blank"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium">Términos de Servicio</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
            <a 
              href="/privacy" 
              target="_blank"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium">Política de Privacidad</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
            <a 
              href="/cookies" 
              target="_blank"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium">Política de Cookies</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
