import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, LogOut, ArrowLeft } from 'lucide-react';
import BrandLogo from '../BrandLogo';
import { useAuth } from '../../contexts/AuthContext';

const ADMIN_NAV = [
  {
    label: 'Visão Geral',
    items: [{ path: '/admin', label: 'Dashboard', end: true }],
  },
  {
    label: 'Usuários',
    items: [
      { path: '/admin/users',   label: 'Todos os usuários' },
      { path: '/admin/audit',   label: 'Auditoria' },
    ],
  },
  {
    label: 'Monetização',
    items: [
      { path: '/admin/subscriptions', label: 'Assinaturas' },
      { path: '/admin/payments',      label: 'Pagamentos' },
      { path: '/admin/plans',         label: 'Planos' },
    ],
  },
  {
    label: 'Métricas',
    items: [{ path: '/admin/metrics', label: 'Crescimento' }],
  },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
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
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';

  return (
    <>
      {!sidebarOpen && (
        <button className="mobile-toggle" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      )}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="app-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BrandLogo />
              <span className="admin-badge">ADMIN</span>
            </h1>
            <p>Painel Administrativo</p>
          </div>

          <nav className="sidebar-nav" ref={navRef}>
            <div className="nav-slider" style={{ top: navInd.top, height: navInd.height, opacity: navInd.visible ? 1 : 0 }} />
            {ADMIN_NAV.map(group => (
              <div key={group.label} className="nav-group">
                <span className="nav-group-label">{group.label}</span>
                {group.items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
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
                to="/dashboard"
                className="nav-item"
                onClick={() => setSidebarOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ArrowLeft size={13} aria-hidden="true" style={{ opacity: 0.6 }} />
                Voltar ao app
              </NavLink>
            </div>
          </nav>

          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <div className="sidebar-user-avatar" style={{ padding: 0, overflow: 'hidden' }}>
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="sidebar-user-name">{userName}</p>
                <p className="sidebar-user-email">{user?.email}</p>
              </div>
            </div>
            <button className="sidebar-logout" onClick={handleSignOut} aria-label="Sair">
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </aside>

        <main className="main-content">
          <div key={location.pathname} className="page-transition">
            <Outlet />
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
