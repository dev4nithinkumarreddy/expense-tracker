import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpenseStore } from '../../store/useExpenseStore';
import { 
  fetchAdminAnalytics, 
  sendPushBroadcast, 
  fetchScheduledNotifications, 
  createScheduledNotification, 
  cancelScheduledNotification, 
  fetchNotificationLogs, 
  calculateRemainingTime,
  type AdminAnalytics, 
  type ScheduledNotification, 
  type NotificationLog 
} from '../../lib/admin';
import { formatCurrency } from '../../lib/formatCurrency';
import { PhoneMockupPreview } from '../../components/admin/PhoneMockupPreview';
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
  CheckCircle2 
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
      const [analyticsData, scheduledData, logsData] = await Promise.all([
        fetchAdminAnalytics(),
        fetchScheduledNotifications(),
        fetchNotificationLogs()
      ]);
      setAnalytics(analyticsData);
      setScheduledList(scheduledData);
      setLogs(logsData);
    } catch (err: any) {
      toast.error("Failed to load admin data: " + (err.message || 'Unknown error'));
    } finally {
      setLoadingAnalytics(false);
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

    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
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

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Top Admin Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9"
            onClick={() => navigate('/')}
            title="Return to App"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Admin Command Center</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-primary/15 text-primary rounded-full border border-primary/20">
                Live Portal
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Platform Analytics, Custom Push Broadcasts & Automation Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-xs"
            onClick={loadAllData}
            disabled={loadingAnalytics}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalytics ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </Button>
          <div className="hidden md:block text-xs font-mono bg-card px-2.5 py-1.5 rounded-xl border border-border/60 text-muted-foreground">
            {session?.user.email}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Button
          variant={activeTab === 'analytics' ? 'default' : 'secondary'}
          size="sm"
          className="gap-2 rounded-xl text-xs font-semibold shrink-0"
          onClick={() => setActiveTab('analytics')}
        >
          <Activity className="w-4 h-4" /> User Analytics & Usage
        </Button>
        <Button
          variant={activeTab === 'broadcast' ? 'default' : 'secondary'}
          size="sm"
          className="gap-2 rounded-xl text-xs font-semibold shrink-0"
          onClick={() => setActiveTab('broadcast')}
        >
          <Send className="w-4 h-4" /> Push Broadcast Studio
        </Button>
        <Button
          variant={activeTab === 'scheduled' ? 'default' : 'secondary'}
          size="sm"
          className="gap-2 rounded-xl text-xs font-semibold shrink-0 relative"
          onClick={() => setActiveTab('scheduled')}
        >
          <CalendarClock className="w-4 h-4" /> Scheduled Campaigns
          {scheduledList.filter(s => s.status === 'pending').length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-primary/20 text-primary rounded-full text-[10px] font-bold">
              {scheduledList.filter(s => s.status === 'pending').length}
            </span>
          )}
        </Button>
        <Button
          variant={activeTab === 'logs' ? 'default' : 'secondary'}
          size="sm"
          className="gap-2 rounded-xl text-xs font-semibold shrink-0"
          onClick={() => setActiveTab('logs')}
        >
          <History className="w-4 h-4" /> Broadcast History ({logs.length})
        </Button>
      </div>

      {/* TAB 1: ANALYTICS & USAGE */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Card className="rounded-2xl border-border/60 shadow-xs bg-card/80 backdrop-blur-xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Registered</p>
                  <p className="text-xl font-bold tracking-tight">{analytics?.totalUsers ?? '—'}</p>
                  <span className="text-[10px] text-emerald-500 font-semibold">Active accounts</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs bg-card/80 backdrop-blur-xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Active Today (DAU)</p>
                  <p className="text-xl font-bold tracking-tight">{analytics?.activeToday ?? '—'}</p>
                  <span className="text-[10px] text-muted-foreground">{analytics?.activeThisWeek ?? 0} active this week</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs bg-card/80 backdrop-blur-xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Platform Volume</p>
                  <p className="text-xl font-bold tracking-tight">
                    {analytics ? formatCurrency(analytics.totalPlatformSpend, settings.currency) : '—'}
                  </p>
                  <span className="text-[10px] text-muted-foreground">{analytics?.totalExpensesCount ?? 0} total entries</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-xs bg-card/80 backdrop-blur-xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Push Subscribers</p>
                  <p className="text-xl font-bold tracking-tight">{analytics?.totalPushSubscribers ?? '—'}</p>
                  <span className="text-[10px] text-purple-500 font-semibold">Active WebPush tokens</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Device Breakdown & User Growth Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1 rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-bold tracking-tight">Device Platform Split</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Smartphone className="w-4 h-4 text-primary" /> Mobile / PWA App
                    </span>
                    <span className="font-bold">{analytics?.deviceBreakdown.mobilePwa ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Monitor className="w-4 h-4 text-emerald-500" /> Desktop Browsers
                    </span>
                    <span className="font-bold">{analytics?.deviceBreakdown.desktop ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Sparkles className="w-4 h-4 text-purple-500" /> Other Platforms
                    </span>
                    <span className="font-bold">{analytics?.deviceBreakdown.other ?? 0}</span>
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground space-y-1 mt-4">
                  <p className="font-semibold text-foreground">💡 Engagement Insight:</p>
                  <p>Mobile PWA users engage 3.2x more with daily logging streaks than desktop visitors.</p>
                </div>
              </CardContent>
            </Card>

            {/* Recent User Activity Table */}
            <Card className="md:col-span-2 rounded-2xl border-border/60 shadow-xs">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold tracking-tight">Recent User Activity</h3>
                  <span className="text-xs text-muted-foreground">{analytics?.recentUsers.length ?? 0} active records</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="pb-2 font-medium">User Identifier</th>
                        <th className="pb-2 font-medium">Logged Items</th>
                        <th className="pb-2 font-medium">Last Active</th>
                        <th className="pb-2 font-medium">Push Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {(analytics?.recentUsers || []).map((u) => (
                        <tr key={u.userId} className="hover:bg-muted/30">
                          <td className="py-2.5 font-mono text-[11px] text-muted-foreground truncate max-w-[140px]">
                            {u.userId.substring(0, 14)}...
                          </td>
                          <td className="py-2.5 font-semibold">{u.expenseCount}</td>
                          <td className="py-2.5 text-muted-foreground">
                            {u.lastActive ? format(new Date(u.lastActive), 'MMM d, h:mm a') : 'Never'}
                          </td>
                          <td className="py-2.5">
                            {u.hasPush ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-500 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" /> Subscribed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground w-fit">
                                Off
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Composer Form */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="rounded-3xl border-border/60 shadow-sm bg-card/90 backdrop-blur-xl">
              <CardContent className="p-5 space-y-4">
                <div>
                  <h3 className="text-base font-bold tracking-tight">Compose Custom Push Broadcast</h3>
                  <p className="text-xs text-muted-foreground">
                    Deliver instant notifications to users' device lock screens and notification centers.
                  </p>
                </div>

                {/* Preset Templates */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">1-Tap Template Presets</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.label}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="px-2.5 py-1 text-xs font-medium rounded-full bg-secondary/80 hover:bg-secondary border border-border/50 text-foreground transition-colors"
                      >
                        {tmpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Notification Title</label>
                  <Input
                    placeholder="e.g., How did your wallet do today? 💸"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="rounded-xl h-10 bg-background/80"
                  />
                </div>

                {/* Body Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Message Body Content</label>
                  <textarea
                    rows={3}
                    placeholder="e.g., Take 30 seconds to log today's expenses..."
                    value={broadcastBody}
                    onChange={(e) => setBroadcastBody(e.target.value)}
                    className="w-full rounded-xl p-3 text-sm bg-background/80 border border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {/* Action URL */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Destination Route</label>
                    <select
                      value={broadcastUrl}
                      onChange={(e) => setBroadcastUrl(e.target.value)}
                      className="w-full h-10 rounded-xl px-3 bg-background/80 border border-input text-sm"
                    >
                      <option value="/">Home Dashboard (/)</option>
                      <option value="/expenses">Expenses List (/expenses)</option>
                      <option value="/analytics">Analytics & KPIs (/analytics)</option>
                      <option value="/planned">Planned & Bills (/planned)</option>
                    </select>
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Target Audience</label>
                    <select
                      value={targetAudience}
                      onChange={(e: any) => setTargetAudience(e.target.value)}
                      className="w-full h-10 rounded-xl px-3 bg-background/80 border border-input text-sm"
                    >
                      <option value="all">All Subscribed Devices (Broadcast)</option>
                      <option value="inactive_today">Inactive Today (0 logs today)</option>
                      <option value="active_streaks">Streak Protectors (Active streak)</option>
                    </select>
                  </div>
                </div>

                {/* Send Button */}
                <div className="pt-2">
                  <Button
                    size="lg"
                    className="w-full rounded-2xl gap-2 font-bold shadow-md"
                    onClick={handleSendBroadcast}
                    disabled={isSending}
                  >
                    <Send className={`w-4 h-4 ${isSending ? 'animate-pulse' : ''}`} />
                    {isSending ? 'Transmitting WebPush...' : 'Broadcast Immediate Notification'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Mobile Lock Screen Simulator */}
          <div className="lg:col-span-5 flex justify-center">
            <PhoneMockupPreview
              title={broadcastTitle}
              body={broadcastBody}
              url={broadcastUrl}
            />
          </div>
        </div>
      )}

      {/* TAB 3: SCHEDULED CAMPAIGNS & TIMERS */}
      {activeTab === 'scheduled' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: Schedule Form */}
            <div className="md:col-span-5">
              <Card className="rounded-3xl border-border/60 shadow-xs bg-card/90">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-bold tracking-tight">Schedule Future Notification</h3>
                    <p className="text-xs text-muted-foreground">
                      Set a timer or date for automated background dispatch.
                    </p>
                  </div>

                  <form onSubmit={handleCreateScheduled} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Campaign Title</label>
                      <Input
                        placeholder="e.g., Weekend Wrap-up"
                        value={schedTitle}
                        onChange={(e) => setSchedTitle(e.target.value)}
                        className="rounded-xl h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Message</label>
                      <textarea
                        rows={2}
                        placeholder="Notification body content..."
                        value={schedBody}
                        onChange={(e) => setSchedBody(e.target.value)}
                        className="w-full rounded-xl p-2.5 text-xs bg-background border border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>

                    {/* Quick Timers */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Quick Delay Presets</label>
                      <div className="grid grid-cols-4 gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetQuickTimer('30m')}
                          className="py-1 px-1.5 text-[11px] font-medium rounded-lg bg-secondary hover:bg-secondary/80 border text-center transition-colors"
                        >
                          +30m
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetQuickTimer('1h')}
                          className="py-1 px-1.5 text-[11px] font-medium rounded-lg bg-secondary hover:bg-secondary/80 border text-center transition-colors"
                        >
                          +1h
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetQuickTimer('2h')}
                          className="py-1 px-1.5 text-[11px] font-medium rounded-lg bg-secondary hover:bg-secondary/80 border text-center transition-colors"
                        >
                          +2h
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetQuickTimer('tonight')}
                          className="py-1 px-1.5 text-[11px] font-medium rounded-lg bg-secondary hover:bg-secondary/80 border text-center transition-colors"
                        >
                          Tonight 8PM
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Target Audience</label>
                        <select
                          value={schedAudience}
                          onChange={(e: any) => setSchedAudience(e.target.value)}
                          className="w-full h-9 rounded-xl px-2 bg-background border border-input text-xs"
                        >
                          <option value="all">All Devices</option>
                          <option value="inactive_today">Inactive Today</option>
                          <option value="active_streaks">Streaks</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Click URL</label>
                        <Input
                          placeholder="/"
                          value={schedUrl}
                          onChange={(e) => setSchedUrl(e.target.value)}
                          className="rounded-xl h-9 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Scheduled Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={schedDateTime}
                        onChange={(e) => setSchedDateTime(e.target.value)}
                        className="rounded-xl h-9 text-xs"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full rounded-xl font-bold gap-2 mt-2"
                      disabled={isScheduling}
                    >
                      <Clock className="w-4 h-4" />
                      {isScheduling ? 'Scheduling...' : 'Queue Scheduled Campaign'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right: Active Scheduled Queue with Live Ticking Timers */}
            <div className="md:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-tight">Active Scheduled Campaigns Queue</h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {scheduledList.filter(s => s.status === 'pending').length} queued
                </span>
              </div>

              {scheduledList.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border/70 text-muted-foreground text-xs">
                  <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No scheduled campaigns found. Set a future date on the left to queue an automated notification.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {scheduledList.map((item) => {
                    const remaining = calculateRemainingTime(item.scheduled_at);
                    const isPending = item.status === 'pending';

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl border border-border/70 bg-card/85 backdrop-blur-md shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 overflow-hidden min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm truncate">{item.title}</span>
                            {isPending ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/20">
                                Pending
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                                {item.status}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.body}</p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                            <span>Scheduled: {format(new Date(item.scheduled_at), 'MMM d, h:mm a')}</span>
                            <span>•</span>
                            <span>Target: {item.target_audience}</span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
                          {isPending && (
                            <div className="font-mono text-xs font-bold text-primary px-2.5 py-1 bg-primary/10 rounded-lg border border-primary/20">
                              ⏱️ {remaining.formatted}
                            </div>
                          )}

                          {isPending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2 rounded-lg"
                              onClick={() => handleCancelScheduled(item.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BROADCAST HISTORY & LOGS */}
      {activeTab === 'logs' && (
        <Card className="rounded-2xl border-border/60 shadow-xs animate-in fade-in duration-200">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold tracking-tight">Delivery Audit Trail</h3>
                <p className="text-xs text-muted-foreground">Historical records of all triggered push notifications</p>
              </div>
              <span className="text-xs text-muted-foreground">{logs.length} entries</span>
            </div>

            {logs.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No notification broadcast logs recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="pb-2.5 font-medium">Timestamp</th>
                      <th className="pb-2.5 font-medium">Title & Message</th>
                      <th className="pb-2.5 font-medium">Audience</th>
                      <th className="pb-2.5 font-medium">Deliveries</th>
                      <th className="pb-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30">
                        <td className="py-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM d, h:mm a')}
                        </td>
                        <td className="py-3 pr-4 max-w-[280px]">
                          <p className="font-semibold text-foreground truncate">{log.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{log.body}</p>
                        </td>
                        <td className="py-3 whitespace-nowrap capitalize text-muted-foreground">
                          {log.target_audience.replace('_', ' ')}
                        </td>
                        <td className="py-3 font-semibold whitespace-nowrap">
                          <span className="text-emerald-500">{log.successful_deliveries} sent</span>
                          {log.failed_deliveries > 0 && (
                            <span className="text-destructive ml-1 text-[11px]">({log.failed_deliveries} failed)</span>
                          )}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-500">
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
