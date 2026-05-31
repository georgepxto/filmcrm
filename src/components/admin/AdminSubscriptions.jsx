import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminActions } from '../../lib/adminActions';
import { useToast } from '../Toast';
import ConfirmModal from '../ConfirmModal';

const STATUS_LABEL = { active: 'Ativo', trial: 'Trial', past_due: 'Inadimplente', canceled: 'Cancelado', expired: 'Expirado' };
const STATUS_COLOR = { active: 'var(--success)', trial: 'var(--info)', past_due: 'var(--danger)', canceled: 'var(--text-muted)', expired: 'var(--text-muted)' };
const fmt = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export default function AdminSubscriptions({ subscriptions, plans, users, updateSubscriptionLocal, removeSubscription }) {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan,   setFilterPlan]   = useState('');
  const [cancelModal, setCancelModal]   = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const usersMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);

  const summary = useMemo(() => ({
    active:   subscriptions.filter(s => s.status === 'active').length,
    trial:    subscriptions.filter(s => s.status === 'trial').length,
    past_due: subscriptions.filter(s => s.status === 'past_due').length,
    canceled: subscriptions.filter(s => s.status === 'canceled').length,
  }), [subscriptions]);

  const filtered = useMemo(() => {
    return subscriptions.filter(s =>
      (!filterStatus || s.status === filterStatus) &&
      (!filterPlan   || s.plan?.slug === filterPlan)
    );
  }, [subscriptions, filterStatus, filterPlan]);

  const doCancel = async () => {
    if (!cancelModal) return;
    const reason = window.prompt('Motivo do cancelamento:') || '';
    setActionLoading(cancelModal.id);
    try {
      await adminActions.cancelSubscription(cancelModal.id, cancelModal.user_id, reason);
      removeSubscription(cancelModal.id);
      success('Assinatura cancelada.');
    } catch { error('Erro ao cancelar assinatura.'); }
    setActionLoading(null);
    setCancelModal(null);
  };

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: 1200 }}>
      <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>Assinaturas</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{subscriptions.length} no total</p>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Ativas',       value: summary.active,   color: 'var(--success)' },
          { label: 'Em trial',     value: summary.trial,    color: 'var(--info)' },
          { label: 'Inadimplentes',value: summary.past_due, color: 'var(--danger)' },
          { label: 'Canceladas',   value: summary.canceled, color: 'var(--text-muted)' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{c.label}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: c.color, lineHeight: 1 }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: '0.82rem', minWidth: 150 }}>
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="trial">Trial</option>
          <option value="past_due">Inadimplente</option>
          <option value="canceled">Cancelado</option>
          <option value="expired">Expirado</option>
        </select>
        <select className="form-control" value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={{ fontSize: '0.82rem', minWidth: 130 }}>
          <option value="">Todos os planos</option>
          {plans.map(p => <option key={p.id} value={p.slug}>{p.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Cliente', 'Plano', 'Status', 'Ciclo', 'Valor', 'Próx. cobrança', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma assinatura encontrada</td></tr>
              ) : filtered.map((s, i) => {
                const u = usersMap[s.user_id];
                const price = s.billing_cycle === 'yearly' ? (s.plan?.price_yearly || 0) : (s.plan?.price_monthly || 0);
                return (
                  <tr key={s.id}
                    style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {u ? (
                        <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => navigate(`/admin/users/${u.id}`)}>
                          <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.82rem' }}>{u.full_name || u.email}</p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</p>
                        </button>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{s.user_id.slice(0, 8)}…</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>{s.plan?.name || '—'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[s.status] || 'var(--text-muted)' }} />
                        {STATUS_LABEL[s.status] || s.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                      {s.billing_cycle === 'yearly' ? 'Anual' : 'Mensal'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>{fmt(price)}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {(s.status === 'active' || s.status === 'trial') && (
                        <button className="btn btn-danger" style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }} onClick={() => setCancelModal(s)} disabled={actionLoading === s.id}>
                          {actionLoading === s.id ? '…' : 'Cancelar'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {cancelModal && (
        <ConfirmModal
          title="Cancelar assinatura"
          message={`Cancelar a assinatura ${cancelModal.plan?.name} de ${usersMap[cancelModal.user_id]?.full_name || usersMap[cancelModal.user_id]?.email || 'este usuário'}?`}
          confirmLabel="Cancelar assinatura"
          danger
          onConfirm={doCancel}
          onCancel={() => setCancelModal(null)}
        />
      )}
    </div>
  );
}
