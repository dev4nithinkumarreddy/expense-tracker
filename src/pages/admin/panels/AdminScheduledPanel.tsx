import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { 
  Sliders, 
  Clock, 
  CalendarClock, 
  Trash2 
} from 'lucide-react';
import { calculateRemainingTime, type AutomatedRule, type ScheduledNotification } from '../../../lib/admin';

interface AdminScheduledPanelProps {
  automatedRules: AutomatedRule[];
  onToggleRule: (id: string, currentStatus: boolean) => Promise<void>;
  schedTitle: string;
  setSchedTitle: (val: string) => void;
  schedBody: string;
  setSchedBody: (val: string) => void;
  schedUrl: string;
  setSchedUrl: (val: string) => void;
  schedAudience: 'all' | 'inactive_today' | 'active_streaks';
  setSchedAudience: (val: 'all' | 'inactive_today' | 'active_streaks') => void;
  schedDateTime: string;
  setSchedDateTime: (val: string) => void;
  isScheduling: boolean;
  scheduledList: ScheduledNotification[];
  onCreateScheduled: (e: React.FormEvent) => Promise<void>;
  onCancelScheduled: (id: string) => Promise<void>;
  onSetQuickTimer: (type: '30m' | '1h' | '2h' | 'tonight') => void;
}

export default function AdminScheduledPanel({
  automatedRules,
  onToggleRule,
  schedTitle,
  setSchedTitle,
  schedBody,
  setSchedBody,
  schedUrl,
  setSchedUrl,
  schedAudience,
  setSchedAudience,
  schedDateTime,
  setSchedDateTime,
  isScheduling,
  scheduledList,
  onCreateScheduled,
  onCancelScheduled,
  onSetQuickTimer
}: AdminScheduledPanelProps) {
  return (
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
                body: "Dispatched to users who haven't logged any expense by 8:30 PM today.",
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
                    onClick={() => onToggleRule(rule.id, rule.is_enabled)}
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

              <form onSubmit={onCreateScheduled} className="space-y-3.5">
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
                      onClick={() => onSetQuickTimer('30m')}
                      className="py-1.5 px-2 text-[11px] font-semibold rounded-xl bg-secondary/70 hover:bg-secondary border border-border/50 active:scale-95 transition-all text-center"
                    >
                      +30m
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetQuickTimer('1h')}
                      className="py-1.5 px-2 text-[11px] font-semibold rounded-xl bg-secondary/70 hover:bg-secondary border border-border/50 active:scale-95 transition-all text-center"
                    >
                      +1h
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetQuickTimer('2h')}
                      className="py-1.5 px-2 text-[11px] font-semibold rounded-xl bg-secondary/70 hover:bg-secondary border border-border/50 active:scale-95 transition-all text-center"
                    >
                      +2h
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetQuickTimer('tonight')}
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
                            onClick={() => onCancelScheduled(item.id)}
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
  );
}
