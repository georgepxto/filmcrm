import { useState } from 'react';
import {
  Search, ChevronDown, ChevronUp, Edit, X,
  DollarSign, Package, Film, AlertTriangle,
} from 'lucide-react';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';

/* ── Local micro-components ── */
const OutlineBtn = ({ onClick, children, style = {}, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'transparent', border: '1px solid var(--amber)', color: disabled ? 'var(--text-muted)' : 'var(--amber)',
      borderRadius: 6, padding: '0.5rem 1.15rem', fontSize: '0.85rem', fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      transition: 'background 0.18s', fontFamily: 'var(--font-body)', opacity: disabled ? 0.5 : 1, ...style,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,135,10,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
  >
    {children}
  </button>
);

const SecLabel = ({ children }) => (
  <span style={{
    fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: 'var(--text-muted)', opacity: 0.8,
  }}>
    {children}
  </span>
);

const fieldStyle = {
  height: '30px',
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 6,
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-body)',
  padding: '0 0.65rem',
  outline: 'none',
  cursor: 'pointer',
};

export default function Packages({ clients, packages, payments, videos, updatePackage, addPackage }) {
  const { user } = useAuth();
  const cSym = user?.user_metadata?.currency === 'USD' ? '$' : user?.user_metadata?.currency === 'EUR' ? '€' : 'R$';
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [expandedPkg, setExpandedPkg] = useState(null);
  const [editingPkg, setEditingPkg] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const emptyPkg = { client_id: '', name: '', total_videos: 4, edited: 0, delivered: 0, posted: 0, status: 'Ativo', value: '', paid: 0, start_date: new Date().toISOString().slice(0, 10), end_date: '', billing_cycle: 'Mensal' };
  const [createForm, setCreateForm] = useState(emptyPkg);

  const saveNewPkg = async () => {
    if (!createForm.client_id) { toast.error('Selecione um cliente'); return; }
    if (!createForm.name.trim()) { toast.error('Informe o nome do pacote'); return; }
    setSaving(true);
    const data = { ...createForm, total_videos: Number(createForm.total_videos), edited: Number(createForm.edited), delivered: Number(createForm.delivered), posted: Number(createForm.posted), value: Number(createForm.value), paid: Number(createForm.paid), end_date: createForm.end_date || null };
    const result = await addPackage(data);
    result ? toast.success(`Pacote "${createForm.name}" criado`) : toast.error('Erro ao criar pacote');
    setSaving(false);
    if (result) { setShowCreateModal(false); setCreateForm(emptyPkg); }
  };

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '—';

  let filtered = packages.filter(p => {
    const clientName = getClientName(p.client_id).toLowerCase();
    const matchSearch = !searchQuery || clientName.includes(searchQuery.toLowerCase()) || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    const matchClient = !filterClient || p.client_id === filterClient;
    return matchSearch && matchStatus && matchClient;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'recent') return (b.created_at || '').localeCompare(a.created_at || '');
    if (sortBy === 'value') return (b.value || 0) - (a.value || 0);
    if (sortBy === 'progress') {
      const pA = a.total_videos > 0 ? a.delivered / a.total_videos : 0;
      const pB = b.total_videos > 0 ? b.delivered / b.total_videos : 0;
      return pB - pA;
    }
    if (sortBy === 'client') return getClientName(a.client_id).localeCompare(getClientName(b.client_id));
    return 0;
  });

  const activePkgs = packages.filter(p => p.status === 'Ativo');
  const totalValue = packages.reduce((s, p) => s + (p.value || 0), 0);
  const totalPaid = packages.reduce((s, p) => s + (p.paid || 0), 0);
  const totalOwed = packages.reduce((s, p) => s + Math.max(0, (p.value || 0) - (p.paid || 0)), 0);
  const lowPkgs = activePkgs.filter(p => p.total_videos > 0 && (p.total_videos - p.delivered) <= 2);

  const startEdit = (pkg) => {
    setEditingPkg(pkg.id);
    setEditForm({ edited: pkg.edited || 0, delivered: pkg.delivered || 0, posted: pkg.posted || 0, status: pkg.status, paid: pkg.paid || 0 });
  };

  const saveEdit = async (pkgId) => {
    setSaving(true);
    const result = await updatePackage(pkgId, {
      edited: Number(editForm.edited), delivered: Number(editForm.delivered),
      posted: Number(editForm.posted), status: editForm.status, paid: Number(editForm.paid),
    });
    result ? toast.success('Pacote atualizado') : toast.error('Não foi possível atualizar. Tente novamente.');
    setSaving(false);
    setEditingPkg(null);
  };

  const getPkgPayments = (pkgId) => payments.filter(p => p.package_id === pkgId);
  const getPkgVideos = (pkgId) => videos.filter(v => v.package_id === pkgId);

  const getStatusBadge = (status) => {
    const map = { 'Ativo': 'active', 'Pausado': 'paused', 'Concluído': 'concluded' };
    return map[status] || 'active';
  };

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
            Pacotes
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Acompanhe o que está rolando com cada cliente.
          </p>
        </div>
        <OutlineBtn onClick={() => { setCreateForm(emptyPkg); setShowCreateModal(true); }}>
          + Novo Pacote
        </OutlineBtn>
      </div>

      {/* ── Featured metric — Valor Total ── */}
      <div style={{ padding: '1.75rem 2rem', border: '0.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)', marginBottom: '0.5rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem', opacity: 0.8 }}>
          Valor total em carteira
        </p>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.4rem, 5vw, 3.2rem)', fontWeight: 400, color: 'var(--amber)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.5rem' }}>
          {cSym} {totalValue.toLocaleString('pt-BR')}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {cSym} {totalPaid.toLocaleString('pt-BR')} recebido
          {totalOwed > 0 && <> · <span style={{ color: 'rgba(239,68,68,0.7)' }}>{cSym} {totalOwed.toLocaleString('pt-BR')} a receber</span></>}
        </p>
      </div>

      {/* ── Secondary metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Total de pacotes', value: packages.length, color: 'var(--text-secondary)' },
          { label: 'Ativos agora', value: activePkgs.length, color: 'var(--text-secondary)' },
          { label: 'Críticos', value: lowPkgs.length, color: lowPkgs.length > 0 ? 'var(--warning)' : 'var(--text-muted)' },
        ].map(m => (
          <div key={m.label} style={{ padding: '1rem 1.25rem', border: '0.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)' }}>
            <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', opacity: 0.8 }}>
              {m.label}
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 400, color: m.color, lineHeight: 1, letterSpacing: '-0.01em' }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="pkg-filters" style={{ padding: 0, marginBottom: '1.5rem', gap: '0.5rem' }}>
        <div className="pkg-search" style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.5, pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por cliente ou pacote..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...fieldStyle, paddingLeft: '1.75rem', width: '100%', cursor: 'text' }}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={fieldStyle}>
          <option value="">Todos os status</option>
          <option value="Ativo">Ativo</option>
          <option value="Pausado">Pausado</option>
          <option value="Concluído">Concluído</option>
        </select>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={fieldStyle}>
          <option value="">Todos os clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={fieldStyle}>
          <option value="recent">Mais recente</option>
          <option value="value">Maior valor</option>
          <option value="progress">Maior progresso</option>
          <option value="client">Cliente A-Z</option>
        </select>
      </div>

      {/* ── Package list ── */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.9, padding: '3rem 0', textAlign: 'center' }}>
          {packages.length === 0
            ? 'Nenhum pacote por aqui ainda — quando criar um, ele aparece nesta lista.'
            : 'Nenhum pacote encontrado com esses filtros.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(pkg => {
            const remaining = pkg.total_videos - pkg.delivered;
            const progress = pkg.total_videos > 0 ? (pkg.delivered / pkg.total_videos) * 100 : 0;
            const isLow = remaining <= 2 && pkg.status === 'Ativo' && pkg.total_videos > 0;
            const isExpanded = expandedPkg === pkg.id;
            const isEditing = editingPkg === pkg.id;
            const pkgPayments = getPkgPayments(pkg.id);
            const pkgVideos = getPkgVideos(pkg.id);
            const owed = Math.max(0, (pkg.value || 0) - (pkg.paid || 0));

            return (
              <div
                key={pkg.id}
                style={{
                  border: isLow ? '0.5px solid rgba(239,68,68,0.3)' : '0.5px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--bg-card)',
                  overflow: 'hidden',
                  transition: 'border-color 0.18s',
                }}
              >
                {/* ── Main row ── */}
                <div
                  className="pkg-card-row"
                  style={{ padding: '1.1rem 1.5rem' }}
                  onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}
                >
                  {/* Left: name + meta */}
                  <div className="pkg-card-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        {pkg.name}
                      </span>
                      <span className={`badge badge-${getStatusBadge(pkg.status)}`} style={{ borderRadius: 3, fontSize: '0.58rem', letterSpacing: '0.08em' }}>
                        {pkg.status}
                      </span>
                      {isLow && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--danger)', opacity: 0.8 }}>
                          {remaining === 0 ? 'finalizado' : `${remaining} restante${remaining !== 1 ? 's' : ''}`}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{getClientName(pkg.client_id)}</span>
                      <span style={{ opacity: 0.35 }}>·</span>
                      <span>{pkg.billing_cycle || 'Mensal'}</span>
                      <span style={{ opacity: 0.35 }}>·</span>
                      <span>{pkg.end_date ? `Até ${new Date(pkg.end_date + 'T12:00').toLocaleDateString('pt-BR')}` : 'Contínuo'}</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="pkg-card-progress">
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', opacity: 0.8 }}>
                      <span>{pkg.delivered}/{pkg.total_videos} entregues</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 2, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: isLow ? 'rgba(239,68,68,0.6)' : 'rgba(212,135,10,0.45)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>

                  {/* Value + chevron */}
                  <div className="pkg-card-value">
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        {cSym} {(pkg.value || 0).toLocaleString('pt-BR')}
                      </div>
                      <div style={{ fontSize: '0.63rem', color: owed > 0 ? 'rgba(239,68,68,0.65)' : 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {owed > 0 ? `deve ${cSym} ${owed.toLocaleString('pt-BR')}` : 'quitado'}
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', opacity: 0.45, flexShrink: 0 }}>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </div>
                </div>

                {/* ── Expanded detail ── */}
                {isExpanded && (
                  <div style={{ borderTop: '0.5px solid var(--border)', padding: '1.25rem 1.5rem', animation: 'fadeIn 0.2s ease' }}>

                    {/* Stats mini grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.5rem', marginBottom: '1.25rem' }}>
                      {[
                        { label: 'Total', value: pkg.total_videos, color: 'var(--text-secondary)' },
                        { label: 'Editados', value: pkg.edited || 0, color: 'var(--info)' },
                        { label: 'Entregues', value: pkg.delivered, color: 'var(--success)' },
                        { label: 'Postados', value: pkg.posted, color: 'var(--info)' },
                        { label: 'Restantes', value: remaining, color: isLow ? 'var(--danger)' : 'var(--text-secondary)' },
                        { label: 'Pago', value: `${cSym} ${(pkg.paid || 0).toLocaleString('pt-BR')}`, color: 'var(--success)' },
                        { label: 'Devendo', value: `${cSym} ${owed.toLocaleString('pt-BR')}`, color: owed > 0 ? 'var(--danger)' : 'var(--text-muted)' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ padding: '0.6rem 0.65rem', border: '0.5px solid var(--border)', borderRadius: 6, textAlign: 'center' }}>
                          <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 600, opacity: 0.7, marginBottom: '0.2rem' }}>
                            {label}
                          </div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 300, color, lineHeight: 1 }}>
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick edit */}
                    {isEditing ? (
                      <div style={{ border: '0.5px solid var(--amber)', borderRadius: 8, padding: '1rem', marginBottom: '1rem', background: 'rgba(212,135,10,0.03)' }}>
                        <SecLabel style={{ display: 'block', marginBottom: '0.75rem' }}>Edição Rápida</SecLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                          {[
                            { label: 'Editados', key: 'edited', max: pkg.total_videos },
                            { label: 'Entregues', key: 'delivered', max: pkg.total_videos },
                            { label: 'Postados', key: 'posted', max: pkg.total_videos },
                            { label: `Pago (${cSym})`, key: 'paid', max: undefined },
                          ].map(({ label, key, max }) => (
                            <div className="form-group" key={key} style={{ marginBottom: 0 }}>
                              <label>{label}</label>
                              <input type="number" className="form-control" value={editForm[key]} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} min={0} max={max} />
                            </div>
                          ))}
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Status</label>
                            <select className="form-control" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                              <option value="Ativo">Ativo</option>
                              <option value="Pausado">Pausado</option>
                              <option value="Concluído">Concluído</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingPkg(null)}>Cancelar</button>
                          <button className="btn btn-primary btn-sm" onClick={() => saveEdit(pkg.id)} disabled={saving}>
                            {saving ? 'Salvando...' : 'Salvar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: '1.25rem' }}>
                        <button
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.73rem', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', transition: 'color 0.18s', fontFamily: 'var(--font-body)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                          onClick={e => { e.stopPropagation(); startEdit(pkg); }}
                        >
                          <Edit size={12} /> Edição Rápida
                        </button>
                      </div>
                    )}

                    {/* Payments + Videos */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                      {/* Payments */}
                      <div>
                        <SecLabel style={{ display: 'block', marginBottom: '0.65rem' }}>
                          Histórico de Pagamentos ({pkgPayments.length})
                        </SecLabel>
                        {pkgPayments.length === 0 ? (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>Nenhum pagamento registrado.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            {pkgPayments.sort((a, b) => b.date.localeCompare(a.date)).map(pay => (
                              <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.65rem', border: '0.5px solid var(--border)', borderRadius: 6, fontSize: '0.78rem' }}>
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>
                                    {new Date(pay.date + 'T12:00').toLocaleDateString('pt-BR')}
                                  </span>
                                  {pay.note && <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>{pay.note}</span>}
                                </div>
                                <span style={{ fontFamily: 'var(--font-display)', color: 'var(--success)', fontWeight: 300, fontSize: '0.95rem' }}>
                                  + {cSym} {pay.amount.toLocaleString('pt-BR')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Videos */}
                      <div>
                        <SecLabel style={{ display: 'block', marginBottom: '0.65rem' }}>
                          Vídeos do Pacote ({pkgVideos.length})
                        </SecLabel>
                        {pkgVideos.length === 0 ? (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>Nenhum vídeo vinculado.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            {pkgVideos.map(v => (
                              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.65rem', border: '0.5px solid var(--border)', borderRadius: 6, fontSize: '0.78rem' }}>
                                <span style={{ color: 'var(--text-primary)' }}>{v.title}</span>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  {v.edited && <span style={{ fontSize: '0.6rem', color: 'var(--info)', opacity: 0.8 }}>editado</span>}
                                  {v.delivered && <span style={{ fontSize: '0.6rem', color: 'var(--success)', opacity: 0.8 }}>entregue</span>}
                                  {v.posted && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>postado</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer info */}
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      {pkg.start_date && <span>Início: {new Date(pkg.start_date + 'T12:00').toLocaleDateString('pt-BR')}</span>}
                      {pkg.end_date && <span>Fim: {new Date(pkg.end_date + 'T12:00').toLocaleDateString('pt-BR')}</span>}
                      <span>Ciclo: {pkg.billing_cycle || 'Mensal'}</span>
                      <span>Valor/ciclo: {cSym} {(pkg.value || 0).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Package Modal ── */}
      {showCreateModal && (() => {
        const totalVids = Number(createForm.total_videos) || 0;
        const pkgValue = Number(createForm.value) || 0;
        const perVideo = totalVids > 0 ? pkgValue / totalVids : 0;
        const videoPresets = [4, 8, 12];
        return (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
            <div className="modal">
              <div className="modal-header">
                <h3 style={{ fontWeight: 400 }}>Novo Pacote</h3>
                <button className="modal-close" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Cliente</label>
                  <select className="form-control" value={createForm.client_id} onChange={e => setCreateForm({ ...createForm, client_id: e.target.value })}>
                    <option value="">Selecione um cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nome do Pacote</label>
                  <input className="form-control" placeholder="Ex: Mensal Premium" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Vídeos</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {videoPresets.map(n => (
                      <button key={n} type="button" className={`btn btn-sm ${Number(createForm.total_videos) === n ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', height: 'auto', padding: '0.5rem 0.25rem', gap: '0.05rem' }} onClick={() => setCreateForm({ ...createForm, total_videos: n })}>
                        <span style={{ fontSize: '1rem', fontWeight: 700 }}>{n}</span>
                        <span style={{ fontSize: '0.62rem', opacity: 0.65 }}>vídeos</span>
                      </button>
                    ))}
                    <div style={{ flex: 1 }}>
                      <input type="number" className="form-control" min="1" placeholder="Outro" value={videoPresets.includes(Number(createForm.total_videos)) ? '' : createForm.total_videos} onChange={e => setCreateForm({ ...createForm, total_videos: e.target.value })} style={{ height: '100%', textAlign: 'center' }} />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ciclo de Cobrança</label>
                    <select className="form-control" value={createForm.billing_cycle} onChange={e => setCreateForm({ ...createForm, billing_cycle: e.target.value })}>
                      <option value="Semanal">Semanal</option>
                      <option value="Quinzenal">Quinzenal</option>
                      <option value="Mensal">Mensal</option>
                      <option value="Bimestral">Bimestral</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Semestral">Semestral</option>
                      <option value="Anual">Anual</option>
                      <option value="Único">Pagamento Único</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Início do Contrato</label>
                    <input type="date" className="form-control" value={createForm.start_date} onChange={e => setCreateForm({ ...createForm, start_date: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Término <span style={{ fontWeight: 400, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(vazio = contínuo)</span></label>
                  <input type="date" className="form-control" value={createForm.end_date || ''} onChange={e => setCreateForm({ ...createForm, end_date: e.target.value })} />
                </div>
                <div style={{ background: 'var(--bg-primary)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <DollarSign size={12} /> Valor por Ciclo ({createForm.billing_cycle || 'Mensal'}) ({cSym})
                    </label>
                    <input type="number" className="form-control" min="0" step="100" placeholder="0" value={createForm.value} onChange={e => setCreateForm({ ...createForm, value: e.target.value })} style={{ fontSize: '1.1rem', fontWeight: 600 }} />
                  </div>
                  {pkgValue > 0 && totalVids > 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ≈ <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{cSym} {perVideo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span> / vídeo
                    </p>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <OutlineBtn onClick={saveNewPkg} disabled={saving || !createForm.name.trim() || !createForm.client_id}>
                  {saving ? 'Salvando...' : 'Criar Pacote'}
                </OutlineBtn>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
