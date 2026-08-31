import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const setAuth = useAuthStore((s) => s.setAuth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [inviteDetails, setInviteDetails] = useState<{ workspaceName: string; inviterName: string } | null>(null);

  useEffect(() => {
    if (inviteToken) {
      api.get(`/invitations/${inviteToken}`)
        .then((res) => {
          setEmail(res.data.data.email);
          setInviteDetails({
            workspaceName: res.data.data.workspaceName,
            inviterName: res.data.data.inviterName,
          });
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Invalid or expired invitation token');
        });
    }
  }, [inviteToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      
      if (inviteToken) {
        try {
          await api.post(`/invitations/${inviteToken}/accept`, {}, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
        } catch (acceptErr) {
          console.error('Failed to accept invite after login', acceptErr);
        }
      }
      
      navigate('/app');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden px-4">
      {/* WhatsApp Signature Top Teal Banner */}
      <div className="absolute top-0 left-0 right-0 h-[220px] bg-whatsapp-teal pointer-events-none z-0" />
      
      <Card className="w-full max-w-[460px] bg-card border border-border/80 rounded-2xl shadow-xl relative z-10 p-4 md:p-6 my-auto">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-whatsapp-teal text-white flex items-center justify-center shadow-sm">
              <span className="font-sans font-bold text-base">W</span>
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-lg text-foreground leading-none">WebZoo</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">Workspace Portal</span>
            </div>
          </div>
          <div className="pt-2">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              {inviteDetails ? 'Sign In to Accept Invite' : 'Sign In'}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              {inviteDetails ? (
                <><strong>{inviteDetails.inviterName}</strong> invited you to join <strong>{inviteDetails.workspaceName}</strong></>
              ) : (
                'Enter your credentials to access the workspace'
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground ml-0.5">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => !inviteToken && setEmail(e.target.value)}
                required
                disabled={!!inviteToken}
                className="h-10 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-whatsapp-teal focus-visible:ring-offset-0 focus-visible:border-whatsapp-teal px-3.5 disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center px-0.5">
                <Label htmlFor="password" className="text-xs font-semibold text-foreground">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-whatsapp-teal focus-visible:ring-offset-0 focus-visible:border-whatsapp-teal px-3.5"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive font-semibold text-center mt-2">{error}</p>
            )}
            <Button 
              type="submit" 
              className="w-full h-11 bg-whatsapp-teal hover:bg-whatsapp-teal/90 text-white font-semibold rounded-lg text-sm transition-all shadow-xs border-0 mt-2 flex items-center justify-center cursor-pointer disabled:opacity-50"
              disabled={loading || (!!inviteToken && !inviteDetails && !error)}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border mt-5 pt-5">
          <p className="text-xs text-muted-foreground">
            Don't have an account?
            <Link to={inviteToken ? `/register?invite=${inviteToken}` : "/register"} className="text-whatsapp-teal hover:underline font-bold transition-all ml-1">
              Create one
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
