import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenseStore } from '../../store/useExpenseStore';
import { 
  fetchAdminAnalytics, 
  sendPushBroadcast, 
  sendDirectUserNudge,
  fetchScheduledNotifications, 
  createScheduledNotification, 
  cancelScheduledNotification, 
  fetchNotificationLogs, 
  calculateRemainingTime,
  fetchAutomatedRules,
  toggleAutomatedRule,
  pingHealth,
  type AdminAnalytics, 
  type ScheduledNotification, 
  type NotificationLog,
  type AutomatedRule
} from '../../lib/admin';
import { formatCurrency } from '../../lib/formatCurrency';
import { PhoneMockupPreview } from '../../components/admin/PhoneMockupPreview';
import { UserInspectorSheet } from '../../components/admin/UserInspectorSheet';
import { DirectNudgeModal } from '../../components/admin/DirectNudgeModal';
import { AdminTeamModal } from '../../components/admin/AdminTeamModal';
import { MacroChartsSection } from '../../components/admin/MacroChartsSection';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Bell, 
  CalendarClock, 
  History, 
  Send, 
  Clock, 
  Smartphone, 
  Monitor, 
  Sparkles, 
  Trash2, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Shield,
  Radio,
  BarChart3,
  Zap,
  Sliders,
  MousePointerClick,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { vibrate } from '../../lib/utils';
import { format, addHours, addMinutes, setHours, setMinutes } from 'date-fns';

const TEMPLATES = [
  {
    label: "Evening Log Reminder ☕",
    title: "How did your wallet do today? 💸",
    body: "Take 30 seconds to log today's coffee, meals, and purchases before bed.",
    url: "/expenses"
  },
  {
    label: "Streak at Risk 🔥",
    title: "Don't break your logging streak! 🔥",
    body: "You're on a hot streak! Log at least one expense today to keep it blazing.",
    url: "/"
  },
  {
    label: "Weekend Spend Check 🍕",
    title: "Weekend vibes, mindful spends ✨",
    body: "Don't ghost your budget! Check your spending pacing before the week starts.",
    url: "/analytics"
  },
  {
    label: "Bill Due Reminder 📅",
    title: "Upcoming Bill Reminder 💡",
    body: "You have recurring bills due soon. Check your Planned tab to stay ahead.",
    url: "/planned"
  }
];

