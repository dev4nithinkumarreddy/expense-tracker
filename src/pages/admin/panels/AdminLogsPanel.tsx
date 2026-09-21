import { format } from 'date-fns';
import { Card, CardContent } from '../../../components/ui/card';
import { History, MousePointerClick } from 'lucide-react';
import type { NotificationLog } from '../../../lib/admin';

interface AdminLogsPanelProps {
  logs: NotificationLog[];
}

export default function AdminLogsPanel({ logs }: AdminLogsPanelProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="w-4.5 h-4.5 text-primary" />
            Broadcast Delivery History & Audit Logs
          </h3>
          <p className="text-xs text-muted-foreground">
            Real-time record of all sent WebPush campaigns, target audiences, and success rates.
          </p>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{logs.length} logged dispatches</span>
      </div>

      {logs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border/70 text-muted-foreground text-xs bg-card/40 backdrop-blur-md">
          <History className="w-10 h-10 mx-auto mb-2.5 opacity-40 text-primary" />
          <p className="font-semibold text-foreground text-sm">No Delivery Logs Found</p>
          <p className="mt-1">Broadcast an immediate notification from the studio to populate audit logs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const openCount = log.opened_count || 0;
            const openRate = log.successful_deliveries > 0
              ? Math.round((openCount / log.successful_deliveries) * 100)
              : 0;

            return (
              <Card 
                key={log.id} 
                className="rounded-3xl border border-white/30 dark:border-white/10 bg-card/85 backdrop-blur-xl shadow-xs"
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate">
                        {log.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground uppercase tracking-wider">
                        {log.target_audience}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {log.body}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono pt-0.5">
                      <span>Route: {log.target_url}</span>
                      <span>•</span>
                      <span>Sent: {format(new Date(log.created_at), 'MMM d, yyyy h:mm:ss a')}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0 self-end sm:self-auto">
                    {/* Open Rate (CTR) Pill */}
                    <div 
                      className="px-3 py-1.5 rounded-2xl bg-primary/10 border border-primary/25 flex items-center gap-1.5 text-xs font-bold text-primary font-mono shadow-xs"
                      title={`${openCount} clicks recorded on notification`}
                    >
                      <MousePointerClick className="w-3.5 h-3.5" />
                      <span>{openRate}% CTR</span>
                      <span className="text-[10px] opacity-75">({openCount} opens)</span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {log.successful_deliveries} delivered
                        </span>
                      </div>
                      {log.failed_deliveries > 0 && (
                        <span className="text-[10px] text-destructive font-mono">
                          {log.failed_deliveries} failed
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
