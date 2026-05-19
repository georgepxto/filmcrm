import { useState } from 'react';
import {
  LayoutDashboard, Users, AlertTriangle, DollarSign,
  CalendarDays, Clapperboard, TrendingUp, Bell, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

export default function Dashboard({ clients, packages, sessions, payments, videos, onNavigate }) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const activeClients = packages.filter(p => p.status === 'Ativo').length;

  const weekSessions = sessions.filter(s => s.date >= todayStr && s.date <= weekEndStr);

  const totalOwed = packages.reduce((sum, p) => sum + Math.max(0, p.value - p.paid), 0);



  const isActiveInMonth = (pkg, year, month) => {
    if (!pkg.start_date) return pkg.status === 'Ativo';
    const dur = pkg.duration_months || 1;
    const start = new Date(pkg.start_date + 'T12:00');
    const end = new Date(pkg.start_date + 'T12:00');
    end.setMonth(end.getMonth() + dur);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    return start <= monthEnd && end >= monthStart;
  };

  const activePkgsThisMonth = packages.filter(p => isActiveInMonth(p, today.getFullYear(), today.getMonth()));
  const monthlyExpected = activePkgsThisMonth.reduce((s, p) => {
    const dur = p.duration_months || 1;
    return s + (p.value / dur);
  }, 0);

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '—';

  // Revenue chart data — last 6 months
  const chartData = [];
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const total = payments
      .filter(p => p.date.startsWith(mKey))
      .reduce((s, p) => s + p.amount, 0);
    chartData.push({ month: monthNames[d.getMonth()], receita: total });
  }

  // Smart alerts
  const alerts = [];
  let lowPackagesCount = 0;
  packages.forEach(pkg => {
    if (pkg.status !== 'Ativo' || pkg.total_videos <= 0) return;
    const client = getClientName(pkg.client_id);
    const delivered = pkg.delivered || 0;
    const total = pkg.total_videos;
    const remaining = total - delivered;
    const percent = Math.floor((delivered / total) * 100);

    if (remaining === 0) {
      alerts.push({
        type: 'urgent',
        text: `O pacote de <strong>${client}</strong> foi 100% concluído! (Todos os ${total} vídeos entregues) — hora de renovar.`,
      });
      lowPackagesCount++;
    } else if (remaining <= 2 || percent >= 70) {
      alerts.push({
        type: remaining <= 1 ? 'urgent' : 'warning',
        text: `O pacote de <strong>${client}</strong> está <strong>${percent}% concluído</strong>. Resta${remaining !== 1 ? 'm' : ''} apenas ${remaining} vídeo${remaining !== 1 ? 's' : ''} de ${total}.`,
      });
      lowPackagesCount++;
    }
  });

  const pendingPayments = packages.filter(p => p.value > p.paid && p.status === 'Ativo');
  pendingPayments.forEach(pkg => {
    const client = getClientName(pkg.client_id);
    const owed = pkg.value - pkg.paid;
    alerts.push({
      type: 'info',
      text: `<strong>${client}</strong> possui saldo devedor de R$ ${owed.toLocaleString('pt-BR')}`,
    });
  });

  const monthPayments = payments
    .filter(p => p.date.startsWith(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`))
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2><LayoutDashboard size={24} /> Dashboard</h2>
        <p className="text-muted" style={{ fontSize: '0.82rem' }}>
          {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card" onClick={() => onNavigate('clients')} style={{ cursor: 'pointer' }}>
          <div className="icon-wrap"><Users size={20} /></div>
          <div className="info">
            <h4>Clientes Ativos</h4>
            <div className="value">{activeClients}</div>
          </div>
        </div>
        <div className="summary-card" onClick={() => onNavigate('calendar')} style={{ cursor: 'pointer' }}>
          <div className="icon-wrap"><CalendarDays size={20} /></div>
          <div className="info">
            <h4>Gravações esta Semana</h4>
            <div className="value">{weekSessions.length}</div>
          </div>
        </div>
        <div className="summary-card" onClick={() => onNavigate('payments')} style={{ cursor: 'pointer' }}>
          <div className="icon-wrap" style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--info)' }}>
            <DollarSign size={20} />
          </div>
          <div className="info">
            <h4>Previsto/Mês</h4>
            <div className="value" style={{ color: 'var(--info)' }}>
              R$ {monthlyExpected.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
        <div className="summary-card">
          <div className="icon-wrap" style={{ background: lowPackagesCount > 0 ? 'rgba(245,158,11,0.15)' : undefined, color: lowPackagesCount > 0 ? 'var(--warning)' : undefined }}>
            <AlertTriangle size={20} />
          </div>
          <div className="info">
            <h4>Pacotes Acabando</h4>
            <div className="value" style={{ color: lowPackagesCount > 0 ? 'var(--warning)' : undefined }}>
              {lowPackagesCount}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        {/* Left column */}
        <div>
          {/* Alerts */}
          <h3 className="section-title"><Bell size={18} /> Alertas Inteligentes</h3>
          {alerts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              Nenhum alerta no momento ✨
            </div>
          ) : (
            alerts.map((a, i) => (
              <div key={i} className={`alert-item ${a.type}`}>
                <div className="alert-icon">
                  {a.type === 'urgent' ? <AlertTriangle size={16} color="var(--danger)" /> :
                   a.type === 'warning' ? <AlertTriangle size={16} color="var(--warning)" /> :
                   <Bell size={16} color="var(--info)" />}
                </div>
                <div className="alert-text" dangerouslySetInnerHTML={{ __html: a.text }} />
              </div>
            ))
          )}

          {/* Upcoming sessions */}
          <h3 className="section-title mt-2"><Clapperboard size={18} /> Próximas Gravações (7 dias)</h3>
          {weekSessions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              Nenhuma gravação agendada
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Cliente</th>
                    <th>Serviço</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {weekSessions
                    .sort((a, b) => a.date.localeCompare(b.date) || (a.time_start || a.time || '').localeCompare(b.time_start || b.time || ''))
                    .map(s => (
                      <tr key={s.id}>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {new Date(s.date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </td>
                        <td>
                          {s.time_start || s.time || '—'}
                          {s.time_end && ` — ${s.time_end}`}
                        </td>
                        <td style={{ color: 'var(--text-primary)' }}>{getClientName(s.client_id)}</td>
                        <td>{s.service}</td>
                        <td>
                          <span className={`badge badge-${(s.status || '').toLowerCase()}`}>
                            {s.status === 'Confirmado' ? 'Confirmado' : s.status === 'Pendente' ? 'Pendente' : 'Concluído'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column — Chart */}
        <div>
          <h3 className="section-title"><TrendingUp size={18} /> Receita Mensal</h3>
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span className="text-muted" style={{ fontSize: '0.78rem' }}>Recebido este mês</span>
              <span className="text-amber" style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                R$ {monthPayments.toLocaleString('pt-BR')}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="month" stroke="#6b6155" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b6155" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Receita']}
                  contentStyle={{ background: '#161616', border: '1px solid #222', borderRadius: 10, fontSize: '0.82rem' }}
                  cursor={{ fill: 'rgba(212,135,10,0.08)' }}
                />
                <Bar dataKey="receita" fill="#d4870a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick financial summary */}
          <h3 className="section-title mt-2"><DollarSign size={18} /> Resumo Financeiro</h3>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <span className="text-muted" style={{ fontSize: '0.82rem' }}>Previsto/Mês (Contratos)</span>
              <span style={{ color: 'var(--info)', fontWeight: 600 }}>
                R$ {monthlyExpected.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
              <span className="text-muted" style={{ fontSize: '0.82rem' }}>Total Recebido (Geral)</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                R$ {payments.reduce((s, p) => s + p.amount, 0).toLocaleString('pt-BR')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span className="text-muted" style={{ fontSize: '0.82rem' }}>Saldo Devedor Total</span>
              <span style={{ color: totalOwed > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                R$ {totalOwed.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
