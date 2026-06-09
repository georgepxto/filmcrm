import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminActions } from '../../lib/adminActions';
import { useToast } from '../Toast';

const STATUS_LABEL = { paid: 'Pago', pending: 'Pendente', failed: 'Falhou', refunded: 'Reembolso' };
const STATUS_COLOR = { paid: 'var(--success)', pending: 'var(--warning)', failed: 'var(--danger)', refunded: 'var(--info)' };
const fmt = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function AdminPayments({ subscriptionPayments, subscriptions, users, plans }) {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const today = new Date();
  const [viewMonth, setViewMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [filterStatus, setFilterStatus] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({ subscription_id: '', amount: '', currency: 'BRL' });
  const [saving, setSaving] = useState(false);

  const usersMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);
  const subsMap  = useMemo(() => Object.fromEntries(subscriptions.map(s => [s.id, s])), [subscriptions]);

  const monthKey = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}`;

  const monthPayments = useMemo(() =>
    subscriptionPayments.filter(p => p.created_at?.startsWith(monthKey)),
    [subscriptionPayments, monthKey]
  );

  const filtered = useMemo(() =>
    monthPayments.filter(p => !filterStatus || p.status === filterStatus),
    [monthPayments, filterStatus]
  );

  const totalPaid    = monthPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = monthPayments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalFailed  = monthPayments.filter(p => p.status === 'failed').reduce((s, p) => s + p.amount, 0);

  const prevMonth = () => setViewMonth(m => {
    if (m.month === 0) return { year: m.year - 1, month: 11 };
    return { ...m, month: m.month - 1 };
  });
  const nextMonth = () => setViewMonth(m => {
    if (m.month === 11) return { year: m.year + 1, month: 0 };
    return { ...m, month: m.month + 1 };
  });

  const doCreateManual = async () => {
    if (!manualForm.subscription_id || !manualForm.amount) { error('Preencha todos os campos.'); return; }
    const sub = subsMap[manualForm.subscription_id];
    if (!sub) { error('Assinatura não encontrada.'); return; }
    setSaving(true);
    try {
      await adminActions.createManualPayment(manualForm.subscription_id, sub.user_id, Number(manualForm.amount), manualForm.currency);
      success('Pagamento manual registrado.');
      setShowManualModal(false);
      setManualForm({ subscription_id: '', amount: '', currency: 'BRL' });
    } catch { error('Erro ao registrar pagamento.'); }
    setSaving(false);
  };

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '0.15rem' }}>Pagamentos</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.65rem', fontSize: '0.8rem' }} onClick={prevMonth}>←</button>
            <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{monthNames[viewMonth.month]} {viewMonth.year}</span>
            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.65rem', fontSize: '0.8rem' }} onClick={nextMonth}>→</button>
          </div>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: '0.82rem' }} onClick={() => setShowManualModal(true)}>
          + Registrar manual
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Recebido', value: totalPaid,    color: 'var(--success)' },
          { label: 'Pendente', value: totalPending,  color: 'var(--warning)' },
          { label: 'Falhou',   value: totalFailed,   color: 'var(--danger)' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{c.label}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: c.color, lineHeight: 1 }}>{fmt(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '1rem' }}>
        <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: '0.82rem', minWidth: 150, display: 'inline-block', width: 'auto' }}>
          <option value="">Todos os status</option>
          <option value="paid">Pago</option>
          <option value="pending">Pendente</option>
          <option value="failed">Falhou</option>
          <option value="refunded">Reembolso</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Data', 'Usuário', 'Plano', 'Valor', 'Moeda', 'Status'].map(h => (
                  <th key={h} style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum pagamento em {monthNames[viewMonth.month]} {viewMonth.year}</td></tr>
              ) : filtered.map((p, i) => {
                const sub = subsMap[p.subscription_id];
                const u   = usersMap[p.user_id];
                return (
                  <tr key={p.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString('pt-BR') : new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {u ? (
                        <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => navigate(`/admin/users/${u.id}`)}>
                          <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.82rem' }}>{u.full_name || u.email}</p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</p>
                        </button>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{p.user_id?.slice(0, 8)}…</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>{sub?.plan?.name || '—'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>{fmt(p.amount)}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{p.currency || 'BRL'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[p.status] || 'var(--text-muted)' }} />
                        {STATUS_LABEL[p.status] || p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual payment modal */}
      {showManualModal && (
        <div className="modal-overlay" onClick={() => setShowManualModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '1.25rem' }}>Registrar pagamento manual</h3>
            <div className="form-group">
              <label>Assinatura</label>
              <select className="form-control" value={manualForm.subscription_id} onChange={e => setManualForm(f => ({ ...f, subscription_id: e.target.value }))}>
                <option value="">Selecionar…</option>
                {subscriptions.filter(s => s.status === 'active' || s.status === 'trial').map(s => {
                  const u = usersMap[s.user_id];
                  return <option key={s.id} value={s.id}>{u?.email || s.user_id.slice(0, 8)} — {s.plan?.name}</option>;
                })}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
              <div className="form-group">
                <label>Valor</label>
                <input className="form-control" type="number" min="0" step="0.01" value={manualForm.amount} onChange={e => setManualForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Moeda</label>
                <select className="form-control" value={manualForm.currency} onChange={e => setManualForm(f => ({ ...f, currency: e.target.value }))}>
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button className="btn btn-primary" onClick={doCreateManual} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Registrando…' : 'Registrar'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowManualModal(false)} style={{ flex: 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
