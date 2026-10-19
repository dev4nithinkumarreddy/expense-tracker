import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Mail, Key, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { cn, vibrate } from '../lib/utils';
import { toast } from 'sonner';
import { useExpenseStore } from '../store/useExpenseStore';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        toast.success('Check your email for the password reset link!');
        setIsForgotPassword(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Left Column - Branding (Hidden on small screens, split on desktop) */}
      {/* Left Column - Branding (Desktop) */}
      <div className="hidden md:flex md:w-1/2 bg-zinc-950 p-12 flex-col justify-between relative border-r border-zinc-800">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <img src="/icon.png" alt="Expense Tracker Logo" className="w-9 h-9 rounded-lg object-cover" />
            <span className="text-lg font-semibold tracking-tight text-white">Expense Tracker</span>
          </div>
          
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white mb-4 leading-tight">
            Personal Expense Ledger
          </h1>
          <p className="text-base text-zinc-400 max-w-md mb-10 leading-relaxed">
            Designed for speed, tactile precision, and privacy. Works fully offline in guest mode with optional multi-device cloud synchronization.
          </p>

          <div className="space-y-4 border-t border-zinc-800/80 pt-8 max-w-md">
            <div className="flex items-baseline gap-3 text-sm text-zinc-300">
              <span className="font-mono text-xs text-primary font-bold">01</span>
              <span>Local-first architecture with instant IndexedDB persistence</span>
            </div>
            <div className="flex items-baseline gap-3 text-sm text-zinc-300">
              <span className="font-mono text-xs text-primary font-bold">02</span>
              <span>Multi-account ledger for bank, cash, and credit balances</span>
            </div>
            <div className="flex items-baseline gap-3 text-sm text-zinc-300">
              <span className="font-mono text-xs text-primary font-bold">03</span>
              <span>NPCI UPI deep-linking with 1-cent exact bill distribution</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-zinc-500 font-mono">
          Expense Tracker • Offline-First PWA
        </div>
      </div>

      {/* Right Column - Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-background relative flex-1">
        <div className="w-full max-w-md relative z-10">
          <div className="md:hidden flex items-center justify-center mb-8">
            <img src="/icon.png" alt="Expense Tracker Logo" className="w-14 h-14 rounded-xl shadow-xs object-cover" />
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xs">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                {isForgotPassword ? 'Reset password' : isLogin ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="text-muted-foreground text-sm mb-8">
                {isForgotPassword ? 'Enter your email to receive a reset link' : 'Enter your email and password to securely log in'}
              </p>

              <div className="flex gap-4 border-b border-border mb-8">
                {!isForgotPassword ? (
                  <>
                    <button 
                      className={cn("pb-3 text-sm font-medium transition-colors relative", isLogin ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                      onClick={() => { setIsLogin(true); setError(null); }}
                    >
                      Sign In
                      {isLogin && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button 
                      className={cn("pb-3 text-sm font-medium transition-colors relative", !isLogin ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                      onClick={() => { setIsLogin(false); setError(null); }}
                    >
                      Create Account
                      {!isLogin && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                  </>
                ) : (
                  <button className="pb-3 text-sm font-medium transition-colors relative text-foreground">
                    Reset Password
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              {error && (
                <div className="p-3 text-sm bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0"></span>
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium px-1">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    <Mail className="w-4 h-4" />
                  </div>
                  <Input 
                    type="email" 
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11 bg-background/50 focus:bg-background transition-colors"
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-sm font-medium">Password</label>
                      {isLogin && (
                        <button 
                          type="button" 
                          onClick={() => { setIsForgotPassword(true); setError(null); }}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                        <Key className="w-4 h-4" />
                      </div>
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="pl-10 pr-10 h-11 bg-background/50 focus:bg-background transition-colors"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {!isLogin && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Passwords must be at least 6 characters</span>
                    </div>
                  )}
                </>
              )}

              <Button className="w-full h-11 text-base font-medium mt-6 shadow-md" type="submit" disabled={loading}>
                {loading ? 'Processing...' : isForgotPassword ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
              </Button>

              {!isForgotPassword && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/60" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground font-medium">Or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      vibrate(15);
                      useExpenseStore.getState().updateSettings({ isGuestMode: true });
                    }}
                    className="w-full h-11 text-sm font-medium border-border/80 hover:bg-secondary/60 text-foreground rounded-xl"
                  >
                    Continue as Guest (Offline Mode)
                  </Button>
                </>
              )}

              {isForgotPassword && (
                <div className="text-center mt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsForgotPassword(false)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to login
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
