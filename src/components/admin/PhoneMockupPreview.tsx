import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Flashlight, Camera } from 'lucide-react';

interface PhoneMockupPreviewProps {
  title: string;
  body: string;
  url?: string;
}

export function PhoneMockupPreview({ title, body }: PhoneMockupPreviewProps) {
  const currentTime = format(new Date(), 'h:mm');
  const currentDate = format(new Date(), 'EEEE, MMMM d');

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Live Lock Screen Preview
      </div>

      {/* iPhone Outer Frame */}
      <div className="relative w-[280px] h-[520px] bg-black rounded-[48px] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[5px] border-zinc-700/80 overflow-hidden select-none">
        
        {/* Dynamic Island Pill */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30 flex items-center justify-between px-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
          <div className="w-2.5 h-2.5 rounded-full bg-blue-950/60" />
        </div>

        {/* Wallpaper Background */}
        <div className="relative w-full h-full rounded-[38px] overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-950 flex flex-col justify-between p-4 text-white">
          
          {/* Ambient light glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

          {/* Top Lock Screen Header */}
          <div className="pt-8 text-center relative z-10">
            <p className="text-xs font-medium text-white/80">{currentDate}</p>
            <h2 className="text-5xl font-light tracking-tight text-white font-sans mt-0.5">
              {currentTime}
            </h2>
          </div>

          {/* Push Notification Banner */}
          <div className="relative z-20 -mt-8">
            <motion.div
              layout
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="p-3 rounded-2xl bg-black/45 backdrop-blur-xl border border-white/20 shadow-xl space-y-1.5"
            >
              {/* Notification Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <img
                    src="/icon.png"
                    alt="Expense Tracker"
                    className="w-4 h-4 rounded-md object-cover shadow-xs"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="text-[10px] font-bold tracking-wider text-white/80 uppercase">
                    Expense Tracker
                  </span>
                </div>
                <span className="text-[10px] text-white/60">now</span>
              </div>

              {/* Notification Content */}
              <div>
                <p className="text-xs font-semibold text-white leading-snug line-clamp-1">
                  {title.trim() || 'Notification Title'}
                </p>
                <p className="text-[11px] text-white/80 leading-snug mt-0.5 line-clamp-3">
                  {body.trim() || 'Your notification message content will appear right here on the user\'s lock screen...'}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Bottom Quick Controls & Home Indicator */}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-full flex items-center justify-between px-2">
              <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/80 border border-white/10 shadow-xs">
                <Flashlight className="w-4 h-4" />
              </div>
              <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/80 border border-white/10 shadow-xs">
                <Camera className="w-4 h-4" />
              </div>
            </div>

            {/* Home Indicator bar */}
            <div className="w-28 h-1 bg-white/70 rounded-full" />
          </div>

        </div>
      </div>
    </div>
  );
}
