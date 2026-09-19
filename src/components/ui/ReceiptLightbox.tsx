import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { Button } from './button';
import { formatCurrency } from '../../lib/formatCurrency';
import { vibrate } from '../../lib/utils';
import { playTapSound } from '../../lib/sound';

interface ReceiptLightboxProps {
  imageUrl: string | null;
  title?: string;
  amount?: number;
  currency?: string;
  onClose: () => void;
}

export function ReceiptLightbox({
  imageUrl,
  title,
  amount,
  currency = '₹',
  onClose
}: ReceiptLightboxProps) {
  const isOpen = !!imageUrl;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              vibrate(10);
              playTapSound();
              onClose();
            }}
            className="fixed inset-0 bg-background/80 backdrop-blur-xl"
          />

          {/* Dialog Card */}
          <motion.div
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.6 }}
            onDragEnd={(_e, info: PanInfo) => {
              if (info.offset.y > 100 || info.velocity.y > 350) {
                vibrate(20);
                onClose();
              }
            }}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 28
            }}
            className="glass-card w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto my-2.5 shrink-0 cursor-grab" />

            {/* Header */}
            <div className="flex justify-between items-center px-4 pb-2 shrink-0">
              <div>
                <h3 className="text-sm font-bold truncate leading-tight">{title || 'Receipt Image'}</h3>
                {amount !== undefined && (
                  <p className="text-xs font-semibold text-primary display-number">
                    {formatCurrency(amount, currency)}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8"
                onClick={() => {
                  vibrate(10);
                  playTapSound();
                  onClose();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Image Preview Container */}
            <div className="p-3 overflow-y-auto flex-1 flex items-center justify-center bg-black/10 rounded-2xl m-3">
              <img
                src={imageUrl}
                alt={title || 'Receipt'}
                className="max-h-[55vh] w-auto max-w-full object-contain rounded-xl shadow-md select-none"
              />
            </div>

            {/* Footer action */}
            <div className="p-3 pt-0 flex justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 rounded-xl"
                onClick={() => window.open(imageUrl, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Full Image</span>
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
