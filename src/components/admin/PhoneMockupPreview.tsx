import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Flashlight, Camera, ExternalLink, Lock, Wifi, Battery, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PhoneMockupPreviewProps {
  title: string;
  body: string;
  url?: string;
}

type WallpaperTheme = 'violet' | 'ocean' | 'ember' | 'titanium';
type PreviewMode = 'lockscreen' | 'dynamic_island';

const WALLPAPERS: Record<WallpaperTheme, { name: string; bg: string; orb1: string; orb2: string }> = {
  violet: {
    name: 'Midnight Violet',
    bg: 'from-[#120826] via-[#1a0f3c] to-[#080414]',
    orb1: 'bg-purple-600/30',
    orb2: 'bg-indigo-500/25',
  },
  ocean: {
    name: 'Deep Ocean',
    bg: 'from-[#03112a] via-[#071d49] to-[#020716]',
    orb1: 'bg-blue-500/30',
    orb2: 'bg-cyan-500/20',
  },
  ember: {
    name: 'Sunset Ember',
    bg: 'from-[#230919] via-[#3a1027] to-[#12040c]',
    orb1: 'bg-rose-500/30',
    orb2: 'bg-amber-500/25',
  },
  titanium: {
    name: 'Stealth Titanium',
    bg: 'from-[#18181b] via-[#121214] to-[#09090b]',
    orb1: 'bg-zinc-600/25',
    orb2: 'bg-zinc-500/15',
  },
};

