import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, MessageSquare, QrCode, ArrowUpRight, CheckCircle2, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/formatCurrency';
import { generateUpiUrl, generateWhatsAppShareText, generateWhatsAppUrl, generatePayWebUrl } from '../../lib/upi';
import { vibrate } from '../../lib/utils';

export interface SplitShareItem {
  id?: string;
  name: string;
  amount: number;
  upiId?: string;
  debtId?: string;
}

interface SplitShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  splitTitle: string;
  totalAmount: number;
  participants: SplitShareItem[];
  payerUpiId?: string;
  payerName?: string;
  currency?: string;
}

export const SplitShareSheet: React.FC<SplitShareSheetProps> = ({
  isOpen,
  onClose,
  splitTitle,
  totalAmount,
  participants,
  payerUpiId,
  payerName = 'Me',
  currency = '₹',
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeQrParticipant, setActiveQrParticipant] = useState<SplitShareItem | null>(null);

  const handleCopyLink = (p: SplitShareItem, upiUrl: string) => {
    vibrate(15);
    navigator.clipboard.writeText(upiUrl);
    setCopiedId(p.name);
    toast.success(`Copied payment link for ${p.name}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsAppShare = (p: SplitShareItem, upiUrl: string) => {
    vibrate(15);
    const payWebUrl = payerUpiId
      ? generatePayWebUrl({
          pa: payerUpiId,
          pn: payerName,
          am: p.amount,
          tn: splitTitle,
          cu: currency === '₹' ? 'INR' : currency,
        })
      : undefined;

    const message = generateWhatsAppShareText({
      payeeName: p.name,
      payerName,
      amount: p.amount,
      currency,
      description: splitTitle,
      upiId: payerUpiId,
      upiUrl,
      payWebUrl,
    });
    const waUrl = generateWhatsAppUrl(message);
    window.open(waUrl, '_blank');
  };

  const handleOpenUpi = (upiUrl: string) => {
    vibrate(15);
    window.location.href = upiUrl;
  };

  const handleNativeShare = async (p: SplitShareItem, upiUrl: string) => {
    vibrate(15);
    const payWebUrl = payerUpiId
      ? generatePayWebUrl({
          pa: payerUpiId,
          pn: payerName,
          am: p.amount,
          tn: splitTitle,
          cu: currency === '₹' ? 'INR' : currency,
        })
      : undefined;

    const message = generateWhatsAppShareText({
      payeeName: p.name,
      payerName,
      amount: p.amount,
      currency,
      description: splitTitle,
      upiId: payerUpiId,
      upiUrl,
      payWebUrl,
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Split Request: ${splitTitle}`,
          text: message,
          url: payWebUrl || upiUrl,
        });
      } catch {
        // User cancelled or share failed silently
      }
    } else {
      handleCopyLink(p, payWebUrl || upiUrl);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-card border border-border/60 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[85dvh]"
          >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between bg-muted/20 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <h3 className="font-semibold text-lg">Split Created & Ready to Share</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {splitTitle} • Total {formatCurrency(totalAmount, currency)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body List */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            {!payerUpiId && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
                <span>Add your UPI ID in Settings to auto-generate direct 1-tap payment links.</span>
              </div>
            )}

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Request Payments from Friends ({participants.length})
            </p>

            <div className="space-y-3">
              {participants.map((p) => {
                const upiUrl = payerUpiId
                  ? generateUpiUrl({
                      pa: payerUpiId,
                      pn: payerName,
                      am: p.amount,
                      tn: `Split: ${splitTitle}`,
                    })
                  : '';

                return (
                  <Card key={p.name} className="border-border/60 overflow-hidden bg-card/60 shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">Owes you</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(p.amount, currency)}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsAppShare(p, upiUrl)}
                          className="h-8 text-xs font-medium gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </Button>

                        {payerUpiId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenUpi(upiUrl)}
                            className="h-8 text-xs font-medium gap-1 hover:bg-primary/10"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" /> UPI App
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleNativeShare(p, upiUrl)}
                            className="h-8 text-xs font-medium gap-1"
                          >
                            <Share2 className="w-3.5 h-3.5" /> Share
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => (payerUpiId ? setActiveQrParticipant(p) : handleCopyLink(p, upiUrl))}
                          className="h-8 text-xs font-medium gap-1"
                        >
                          {payerUpiId ? (
                            <>
                              <QrCode className="w-3.5 h-3.5" /> QR Code
                            </>
                          ) : copiedId === p.name ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border/40 bg-card/95 backdrop-blur-md shrink-0 flex justify-end pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))]">
            <Button onClick={onClose} className="w-full sm:w-auto px-6">
              Done
            </Button>
          </div>
        </motion.div>
          </div>
        )}

      {/* QR Code Modal */}
      {activeQrParticipant && payerUpiId && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border/60 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">Scan to Pay {payerName}</h4>
              <button
                onClick={() => setActiveQrParticipant(null)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  generateUpiUrl({
                    pa: payerUpiId,
                    pn: payerName,
                    am: activeQrParticipant.amount,
                    tn: `Split: ${splitTitle}`,
                  })
                )}`}
                alt="UPI Payment QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div>
              <p className="font-bold text-lg text-emerald-600">
                {formatCurrency(activeQrParticipant.amount, currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">UPI ID: {payerUpiId}</p>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                size="sm"
                className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                onClick={async () => {
                  vibrate(15);
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    generateUpiUrl({
                      pa: payerUpiId,
                      pn: payerName,
                      am: activeQrParticipant.amount,
                      tn: `Split: ${splitTitle}`,
                    })
                  )}`;
                  try {
                    const res = await fetch(qrUrl);
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `UPI-QR-${activeQrParticipant.name}-${activeQrParticipant.amount}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success('QR Code downloaded! You can send it directly in WhatsApp.');
                  } catch {
                    window.open(qrUrl, '_blank');
                  }
                }}
              >
                <Download className="w-3.5 h-3.5" /> Save QR to Send in Chat
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => {
                    vibrate(10);
                    navigator.clipboard.writeText(payerUpiId);
                    toast.success('UPI ID copied!');
                  }}
                >
                  <Copy className="w-3 h-3" /> Copy UPI ID
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => {
                    vibrate(10);
                    const url = generatePayWebUrl({
                      pa: payerUpiId,
                      pn: payerName,
                      am: activeQrParticipant.amount,
                      tn: splitTitle,
                      cu: currency === '₹' ? 'INR' : currency,
                    });
                    navigator.clipboard.writeText(url);
                    toast.success('Web Pay link copied!');
                  }}
                >
                  <Share2 className="w-3 h-3" /> Copy Pay Link
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
