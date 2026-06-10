import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from './AuthProvider';
import { ErrorState } from '@/components/common/ErrorState';

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'Password requerido'),
});

const registerSchema = loginSchema.extend({
  orgName: z.string().min(1, 'Organizacion requerida'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function LoginPage() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<unknown>(null);
  const location = useLocation();
  const to = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', orgName: '' },
  });

  if (user) return <Navigate to={to} replace />;

  async function onLogin(values: LoginValues) {
    setError(null);
    try {
      await login(values.email, values.password);
    } catch (err) {
      setError(err);
    }
  }

  async function onRegister(values: RegisterValues) {
    setError(null);
    try {
      await register(values.email, values.password, values.orgName);
    } catch (err) {
      setError(err);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-8 lg:grid-cols-[1fr_420px]">
        <section className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium shadow-soft">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Consola privada de infraestructura conversacional
          </div>
          <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">Chatbox Console</h1>
          <p className="mt-4 text-lg leading-7 text-muted-foreground">
            Administra organizaciones, agentes, canales, credenciales, safety, knowledge, DLQ, auditoria y cumplimiento ARCO desde una consola operativa.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">BYO credentials, sin exponer secretos completos.</div>
            <div className="rounded-lg border bg-card p-4">Aislamiento por organizacion y RBAC del backend.</div>
            <div className="rounded-lg border bg-card p-4">Estados claros de API, Redis, DB y colas.</div>
          </div>
        </section>

        <Card>
          <CardContent className="p-6">
            <div className="mb-5 flex rounded-md border bg-muted p-1">
              <button
                className={`h-9 flex-1 rounded-sm text-sm font-medium ${mode === 'login' ? 'bg-card shadow-soft' : 'text-muted-foreground'}`}
                onClick={() => setMode('login')}
                type="button"
              >
                Login
              </button>
              <button
                className={`h-9 flex-1 rounded-sm text-sm font-medium ${mode === 'register' ? 'bg-card shadow-soft' : 'text-muted-foreground'}`}
                onClick={() => setMode('register')}
                type="button"
              >
                Registro
              </button>
            </div>

            {error ? <div className="mb-4"><ErrorState error={error} /></div> : null}

            {mode === 'login' ? (
              <form className="space-y-4" onSubmit={loginForm.handleSubmit(onLogin)}>
                <div>
                  <label className="field-label" htmlFor="email">Email</label>
                  <Input id="email" type="email" autoComplete="email" {...loginForm.register('email')} />
                  <p className="field-help">{loginForm.formState.errors.email?.message}</p>
                </div>
                <div>
                  <label className="field-label" htmlFor="password">Password</label>
                  <Input id="password" type="password" autoComplete="current-password" {...loginForm.register('password')} />
                  <p className="field-help">{loginForm.formState.errors.password?.message}</p>
                </div>
                <Button className="w-full" disabled={loginForm.formState.isSubmitting} type="submit">
                  {loginForm.formState.isSubmitting ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={registerForm.handleSubmit(onRegister)}>
                <div>
                  <label className="field-label" htmlFor="orgName">Organizacion</label>
                  <Input id="orgName" {...registerForm.register('orgName')} />
                  <p className="field-help">{registerForm.formState.errors.orgName?.message}</p>
                </div>
                <div>
                  <label className="field-label" htmlFor="register-email">Email</label>
                  <Input id="register-email" type="email" autoComplete="email" {...registerForm.register('email')} />
                  <p className="field-help">{registerForm.formState.errors.email?.message}</p>
                </div>
                <div>
                  <label className="field-label" htmlFor="register-password">Password</label>
                  <Input id="register-password" type="password" autoComplete="new-password" {...registerForm.register('password')} />
                  <p className="field-help">{registerForm.formState.errors.password?.message}</p>
                </div>
                <Button className="w-full" disabled={registerForm.formState.isSubmitting} type="submit">
                  {registerForm.formState.isSubmitting ? 'Creando...' : 'Crear organizacion'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
