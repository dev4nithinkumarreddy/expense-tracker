import { motion } from 'framer-motion';

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.994 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.996 }}
      transition={{
        type: 'spring',
        bounce: 0,
        duration: 0.3,
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

