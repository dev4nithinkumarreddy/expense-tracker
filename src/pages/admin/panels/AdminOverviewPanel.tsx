import { format } from 'date-fns';
import { Card, CardContent } from '../../../components/ui/card';
import { MacroChartsSection } from '../../../components/admin/MacroChartsSection';
import { formatCurrency } from '../../../lib/formatCurrency';
import { vibrate } from '../../../lib/utils';
import type { AdminAnalytics } from '../../../lib/admin';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Bell, 
  Smartphone, 
  Monitor, 
  Sparkles, 
  CheckCircle2, 
  Eye, 
  Send 
} from 'lucide-react';

interface AdminOverviewPanelProps {
  analytics: AdminAnalytics | null;
  currency: string;
  onSelectUserId: (userId: string) => void;
  onNudgeUser: (user: { id: string; name?: string; email?: string }) => void;
}

export default function AdminOverviewPanel({
  analytics,
  currency,
  onSelectUserId,
  onNudgeUser
}: AdminOverviewPanelProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Registered Users */}
        <Card className="rounded-3xl border border-white/30 dark:border-white/10 bg-gradient-to-b from-card/90 to-card/50 backdrop-blur-xl shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Total Users</span>
              <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-inner">
                <Users className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
                {analytics?.totalUsers ?? '—'}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block" />
                Platform Accounts
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Daily Active Users */}
        <Card className="rounded-3xl border border-white/30 dark:border-white/10 bg-gradient-to-b from-card/90 to-card/50 backdrop-blur-xl shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Active Today</span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                <Activity className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
                {analytics?.activeToday ?? '—'}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {analytics?.activeThisWeek ?? 0} active this week
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Platform Spending Volume */}
        <Card className="rounded-3xl border border-white/30 dark:border-white/10 bg-gradient-to-b from-card/90 to-card/50 backdrop-blur-xl shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Platform Volume</span>
              <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
                {analytics ? formatCurrency(analytics.totalPlatformSpend, currency) : '—'}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {analytics?.totalExpensesCount ?? 0} logged transactions
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Push Subscribers */}
        <Card className="rounded-3xl border border-white/30 dark:border-white/10 bg-gradient-to-b from-card/90 to-card/50 backdrop-blur-xl shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Push Subscribers</span>
              <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-inner">
                <Bell className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
                {analytics?.totalPushSubscribers ?? '—'}
              </h3>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                Subscribed Devices
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Macro Spending & 24H Activity Heatmap Charts */}
      <MacroChartsSection
        platformCategories={analytics?.platformCategories}
        hourlyDistribution={analytics?.hourlyDistribution}
        totalSpend={analytics?.totalPlatformSpend || 0}
      />

      {/* Device Breakdown & User Table Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Device Split Card */}
        <Card className="md:col-span-4 rounded-3xl border border-white/30 dark:border-white/10 bg-card/80 backdrop-blur-xl shadow-xs">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                Platform & Device Split
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">
                {analytics?.totalPushSubscribers || 0} total
              </span>
            </div>

            <div className="space-y-3.5 pt-1">
              {/* Mobile PWA */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <Smartphone className="w-3.5 h-3.5 text-primary" /> Mobile / PWA App
                  </span>
                  <span className="font-bold tabular-nums font-mono">
                    {analytics?.deviceBreakdown.mobilePwa ?? 0}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        analytics && analytics.totalPushSubscribers > 0
                          ? Math.round((analytics.deviceBreakdown.mobilePwa / analytics.totalPushSubscribers) * 100)
                          : 0
                      }%`
                    }}
                  />
                </div>
              </div>

              {/* Desktop */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <Monitor className="w-3.5 h-3.5 text-emerald-500" /> Desktop Browsers
                  </span>
                  <span className="font-bold tabular-nums font-mono">
                    {analytics?.deviceBreakdown.desktop ?? 0}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        analytics && analytics.totalPushSubscribers > 0
                          ? Math.round((analytics.deviceBreakdown.desktop / analytics.totalPushSubscribers) * 100)
                          : 0
                      }%`
                    }}
                  />
                </div>
              </div>

              {/* Other */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Other Platforms
                  </span>
                  <span className="font-bold tabular-nums font-mono">
                    {analytics?.deviceBreakdown.other ?? 0}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        analytics && analytics.totalPushSubscribers > 0
                          ? Math.round((analytics.deviceBreakdown.other / analytics.totalPushSubscribers) * 100)
                          : 0
                      }%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-secondary/40 rounded-2xl text-xs text-muted-foreground space-y-1 border border-border/40">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Apple PWA Experience
              </p>
              <p className="text-[11.5px] leading-relaxed">
                Users with the app saved to their home screen receive native background push banners and haptic feedback.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent User Activity Table */}
        <Card className="md:col-span-8 rounded-3xl border border-white/30 dark:border-white/10 bg-card/80 backdrop-blur-xl shadow-xs">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Recent User Telemetry & Actions
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Click any user row to inspect deep metrics or send a direct 1-on-1 push nudge
                </p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {analytics?.recentUsers.length ?? 0} active records
              </span>
            </div>

            <div className="overflow-x-auto max-h-[340px] scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="pb-2.5 font-semibold">User</th>
                    <th className="pb-2.5 font-semibold">Logged</th>
                    <th className="pb-2.5 font-semibold">Last Active</th>
                    <th className="pb-2.5 font-semibold">Push</th>
                    <th className="pb-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {(analytics?.recentUsers || []).map((u, idx) => {
                    const avatarLetter = (u.name || u.email || 'U').charAt(0).toUpperCase();
                    return (
                      <tr 
                        key={u.userId} 
                        onClick={() => {
                          vibrate(8);
                          onSelectUserId(u.userId);
                        }}
                        className="hover:bg-secondary/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20 font-bold text-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              {avatarLetter}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-foreground truncate max-w-[150px]">
                                {u.name || (u.email ? u.email.split('@')[0] : `User ${idx + 1}`)}
                              </p>
                              <p className="text-[10.5px] text-muted-foreground truncate max-w-[150px] font-mono">
                                {u.email || `${u.userId.substring(0, 10)}...`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 font-bold tabular-nums text-xs">{u.expenseCount}</td>
                        <td className="py-2.5 text-muted-foreground text-[11px]">
                          {u.lastActive ? format(new Date(u.lastActive), 'MMM d, h:mm a') : 'Never'}
                        </td>
                        <td className="py-2.5">
                          {u.hasPush ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 w-fit border border-emerald-500/25">
                              <CheckCircle2 className="w-3 h-3" /> Subscribed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground w-fit">
                              Off
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                vibrate(8);
                                onSelectUserId(u.userId);
                              }}
                              className="p-1.5 rounded-xl bg-secondary/80 hover:bg-primary/15 hover:text-primary text-muted-foreground transition-all flex items-center gap-1 text-[11px] font-medium"
                              title="Inspect user telemetry"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Inspect</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                vibrate(8);
                                onNudgeUser({ id: u.userId, name: u.name, email: u.email });
                              }}
                              className="p-1.5 rounded-xl bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary transition-all flex items-center gap-1 text-[11px] font-medium shadow-2xs active:scale-95"
                              title="Send direct 1-on-1 nudge"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Nudge</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
