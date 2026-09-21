import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { PhoneMockupPreview } from '../../../components/admin/PhoneMockupPreview';
import { Radio, Sparkles, ExternalLink, Users, Send } from 'lucide-react';
import { toast } from 'sonner';
import { vibrate } from '../../../lib/utils';

const BROADCAST_TEMPLATES = [
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

interface AdminBroadcastPanelProps {
  broadcastTitle: string;
  setBroadcastTitle: (title: string) => void;
  broadcastBody: string;
  setBroadcastBody: (body: string) => void;
  broadcastUrl: string;
  setBroadcastUrl: (url: string) => void;
  targetAudience: 'all' | 'inactive_today' | 'active_streaks';
  setTargetAudience: (audience: 'all' | 'inactive_today' | 'active_streaks') => void;
  isSending: boolean;
  onSendBroadcast: () => Promise<void>;
}

export default function AdminBroadcastPanel({
  broadcastTitle,
  setBroadcastTitle,
  broadcastBody,
  setBroadcastBody,
  broadcastUrl,
  setBroadcastUrl,
  targetAudience,
  setTargetAudience,
  isSending,
  onSendBroadcast
}: AdminBroadcastPanelProps) {
  const handleApplyTemplate = (tmpl: typeof BROADCAST_TEMPLATES[0]) => {
    vibrate(10);
    setBroadcastTitle(tmpl.title);
    setBroadcastBody(tmpl.body);
    setBroadcastUrl(tmpl.url);
    toast.success("Applied template: " + tmpl.label);
  };

  return (
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
                {BROADCAST_TEMPLATES.map((tmpl) => (
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
                onClick={onSendBroadcast}
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
  );
}
