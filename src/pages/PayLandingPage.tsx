import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  Copy, 
  QrCode, 
  Download, 
  ArrowRight, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { generateUpiUrl, getUpiAppIntentUrl, type UpiAppTarget } from '../lib/upi';
import { GooglePayIcon, PhonePeIcon, PaytmIcon, UpiIcon } from '../components/split/UpiAppIcons';
import { formatCurrency } from '../lib/formatCurrency';
import { vibrate } from '../lib/utils';
import { toast } from 'sonner';

export default function PayLandingPage() {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Parse query parameters
  const params = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search) 
    : new URLSearchParams();

  const pa = params.get('pa') || ''; // Payee UPI ID
  const pn = params.get('pn') || 'Expense Payee'; // Payee Name
  const am = parseFloat(params.get('am') || '0'); // Amount
  const tn = params.get('tn') || 'Expense Split'; // Note
  const cu = params.get('cu') || 'INR';
  const currencySymbol = cu === 'INR' ? '₹' : cu;

  const upiUrl = pa 
    ? generateUpiUrl({
        pa,
        pn,
        am,
        tn,
        cu,
      })
    : '';

  const qrImageUrl = upiUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`
    : '';

  const handleCopyUpiId = () => {
    if (!pa) return;
    vibrate(15);
    navigator.clipboard.writeText(pa);
    setCopied(true);
    toast.success('UPI ID copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenApp = (app: UpiAppTarget) => {
    if (!pa) return;
    vibrate(20);

    const intentUrl = getUpiAppIntentUrl(
      { pa, pn, am, tn, cu },
      app
    );

    window.location.href = intentUrl;

    if (app !== 'generic') {
      const appName = app === 'gpay' ? 'Google Pay' : app === 'phonepe' ? 'PhonePe' : app === 'paytm' ? 'Paytm' : 'BHIM';
      setTimeout(() => {
        toast.info(`Launching ${appName}... If it didn't open, copy the UPI ID below to pay directly.`, {
          id: 'app-launch-info',
          duration: 4000,
        });
      }, 2000);
    }
  };

  const handleDownloadQr = async () => {
    if (!qrImageUrl) return;
    vibrate(15);
    setDownloading(true);
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `UPI-Payment-${pn.replace(/\s+/g, '-')}-${am}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('QR Code saved to gallery/downloads!');
    } catch {
      window.open(qrImageUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  if (!pa || am <= 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
        <Card className="max-w-md w-full p-6 text-center border-border/60 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Invalid Payment Link</h2>
          <p className="text-sm text-muted-foreground">
            This payment request is missing required details (UPI ID or valid amount). Please ask the sender to generate a fresh link.
          </p>
          <Button onClick={() => window.location.href = '/'} variant="outline">
            Go to Expense Tracker
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-background/95 text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm sm:max-w-md space-y-4"
      >
        {/* Brand Bar */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified NPCI UPI Request</span>
          </div>
        </div>

        {/* Main Payment Card */}
        <Card className="border-border/60 shadow-2xl bg-card/90 backdrop-blur-xl overflow-hidden rounded-3xl">
          {/* Card Top: Amount & Payee */}
          <div className="p-6 text-center border-b border-border/40 bg-muted/20 space-y-2">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Pay to {pn}
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              {formatCurrency(am, currencySymbol)}
            </h1>
            <div className="inline-block px-3 py-0.5 rounded-full bg-muted text-xs text-muted-foreground font-medium">
              {tn}
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="relative p-4 bg-white rounded-2xl shadow-md border border-border/20">
                <img
                  src={qrImageUrl}
                  alt={`QR Code to pay ${pn} ${am}`}
                  className="w-48 h-48 sm:w-52 sm:h-52 mx-auto object-contain"
                />
                <div className="absolute inset-x-0 bottom-1 text-center">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                    Scan with any UPI App
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors p-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloading ? 'Saving...' : 'Save QR image'}</span>
                </button>
              </div>
            </div>

            {/* Direct Pay Action Button */}
            <div className="space-y-3">
              <Button
                type="button"
                onClick={() => handleOpenApp('generic')}
                className="w-full h-12 text-base font-semibold gap-2.5 shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98] transition-all rounded-2xl"
              >
                <UpiIcon size={22} className="shrink-0 rounded shadow-xs" />
                <span>Pay via Any UPI App</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>

              {/* Quick App Intent Shortcuts with Authentic Logos */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenApp('gpay')}
                  className="p-3 rounded-2xl border border-border/70 hover:border-blue-500/50 bg-card hover:bg-blue-500/5 shadow-xs flex flex-col items-center gap-1.5 transition-all active:scale-95 group"
                >
                  <div className="p-1.5 rounded-xl bg-white shadow-xs border border-gray-100 dark:border-white/10 group-hover:scale-105 transition-transform flex items-center justify-center">
                    <GooglePayIcon size={28} />
                  </div>
                  <span className="text-xs font-semibold text-foreground/90">Google Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenApp('phonepe')}
                  className="p-3 rounded-2xl border border-border/70 hover:border-purple-500/50 bg-card hover:bg-purple-500/5 shadow-xs flex flex-col items-center gap-1.5 transition-all active:scale-95 group"
                >
                  <div className="p-1.5 rounded-xl bg-white shadow-xs border border-gray-100 dark:border-white/10 group-hover:scale-105 transition-transform flex items-center justify-center">
                    <PhonePeIcon size={28} />
                  </div>
                  <span className="text-xs font-semibold text-foreground/90">PhonePe</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenApp('paytm')}
                  className="p-3 rounded-2xl border border-border/70 hover:border-cyan-500/50 bg-card hover:bg-cyan-500/5 shadow-xs flex flex-col items-center gap-1.5 transition-all active:scale-95 group"
                >
                  <div className="p-1.5 rounded-xl bg-white shadow-xs border border-gray-100 dark:border-white/10 group-hover:scale-105 transition-transform flex items-center justify-center">
                    <PaytmIcon size={28} />
                  </div>
                  <span className="text-xs font-semibold text-foreground/90">Paytm</span>
                </button>
              </div>
            </div>

            {/* UPI ID Row with 1-Tap Copy */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  UPI ID (VPA)
                </p>
                <p className="font-mono font-semibold text-sm truncate select-all">
                  {pa}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyUpiId}
                className="shrink-0 gap-1.5 h-8 px-3 text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>

          {/* Footer Notice */}
          <div className="p-4 border-t border-border/30 bg-muted/10 text-center text-xs text-muted-foreground">
            <p>100% direct bank-to-bank transfer. No platform fees or middleman.</p>
          </div>
        </Card>

        {/* Back link */}
        <div className="text-center">
          <a
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <span>Track your own expenses with Expense Tracker</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </motion.div>
    </div>
  );
}
