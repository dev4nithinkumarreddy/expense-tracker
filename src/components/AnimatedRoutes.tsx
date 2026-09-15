import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Suspense, lazy } from 'react';
import Dashboard from '../pages/Dashboard';
import { PageTransition } from './PageTransition';

// Lazy load the heavy pages to drastically reduce the initial bundle size
const Expenses = lazy(() => import('../pages/Expenses'));
const Planned = lazy(() => import('../pages/Planned'));
const Analytics = lazy(() => import('../pages/Analytics'));
const Settings = lazy(() => import('../pages/Settings'));

const LoadingFallback = () => (
  <div className="flex h-[50vh] items-center justify-center text-muted-foreground animate-pulse">
    Loading...
  </div>
);

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/expenses" element={<PageTransition><Suspense fallback={<LoadingFallback />}><Expenses /></Suspense></PageTransition>} />
        <Route path="/planned" element={<PageTransition><Suspense fallback={<LoadingFallback />}><Planned /></Suspense></PageTransition>} />
        <Route path="/analytics" element={<PageTransition><Suspense fallback={<LoadingFallback />}><Analytics /></Suspense></PageTransition>} />
        <Route path="/settings" element={<PageTransition><Suspense fallback={<LoadingFallback />}><Settings /></Suspense></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

