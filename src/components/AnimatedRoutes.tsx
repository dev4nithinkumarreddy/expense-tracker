import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Suspense, lazy } from 'react';
import Dashboard from '../pages/Dashboard';
import { PageTransition } from './PageTransition';

import {
  ExpensesSkeleton,
  PlannedSkeleton,
  AnalyticsSkeleton,
  SettingsSkeleton,
} from './ui/RouteSkeletons';

// Lazy load the heavy pages to drastically reduce the initial bundle size
const Expenses = lazy(() => import('../pages/Expenses'));
const Planned = lazy(() => import('../pages/Planned'));
const Analytics = lazy(() => import('../pages/Analytics'));
const Settings = lazy(() => import('../pages/Settings'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
import { AdminRouteGuard } from './admin/AdminRouteGuard';

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/expenses" element={<PageTransition><Suspense fallback={<ExpensesSkeleton />}><Expenses /></Suspense></PageTransition>} />
        <Route path="/planned" element={<PageTransition><Suspense fallback={<PlannedSkeleton />}><Planned /></Suspense></PageTransition>} />
        <Route path="/analytics" element={<PageTransition><Suspense fallback={<AnalyticsSkeleton />}><Analytics /></Suspense></PageTransition>} />
        <Route path="/settings" element={<PageTransition><Suspense fallback={<SettingsSkeleton />}><Settings /></Suspense></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminRouteGuard><Suspense fallback={<SettingsSkeleton />}><AdminDashboard /></Suspense></AdminRouteGuard></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

