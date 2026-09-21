import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, User, Loader2, Compass } from 'lucide-react';
import { sendDirectUserNudge } from '../../lib/admin';
import { useExpenseStore } from '../../store/useExpenseStore';
import { toast } from 'sonner';

interface DirectNudgeModalProps {
  user: { id: string; name?: string; email?: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DESTINATION_OPTIONS = [
  { label: "Dashboard (Home)", value: "/" },
  { label: "Analytics Hub", value: "/analytics" },
  { label: "Add Expense", value: "/add" },
  { label: "Profile & Settings", value: "/settings" }
];

export function DirectNudgeModal({ user, isOpen, onClose, onSuccess }: DirectNudgeModalProps) {
  const session = useExpenseStore((state) => state.session);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetUrl, setTargetUrl] = useState('/');
  const [loading, setLoading] = useState(false);

  const userName = user?.name || (user?.email ? user.email.split('@')[0] : 'there');

  useEffect(() => {
    if (isOpen && user) {
      setTitle(`Hey ${userName} 👋`);
      setBody(`Quick check-in! Don't forget to track your expenses today to keep your streak alive 💸`);
      setTargetUrl('/');
    }
  }, [isOpen, user, userName]);

  const quickTemplates = [
    {
      label: 'Streak Saver 🔥',
      title: `Keep it up, ${userName}! 🔥`,
      body: `Your tracking streak is on the line today! Log today's expenses before midnight to keep your momentum going.`
    },
    {
      label: 'Gentle Reminder ☕',
      title: `Hey ${userName} 👋`,
      body: `Grab a coffee or lunch today? Take 10 seconds to log it and keep your budget tidy.`
    },
    {
      label: 'Weekly Review 📊',
      title: `Your weekly wrap is ready 📊`,
      body: `Take a quick peek at where your money went this week and plan ahead for next week!`
    }
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim() || !body.trim()) {
      toast.error("Please fill in both title and message body");
      return;
    }

    try {
      setLoading(true);
      const res = await sendDirectUserNudge(user.id, {
        title: title.trim(),
        body: body.trim(),
        url: targetUrl,
        admin_user_id: session?.user?.id
      });

      if (res.successful > 0) {
        toast.success(`Direct nudge successfully delivered to ${userName}!`);
      } else if (res.total_subscribers === 0) {
        toast.warning(`${userName} has no active push notification devices linked.`);
      } else {
        toast.error("Failed to deliver nudge. User's push subscription may have expired.");
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Direct nudge failed:", err);
      toast.error(err.message || "Failed to dispatch direct nudge");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-3xl z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-border/60 flex items-center justify-between gap-4 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    1-on-1 Nudge to {userName}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                    {user.email || user.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSend} className="p-6 space-y-4">
              {/* Quick Template Pills */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Quick Inspiration
                </label>
                <div className="flex flex-wrap gap-2">
                  {quickTemplates.map((tmpl) => (
                    <button
                      key={tmpl.label}
                      type="button"
                      onClick={() => {
                        setTitle(tmpl.title);
                        setBody(tmpl.body);
                      }}
                      className="px-2.5 py-1 text-xs rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary border border-border/60 text-muted-foreground transition-colors"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Notification Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Quick check-in! 👋"
                  maxLength={50}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border/80 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>

              {/* Message Body Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <label className="font-medium">Message Body</label>
                  <span>{body.length} / 160</span>
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type your personal message..."
                  rows={3}
                  maxLength={160}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border/80 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none transition-all"
                />
              </div>

              {/* Destination URL */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  On-Tap Destination
                </label>
                <select
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border/80 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                >
                  {DESTINATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.value})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Nudge
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
