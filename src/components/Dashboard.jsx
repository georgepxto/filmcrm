import { AlertTriangle, Bell } from 'lucide-react';
import {
  BarChart, Bar, Cell, XAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: '0.6rem',
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '0.75rem',
    opacity: 0.8,
  }}>
    {children}
  </p>
);

export default function Dashboard({ clients, packages, sessions, payments, videos, onNavigate }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const cSym = user?.user_metadata?.currency === 'USD' ? '$' : user?.user_metadata?.currency === 'EUR' ? '€' : 'R$';
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const getGreeting = () => {
    const h = today.getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'cineasta';
  const firstName = userName.split(' ')[0];

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

  const activePkgsThisMonth = packages.filter(p =>
    isActiveInMonth(p, today.getFullYear(), today.getMonth())
  );
  const monthlyExpected = activePkgsThisMonth.reduce((s, p) => {
    const dur = p.duration_months || 1;
    return s + (p.value / dur);
  }, 0);

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '—';

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const total = payments
      .filter(p => p.date.startsWith(mKey))
      .reduce((s, p) => s + p.amount, 0);
    chartData.push({ month: monthNames[d.getMonth()], receita: total });
  }

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
        text: `O pacote de <strong>${client}</strong> foi 100% concluído — hora de renovar.`,
      });
      lowPackagesCount++;
    } else if (remaining <= 2 || percent >= 70) {
      alerts.push({
        type: remaining <= 1 ? 'urgent' : 'warning',
        text: `O pacote de <strong>${client}</strong> está <strong>${percent}% concluído</strong>. Resta${remaining !== 1 ? 'm' : ''} ${remaining} vídeo${remaining !== 1 ? 's' : ''}.`,
      });
      lowPackagesCount++;
    }
  });

  packages.filter(p => p.value > p.paid && p.status === 'Ativo').forEach(pkg => {
    const client = getClientName(pkg.client_id);
    const owed = pkg.value - pkg.paid;
    alerts.push({
      type: 'info',
      text: `<strong>${client}</strong> possui saldo devedor de ${cSym} ${owed.toLocaleString('pt-BR')}`,
    });
  });

  const monthPayments = payments
    .filter(p => p.date.startsWith(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    ))
    .reduce((s, p) => s + p.amount, 0);

  const dimBar = theme === 'light' ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.07)';
  const tooltipTextColor = theme === 'light' ? '#1c1916' : '#f0ece4';
  const tooltipLabelColor = theme === 'light' ? '#8a7e72' : '#a09888';

  const card = (style = {}) => ({
    border: '0.5px solid var(--border)',
    borderRadius: 8,
    background: 'var(--bg-card)',
    ...style,
  });

  const financialRows = [
    {
      label: 'Previsto / mês',
      value: `${cSym} ${monthlyExpected.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
      color: 'var(--text-primary)',
    },
    {
      label: 'Total recebido',
      value: `${cSym} ${payments.reduce((s, p) => s + p.amount, 0).toLocaleString('pt-BR')}`,
      color: payments.reduce((s, p) => s + p.amount, 0) > 0 ? 'var(--success)' : 'var(--text-muted)',
    },
    {
      label: 'Saldo devedor',
      value: `${cSym} ${totalOwed.toLocaleString('pt-BR')}`,
      color: totalOwed > 0 ? 'var(--danger)' : 'var(--text-muted)',
    },
  ];

  return (
    <div className="fade-in">

      {/* ── Greeting ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
          fontWeight: 400,
          letterSpacing: '-0.02em',
          marginBottom: '0.3rem',
          color: 'var(--text-primary)',
          lineHeight: 1.2,
        }}>
          {getGreeting()}, <em style={{ color: 'var(--amber)' }}>{firstName}</em>.
        </h2>
        <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
          {today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── Featured card — Previsto/Mês ── */}
      <div
        style={{ ...card({ padding: '1.75rem 2rem', marginBottom: '0.75rem', cursor: 'pointer' }) }}
        onClick={() => onNavigate('payments')}
      >
        <p style={{
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem', opacity: 0.8,
        }}>
          Previsto este mês
        </p>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.6rem, 5vw, 3.5rem)',
          fontWeight: 400,
          color: 'var(--amber)',
          lineHeight: 1,
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em',
        }}>
          {cSym} {monthlyExpected.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {activePkgsThisMonth.length} pacote{activePkgsThisMonth.length !== 1 ? 's' : ''} ativo{activePkgsThisMonth.length !== 1 ? 's' : ''} neste período
        </p>
      </div>

      {/* ── Secondary cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.5rem',
        marginBottom: '2.5rem',
      }}>
        {[
          {
            label: 'Clientes ativos',
            value: activeClients,
            color: 'var(--text-primary)',
            nav: 'clients',
          },
          {
            label: 'Gravações esta semana',
            value: weekSessions.length,
            color: 'var(--text-primary)',
            nav: 'calendar',
          },
          {
            label: 'Pacotes críticos',
            value: lowPackagesCount,
            color: lowPackagesCount > 0 ? 'var(--warning)' : 'var(--text-muted)',
            nav: null,
          },
        ].map((m) => (
          <div
            key={m.label}
            style={{ ...card({ padding: '1rem 1.25rem', cursor: m.nav ? 'pointer' : 'default' }) }}
            onClick={m.nav ? () => onNavigate(m.nav) : undefined}
          >
            <span style={{
              display: 'block', fontSize: '0.65rem', fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--text-muted)', marginBottom: '0.5rem', opacity: 0.8,
            }}>
              {m.label}
            </span>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.9rem',
              fontWeight: 400,
              color: m.color,
              lineHeight: 1,
              letterSpacing: '-0.01em',
            }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column layout ── */}
      <div className="dashboard-layout">

        {/* Left col — Alerts + Sessions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Alerts */}
          <div>
            <SectionLabel>Alertas</SectionLabel>
            {alerts.length === 0 ? (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.9 }}>
                Tudo certo. Nenhum pacote crítico ou pagamento pendente agora.
              </p>
            ) : (
              alerts.map((a, i) => (
                <div key={i} className={`alert-item ${a.type}`}>
                  <div className="alert-icon">
                    {a.type === 'urgent'
                      ? <AlertTriangle size={13} color="var(--danger)" />
                      : a.type === 'warning'
                        ? <AlertTriangle size={13} color="var(--warning)" />
                        : <Bell size={13} color="var(--info)" />}
                  </div>
                  <div className="alert-text" dangerouslySetInnerHTML={{ __html: a.text }} />
                </div>
              ))
            )}
          </div>

          {/* Upcoming sessions */}
          <div>
            <SectionLabel>Próximas gravações</SectionLabel>
            {weekSessions.length === 0 ? (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.9 }}>
                Tudo tranquilo por aqui — suas próximas gravações aparecem quando agendadas.
              </p>
            ) : (() => {
              const sorted = [...weekSessions].sort((a, b) =>
                a.date.localeCompare(b.date) ||
                (a.time_start || a.time || '').localeCompare(b.time_start || b.time || '')
              );
              return (
                <>
                  {/* Desktop: tabela */}
                  <div className="sessions-desktop-table table-wrap">
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
                        {sorted.map(s => (
                          <tr key={s.id}>
                            <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                              {new Date(s.date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </td>
                            <td>
                              {(s.time_start || s.time || '').slice(0, 5) || '—'}
                              {s.time_end && ` — ${s.time_end.slice(0, 5)}`}
                            </td>
                            <td style={{ color: 'var(--text-primary)' }}>{getClientName(s.client_id)}</td>
                            <td>{s.service}</td>
                            <td>
                              <span className={`badge badge-${(s.status || '').toLowerCase()}`}>
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: cards */}
                  <div className="sessions-mobile-cards">
                    {sorted.map(s => (
                      <div key={s.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        padding: '0.75rem 0', borderBottom: '0.5px solid var(--border)',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                            {getClientName(s.client_id)}
                          </div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                            {new Date(s.date + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                            {' · '}
                            {(s.time_start || s.time || '').slice(0, 5) || '—'}
                            {s.time_end && `–${s.time_end.slice(0, 5)}`}
                          </div>
                          {s.service && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              {s.service}
                            </div>
                          )}
                        </div>
                        <span className={`badge badge-${(s.status || '').toLowerCase()}`} style={{ marginLeft: '0.75rem', flexShrink: 0 }}>
                          {s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Right col — Chart + Financial */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Revenue chart */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
              <SectionLabel>Receita</SectionLabel>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.05rem',
                color: 'var(--text-secondary)',
                letterSpacing: '-0.01em',
              }}>
                {cSym} {monthPayments.toLocaleString('pt-BR')}
              </span>
            </div>
            <div style={{ ...card({ padding: '1rem 1rem 0.5rem' }) }}>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={chartData} barCategoryGap="38%">
                  <XAxis
                    dataKey="month"
                    stroke="transparent"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-body)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [`${cSym} ${v.toLocaleString('pt-BR')}`, 'Receita']}
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      fontFamily: 'var(--font-body)',
                      boxShadow: 'none',
                    }}
                    labelStyle={{ color: tooltipLabelColor }}
                    itemStyle={{ color: tooltipTextColor }}
                    cursor={{ fill: 'rgba(212,135,10,0.05)' }}
                  />
                  <Bar dataKey="receita" radius={[3, 3, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={index === chartData.length - 1 ? 'var(--amber)' : dimBar}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Financial summary */}
          <div>
            <SectionLabel>Resumo financeiro</SectionLabel>
            <div style={{ ...card({ overflow: 'hidden' }) }}>
              {financialRows.map((row, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.7rem 1rem',
                  borderBottom: i < financialRows.length - 1 ? '0.5px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{row.label}</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: row.color, fontFamily: 'var(--font-display)' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