export default function AdminDashboard() {
  const { session, settings } = useExpenseStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'analytics' | 'broadcast' | 'scheduled' | 'logs'>('analytics');
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState("Hey there... 👋");
  const [broadcastBody, setBroadcastBody] = useState("Don't forget to log your daily expenses in the app!");
  const [broadcastUrl, setBroadcastUrl] = useState("/");
  const [targetAudience, setTargetAudience] = useState<'all' | 'inactive_today' | 'active_streaks'>('all');
  const [isSending, setIsSending] = useState(false);

  // Scheduled campaign state
  const [schedTitle, setSchedTitle] = useState("");
  const [schedBody, setSchedBody] = useState("");
  const [schedUrl, setSchedUrl] = useState("/");
  const [schedAudience, setSchedAudience] = useState<'all' | 'inactive_today' | 'active_streaks'>('all');
  const [schedDateTime, setSchedDateTime] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledList, setScheduledList] = useState<ScheduledNotification[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);

  // Advanced features state
  const [automatedRules, setAutomatedRules] = useState<AutomatedRule[]>([]);
  const [health, setHealth] = useState<{ latencyMs: number; status: string } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [nudgeTargetUser, setNudgeTargetUser] = useState<{ id: string; name?: string; email?: string } | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Timer refresh ticker
  const [, setTicker] = useState(0);

  useEffect(() => {
    loadAllData();
  }, []);

  // Update countdown timers every second
  useEffect(() => {
    const timer = setInterval(() => setTicker(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAllData = async () => {
    setLoadingAnalytics(true);
    try {
      const [analyticsData, scheduledData, logsData, rulesData, healthData] = await Promise.all([
        fetchAdminAnalytics(),
        fetchScheduledNotifications(),
        fetchNotificationLogs(),
        fetchAutomatedRules(),
        pingHealth()
      ]);
      setAnalytics(analyticsData);
      setScheduledList(scheduledData);
      setLogs(logsData);
      setAutomatedRules(rulesData);
      setHealth({ latencyMs: healthData.latencyMs, status: healthData.status });
    } catch (err: any) {
      toast.error("Failed to load admin data: " + (err.message || 'Unknown error'));
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleTestOnMyself = async () => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to test on yourself.");
      return;
    }

    setIsSending(true);
    vibrate(15);
    try {
      const res = await sendDirectUserNudge(session.user.id, {
        title: "Test Push from Admin 🚀",
        body: "System Check: Your device received this push notification instantly!",
        url: "/",
        admin_user_id: session.user.id
      });

      if (res.successful > 0) {
        toast.success("Test notification received on your device!");
      } else {
        toast.warning("Notification sent, but no active subscription found for your account. Ensure push notifications are enabled in Settings.");
      }
      loadAllData();
    } catch (err: any) {
      toast.error("Test push failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleRule = async (id: string, currentStatus: boolean) => {
    vibrate(10);
    const nextStatus = !currentStatus;
    // Optimistic UI update
    setAutomatedRules(rules => rules.map(r => r.id === id ? { ...r, is_enabled: nextStatus } : r));

    const ok = await toggleAutomatedRule(id, nextStatus);
    if (ok) {
      toast.success(nextStatus ? "Automated drip rule enabled" : "Automated drip rule paused");
    } else {
      toast.error("Failed to update rule state");
      // Revert
      setAutomatedRules(rules => rules.map(r => r.id === id ? { ...r, is_enabled: currentStatus } : r));
    }
  };

  const handleApplyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    vibrate(10);
    setBroadcastTitle(tmpl.title);
    setBroadcastBody(tmpl.body);
    setBroadcastUrl(tmpl.url);
    toast.success("Applied template: " + tmpl.label);
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      toast.error("Please fill in both title and body");
      return;
    }

    setIsSending(true);
    vibrate(20);

    try {
      const result = await sendPushBroadcast({
        title: broadcastTitle,
        body: broadcastBody,
        url: broadcastUrl,
        target_audience: targetAudience,
        admin_user_id: session?.user.id
      });

      toast.success(`Broadcast sent to ${result.successful || 0} devices!`);
      loadAllData();
    } catch (err: any) {
      toast.error("Broadcast failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSending(false);
    }
  };

  const handleSetQuickTimer = (type: '30m' | '1h' | '2h' | 'tonight') => {
    vibrate(10);
    const now = new Date();
    let target = now;

    if (type === '30m') target = addMinutes(now, 30);
    else if (type === '1h') target = addHours(now, 1);
    else if (type === '2h') target = addHours(now, 2);
    else if (type === 'tonight') target = setMinutes(setHours(now, 20), 0);

    const formatted = format(target, "yyyy-MM-dd'T'HH:mm");
    setSchedDateTime(formatted);
    toast.info(`Timer set for ${format(target, 'h:mm a')}`);
  };

  const handleCreateScheduled = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedTitle.trim() || !schedBody.trim() || !schedDateTime) {
      toast.error("Please provide title, message, and scheduled time");
      return;
    }

    setIsScheduling(true);
    vibrate(20);

    try {
      await createScheduledNotification({
        title: schedTitle,
        body: schedBody,
        scheduled_at: new Date(schedDateTime).toISOString(),
        target_url: schedUrl,
        target_audience: schedAudience,
        created_by: session?.user.id
      });

      toast.success("Campaign scheduled successfully!");
      setSchedTitle("");
      setSchedBody("");
      setSchedDateTime("");
      const updated = await fetchScheduledNotifications();
      setScheduledList(updated);
    } catch (err: any) {
      toast.error("Failed to schedule campaign: " + (err.message || "Unknown error"));
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelScheduled = async (id: string) => {
    vibrate(15);
    try {
      await cancelScheduledNotification(id);
      toast.info("Campaign cancelled");
      const updated = await fetchScheduledNotifications();
      setScheduledList(updated);
    } catch (err: any) {
      toast.error("Could not cancel: " + (err.message || "Unknown error"));
    }
  };

  const pendingScheduledCount = scheduledList.filter(s => s.status === 'pending').length;

  const tabs = [
    { id: 'analytics' as const, label: 'Analytics & Usage', icon: BarChart3 },
    { id: 'broadcast' as const, label: 'Broadcast Studio', icon: Send },
    { id: 'scheduled' as const, label: 'Scheduled', icon: CalendarClock, badge: pendingScheduledCount },
    { id: 'logs' as const, label: 'Delivery Logs', icon: History, count: logs.length }
  ];

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto px-1">
      {/* Top Apple Translucent Navigation Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-card/60 dark:bg-card/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl h-10 w-10 bg-secondary/60 hover:bg-secondary border border-border/40 active:scale-95 transition-all"
            onClick={() => {
              vibrate(10);
              navigate('/');
            }}
            title="Return to Personal App"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Admin Console
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10.5px] font-bold tracking-wider uppercase bg-primary/15 text-primary rounded-full border border-primary/25 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Super Admin
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Platform Analytics, Custom WebPush Studio & Automation Engine
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          {/* Edge Latency & Health Indicator */}
          {health && (
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-secondary/50 border border-border/50 text-[11px] font-mono shadow-xs"
              title={`Edge Function status: ${health.status} (${health.latencyMs}ms)`}
            >
              <span className={`w-2 h-2 rounded-full ${health.status === 'operational' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-muted-foreground font-sans text-xs">Edge:</span>
              <span className="font-bold text-foreground">{health.latencyMs}ms</span>
            </div>
          )}

          {/* Test Push on Current Admin */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-2xl text-xs font-semibold h-9 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-xs active:scale-95 transition-all"
            onClick={handleTestOnMyself}
            disabled={isSending}
            title="Dispatch a test push notification solely to your current device"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Test on Myself</span>
            <span className="sm:hidden">Test</span>
          </Button>

          {/* Admin Team Whitelist Modal Trigger */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-2xl text-xs font-semibold h-9 px-3 bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 shadow-xs active:scale-95 transition-all"
            onClick={() => {
              vibrate(10);
              setIsTeamModalOpen(true);
            }}
            title="Manage admin whitelist and authorized team members"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Team</span>
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            className="rounded-2xl h-9 w-9 bg-background/60 hover:bg-background border-border/60 shadow-xs active:scale-95 transition-all"
            onClick={() => {
              vibrate(10);
              loadAllData();
            }}
            disabled={loadingAnalytics}
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalytics ? 'animate-spin text-primary' : ''}`} />
          </Button>

          <div className="hidden lg:flex items-center gap-2 text-xs font-mono bg-secondary/40 px-3 py-1.5 rounded-2xl border border-border/50 text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="truncate max-w-[150px]">{session?.user.email}</span>
          </div>
        </div>
      </div>

      {/* Apple-Style Segmented Tab Dock */}
      <div className="p-1.5 rounded-2xl bg-secondary/40 dark:bg-secondary/20 backdrop-blur-xl border border-border/40 flex gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                vibrate(12);
                setActiveTab(tab.id);
              }}
              className={`relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 select-none ${
                isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="adminTabIndicator"
                  className="absolute inset-0 rounded-xl bg-primary shadow-sm"
                  transition={{ type: 'spring', damping: 28, stiffness: 420 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-black/20 text-white' : 'bg-primary/20 text-primary'
                  }`}>
                    {tab.badge}
                  </span>
                )}
                {tab.count !== undefined && (
                  <span className={`text-[10px] opacity-75 font-mono ${isActive ? 'text-white' : ''}`}>
                    ({tab.count})
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ANALYTICS & PLATFORM USAGE */}
      {activeTab === 'analytics' && (
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
                    {analytics ? formatCurrency(analytics.totalPlatformSpend, settings.currency) : '—'}
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
                              setSelectedUserId(u.userId);
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
                                    setSelectedUserId(u.userId);
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
                                    setNudgeTargetUser({ id: u.userId, name: u.name, email: u.email });
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
      )}

      {/* TAB 2: PUSH BROADCAST STUDIO */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
          {/* Left: Compose Controls */}
          <div className="lg:col-span-7 space-y-5">
            <Card className="rounded-3xl border border-white/30 dark:border-white/10 bg-card/85 backdrop-blur-2xl shadow-sm">
              <CardContent className="p-5 sm:p-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Radio className="w-4 h-4 text-primary animate-pulse" />
                    Compose Custom Push Broadcast
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Transmits instant native push banners directly to registered devices' lock screens.
                  </p>
                </div>

                {/* 1-Tap Preset Chips */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    1-Tap Template Presets
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.label}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-secondary/60 hover:bg-secondary border border-border/50 transition-all active:scale-95 text-foreground shadow-2xs"
                      >
                        {tmpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-muted-foreground">Notification Title</label>
                    <span className="text-[10px] font-mono text-muted-foreground">{broadcastTitle.length}/60</span>
                  </div>
                  <Input
                    placeholder="e.g., How did your wallet do today? 💸"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    maxLength={60}
                    className="rounded-2xl h-11 bg-secondary/30 focus:bg-background border-border/60 text-sm font-medium"
                  />
                </div>

                {/* Body Textarea */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-muted-foreground">Message Body Content</label>
                    <span className="text-[10px] font-mono text-muted-foreground">{broadcastBody.length}/180</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="e.g., Take 30 seconds to log today's expenses..."
                    value={broadcastBody}
                    onChange={(e) => setBroadcastBody(e.target.value)}
                    maxLength={180}
                    className="w-full rounded-2xl p-3 text-sm bg-secondary/30 focus:bg-background border border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  />
                </div>

                {/* Destination Route & Audience Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Destination Route */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" /> Destination Route
                    </label>
                    <select
                      value={broadcastUrl}
                      onChange={(e) => setBroadcastUrl(e.target.value)}
                      className="w-full h-11 rounded-2xl px-3 bg-secondary/30 focus:bg-background border border-border/60 text-xs font-medium"
                    >
                      <option value="/">Home Dashboard (/)</option>
                      <option value="/expenses">Expenses List (/expenses)</option>
                      <option value="/analytics">Analytics & Charts (/analytics)</option>
                      <option value="/planned">Planned & Bills (/planned)</option>
                    </select>
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Target Audience
                    </label>
                    <select
                      value={targetAudience}
                      onChange={(e: any) => setTargetAudience(e.target.value)}
                      className="w-full h-11 rounded-2xl px-3 bg-secondary/30 focus:bg-background border border-border/60 text-xs font-medium"
                    >
                      <option value="all">All Subscribed Devices (Broadcast)</option>
                      <option value="inactive_today">Inactive Today (0 logged expenses)</option>
                      <option value="active_streaks">Streak Protectors (Active streaks)</option>
                    </select>
                  </div>
                </div>

                {/* Send Button */}
                <div className="pt-2">
                  <Button
                    size="lg"
                    className="w-full rounded-2xl gap-2.5 font-bold shadow-md h-12 text-sm bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all"
                    onClick={handleSendBroadcast}
                    disabled={isSending}
                  >
                    <Send className={`w-4 h-4 ${isSending ? 'animate-pulse' : ''}`} />
                    {isSending ? 'Transmitting WebPush Packets...' : 'Broadcast Immediate Notification'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Realistic iPhone Lock Screen Preview */}
          <div className="lg:col-span-5 flex justify-center sticky top-6">
            <PhoneMockupPreview
              title={broadcastTitle}
              body={broadcastBody}
              url={broadcastUrl}
            />
          </div>
        </div>
      )}

      {/* TAB 3: SCHEDULED CAMPAIGNS & LIVE TIMERS */}
      {activeTab === 'scheduled' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Automated Recurring Smart Drips (Set & Forget) Card */}
          <Card className="rounded-3xl border border-white/30 dark:border-white/10 bg-card/85 backdrop-blur-2xl shadow-sm">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    Automated Recurring Smart Drips
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    "Set & Forget" autonomous behavioral nudges triggered via Supabase Cron
                  </p>
                </div>
                <span className="w-fit text-[11px] font-mono px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Cron Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                {(automatedRules.length > 0 ? automatedRules : [
                  {
                    id: 'rule-inactivity',
                    rule_type: 'daily_inactivity',
                    title: 'Daily Evening Inactivity Nudge',
                    body: 'Dispatched to users who haven\'t logged any expense by 8:30 PM today.',
                    trigger_time: '20:30',
                    target_url: '/',
                    is_enabled: true
                  },
                  {
                    id: 'rule-streak',
                    rule_type: 'streak_saver',
                    title: '9:30 PM Streak Saver Alert',
                    body: 'Alerts active streaks at risk before midnight to maintain habit retention.',
                    trigger_time: '21:30',
                    target_url: '/',
                    is_enabled: true
                  },
                  {
                    id: 'rule-weekly',
                    rule_type: 'weekly_summary',
                    title: 'Sunday 7 PM Weekly Recap',
                    body: 'Wraps up total weekly expenses and helps users plan ahead for Monday.',
                    trigger_time: '19:00',
                    target_url: '/analytics',
                    is_enabled: true
                  }
                ]).map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 rounded-2xl bg-secondary/30 border border-border/50 flex flex-col justify-between gap-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          {rule.title}
                        </span>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{rule.trigger_time}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {rule.body}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
                      <span className={`text-[11px] font-semibold ${rule.is_enabled ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        {rule.is_enabled ? 'Active • Running' : 'Paused'}
                      </span>
                      {/* Apple Style Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id, rule.is_enabled)}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          rule.is_enabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                        }`}
                        title={rule.is_enabled ? 'Pause rule' : 'Enable rule'}
                      >
                        <span
                          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                            rule.is_enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left: Schedule Form */}
            <div className="md:col-span-5">
              <Card className="rounded-3xl border border-white/30 dark:border-white/10 bg-card/85 backdrop-blur-2xl shadow-sm">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Schedule Future Broadcast
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Queue an automated notification for background dispatch.
                    </p>
                  </div>

                  <form onSubmit={handleCreateScheduled} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Campaign Title</label>
                      <Input
                        placeholder="e.g., Weekend Wrap-up"
                        value={schedTitle}
                        onChange={(e) => setSchedTitle(e.target.value)}
                        className="rounded-2xl h-10 text-xs bg-secondary/30"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Message</label>
                      <textarea
                        rows={2}
                        placeholder="Notification body content..."
                        value={schedBody}
                        onChange={(e) => setSchedBody(e.target.value)}
                        className="w-full rounded-2xl p-3 text-xs bg-secondary/30 border border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                      />
                    </div>

                    {/* Quick Delay Presets */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Quick Delay Presets</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSetQuickTimer('30m')}
                          className="py-1.5 px-2 text-[11px] font-semibold rounded-xl bg-secondary/70 hover:bg-secondary border border-border/50 active:scale-95 transition-all text-center"
                        >
                          +30m
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetQuickTimer('1h')}
                          className="py-1.5 px-2 text-[11px] font-semibold rounded-xl bg-secondary/70 hover:bg-secondary border border-border/50 active:scale-95 transition-all text-center"
                        >
                          +1h
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetQuickTimer('2h')}
                          className="py-1.5 px-2 text-[11px] font-semibold rounded-xl bg-secondary/70 hover:bg-secondary border border-border/50 active:scale-95 transition-all text-center"
                        >
                          +2h
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetQuickTimer('tonight')}
                          className="py-1.5 px-2 text-[11px] font-semibold rounded-xl bg-secondary/70 hover:bg-secondary border border-border/50 active:scale-95 transition-all text-center"
                        >
                          Tonight 8PM
                        </button>
                      </div>
                    </div>

                    {/* Target Route & Audience */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Target Audience</label>
                        <select
                          value={schedAudience}
                          onChange={(e: any) => setSchedAudience(e.target.value)}
                          className="w-full h-10 rounded-2xl px-2.5 bg-secondary/30 border border-border/60 text-xs"
                        >
                          <option value="all">All Devices</option>
                          <option value="inactive_today">Inactive Today</option>
                          <option value="active_streaks">Streaks</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Click Route</label>
                        <Input
                          placeholder="/"
                          value={schedUrl}
                          onChange={(e) => setSchedUrl(e.target.value)}
                          className="rounded-2xl h-10 text-xs font-mono bg-secondary/30"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Scheduled Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={schedDateTime}
                        onChange={(e) => setSchedDateTime(e.target.value)}
                        className="rounded-2xl h-10 text-xs bg-secondary/30"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full rounded-2xl font-bold gap-2 h-11 mt-2 shadow-xs active:scale-95 transition-all"
                      disabled={isScheduling}
                    >
                      <CalendarClock className="w-4 h-4" />
                      {isScheduling ? 'Scheduling...' : 'Queue Scheduled Campaign'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right: Active Scheduled Queue with Live Ticking Timers */}
            <div className="md:col-span-7 space-y-3.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-primary" />
                  Scheduled Campaigns Queue
                </h3>
                <span className="text-xs font-mono text-muted-foreground">
                  {scheduledList.filter(s => s.status === 'pending').length} queued
                </span>
              </div>

              {scheduledList.length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-border/70 text-muted-foreground text-xs bg-card/40 backdrop-blur-md">
                  <CalendarClock className="w-10 h-10 mx-auto mb-2.5 opacity-40 text-primary" />
                  <p className="font-semibold text-foreground text-sm">No Active Campaigns</p>
                  <p className="mt-1">Queue a notification using the form on the left to set up automated timers.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {scheduledList.map((item) => {
                      const remaining = calculateRemainingTime(item.scheduled_at);
                      const isPending = item.status === 'pending';

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="p-4 rounded-3xl border border-white/30 dark:border-white/10 bg-card/85 backdrop-blur-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                                isPending 
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25'
                                  : item.status === 'completed'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                  : 'bg-muted text-muted-foreground border-border/40'
                              }`}>
                                {item.status}
                              </span>
                              <span className="text-xs font-bold text-foreground truncate">
                                {item.title}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {item.body}
                            </p>
                            <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground font-mono">
                              <span>Audience: {item.target_audience}</span>
                              <span>•</span>
                              <span>At: {format(new Date(item.scheduled_at), 'MMM d, h:mm a')}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            {isPending && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-mono text-xs font-bold shadow-xs">
                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                <span>{remaining.formatted}</span>
                              </div>
                            )}

                            {isPending && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-destructive hover:bg-destructive/10 rounded-xl px-2.5 text-xs font-medium"
                                onClick={() => handleCancelScheduled(item.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Cancel
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DELIVERY AUDIT LOGS */}
      {activeTab === 'logs' && (
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
      )}

      {/* User Inspector Deep-Dive Sheet */}
      <UserInspectorSheet
        userId={selectedUserId}
        isOpen={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onNudgeUser={(u) => {
          setSelectedUserId(null);
          setNudgeTargetUser(u);
        }}
      />

      {/* 1-on-1 Direct Nudge Composer Modal */}
      <DirectNudgeModal
        user={nudgeTargetUser}
        isOpen={!!nudgeTargetUser}
        onClose={() => setNudgeTargetUser(null)}
        onSuccess={loadAllData}
      />

      {/* Admin Team Whitelist Management Modal */}
      <AdminTeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        currentUserEmail={session?.user?.email}
      />
    </div>
  );
}
