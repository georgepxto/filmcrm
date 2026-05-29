import { useState } from 'react';
import {
  LayoutDashboard, CalendarDays, Users, Film, DollarSign, Package,
  Menu, X, Clapperboard, LogOut, Loader, Settings as SettingsIcon
} from 'lucide-react';
import {
  BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useSupabaseData } from './hooks/useSupabaseData';
import { ToastProvider } from './components/Toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import Clients from './components/Clients';
import PostControl from './components/PostControl';
import Payments from './components/Payments';
import Packages from './components/Packages';
import Settings from './components/Settings';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/calendar', label: 'Calendário', icon: CalendarDays },
  { path: '/clients', label: 'Clientes & Pacotes', icon: Users },
  { path: '/packages', label: 'Pacotes', icon: Package },
  { path: '/posts', label: 'Postagens', icon: Film },
  { path: '/payments', label: 'Pagamentos', icon: DollarSign },
];

function AppLayout() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const data = useSupabaseData();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (authLoading) {
    return (
      <div className="loading-screen">
        <Loader size={32} className="login-spinner" />
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';

  const pageContent = () => {
    if (data.loading) {
      return (
        <div className="loading-screen" style={{ minHeight: '60vh' }}>
          <Loader size={28} className="login-spinner" />
          <p>Carregando dados...</p>
        </div>
      );
    }
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard clients={data.clients} packages={data.packages} sessions={data.sessions} payments={data.payments} videos={data.videos} onNavigate={(p) => navigate('/' + p)} />} />
        <Route path="/calendar" element={<Calendar clients={data.clients} sessions={data.sessions} addSession={data.addSession} updateSession={data.updateSession} deleteSession={data.deleteSession} addClient={data.addClient} />} />
        <Route path="/clients" element={<Clients clients={data.clients} packages={data.packages} references={data.references} addClient={data.addClient} updateClient={data.updateClient} deleteClient={data.deleteClient} addPackage={data.addPackage} updatePackage={data.updatePackage} addReference={data.addReference} updateReference={data.updateReference} deleteReference={data.deleteReference} />} />
        <Route path="/packages" element={<Packages clients={data.clients} packages={data.packages} payments={data.payments} videos={data.videos} updatePackage={data.updatePackage} addPackage={data.addPackage} />} />
        <Route path="/posts" element={<PostControl clients={data.clients} videos={data.videos} packages={data.packages} addVideo={data.addVideo} updateVideo={data.updateVideo} deleteVideo={data.deleteVideo} pipelineSettings={data.pipelineSettings} updatePipelineSettings={data.updatePipelineSettings} />} />
        <Route path="/payments" element={<Payments clients={data.clients} packages={data.packages} payments={data.payments} addPayment={data.addPayment} deletePayment={data.deletePayment} />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  };

  return (
    <>
      {/* Mobile toggle — only visible when sidebar is closed */}
      {!sidebarOpen && (
        <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>
          <Menu size={20} />
        </button>
      )}

      {/* Overlay to close sidebar by tapping outside */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="app-layout">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <h1><Clapperboard size={22} style={{ display: 'inline', marginRight: 6, color: '#d4870a' }} />Film<span>CRM</span></h1>
            <p>Gestão Cinematográfica</p>
          </div>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div style={{ padding: '0 1.25rem', marginBottom: '0.5rem' }}>
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <SettingsIcon size={18} />
              Configurações
            </NavLink>
          </div>

          {/* User section */}
          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <div className="sidebar-user-avatar" style={{ padding: 0, overflow: 'hidden' }}>
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="sidebar-user-name">{userName}</p>
                <p className="sidebar-user-email">{user.email}</p>
              </div>
            </div>
            <button className="sidebar-logout" onClick={handleSignOut} title="Sair">
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {pageContent()}
        </main>
      </div>

      {/* Mobile overlay for sidebar */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader size={32} className="login-spinner" />
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AuthGate />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
