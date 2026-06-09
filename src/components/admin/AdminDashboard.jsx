import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const SL = ({ children }) => (
  <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
    {children}
  </p>
);

const fmt = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);

export default function AdminDashboard({ users, subscriptions, subscriptionPayments, plans }) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = (() => { const d = new Date(today); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();

  const activeUsers     = users.filter(u => u.status === 'active').length;
  const newThisMonth    = users.filter(u => u.created_at?.startsWith(thisMonth)).length;
  const newLastMonth    = users.filter(u => u.created_at?.startsWith(lastMonth)).length;
  const userDelta       = newLastMonth > 0 ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) : null;

  const activeSubs      = subscriptions.filter(s => s.status === 'active' || s.status === 'trial');
  const mrr             = activeSubs.reduce((sum, s) => sum + (s.billing_cycle === 'yearly' ? (s.plan?.price_yearly || 0) / 12 : (s.plan?.price_monthly || 0)), 0);
  const canceledMonth   = subscriptions.filter(s => s.canceled_at?.startsWith(thisMonth)).length;
  const churn           = activeSubs.length > 0 ? ((canceledMonth / (activeSubs.length + canceledMonth)) * 100).toFixed(1) : '0.0';

  const planDist = useMemo(() => {
    const map = {};
    activeSubs.forEach(s => {
      const slug = s.plan?.slug || 'free';
      map[slug] = (map[slug] || 0) + 1;
    });
    return plans.map(p => ({ name: p.name, count: map[p.slug] || 0 }));
  }, [activeSubs, plans]);

  const userGrowth = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        month: monthNames[d.getMonth()],
        novos: users.filter(u => u.created_at?.startsWith(key)).length,
      });
    }
    return months;
  }, [users]);

  const recentUsers     = [...users].slice(0, 5);
  const recentPayments  = [...subscriptionPayments].slice(0, 5);

  const barColor = theme === 'light' ? '#d4870a' : '#e8a833';
  const gridColor = theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
  const textColor = theme === 'light' ? '#4a433b' : '#a09888';

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: 1200 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>
          Painel Administrativo
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Visão geral do sistema — {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Hero MRR */}
      <div className="summary-card" style={{ marginBottom: '1.5rem', padding: '1.75rem 2rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--amber)', marginBottom: '0.4rem' }}>
          MRR — Receita Mensal Recorrente
        </p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', color: 'var(--amber)', lineHeight: 1, marginBottom: '0.5rem' }}>
          {fmt(mrr)}
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {activeSubs.length} assinante{activeSubs.length !== 1 ? 's' : ''} ativos · ARR projetado: {fmt(mrr * 12)}
        </p>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          {
            label: 'Usuários totais',
            value: activeUsers,
            sub: newThisMonth > 0 ? `+${newThisMonth} este mês${userDelta !== null ? ` (${userDelta > 0 ? '+' : ''}${userDelta}% vs mês ant.)` : ''}` : 'Nenhum novo este mês',
          },
          {
            label: 'Assinantes ativos',
            value: activeSubs.length,
            sub: `${subscriptions.filter(s => s.status === 'trial').length} em trial`,
          },
          {
            label: 'Churn no mês',
            value: `${churn}%`,
            sub: `${canceledMonth} cancelamento${canceledMonth !== 1 ? 's' : ''} em ${monthNames[today.getMonth()]}`,
          },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{c.label}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', lineHeight: 1, marginBottom: '0.35rem' }}>{c.value}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* User Growth Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <SL>Novos usuários — 6 meses</SL>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={userGrowth} barCategoryGap="35%">
              <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)' }}
                cursor={{ fill: gridColor }}
                formatter={(v) => [v, 'Novos usuários']}
              />
              <Bar dataKey="novos" fill={barColor} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plan distribution */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <SL>Distribuição de planos</SL>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            {planDist.map(p => {
              const pct = activeSubs.length > 0 ? Math.round((p.count / activeSubs.length) * 100) : 0;
              return (
                <div key={p.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.count} ({pct}%)</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {activeSubs.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                Sem assinantes ativos ainda
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Recent Users */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <SL>Últimos usuários cadastrados</SL>
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }} onClick={() => navigate('/admin/users')}>
              Ver todos
            </button>
          </div>
          {recentUsers.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>Nenhum usuário</p>
          ) : (
            <div>
              {recentUsers.map((u, i) => (
                <div
                  key={u.id}
                  onClick={() => navigate(`/admin/users/${u.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.65rem 0',
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--amber-glow)', border: '1px solid var(--amber-glow-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--amber)', flexShrink: 0 }}>
                    {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || u.email}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <SL>Últimos pagamentos</SL>
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }} onClick={() => navigate('/admin/payments')}>
              Ver todos
            </button>
          </div>
          {recentPayments.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>Nenhum pagamento ainda</p>
          ) : (
            <div>
              {recentPayments.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <p style={{ fontSize: '0.82rem', fontWeight: 500 }}>{fmt(p.amount)}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={`badge badge-${p.status === 'paid' ? 'active' : p.status === 'failed' ? 'danger' : 'pending'}`}>
                    {p.status === 'paid' ? 'Pago' : p.status === 'failed' ? 'Falhou' : p.status === 'refunded' ? 'Reembolso' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
