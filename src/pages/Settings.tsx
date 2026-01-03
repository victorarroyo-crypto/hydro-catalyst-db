import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, Calendar } from 'lucide-react';

const Settings: React.FC = () => {
  const { profile, user } = useAuth();

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
              <Input value={profile?.full_name || ''} disabled />
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
      </div>
    </div>
  );
};

export default Settings;
