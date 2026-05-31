import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useToast } from '../Toast';
import { adminActions } from '../../lib/adminActions';

const STATUS_LABEL = { active: 'Ativo', suspended: 'Suspenso', deleted: 'Excluído' };
const STATUS_COLOR = { active: 'var(--success)', suspended: 'var(--warning)', deleted: 'var(--danger)' };

const PAGE_SIZE = 50;

function exportCSV(users) {
  const header = ['Email', 'Nome', 'Role', 'Status', 'Cadastro', 'Último login'];
  const rows = users.map(u => [
    u.email,
    u.full_name || '',
    u.role,
    u.status,
    u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '',
    u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR') : '',
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'usuarios.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminUsers({ users, subscriptions, plans, updateUserLocal }) {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan]   = useState('');
  const [sortBy, setSortBy]           = useState('recent');
  const [page, setPage]               = useState(1);
  const [actionLoading, setActionLoading] = useState(null);

  const subsMap = useMemo(() => {
    const m = {};
    subscriptions.forEach(s => { if (!m[s.user_id] || s.created_at > m[s.user_id].created_at) m[s.user_id] = s; });
    return m;
  }, [subscriptions]);

  const filtered = useMemo(() => {
    let list = users.filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q) || u.id?.toLowerCase().includes(q);
      const matchStatus = !filterStatus || u.status === filterStatus;
      const matchPlan   = !filterPlan  || subsMap[u.id]?.plan?.slug === filterPlan;
      return matchSearch && matchStatus && matchPlan;
    });
    if (sortBy === 'recent') list = [...list].sort((a, b) => (b.created_at || '') > (a.created_at || '') ? 1 : -1);
    else if (sortBy === 'email') list = [...list].sort((a, b) => (a.email || '') > (b.email || '') ? 1 : -1);
    return list;
  }, [users, search, filterStatus, filterPlan, sortBy, subsMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSuspend = async (u) => {
    setActionLoading(u.id);
    try {
      if (u.status === 'suspended') {
        await adminActions.reactivateUser(u.id);
        updateUserLocal(u.id, { status: 'active', suspended_at: null, suspension_reason: null });
        success('Usuário reativado.');
      } else {
        const reason = window.prompt('Motivo da suspensão (opcional):') || '';
        await adminActions.suspendUser(u.id, reason);
        updateUserLocal(u.id, { status: 'suspended', suspended_at: new Date().toISOString(), suspension_reason: reason });
        success('Usuário suspenso.');
      }
    } catch (e) { error('Erro ao atualizar status do usuário.'); }
    setActionLoading(null);
  };

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '0.15rem' }}>Usuários</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{users.length} cadastrado{users.length !== 1 ? 's' : ''} no total</p>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => exportCSV(filtered)}>
          Exportar CSV
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="form-control"
            placeholder="Buscar por nome, email ou ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: '2rem', fontSize: '0.82rem' }}
          />
        </div>
        <select className="form-control" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ flex: '0 0 auto', fontSize: '0.82rem', minWidth: 130 }}>
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="suspended">Suspenso</option>
          <option value="deleted">Excluído</option>
        </select>
        <select className="form-control" value={filterPlan} onChange={e => { setFilterPlan(e.target.value); setPage(1); }} style={{ flex: '0 0 auto', fontSize: '0.82rem', minWidth: 120 }}>
          <option value="">Todos os planos</option>
          {plans.map(p => <option key={p.id} value={p.slug}>{p.name}</option>)}
        </select>
        <select className="form-control" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ flex: '0 0 auto', fontSize: '0.82rem', minWidth: 120 }}>
          <option value="recent">Mais recente</option>
          <option value="email">Email A–Z</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Usuário', 'Plano', 'Status', 'Cadastro', 'Último login', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : pageUsers.map((u, i) => {
                const sub = subsMap[u.id];
                return (
                  <tr key={u.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)', transition: 'background var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--amber-glow)', border: '1px solid var(--amber-glow-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--amber)', flexShrink: 0 }}>
                          {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                            {u.full_name || <span style={{ color: 'var(--text-muted)' }}>Sem nome</span>}
                          </p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {sub ? (
                        <div>
                          <span style={{ fontWeight: 500 }}>{sub.plan?.name || '—'}</span>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sub.billing_cycle === 'yearly' ? 'Anual' : 'Mensal'}</p>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>Free</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[u.status] || 'var(--text-muted)', flexShrink: 0 }} />
                        {STATUS_LABEL[u.status] || u.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR') : 'Nunca'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }} onClick={() => navigate(`/admin/users/${u.id}`)}>
                          Ver
                        </button>
                        <button
                          className={`btn ${u.status === 'suspended' ? 'btn-secondary' : 'btn-danger'}`}
                          style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
                          disabled={actionLoading === u.id}
                          onClick={() => handleSuspend(u)}
                        >
                          {actionLoading === u.id ? '…' : u.status === 'suspended' ? 'Reativar' : 'Suspender'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
              <span>{page} / {totalPages}</span>
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
