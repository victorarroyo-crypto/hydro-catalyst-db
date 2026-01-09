import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, Loader2 } from 'lucide-react';
import { useAdvisorAuth } from '@/contexts/AdvisorAuthContext';
import { toast } from 'sonner';

export default function AdvisorAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, signIn, signUp, resetPassword, isLoading: authLoading } = useAdvisorAuth();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupCompany, setSignupCompany] = useState('');

  // Reset password form
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/advisor/chat');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success('¡Bienvenido de nuevo!');
      navigate('/advisor/chat');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword || !signupName) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    if (signupPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, signupCompany);
    setIsLoading(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success('¡Cuenta creada! Bienvenido a AI Advisor');
      navigate('/advisor/chat');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail || !resetNewPassword || !resetConfirmPassword) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (resetNewPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(resetEmail, resetNewPassword);
    setIsLoading(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success('¡Contraseña cambiada exitosamente!');
      setShowResetPassword(false);
      setResetEmail('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setLoginEmail(resetEmail);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/advisor" className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <Droplets className="w-7 h-7 text-primary-foreground" />
            </div>
          </Link>
          <CardTitle className="text-2xl">AI Advisor</CardTitle>
          <CardDescription>
            Tu experto en tratamiento de agua industrial
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showResetPassword ? (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-medium">Recuperar Contraseña</h3>
                <p className="text-sm text-muted-foreground">
                  Ingresa tu email y nueva contraseña
                </p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-new-password">Nueva Contraseña</Label>
                  <Input
                    id="reset-new-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-confirm-password">Confirmar Contraseña</Label>
                  <Input
                    id="reset-confirm-password"
                    type="password"
                    placeholder="Confirma tu nueva contraseña"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cambiando contraseña...
                    </>
                  ) : (
                    'Cambiar Contraseña'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowResetPassword(false)}
                  disabled={isLoading}
                >
                  Volver al inicio de sesión
                </Button>
              </form>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Iniciando sesión...
                      </>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-sm text-primary hover:underline"
                    onClick={() => setShowResetPassword(true)}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre *</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Tu nombre"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-company">Empresa (opcional)</Label>
                    <Input
                      id="signup-company"
                      type="text"
                      placeholder="Tu empresa"
                      value={signupCompany}
                      onChange={(e) => setSignupCompany(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creando cuenta...
                      </>
                    ) : (
                      'Crear Cuenta Gratis'
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Obtén 5 consultas gratis cada mes
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
