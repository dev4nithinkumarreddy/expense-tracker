import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useExpenseStore } from '../../store/useExpenseStore';
import { 
  fetchAdminAnalytics, 
  sendPushBroadcast, 
  sendDirectUserNudge,
  fetchScheduledNotifications, 
  createScheduledNotification, 
  cancelScheduledNotification, 
  fetchNotificationLogs, 
  fetchAutomatedRules,
  toggleAutomatedRule,
  pingHealth,
  type AdminAnalytics, 
  type ScheduledNotification, 
  type NotificationLog,
  type AutomatedRule
} from '../../lib/admin';
import { UserInspectorSheet } from '../../components/admin/UserInspectorSheet';
import { DirectNudgeModal } from '../../components/admin/DirectNudgeModal';
import { AdminTeamModal } from '../../components/admin/AdminTeamModal';
import { Button } from '../../components/ui/button';
import { 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck,
  Shield,
  BarChart3,
  Send,
  CalendarClock,
  History,
  Zap,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { vibrate } from '../../lib/utils';
import { format, addHours, addMinutes, setHours, setMinutes } from 'date-fns';

const AdminOverviewPanel = lazy(() => import('./panels/AdminOverviewPanel'));
const AdminBroadcastPanel = lazy(() => import('./panels/AdminBroadcastPanel'));
const AdminScheduledPanel = lazy(() => import('./panels/AdminScheduledPanel'));
const AdminLogsPanel = lazy(() => import('./panels/AdminLogsPanel'));

function PanelFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] rounded-3xl border border-dashed border-border/60 bg-card/30 backdrop-blur-md p-8">
      <Loader2 className="w-8 h-8 animate-spin text-primary opacity-60" />
      <span className="text-xs font-mono text-muted-foreground mt-3">Loading panel modules...</span>
    </div>
  );
}

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
    setAutomatedRules(rules => rules.map(r => r.id === id ? { ...r, is_enabled: nextStatus } : r));

    const ok = await toggleAutomatedRule(id, nextStatus);
    if (ok) {
      toast.success(nextStatus ? "Automated drip rule enabled" : "Automated drip rule paused");
    } else {
      toast.error("Failed to update rule state");
      setAutomatedRules(rules => rules.map(r => r.id === id ? { ...r, is_enabled: currentStatus } : r));
    }
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

      {/* Lazy Loaded Tab Content */}
      <Suspense fallback={<PanelFallback />}>
        {activeTab === 'analytics' && (
          <AdminOverviewPanel
            analytics={analytics}
            currency={settings.currency}
            onSelectUserId={setSelectedUserId}
            onNudgeUser={setNudgeTargetUser}
          />
        )}

        {activeTab === 'broadcast' && (
          <AdminBroadcastPanel
            broadcastTitle={broadcastTitle}
            setBroadcastTitle={setBroadcastTitle}
            broadcastBody={broadcastBody}
            setBroadcastBody={setBroadcastBody}
            broadcastUrl={broadcastUrl}
            setBroadcastUrl={setBroadcastUrl}
            targetAudience={targetAudience}
            setTargetAudience={setTargetAudience}
            isSending={isSending}
            onSendBroadcast={handleSendBroadcast}
          />
        )}

        {activeTab === 'scheduled' && (
          <AdminScheduledPanel
            automatedRules={automatedRules}
            onToggleRule={handleToggleRule}
            schedTitle={schedTitle}
            setSchedTitle={setSchedTitle}
            schedBody={schedBody}
            setSchedBody={setSchedBody}
            schedUrl={schedUrl}
            setSchedUrl={setSchedUrl}
            schedAudience={schedAudience}
            setSchedAudience={setSchedAudience}
            schedDateTime={schedDateTime}
            setSchedDateTime={setSchedDateTime}
            isScheduling={isScheduling}
            scheduledList={scheduledList}
            onCreateScheduled={handleCreateScheduled}
            onCancelScheduled={handleCancelScheduled}
            onSetQuickTimer={handleSetQuickTimer}
          />
        )}

        {activeTab === 'logs' && (
          <AdminLogsPanel logs={logs} />
        )}
      </Suspense>

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
