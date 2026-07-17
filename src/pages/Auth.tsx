import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Mail, Key, Wallet, PieChart, Shield, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';

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
        alert('Check your email for the password reset link!');
        setIsForgotPassword(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
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
      <div className="hidden md:flex md:w-1/2 bg-zinc-950 p-12 flex-col justify-between relative overflow-hidden border-r border-border/50">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/40 via-background to-background"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <img src="/icon.png" alt="Expense Tracker Logo" className="w-10 h-10 rounded-xl shadow-sm object-cover" />
            <span className="text-xl font-bold tracking-tight text-white">Expense Tracker</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Take control of your <span className="text-primary">finances.</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-md mb-12">
            A minimalist, lightning-fast expense tracker built to help you understand your spending habits effortlessly.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Track Every Penny</h3>
                <p className="text-sm text-zinc-400">Log expenses and bills in seconds with custom quick-adds.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <PieChart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Visual Analytics</h3>
                <p className="text-sm text-zinc-400">Beautiful charts that break down your spending by category.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Secure & Synced</h3>
                <p className="text-sm text-zinc-400">Your data is safely backed up to the cloud instantly.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-zinc-500 font-medium">
          © {new Date().getFullYear()} Expense Tracker. All rights reserved.
        </div>
      </div>

      {/* Right Column - Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-background/95 relative flex-1">
        <div className="absolute inset-0 opacity-30 md:hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/30 via-background to-background"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="md:hidden flex items-center justify-center mb-8">
            <img src="/icon.png" alt="Expense Tracker Logo" className="w-16 h-16 rounded-2xl shadow-lg object-cover" />
          </div>

          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 md:p-8 shadow-2xl">
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