export function PhoneMockupPreview({ title, body, url = '/' }: PhoneMockupPreviewProps) {
  const [activeTheme, setActiveTheme] = useState<WallpaperTheme>('violet');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('lockscreen');
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);

  const currentTime = format(new Date(), 'h:mm');
  const currentDate = format(new Date(), 'EEEE, MMMM d');
  const currentWallpaper = WALLPAPERS[activeTheme];

  const safeTitle = title.trim() || 'Daily Expense Reminder';
  const safeBody = body.trim() || "Don't forget to track your spending today. Stay on top of your monthly budget!";

  return (
    <div className="flex flex-col items-center select-none">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 mb-4 w-full justify-between max-w-[320px]">
        {/* Live Status Pill */}
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2 bg-secondary/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/50 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span>Live Preview</span>
        </div>

        {/* Preview Mode Switcher */}
        <div className="flex items-center bg-secondary/50 p-0.5 rounded-full border border-border/50 text-[11px]">
          <button
            type="button"
            onClick={() => setPreviewMode('lockscreen')}
            className={cn(
              "px-2.5 py-1 rounded-full font-medium transition-all",
              previewMode === 'lockscreen' 
                ? "bg-card text-foreground shadow-xs" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Lock Screen
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('dynamic_island')}
            className={cn(
              "px-2.5 py-1 rounded-full font-medium transition-all",
              previewMode === 'dynamic_island' 
                ? "bg-card text-foreground shadow-xs" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Dynamic Island
          </button>
        </div>
      </div>

      {/* iPhone 16 Pro Chassis with Exterior Hardware Buttons */}
      <div className="relative">
        {/* Left Side Buttons (Action Button + Volume Rockers) */}
        <div className="absolute -left-[7px] top-[105px] w-[3px] h-[22px] bg-zinc-700/80 rounded-l-[3px] shadow-sm" />
        <div className="absolute -left-[7px] top-[142px] w-[3px] h-[44px] bg-zinc-700/80 rounded-l-[3px] shadow-sm" />
        <div className="absolute -left-[7px] top-[198px] w-[3px] h-[44px] bg-zinc-700/80 rounded-l-[3px] shadow-sm" />

        {/* Right Side Button (Power / Lock) */}
        <div className="absolute -right-[7px] top-[148px] w-[3px] h-[64px] bg-zinc-700/80 rounded-r-[3px] shadow-sm" />

        {/* Outer Titanium Bezel */}
        <div className="relative w-[310px] h-[620px] bg-[#0c0c0e] rounded-[52px] p-[10px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.12)] border-[4.5px] border-[#2c2b30] overflow-hidden">
          
          {/* Specular Inner Metallic Rim */}
          <div className="absolute inset-0 rounded-[47px] pointer-events-none border border-white/10" />

          {/* Screen Display Area */}
          <div className={cn(
            "relative w-full h-full rounded-[42px] overflow-hidden bg-gradient-to-br flex flex-col justify-between p-4 text-white transition-colors duration-500",
            currentWallpaper.bg
          )}>
            
            {/* Ambient Lighting Spheres */}
            <div className={cn("absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-colors duration-500", currentWallpaper.orb1)} />
            <div className={cn("absolute bottom-20 right-0 w-52 h-52 rounded-full blur-3xl pointer-events-none transition-colors duration-500", currentWallpaper.orb2)} />
            
            {/* Glass Surface Specular Sheen */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-black/40 pointer-events-none" />

            {/* Top iOS Status Bar */}
            <div className="relative z-50 flex items-center justify-between px-3 pt-1 text-[11.5px] font-semibold text-white/90">
              {/* Status Bar Clock */}
              <span>{currentTime}</span>

              {/* Dynamic Island Pill */}
              <div className="w-[100px] h-[26px] bg-black rounded-full flex items-center justify-between px-2.5 shadow-md border border-zinc-800/60">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-blue-950/60" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-zinc-900 border border-zinc-800/80" />
                </div>
              </div>

              {/* Cellular, Wi-Fi, Battery Icons */}
              <div className="flex items-center gap-1.5 text-white/90">
                {/* 4-bar cellular icon */}
                <div className="flex items-end gap-[1.5px] h-2.5">
                  <span className="w-[2.5px] h-1 bg-white rounded-xs" />
                  <span className="w-[2.5px] h-1.5 bg-white rounded-xs" />
                  <span className="w-[2.5px] h-2 bg-white rounded-xs" />
                  <span className="w-[2.5px] h-2.5 bg-white rounded-xs" />
                </div>
                <Wifi className="w-3 h-3" />
                <div className="relative flex items-center">
                  <Battery className="w-4 h-4 text-white" />
                  <div className="absolute left-[2px] w-2 h-1.5 bg-white rounded-xs" />
                </div>
              </div>
            </div>

            {/* Dynamic Island Heads-Up Dropdown Banner (Mode 2) */}
            <AnimatePresence>
              {previewMode === 'dynamic_island' && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 380 }}
                  className="relative z-40 mt-1 w-full bg-black/85 backdrop-blur-2xl border border-white/20 rounded-[26px] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.6)] space-y-1.5"
                >
                  <div className="flex items-center gap-2.5">
                    {/* App Icon */}
                    <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-[8px] overflow-hidden shadow-sm bg-zinc-900 border border-white/15 shrink-0 flex items-center justify-center">
                      <img
                        src="/icon.png"
                        alt="App Icon"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider text-white/60 uppercase">Expense Tracker</span>
                        <span className="text-[9.5px] text-white/40">now</span>
                      </div>
                      <p className="text-[12px] font-bold text-white leading-tight truncate mt-0.5">{safeTitle}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/80 leading-snug line-clamp-2 px-0.5">{safeBody}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lock Screen Header: Padlock + Date + Giant Clock */}
            <div className="pt-3 text-center relative z-20">
              {/* Lock Icon */}
              <div className="flex justify-center mb-1">
                <Lock className="w-3.5 h-3.5 text-white/70 stroke-[2.2]" />
              </div>

              {/* Date */}
              <p className="text-[12px] font-medium text-white/85 tracking-tight font-sans">
                {currentDate}
              </p>

              {/* Clock (SF Pro Inspired, Big & Crisp with Zero Clipping) */}
              <h2 className="text-[64px] font-bold tracking-tighter text-white font-sans leading-none mt-0.5 drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
                {currentTime}
              </h2>
            </div>

            {/* Push Notification Banner (Lock Screen Mode) */}
            <div className="relative z-30 my-auto pt-2 pb-1">
              <AnimatePresence mode="wait">
                {previewMode === 'lockscreen' ? (
                  <motion.div
                    key="lockscreen-card"
                    layout
                    initial={{ scale: 0.92, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.92, opacity: 0, y: 16 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                    className="w-full rounded-[24px] bg-white/[0.15] backdrop-blur-2xl border border-white/[0.22] shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.25)] p-3.5 space-y-2"
                  >
                    {/* Top Row: App Icon + Name + Timestamp */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* App Icon Squircle */}
                        <div className="w-5 h-5 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] rounded-[5px] overflow-hidden shadow-xs bg-zinc-900 border border-white/20 shrink-0 flex items-center justify-center">
                          <img
                            src="/icon.png"
                            alt="Expense Tracker"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>

                        {/* App Label */}
                        <span className="text-[10.5px] font-bold tracking-wider text-white/80 uppercase">
                          Expense Tracker
                        </span>
                      </div>

                      <span className="text-[10px] text-white/50 font-medium">now</span>
                    </div>

                    {/* Notification Content Body */}
                    <div className="space-y-1 pt-0.5">
                      <p className="text-[13px] font-bold text-white tracking-tight leading-snug">
                        {safeTitle}
                      </p>
                      <p className="text-[11.5px] text-white/85 leading-relaxed font-normal line-clamp-3">
                        {safeBody}
                      </p>
                    </div>

                    {/* Destination Action Link Pill */}
                    {url && url !== '/' && (
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 border border-white/15 text-[10px] font-semibold text-white shadow-xs">
                          <ExternalLink className="w-3 h-3" />
                          <span>Tap to open {url}</span>
                        </span>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="dynamic-indicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-6"
                  >
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] text-white/70 border border-white/10">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>Banner active in Dynamic Island</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Quick Controls & Home Indicator */}
            <div className="relative z-20 flex flex-col items-center gap-3 pb-1">
              <div className="w-full flex items-center justify-between px-2">
                {/* Flashlight Button */}
                <button
                  type="button"
                  onClick={() => setIsFlashlightOn(!isFlashlightOn)}
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center border shadow-md active:scale-90 transition-all duration-200 backdrop-blur-xl",
                    isFlashlightOn 
                      ? "bg-white text-zinc-950 border-white shadow-[0_0_20px_rgba(255,255,255,0.6)]" 
                      : "bg-black/35 hover:bg-black/50 text-white/90 border-white/15"
                  )}
                  aria-label="Toggle Flashlight"
                >
                  <Flashlight className="w-4.5 h-4.5" />
                </button>

                {/* Camera Button */}
                <button
                  type="button"
                  className="w-11 h-11 rounded-full bg-black/35 hover:bg-black/50 active:scale-90 text-white/90 border border-white/15 shadow-md flex items-center justify-center backdrop-blur-xl transition-all duration-200"
                  aria-label="Open Camera"
                >
                  <Camera className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* iOS Home Indicator Bar */}
              <div className="w-32 h-1 bg-white/75 rounded-full shadow-xs mt-1" />
            </div>

          </div>
        </div>
      </div>

      {/* Wallpaper Theme Palette Switcher */}
      <div className="flex items-center gap-2 mt-3.5 bg-secondary/40 px-3 py-1.5 rounded-full border border-border/40 text-xs">
        <span className="text-muted-foreground text-[10.5px] font-medium mr-1">Wallpaper:</span>
        {(['violet', 'ocean', 'ember', 'titanium'] as WallpaperTheme[]).map((theme) => (
          <button
            key={theme}
            type="button"
            onClick={() => setActiveTheme(theme)}
            className={cn(
              "w-4.5 h-4.5 rounded-full transition-all flex items-center justify-center",
              theme === 'violet' && 'bg-purple-600',
              theme === 'ocean' && 'bg-blue-600',
              theme === 'ember' && 'bg-rose-600',
              theme === 'titanium' && 'bg-zinc-600',
              activeTheme === theme ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "opacity-70 hover:opacity-100"
            )}
            title={WALLPAPERS[theme].name}
            aria-label={WALLPAPERS[theme].name}
          />
        ))}
      </div>
    </div>
  );
}
