import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpenseStore } from '../../store/useExpenseStore';
import { checkIsAdmin } from '../../lib/admin';
import { ShieldAlert, ArrowLeft, LogOut, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { session } = useExpenseStore();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      if (!session) {
        if (isMounted) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      // Check admin status
      const authorized = await checkIsAdmin(session.user.email, session.user.id);
      if (isMounted) {
        setIsAdmin(authorized);
        setLoading(false);
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Verifying admin credentials...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center select-none">
        <div className="w-full max-w-md p-8 rounded-3xl border border-destructive/20 bg-card/85 backdrop-blur-2xl shadow-2xl space-y-6 relative overflow-hidden">
          {/* Ambient red glow orb */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-destructive/15 blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-3xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2 relative z-10">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Restricted</h1>
            <p className="text-sm text-muted-foreground">
              This portal is restricted to authorized platform administrators.
            </p>
            {session?.user.email && (
              <p className="text-xs font-mono bg-muted/60 py-1.5 px-3 rounded-lg text-muted-foreground truncate">
                Signed in as: {session.user.email}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 relative z-10">
            <Button
              variant="default"
              className="flex-1 gap-2 rounded-xl"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-4 h-4" /> Return to App
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 rounded-xl text-muted-foreground hover:text-destructive"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
