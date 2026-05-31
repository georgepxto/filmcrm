import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { adminActions } from '../../lib/adminActions';
import { useToast } from '../Toast';
import ConfirmModal from '../ConfirmModal';

const STATUS_COLOR = { active: 'var(--success)', suspended: 'var(--warning)', deleted: 'var(--danger)' };
const STATUS_LABEL = { active: 'Ativo', suspended: 'Suspenso', deleted: 'Excluído' };

const fmt = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const SL = ({ children }) => (
  <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', opacity: 0.8 }}>
    {children}
  </p>
);

export default function AdminUserDetail({ users, subscriptions, subscriptionPayments, auditLog, updateUserLocal, removeSubscription }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const u = users.find(x => x.id === id);
  const userSubs  = subscriptions.filter(s => s.user_id === id);
  const activeSub = userSubs.find(s => s.status === 'active' || s.status === 'trial');
  const userPayments = subscriptionPayments.filter(p => p.user_id === id);
  const userAudit    = auditLog.filter(a => a.target_user_id === id || a.admin_id === id).slice(0, 20);

  const [stats, setStats]           = useState(null);
  const [notes, setNotes]           = useState(u?.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [suspendModal, setSuspendModal]   = useState(false);
  const [deleteModal, setDeleteModal]     = useState(false);
  const [roleLoading, setRoleLoading]     = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.rpc('admin_get_user_stats', { target_uid: id }).then(({ data }) => setStats(data));
  }, [id]);

  useEffect(() => {
    if (u) setNotes(u.notes || '');
  }, [u]);

  if (!u) {
    return (
      <div style={{ padding: '2rem' }}>
        <button className="btn btn-secondary" style={{ marginBottom: '1.5rem' }} onClick={() => navigate('/admin/users')}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} />Voltar
        </button>
        <p style={{ color: 'var(--text-muted)' }}>Usuário não encontrado.</p>
      </div>
    );
  }

  const doSuspend = async (reason) => {
    setActionLoading('suspend');
    try {
      await adminActions.suspendUser(u.id, reason);
      updateUserLocal(u.id, { status: 'suspended', suspended_at: new Date().toISOString(), suspension_reason: reason });
      success('Usuário suspenso.');
    } catch { error('Erro ao suspender usuário.'); }
    setActionLoading(null);
    setSuspendModal(false);
  };

  const doReactivate = async () => {
    setActionLoading('reactivate');
    try {
      await adminActions.reactivateUser(u.id);
      updateUserLocal(u.id, { status: 'active', suspended_at: null, suspension_reason: null });
      success('Usuário reativado.');
    } catch { error('Erro ao reativar usuário.'); }
    setActionLoading(null);
  };

  const doChangeRole = async () => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Alterar role para "${newRole}"?`)) return;
    setRoleLoading(true);
    try {
      await adminActions.changeRole(u.id, newRole);
      updateUserLocal(u.id, { role: newRole });
      success(`Role alterado para ${newRole}.`);
    } catch { error('Erro ao alterar role.'); }
    setRoleLoading(false);
  };

  const doResetPassword = async () => {
    setActionLoading('reset');
    try {
      await adminActions.resetUserPassword(u.id, u.email);
      success('Email de redefinição de senha enviado.');
    } catch { error('Erro ao enviar email de redefinição.'); }
    setActionLoading(null);
  };

  const doForceLogout = async () => {
    if (!window.confirm('Forçar logout de todas as sessões?')) return;
    setActionLoading('logout');
    try {
      await adminActions.forceLogout(u.id);
      success('Todas as sessões encerradas.');
    } catch { error('Erro ao forçar logout.'); }
    setActionLoading(null);
  };

  const doDelete = async () => {
    setActionLoading('delete');
    try {
      await adminActions.deleteUser(u.id, false);
      updateUserLocal(u.id, { status: 'deleted' });
      success('Usuário marcado como excluído.');
    } catch { error('Erro ao excluir usuário.'); }
    setActionLoading(null);
    setDeleteModal(false);
  };

  const doSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await adminActions.updateUserNotes(u.id, notes);
      updateUserLocal(u.id, { notes });
      success('Notas salvas.');
    } catch { error('Erro ao salvar notas.'); }
    setSavingNotes(false);
  };

  const doCancelSub = async () => {
    if (!activeSub) return;
    const reason = window.prompt('Motivo do cancelamento:') || '';
    setActionLoading('cancel_sub');
    try {
      await adminActions.cancelSubscription(activeSub.id, u.id, reason);
      removeSubscription(activeSub.id);
      success('Assinatura cancelada.');
    } catch { error('Erro ao cancelar assinatura.'); }
    setActionLoading(null);
  };

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: 1100 }}>
      <button className="btn btn-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.8rem' }} onClick={() => navigate('/admin/users')}>
        <ArrowLeft size={13} style={{ marginRight: 5 }} />Voltar para usuários
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left column: identity + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--amber-glow)', border: '1px solid var(--amber-glow-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: 'var(--amber)', margin: '0 auto 1rem' }}>
              {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              {u.full_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem nome</span>}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem', wordBreak: 'break-all' }}>{u.email}</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, padding: '0.2rem 0.6rem', border: `1px solid ${STATUS_COLOR[u.status]}`, borderRadius: 4, color: STATUS_COLOR[u.status] }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_COLOR[u.status] }} />
                {STATUS_LABEL[u.status] || u.status}
              </span>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, padding: '0.2rem 0.6rem', border: '1px solid var(--border)', borderRadius: 4, color: u.role === 'admin' ? 'var(--amber)' : 'var(--text-muted)' }}>
                {u.role}
              </span>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <SL>Informações</SL>
            {[
              ['Cadastro', u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'],
              ['Último login', u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR') : 'Nunca'],
              ['Empresa', u.company_name || '—'],
              ['Moeda', u.currency || 'BRL'],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderTop: '1px solid var(--border)', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-word' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <SL>Ações</SL>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {u.status === 'suspended' ? (
                <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }} onClick={doReactivate} disabled={actionLoading === 'reactivate'}>
                  {actionLoading === 'reactivate' ? 'Reativando…' : 'Reativar conta'}
                </button>
              ) : (
                <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }} onClick={() => setSuspendModal(true)} disabled={actionLoading === 'suspend'}>
                  {actionLoading === 'suspend' ? 'Suspendendo…' : 'Suspender conta'}
                </button>
              )}
              <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }} onClick={doChangeRole} disabled={roleLoading}>
                {roleLoading ? 'Alterando…' : u.role === 'admin' ? 'Revogar admin' : 'Promover a admin'}
              </button>
              <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }} onClick={doResetPassword} disabled={actionLoading === 'reset'}>
                {actionLoading === 'reset' ? 'Enviando…' : 'Resetar senha'}
              </button>
              <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }} onClick={doForceLogout} disabled={actionLoading === 'logout'}>
                {actionLoading === 'logout' ? 'Encerrando…' : 'Forçar logout'}
              </button>
              <button className="btn btn-danger" style={{ width: '100%', fontSize: '0.8rem', marginTop: '0.25rem' }} onClick={() => setDeleteModal(true)}>
                Excluir conta
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Subscription */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <SL>Assinatura ativa</SL>
            {activeSub ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '0.25rem' }}>{activeSub.plan?.name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {activeSub.billing_cycle === 'yearly' ? 'Anual' : 'Mensal'} ·{' '}
                    {fmt(activeSub.billing_cycle === 'yearly' ? (activeSub.plan?.price_yearly || 0) : (activeSub.plan?.price_monthly || 0))}/
                    {activeSub.billing_cycle === 'yearly' ? 'ano' : 'mês'}
                  </p>
                  {activeSub.current_period_end && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Próxima cobrança: {new Date(activeSub.current_period_end).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: activeSub.status === 'active' ? 'var(--success)' : 'var(--warning)' }} />
                    {activeSub.status === 'active' ? 'Ativo' : 'Trial'}
                  </span>
                  <button className="btn btn-danger" style={{ fontSize: '0.75rem' }} onClick={doCancelSub} disabled={actionLoading === 'cancel_sub'}>
                    {actionLoading === 'cancel_sub' ? 'Cancelando…' : 'Cancelar assinatura'}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sem assinatura ativa — plano Free ou sem plano.</p>
            )}
          </div>

          {/* App usage stats */}
          {stats && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <SL>Uso do app</SL>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                {[
                  ['Clientes', stats.clients],
                  ['Pacotes', stats.packages],
                  ['Sessões', stats.sessions],
                  ['Vídeos', stats.videos],
                  ['Pagamentos', stats.payments],
                ].map(([l, v]) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--amber)', lineHeight: 1, marginBottom: '0.25rem' }}>{v ?? '—'}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{l}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment history */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <SL>Histórico de pagamentos</SL>
            {userPayments.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Nenhum pagamento registrado.</p>
            ) : (
              <div className="table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Data', 'Valor', 'Status'].map(h => (
                        <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {userPayments.slice(0, 10).map((p, i) => (
                      <tr key={p.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                        <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString('pt-BR') : '—'}</td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 500 }}>{fmt(p.amount)} {p.currency !== 'BRL' ? p.currency : ''}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: p.status === 'paid' ? 'var(--success)' : p.status === 'failed' ? 'var(--danger)' : 'var(--text-muted)' }}>
                            {p.status === 'paid' ? 'Pago' : p.status === 'failed' ? 'Falhou' : p.status === 'refunded' ? 'Reembolso' : 'Pendente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Internal notes */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <SL>Notas internas (apenas admins)</SL>
            <textarea
              className="form-control"
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Adicionar notas sobre este usuário…"
              style={{ resize: 'vertical', fontSize: '0.82rem', marginBottom: '0.75rem' }}
            />
            <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} onClick={doSaveNotes} disabled={savingNotes}>
              {savingNotes ? 'Salvando…' : 'Salvar notas'}
            </button>
          </div>

          {/* Audit history for this user */}
          {userAudit.length > 0 && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <SL>Atividade administrativa recente</SL>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {userAudit.map(a => (
                  <div key={a.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.78rem' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', marginTop: '0.35rem', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 500 }}>{a.action.replace(/_/g, ' ')}</span>
                      {a.payload && Object.keys(a.payload).length > 0 && (
                        <span style={{ color: 'var(--text-muted)' }}> — {JSON.stringify(a.payload)}</span>
                      )}
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                        {new Date(a.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suspend confirm */}
      {suspendModal && (
        <ConfirmModal
          title="Suspender usuário"
          message={`Tem certeza que deseja suspender ${u.full_name || u.email}? O usuário perderá acesso imediatamente.`}
          confirmLabel="Suspender"
          danger
          onConfirm={() => doSuspend('')}
          onCancel={() => setSuspendModal(false)}
        />
      )}

      {/* Delete confirm */}
      {deleteModal && (
        <ConfirmModal
          title="Excluir conta"
          message={`Tem certeza que deseja excluir ${u.full_name || u.email}? Isso é um soft delete — os dados serão mantidos.`}
          confirmLabel="Excluir"
          danger
          onConfirm={doDelete}
          onCancel={() => setDeleteModal(false)}
        />
      )}
    </div>
  );
}
