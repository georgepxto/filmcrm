import { useState } from 'react';
import {
  LayoutDashboard, CalendarDays, Users, Film, DollarSign, Package,
  Menu, X, Clapperboard, LogOut, Loader,
} from 'lucide-react';
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

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'calendar', label: 'Calendário', icon: CalendarDays },
  { key: 'clients', label: 'Clientes & Pacotes', icon: Users },
  { key: 'packages', label: 'Pacotes', icon: Package },
  { key: 'posts', label: 'Postagens', icon: Film },
  { key: 'payments', label: 'Pagamentos', icon: DollarSign },
];

function AppContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const data = useSupabaseData();

  const navigate = (key) => {
    setPage(key);
    setSidebarOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="loading-screen">
        <Loader size={32} className="login-spinner" />
        <p>Carregando...</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    if (data.loading) {
      return (
        <div className="loading-screen" style={{ minHeight: '60vh' }}>
          <Loader size={28} className="login-spinner" />
          <p>Carregando dados...</p>
        </div>
      );
    }

    switch (page) {
      case 'dashboard':
        return <Dashboard clients={data.clients} packages={data.packages} sessions={data.sessions} payments={data.payments} videos={data.videos} onNavigate={navigate} />;
      case 'calendar':
        return <Calendar clients={data.clients} sessions={data.sessions} addSession={data.addSession} updateSession={data.updateSession} deleteSession={data.deleteSession} addClient={data.addClient} />;
      case 'clients':
        return <Clients clients={data.clients} packages={data.packages} references={data.references} addClient={data.addClient} updateClient={data.updateClient} deleteClient={data.deleteClient} addPackage={data.addPackage} updatePackage={data.updatePackage} addReference={data.addReference} updateReference={data.updateReference} deleteReference={data.deleteReference} />;
      case 'packages':
        return <Packages clients={data.clients} packages={data.packages} payments={data.payments} videos={data.videos} updatePackage={data.updatePackage} addPackage={data.addPackage} />;
      case 'posts':
        return <PostControl clients={data.clients} videos={data.videos} packages={data.packages} addVideo={data.addVideo} updateVideo={data.updateVideo} deleteVideo={data.deleteVideo} />;
      case 'payments':
        return <Payments clients={data.clients} packages={data.packages} payments={data.payments} addPayment={data.addPayment} deletePayment={data.deletePayment} />;
      default:
        return null;
    }
  };

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';

  return (
    <>
      {/* Mobile toggle */}
      <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className="app-layout">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <h1><Clapperboard size={22} style={{ display: 'inline', marginRight: 6, color: '#d4870a' }} />Film<span>CRM</span></h1>
            <p>Gestão Cinematográfica</p>
          </div>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                className={`nav-item ${page === item.key ? 'active' : ''}`}
                onClick={() => navigate(item.key)}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* User section */}
          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <div className="sidebar-user-avatar">
                {userName.charAt(0).toUpperCase()}
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
          {renderPage()}
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

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
