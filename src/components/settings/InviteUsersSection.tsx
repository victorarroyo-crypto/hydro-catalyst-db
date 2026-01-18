import React, { useState } from 'react';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, Mail, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'analyst', label: 'Analista' },
  { value: 'client_enterprise', label: 'Cliente Enterprise' },
  { value: 'client_professional', label: 'Cliente Profesional' },
  { value: 'client_basic', label: 'Cliente Básico' },
];

export const InviteUsersSection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('client_basic');
  const [isSending, setIsSending] = useState(false);

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['user-invitations'],
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from('user_invitations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  const handleInvite = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, introduce un email válido',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const { error } = await externalSupabase
        .from('user_invitations')
        .insert({
          email,
          role,
          invited_by: user?.id,
        });

      if (error) throw error;

      // Log the action
      await externalSupabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'INVITE_USER',
        entity_type: 'user_invitation',
        details: { email, role },
      });

      toast({
        title: 'Invitación enviada',
        description: `Se ha registrado la invitación para ${email}`,
      });

      setEmail('');
      setRole('client_basic');
      queryClient.invalidateQueries({ queryKey: ['user-invitations'] });
    } catch (error: any) {
      toast({
        title: 'Error al enviar invitación',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    try {
      const { error } = await externalSupabase
        .from('user_invitations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['user-invitations'] });
      toast({ title: 'Invitación eliminada' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    if (isExpired) {
      return <Badge variant="outline" className="text-muted-foreground">Expirada</Badge>;
    }
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500">Aceptada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Invitar Usuarios
        </CardTitle>
        <CardDescription>
          Envía invitaciones a nuevos usuarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="invite-email" className="sr-only">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="email@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleInvite} disabled={isSending}>
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : invitations && invitations.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      {ROLE_OPTIONS.find(r => r.value === inv.role)?.label || inv.role}
                    </TableCell>
                    <TableCell>{getStatusBadge(inv.status, inv.expires_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteInvitation(inv.id)}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-4">
            No hay invitaciones pendientes
          </p>
        )}
      </CardContent>
    </Card>
  );
};
