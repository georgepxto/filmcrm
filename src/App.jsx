import { useState, useRef, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChevronRight, LogOut, ShieldCheck, Loader } from 'lucide-react';
import BrandLogo from './components/BrandLogo';
import {
  BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useSupabaseData } from './hooks/useSupabaseData';
import { useAdminData } from './hooks/useAdminData';
import { ToastProvider } from './components/Toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import Clients from './components/Clients';
import PostControl from './components/PostControl';
import Payments from './components/Payments';
import Packages from './components/Packages';
import Settings from './components/Settings';

import AdminGate from './components/admin/AdminGate';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUsers from './components/admin/AdminUsers';
import AdminUserDetail from './components/admin/AdminUserDetail';
import AdminSubscriptions from './components/admin/AdminSubscriptions';
import AdminPlans from './components/admin/AdminPlans';
import AdminPayments from './components/admin/AdminPayments';
import AdminMetrics from './components/admin/AdminMetrics';
import AdminAuditLog from './components/admin/AdminAuditLog';

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/calendar',  label: 'Calendário' },
    ],
  },
  {
    label: 'Clientes',
    items: [
      { path: '/clients',  label: 'Clientes & Pacotes' },
      { path: '/packages', label: 'Pacotes' },
    ],
  },
  {
    label: 'Produção',
    items: [
      { path: '/posts', label: 'Postagens' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { path: '/payments', label: 'Pagamentos' },
    ],
  },
];

function AdminDataWrapper() {
  const adminData = useAdminData();
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard users={adminData.users} subscriptions={adminData.subscriptions} subscriptionPayments={adminData.subscriptionPayments} plans={adminData.plans} />} />
        <Route path="users" element={<AdminUsers users={adminData.users} subscriptions={adminData.subscriptions} plans={adminData.plans} updateUserLocal={adminData.updateUserLocal} />} />
        <Route path="users/:id" element={<AdminUserDetail users={adminData.users} subscriptions={adminData.subscriptions} subscriptionPayments={adminData.subscriptionPayments} auditLog={adminData.auditLog} updateUserLocal={adminData.updateUserLocal} removeSubscription={adminData.removeSubscription} />} />
        <Route path="subscriptions" element={<AdminSubscriptions subscriptions={adminData.subscriptions} plans={adminData.plans} users={adminData.users} updateSubscriptionLocal={adminData.updateSubscriptionLocal} removeSubscription={adminData.removeSubscription} />} />
        <Route path="plans" element={<AdminPlans plans={adminData.plans} updatePlan={adminData.updatePlan} createPlan={adminData.createPlan} />} />
        <Route path="payments" element={<AdminPayments subscriptionPayments={adminData.subscriptionPayments} subscriptions={adminData.subscriptions} users={adminData.users} plans={adminData.plans} />} />
        <Route path="metrics" element={<AdminMetrics users={adminData.users} subscriptions={adminData.subscriptions} subscriptionPayments={adminData.subscriptionPayments} plans={adminData.plans} />} />
        <Route path="audit" element={<AdminAuditLog auditLog={adminData.auditLog} users={adminData.users} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}

function AppLayout() {
  const { user, loading: authLoading, signOut, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const data = useSupabaseData();
  const navRef = useRef(null);
  const [navInd, setNavInd] = useState({ top: 0, height: 0, visible: false });

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector('.nav-item.active');
    if (!active) { setNavInd(v => ({ ...v, visible: false })); return; }
    const navRect  = nav.getBoundingClientRect();
    const itemRect = active.getBoundingClientRect();
    setNavInd({
      top: itemRect.top - navRect.top + nav.scrollTop,
      height: itemRect.height,
      visible: true,
    });
  }, [location.pathname, user]);

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

  if (!user) return <Navigate to="/login" replace />;

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
      {!sidebarOpen && (
        <button className="mobile-toggle" onClick={() => setSidebarOpen(true)}>
          <ChevronRight size={20} />
        </button>
      )}

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="app-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <h1><BrandLogo /></h1>
            <p>Gestão Cinematográfica</p>
          </div>
          <nav className="sidebar-nav" ref={navRef}>
            <div className="nav-slider" style={{ top: navInd.top, height: navInd.height, opacity: navInd.visible ? 1 : 0 }} />
            {NAV_GROUPS.map(group => (
              <div key={group.label} className="nav-group">
                <span className="nav-group-label">{group.label}</span>
                {group.items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
            <div className="nav-group nav-group-sistema">
              <span className="nav-group-label">Sistema</span>
              <NavLink
                to="/settings"
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                Configurações
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="nav-item"
                  onClick={() => setSidebarOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', opacity: 0.75 }}
                >
                  <ShieldCheck size={12} style={{ color: 'var(--amber)' }} />
                  Painel Admin
                </NavLink>
              )}
            </div>
          </nav>

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

        <main className="main-content">
          <div key={location.pathname} className="page-transition">
            {pageContent()}
          </div>
        </main>
      </div>

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
      <Route path="/admin/*" element={
        <AdminGate>
          <AdminDataWrapper />
        </AdminGate>
      } />
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AuthGate />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
