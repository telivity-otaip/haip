import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { useRealtimeInvalidation } from './hooks/useRealtimeInvalidation';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const FrontDesk = lazy(() => import('./pages/FrontDesk'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Guests = lazy(() => import('./pages/Guests'));
const Rooms = lazy(() => import('./pages/Rooms'));
const Housekeeping = lazy(() => import('./pages/Housekeeping'));
const Folios = lazy(() => import('./pages/Folios'));
const RatePlans = lazy(() => import('./pages/RatePlans'));
const NightAudit = lazy(() => import('./pages/NightAudit'));
const Reports = lazy(() => import('./pages/Reports'));
const Channels = lazy(() => import('./pages/Channels'));
const Settings = lazy(() => import('./pages/Settings'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-telivity-teal border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  useRealtimeInvalidation();

  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/front-desk" element={<FrontDesk />} />
          <Route path="/reservations/*" element={<Reservations />} />
          <Route path="/guests/*" element={<Guests />} />
          <Route path="/rooms/*" element={<Rooms />} />
          <Route path="/housekeeping/*" element={<Housekeeping />} />
          <Route path="/folios/*" element={<Folios />} />
          <Route path="/rate-plans/*" element={<RatePlans />} />
          <Route path="/night-audit" element={<NightAudit />} />
          <Route path="/reports/*" element={<Reports />} />
          <Route path="/channels/*" element={<Channels />} />
          <Route path="/settings/*" element={<Settings />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}
