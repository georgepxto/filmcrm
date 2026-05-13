import { useState } from 'react';
import {
  LayoutDashboard, CalendarDays, Users, Film, DollarSign,
  Menu, X, Clapperboard,
} from 'lucide-react';
import {
  INITIAL_CLIENTS, INITIAL_PACKAGES, INITIAL_SESSIONS,
  INITIAL_VIDEOS, INITIAL_PAYMENTS,
} from './data';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import Clients from './components/Clients';
import PostControl from './components/PostControl';
import Payments from './components/Payments';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'calendar', label: 'Calendário', icon: CalendarDays },
  { key: 'clients', label: 'Clientes & Pacotes', icon: Users },
  { key: 'posts', label: 'Postagens', icon: Film },
  { key: 'payments', label: 'Pagamentos', icon: DollarSign },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [packages, setPackages] = useState(INITIAL_PACKAGES);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [videos, setVideos] = useState(INITIAL_VIDEOS);
  const [payments, setPayments] = useState(INITIAL_PAYMENTS);

  // When registering a payment, also update packages paid amount
  const handleSetPayments = (updater) => {
    setPayments(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Find newly added payments
      const newPayments = next.filter(np => !prev.find(op => op.id === np.id));
      if (newPayments.length > 0) {
        setPackages(pkgs =>
          pkgs.map(pkg => {
            const added = newPayments.filter(p => p.packageId === pkg.id).reduce((s, p) => s + p.amount, 0);
            return added > 0 ? { ...pkg, paid: pkg.paid + added } : pkg;
          })
        );
      }
      return next;
    });
  };

  const navigate = (key) => {
    setPage(key);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard clients={clients} packages={packages} sessions={sessions} payments={payments} videos={videos} onNavigate={navigate} />;
      case 'calendar':
        return <Calendar clients={clients} sessions={sessions} setSessions={setSessions} />;
      case 'clients':
        return <Clients clients={clients} setClients={setClients} packages={packages} setPackages={setPackages} />;
      case 'posts':
        return <PostControl clients={clients} videos={videos} setVideos={setVideos} packages={packages} />;
      case 'payments':
        return <Payments clients={clients} packages={packages} payments={payments} setPayments={handleSetPayments} />;
      default:
        return null;
    }
  };

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
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            <p>FilmmakerCRM v1.0</p>
            <p style={{ opacity: 0.6, marginTop: '0.15rem' }}>Dados em memória local</p>
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
