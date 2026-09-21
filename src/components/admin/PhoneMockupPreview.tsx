import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Flashlight, Camera, ExternalLink } from 'lucide-react';

interface PhoneMockupPreviewProps {
  title: string;
  body: string;
  url?: string;
}

export function PhoneMockupPreview({ title, body, url = '/' }: PhoneMockupPreviewProps) {
  const currentTime = format(new Date(), 'h:mm');
  const currentDate = format(new Date(), 'EEEE, MMMM d');

  return (
    <div className="flex flex-col items-center">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-full border border-border/40">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        Live Lock Screen Preview
      </div>

      {/* iPhone Outer Titanium Chassis */}
      <div className="relative w-[295px] h-[550px] bg-zinc-950 rounded-[52px] p-3.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.1)] border-[4px] border-zinc-800/90 overflow-hidden select-none">
        
        {/* Specular Edge Highlight */}
        <div className="absolute inset-0 rounded-[48px] pointer-events-none border border-white/15" />

        {/* Dynamic Island */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-40 flex items-center justify-between px-3 shadow-md border border-zinc-800/40">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-950/70 border border-blue-900/40" />
          </div>
        </div>

        {/* Wallpaper Background Screen */}
        <div className="relative w-full h-full rounded-[42px] overflow-hidden bg-gradient-to-br from-[#120826] via-[#1a0f3c] to-[#080414] flex flex-col justify-between p-4 text-white">
          
          {/* Ambient Lighting Spheres */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-52 h-52 rounded-full bg-purple-600/25 blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 right-0 w-44 h-44 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          
          {/* Subtle Screen Specular Sheen */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/30 pointer-events-none" />

          {/* Lock Screen Header & Clock */}
          <div className="pt-9 text-center relative z-10">
            <p className="text-[11px] font-medium text-white/75 tracking-wide">{currentDate}</p>
            <h2 className="text-[54px] font-light tracking-tight text-white/95 font-sans mt-0.5 leading-none">
              {currentTime}
            </h2>
          </div>

          {/* Push Notification Banner */}
          <div className="relative z-20 my-auto -mt-6">
            <motion.div
              layout
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 350 }}
              className="p-3.5 rounded-[22px] bg-black/55 backdrop-blur-2xl border border-white/20 shadow-[0_12px_32px_rgba(0,0,0,0.5)] space-y-2 transition-all"
            >
              {/* Notification Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4.5 h-4.5 rounded-md overflow-hidden bg-primary/20 flex items-center justify-center">
                    <img
                      src="/icon.png"
                      alt="App"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="text-[10.5px] font-bold tracking-wider text-white/90 uppercase">
                    Expense Tracker
                  </span>
                </div>
                <span className="text-[10px] text-white/60 font-medium">now</span>
              </div>

              {/* Notification Content */}
              <div className="space-y-1">
                <p className="text-[12.5px] font-bold text-white tracking-tight leading-snug">
                  {title.trim() || 'Notification Title'}
                </p>
                <p className="text-[11.5px] text-white/80 leading-relaxed font-normal line-clamp-3">
                  {body.trim() || 'Your notification message content will appear right here on the user\'s lock screen...'}
                </p>
              </div>

              {/* Destination Tag */}
              {url && url !== '/' && (
                <div className="pt-1 flex items-center gap-1 text-[10px] font-medium text-indigo-300">
                  <ExternalLink className="w-3 h-3" />
                  <span>Opens {url}</span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Bottom Quick Controls & Home Indicator */}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-full flex items-center justify-between px-3">
              <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-xl flex items-center justify-center text-white/90 border border-white/15 shadow-md active:scale-95 transition-transform">
                <Flashlight className="w-4 h-4" />
              </div>
              <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-xl flex items-center justify-center text-white/90 border border-white/15 shadow-md active:scale-95 transition-transform">
                <Camera className="w-4 h-4" />
              </div>
            </div>

            {/* iOS Home Indicator Bar */}
            <div className="w-32 h-1 bg-white/80 rounded-full shadow-xs" />
          </div>

        </div>
      </div>
    </div>
  );
}
