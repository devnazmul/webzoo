import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      navigate('/app');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-space-black relative overflow-hidden">
      {/* Aurora Blurry Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-aurora" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[150px] rounded-full animate-aurora" style={{ animationDelay: '-5s' }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-spectral-white/5 blur-[100px] rounded-full animate-aurora" style={{ animationDelay: '-10s' }} />
      </div>
      
      <Card className="w-full max-w-md border-ghost-border bg-black/60 backdrop-blur-2xl relative z-10 p-4 shadow-[0_0_80px_rgba(0,0,0,0.8)]">

        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-spectral-white/10 border border-ghost-border flex items-center justify-center">
              <span className="text-spectral-white font-industrial font-bold text-sm">W</span>
            </div>
            <div className="flex flex-col">
              <span className="font-industrial font-bold text-xl uppercase tracking-[1.17px] text-spectral-white">WebZoo</span>
              <span className="text-[9px] uppercase tracking-[2px] text-spectral-white/40">Mission Control</span>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-industrial uppercase tracking-[1.17px] text-spectral-white">Authentication Required</CardTitle>
            <CardDescription className="uppercase tracking-widest text-[10px] text-spectral-white/50">Establish mission telemetry link</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="uppercase text-[10px] tracking-[2px] text-spectral-white/60 ml-1">Command Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="MISSION_CONTROL@WEBZOO.COM"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-ghost-surface border-ghost-border text-spectral-white placeholder:text-spectral-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" throws className="uppercase text-[10px] tracking-[2px] text-spectral-white/60 ml-1">Access Key</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-ghost-surface border-ghost-border text-spectral-white"
              />
            </div>
            {error && (
              <p className="text-[11px] uppercase tracking-wider text-destructive font-bold text-center">{error}</p>
            )}
            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading ? 'SYNCHRONIZING...' : 'INITIATE LOGIN'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-ghost-border mt-6 pt-6">
          <p className="text-[10px] uppercase tracking-[2px] text-spectral-white/50">
            No credentials?{' '}
            <Link to="/register" className="text-spectral-white hover:underline font-bold transition-all">
              Create Account
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>

  );
}
