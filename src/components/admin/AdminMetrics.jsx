import { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fmt = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);
const PIE_COLORS = ['#d4870a', '#e8a833', '#a06808', '#60a5fa', '#34d399'];

const SL = ({ children }) => (
  <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
    {children}
  </p>
);

export default function AdminMetrics({ users, subscriptions, subscriptionPayments, plans }) {
  const { theme } = useTheme();
  const today = new Date();
  const textColor = theme === 'light' ? '#4a433b' : '#a09888';
  const gridColor = theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';

  // MRR over 6 months
  const mrrHistory = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      // Subs active in this month (approximation: created before month end)
      const activeThen = subscriptions.filter(s =>
        s.created_at?.slice(0, 7) <= key &&
        (s.status === 'active' || s.status === 'trial' || (s.canceled_at && s.canceled_at?.slice(0, 7) > key))
      );
      const mrr = activeThen.reduce((sum, s) => {
        const price = s.billing_cycle === 'yearly' ? (s.plan?.price_yearly || 0) / 12 : (s.plan?.price_monthly || 0);
        return sum + price;
      }, 0);
      months.push({ month: monthNames[d.getMonth()], mrr: Math.round(mrr) });
    }
    return months;
  }, [subscriptions, today]);

  // User growth over 6 months
  const userGrowth = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        month: monthNames[d.getMonth()],
        novos: users.filter(u => u.created_at?.slice(0, 7) === key).length,
        total: users.filter(u => u.created_at?.slice(0, 7) <= key).length,
      });
    }
    return months;
  }, [users, today]);

  // Plan distribution
  const planDist = useMemo(() => {
    const map = {};
    const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'trial');
    activeSubs.forEach(s => {
      const name = s.plan?.name || 'Free';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [subscriptions]);

  // Revenue over 6 months (paid subscription payments)
  const revenueHistory = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const revenue = subscriptionPayments
        .filter(p => p.status === 'paid' && p.paid_at?.slice(0, 7) === key)
        .reduce((s, p) => s + p.amount, 0);
      months.push({ month: monthNames[d.getMonth()], receita: Math.round(revenue) });
    }
    return months;
  }, [subscriptionPayments, today]);

  const activeSubs   = subscriptions.filter(s => s.status === 'active' || s.status === 'trial');
  const currentMRR   = activeSubs.reduce((sum, s) => sum + (s.billing_cycle === 'yearly' ? (s.plan?.price_yearly || 0) / 12 : (s.plan?.price_monthly || 0)), 0);
  const arr          = currentMRR * 12;
  const thisMonth    = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const canceledThisMonth = subscriptions.filter(s => s.canceled_at?.slice(0, 7) === thisMonth).length;
  const churnRate    = (activeSubs.length + canceledThisMonth) > 0 ? ((canceledThisMonth / (activeSubs.length + canceledThisMonth)) * 100).toFixed(1) : '0.0';

  const tooltipStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)' };

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: 1200 }}>
      <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>Métricas</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>Crescimento e desempenho financeiro</p>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'MRR atual',          value: fmt(currentMRR),      sub: 'Receita mensal recorrente' },
          { label: 'ARR projetado',       value: fmt(arr),             sub: 'Anualizado via MRR × 12' },
          { label: 'Assinantes ativos',   value: activeSubs.length,    sub: `${subscriptions.filter(s => s.status === 'trial').length} em trial` },
          { label: 'Churn — mês atual',   value: `${churnRate}%`,      sub: `${canceledThisMonth} cancelamentos` },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{c.label}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.55rem', color: 'var(--amber)', lineHeight: 1, marginBottom: '0.3rem' }}>{c.value}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* MRR over time */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <SL>MRR — Evolução 6 meses</SL>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={mrrHistory}>
              <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} width={55} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: gridColor }} formatter={v => [fmt(v), 'MRR']} />
              <Line type="monotone" dataKey="mrr" stroke="var(--amber)" strokeWidth={2} dot={{ fill: 'var(--amber)', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue collected */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <SL>Receita recebida — 6 meses</SL>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueHistory} barCategoryGap="35%">
              <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} width={55} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: gridColor }} formatter={v => [fmt(v), 'Receita']} />
              <Bar dataKey="receita" fill="var(--amber)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* User growth */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <SL>Crescimento de usuários — 6 meses</SL>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={userGrowth} barCategoryGap="35%">
              <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: gridColor }} formatter={(v, n) => [v, n === 'novos' ? 'Novos' : 'Total']} />
              <Bar dataKey="novos" fill="var(--amber-light)" radius={[3, 3, 0, 0]} name="novos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plan distribution pie */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <SL>Distribuição de planos</SL>
          {planDist.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sem assinantes ativos</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={planDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                  {planDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n]} />
                <Legend wrapperStyle={{ fontSize: 11, color: textColor }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
