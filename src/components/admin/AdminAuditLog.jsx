import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const ACTION_LABELS = {
  user_suspended:         'Usuário suspenso',
  user_reactivated:       'Usuário reativado',
  role_changed:           'Role alterado',
  user_hard_deleted:      'Usuário excluído permanentemente',
  user_soft_deleted:      'Usuário excluído (soft)',
  password_reset_sent:    'Reset de senha enviado',
  force_logout:           'Logout forçado',
  subscription_updated:   'Assinatura atualizada',
  subscription_canceled:  'Assinatura cancelada',
  manual_payment_created: 'Pagamento manual criado',
  user_notes_updated:     'Notas atualizadas',
};

const ACTION_COLOR = {
  user_suspended:         'var(--danger)',
  user_hard_deleted:      'var(--danger)',
  user_soft_deleted:      'var(--warning)',
  role_changed:           'var(--amber)',
  subscription_canceled:  'var(--warning)',
  manual_payment_created: 'var(--success)',
  user_reactivated:       'var(--success)',
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)   return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

export default function AdminAuditLog({ auditLog, users }) {
  const usersMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users]);
  const [expanded, setExpanded] = useState({});
  const [filterAction, setFilterAction] = useState('');

  const allActions = useMemo(() => [...new Set(auditLog.map(a => a.action))], [auditLog]);

  const filtered = useMemo(() =>
    auditLog.filter(a => !filterAction || a.action === filterAction),
    [auditLog, filterAction]
  );

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: 900 }}>
      <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>Log de Auditoria</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Histórico imutável de todas as ações administrativas — {auditLog.length} registro{auditLog.length !== 1 ? 's' : ''}
      </p>

      {/* Filter */}
      <div style={{ marginBottom: '1.25rem' }}>
        <select className="form-control" value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ fontSize: '0.82rem', minWidth: 200, display: 'inline-block', width: 'auto' }}>
          <option value="">Todas as ações</option>
          {allActions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem 1rem' }}>
          <p>Nenhuma ação administrativa registrada ainda.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          {filtered.map((a, i) => {
            const admin  = usersMap[a.admin_id];
            const target = a.target_user_id ? usersMap[a.target_user_id] : null;
            const hasPayload = a.payload && Object.keys(a.payload).length > 0;
            const dotColor = ACTION_COLOR[a.action] || 'var(--amber)';

            return (
              <div key={a.id} style={{ display: 'flex', gap: '1rem', paddingTop: i === 0 ? 0 : '0.9rem', paddingBottom: '0.9rem', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                {/* Timeline dot + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: '0.25rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  {i < filtered.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: '0.35rem' }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: dotColor !== 'var(--amber)' ? dotColor : 'var(--text-primary)' }}>
                      {ACTION_LABELS[a.action] || a.action.replace(/_/g, ' ')}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {timeAgo(a.created_at)}
                      </span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {new Date(a.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>Admin:</strong>{' '}
                    {admin ? `${admin.full_name || admin.email}` : a.admin_id?.slice(0, 8) + '…'}
                    {target && (
                      <>
                        {' · '}
                        <strong style={{ color: 'var(--text-secondary)' }}>Alvo:</strong>{' '}
                        {target.full_name || target.email}
                      </>
                    )}
                    {a.ip_address && (
                      <>
                        {' · '}
                        <span style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{a.ip_address}</span>
                      </>
                    )}
                  </p>

                  {hasPayload && (
                    <div>
                      <button
                        onClick={() => toggle(a.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.72rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        {expanded[a.id] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        {expanded[a.id] ? 'Ocultar' : 'Ver'} payload
                      </button>
                      {expanded[a.id] && (
                        <pre style={{
                          marginTop: '0.5rem',
                          padding: '0.75rem',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          fontSize: '0.72rem',
                          fontFamily: 'monospace',
                          color: 'var(--text-secondary)',
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}>
                          {JSON.stringify(a.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
