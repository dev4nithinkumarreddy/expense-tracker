import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, UserPlus, Trash2, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchAdminTeam, addAdminMember, removeAdminMember, type AdminMember } from '../../lib/admin';
import { toast } from 'sonner';

interface AdminTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
}

const PROTECTED_EMAILS = [
  'dev4nithinkumarreddyc@gmail.com',
  'dev4nithinkumarreddy@gmail.com'
];

export function AdminTeamModal({ isOpen, onClose, currentUserEmail }: AdminTeamModalProps) {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'super_admin'>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminTeam();
      setMembers(data);
    } catch (err) {
      console.error("Failed to load admin team:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTeam();
    }
  }, [isOpen]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    const res = await addAdminMember(newEmail.trim(), newRole);
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Added ${newEmail.trim()} as ${newRole}`);
      setNewEmail('');
      loadTeam();
    } else {
      toast.error(res.error || "Failed to add admin user");
    }
  };

  const handleRemove = async (member: AdminMember) => {
    const isProtected = PROTECTED_EMAILS.includes(member.email.toLowerCase());
    if (isProtected) {
      toast.error("Built-in primary super admin cannot be revoked.");
      return;
    }

    if (member.email.toLowerCase() === currentUserEmail?.toLowerCase()) {
      toast.error("You cannot revoke your own admin access.");
      return;
    }

    if (!window.confirm(`Revoke admin access for ${member.email}?`)) {
      return;
    }

    setDeletingId(member.id);
    const res = await removeAdminMember(member.id);
    setDeletingId(null);

    if (res.success) {
      toast.success(`Revoked admin access for ${member.email}`);
      loadTeam();
    } else {
      toast.error(res.error || "Failed to revoke admin member");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-3xl z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-border/60 flex items-center justify-between gap-4 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Admin Whitelist Management
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Authorize and manage dashboard administrators
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

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Add New Admin Form */}
              <form onSubmit={handleAdd} className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-primary" />
                  Grant Admin Access
                </h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="flex-1 px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Add Admin
                  </button>
                </div>
              </form>

              {/* Members List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Active Admin Personnel ({members.length})
                  </h4>
                </div>

                {loading ? (
                  <div className="py-8 flex justify-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 text-center text-xs text-muted-foreground">
                    No custom admins listed in database. Built-in super admin fallback is active.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => {
                      const isProtected = PROTECTED_EMAILS.includes(member.email.toLowerCase());
                      const isSelf = member.email.toLowerCase() === currentUserEmail?.toLowerCase();

                      return (
                        <div
                          key={member.id}
                          className="p-3 rounded-2xl bg-card border border-border/60 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground truncate">
                                {member.email}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground capitalize">
                              Role: {member.role.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                member.role === 'super_admin'
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  : 'bg-primary/10 text-primary border border-primary/20'
                              }`}
                            >
                              {member.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                            </span>

                            {!isProtected && !isSelf && (
                              <button
                                type="button"
                                onClick={() => handleRemove(member)}
                                disabled={deletingId === member.id}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Revoke Admin Access"
                              >
                                {deletingId === member.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                Admins have full broadcast & telemetry oversight
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
