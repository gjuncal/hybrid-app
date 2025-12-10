import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppProvider, useAuth } from './contexts/AppContext';
import { Layout } from './components/Layout';
import { PublicLandingPage } from './components/PublicLandingPage';
import { Portal } from './components/Portal';
import Login from './components/Login';
import { Dashboard } from './components/Dashboard';
import Activities from './components/Activities';
import ParticipantsList from './components/ParticipantsList';
import ParticipantOverview from './components/ParticipantOverview';
import { Ranking as RankingPage } from './components/Ranking';
import { AttendanceManager } from './components/AttendanceManager';
import { ParticipantRegistration } from './components/ParticipantRegistration';
import { QRAttendance } from './components/QRAttendance';
import GroupsManager from './components/GroupsManager';

const PortalProtectedRoute = () => {
    const { isAuthenticated, user, isLoading } = useAuth();
    if (isLoading) return <div className="flex justify-center items-center h-screen">Carregando...</div>;
    if (!isAuthenticated || !['administrador', 'coordenador', 'cadastrador'].includes(user?.role)) {
        return <Navigate to="/login" replace />;
    }
    return <Outlet />;
};

const PresenceProtectedRoute = () => {
    const { isAuthenticated, user, isLoading } = useAuth();
    if (isLoading) return <div className="flex justify-center items-center h-screen">Carregando...</div>;
    if (!isAuthenticated || (user?.role !== 'administrador' && user?.role !== 'coordenador')) {
        return <Navigate to="/portal" replace />;
    }
    return <Outlet />;
};

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Public routes - no Layout wrapper */}
          <Route path="/" element={<PublicLandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/qr-attendance" element={<QRAttendance />} />
          
          {/* Portal protected */}
          <Route element={<PortalProtectedRoute />}>
            <Route path="/portal" element={<Portal />} />
          </Route>
          
          {/* Presence protected routes */}
          <Route element={<PresenceProtectedRoute />}>
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/register-attendance" element={<Layout><AttendanceManager /></Layout>} />
            <Route path="/register-participant" element={<Layout><ParticipantRegistration /></Layout>} />
            <Route path="/activities" element={<Layout><Activities /></Layout>} />
            <Route path="/groups" element={<Layout><GroupsManager /></Layout>} />
            <Route path="/participants" element={<Layout><ParticipantsList /></Layout>} />
            <Route path="/participants/:id" element={<Layout><ParticipantOverview /></Layout>} />
            <Route path="/ranking" element={<Layout><RankingPage /></Layout>} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;