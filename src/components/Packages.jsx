import { useState } from 'react';
import {
  Package, Search, Filter, Play, Pause, CheckCircle, AlertTriangle,
  Edit, ChevronDown, ChevronUp, DollarSign, Film, Calendar as CalIcon,
  TrendingUp, Clock, Eye, X, Repeat, Video, Scissors, Smartphone, Plus, User,
} from 'lucide-react';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';

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
    if (!createForm.name.trim() || !createForm.client_id) return;
    setSaving(true);
    const data = { ...createForm, total_videos: Number(createForm.total_videos), edited: Number(createForm.edited), delivered: Number(createForm.delivered), posted: Number(createForm.posted), value: Number(createForm.value), paid: Number(createForm.paid), end_date: createForm.end_date || null };
    const result = await addPackage(data);
    result ? toast.success(`Pacote "${createForm.name}" criado`) : toast.error('Erro ao criar pacote');
    setSaving(false);
    if (result) { setShowCreateModal(false); setCreateForm(emptyPkg); }
  };

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '—';

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Ativo': return <Play size={12} />;
      case 'Pausado': return <Pause size={12} />;
      case 'Concluído': return <CheckCircle size={12} />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    const map = { 'Ativo': 'active', 'Pausado': 'paused', 'Concluído': 'concluded' };
    return map[status] || 'active';
  };

  // Filters
  let filtered = packages.filter(p => {
    const clientName = getClientName(p.client_id).toLowerCase();
    const matchSearch = !searchQuery || clientName.includes(searchQuery.toLowerCase()) || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    const matchClient = !filterClient || p.client_id === filterClient;
    return matchSearch && matchStatus && matchClient;
  });

  // Sort
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

  // Stats
  const activePkgs = packages.filter(p => p.status === 'Ativo');
  const totalValue = packages.reduce((s, p) => s + (p.value || 0), 0);
  const totalPaid = packages.reduce((s, p) => s + (p.paid || 0), 0);
  const totalOwed = packages.reduce((s, p) => s + Math.max(0, (p.value || 0) - (p.paid || 0)), 0);
  const lowPkgs = activePkgs.filter(p => p.total_videos > 0 && (p.total_videos - p.delivered) <= 2);

  // Quick edit
  const startEdit = (pkg) => {
    setEditingPkg(pkg.id);
    setEditForm({
      edited: pkg.edited || 0,
      delivered: pkg.delivered || 0,
      posted: pkg.posted || 0,
      status: pkg.status,
      paid: pkg.paid || 0,
    });
  };

  const saveEdit = async (pkgId) => {
    setSaving(true);
    const result = await updatePackage(pkgId, {
      edited: Number(editForm.edited),
      delivered: Number(editForm.delivered),
      posted: Number(editForm.posted),
      status: editForm.status,
      paid: Number(editForm.paid),
    });
    result ? toast.success('Pacote atualizado') : toast.error('Erro ao atualizar');
    setSaving(false);
    setEditingPkg(null);
  };

  const getPkgPayments = (pkgId) => payments.filter(p => p.package_id === pkgId);
  const getPkgVideos = (pkgId) => videos.filter(v => v.package_id === pkgId);

  return (
    <div className="fade-in">
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Package size={24} /> Pacotes</h2>
          <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>Gerencie e acompanhe todos os pacotes dos seus clientes</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setCreateForm(emptyPkg); setShowCreateModal(true); }}>
          <Plus size={16} /> Novo Pacote
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="icon-wrap"><Package size={20} /></div>
          <div className="info">
            <h4>Total de Pacotes</h4>
            <div className="value">{packages.length}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="icon-wrap" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--success)' }}><Play size={20} /></div>
          <div className="info">
            <h4>Ativos</h4>
            <div className="value" style={{ color: 'var(--success)' }}>{activePkgs.length}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="icon-wrap" style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--info)' }}><DollarSign size={20} /></div>
          <div className="info">
            <h4>Valor Total</h4>
            <div className="value" style={{ color: 'var(--info)', fontSize: '1.1rem' }}>{cSym} {totalValue.toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="icon-wrap" style={{ background: lowPkgs.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: lowPkgs.length > 0 ? 'var(--danger)' : 'var(--warning)' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="info">
            <h4>Acabando</h4>
            <div className="value" style={{ color: lowPkgs.length > 0 ? 'var(--danger)' : 'var(--warning)' }}>{lowPkgs.length}</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card pkg-filters">
        <div className="pkg-search">
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por cliente ou pacote..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2rem', height: '36px' }}
          />
        </div>
        <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ height: '36px' }}>
          <option value="">Todos os status</option>
          <option value="Ativo">Ativo</option>
          <option value="Pausado">Pausado</option>
          <option value="Concluído">Concluído</option>
        </select>
        <select className="form-control" value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ height: '36px' }}>
          <option value="">Todos os clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-control" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: '36px' }}>
          <option value="recent">Mais recente</option>
          <option value="value">Maior valor</option>
          <option value="progress">Maior progresso</option>
          <option value="client">Cliente A-Z</option>
        </select>
      </div>

      {/* Package List */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
          <Package size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <p>Nenhum pacote encontrado</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  border: isLow ? '1px solid rgba(239,68,68,0.3)' : isExpanded ? '1px solid var(--amber)' : undefined,
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Main Row */}
                <div
                  className="pkg-card-row"
                  onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}
                >
                  {/* Left: Client + Package Name */}
                  <div className="pkg-card-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{pkg.name}</span>
                      <span className={`badge badge-${getStatusBadge(pkg.status)}`} style={{ fontSize: '0.65rem' }}>
                        {getStatusIcon(pkg.status)} {pkg.status}
                      </span>
                      {isLow && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600 }}>
                          <AlertTriangle size={12} /> {remaining === 0 ? 'Finalizado' : `${remaining} restante${remaining !== 1 ? 's' : ''}`}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ color: 'var(--amber)' }}>{getClientName(pkg.client_id)}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Repeat size={11} /> {pkg.billing_cycle || 'Mensal'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Clock size={11} /> {pkg.end_date ? `Até ${new Date(pkg.end_date + 'T12:00').toLocaleDateString('pt-BR')}` : 'Contínuo'}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Progress */}
                  <div className="pkg-card-progress">
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span>{pkg.edited || 0} editados, {pkg.delivered} entregues / {pkg.total_videos}</span>
                      <span style={{ color: isLow ? 'var(--danger)' : 'var(--amber)' }}>{progress.toFixed(0)}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: '8px' }}>
                      <div className={`progress-fill${isLow ? ' danger' : ''}`} style={{ width: `${progress}%`, borderRadius: '4px' }} />
                    </div>
                  </div>

                  {/* Right: Value + Expand */}
                  <div className="pkg-card-value">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {cSym} {(pkg.value || 0).toLocaleString('pt-BR')}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: owed > 0 ? 'var(--danger)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}>
                        {owed > 0 ? `Deve ${cSym} ${owed.toLocaleString('pt-BR')}` : <><CheckCircle size={11} /> Quitado</>}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '1.25rem', animation: 'fadeIn 0.25s ease' }}>
                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'var(--bg-modifier)' }}>
                        <div className="text-muted" style={{ fontSize: '0.68rem', marginBottom: '0.15rem' }}>Total</div>
                        <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{pkg.total_videos}</div>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'var(--bg-modifier)' }}>
                        <div className="text-muted" style={{ fontSize: '0.68rem', marginBottom: '0.15rem' }}>Editados</div>
                        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--info)' }}>{pkg.edited || 0}</div>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'var(--bg-modifier)' }}>
                        <div className="text-muted" style={{ fontSize: '0.68rem', marginBottom: '0.15rem' }}>Entregues</div>
                        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--success)' }}>{pkg.delivered || 0}</div>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'var(--bg-modifier)' }}>
                        <div className="text-muted" style={{ fontSize: '0.68rem', marginBottom: '0.15rem' }}>Postados</div>
                        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--info)' }}>{pkg.posted}</div>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'var(--bg-modifier)' }}>
                        <div className="text-muted" style={{ fontSize: '0.68rem', marginBottom: '0.15rem' }}>Restantes</div>
                        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: isLow ? 'var(--danger)' : 'var(--amber)' }}>{remaining}</div>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'var(--bg-modifier)' }}>
                        <div className="text-muted" style={{ fontSize: '0.68rem', marginBottom: '0.15rem' }}>Pago</div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--success)' }}>{cSym} {(pkg.paid || 0).toLocaleString('pt-BR')}</div>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', textAlign: 'center', background: 'var(--bg-modifier)' }}>
                        <div className="text-muted" style={{ fontSize: '0.68rem', marginBottom: '0.15rem' }}>Devendo</div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: owed > 0 ? 'var(--danger)' : 'var(--success)' }}>{cSym} {owed.toLocaleString('pt-BR')}</div>
                      </div>
                    </div>

                    {/* Quick Edit */}
                    {isEditing ? (
                      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', border: '1px solid var(--amber)', background: 'rgba(245,158,11,0.03)' }}>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--amber)', fontWeight: 600, marginBottom: '0.75rem' }}>
                          Edição Rápida
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Editados</label>
                            <input type="number" className="form-control" value={editForm.edited} onChange={e => setEditForm({ ...editForm, edited: e.target.value })} min={0} max={pkg.total_videos} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Entregues</label>
                            <input type="number" className="form-control" value={editForm.delivered} onChange={e => setEditForm({ ...editForm, delivered: e.target.value })} min={0} max={pkg.total_videos} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Postados</label>
                            <input type="number" className="form-control" value={editForm.posted} onChange={e => setEditForm({ ...editForm, posted: e.target.value })} min={0} max={pkg.total_videos} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Pago ({cSym})</label>
                            <input type="number" className="form-control" value={editForm.paid} onChange={e => setEditForm({ ...editForm, paid: e.target.value })} min={0} />
                          </div>
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
                      <div style={{ marginBottom: '1rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); startEdit(pkg); }} style={{ fontSize: '0.75rem', gap: '0.3rem' }}>
                          <Edit size={13} /> Edição Rápida
                        </button>
                      </div>
                    )}

                    {/* Two-column layout: Payments + Videos */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      {/* Payment History */}
                      <div>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <DollarSign size={12} /> Histórico de Pagamentos ({pkgPayments.length})
                        </div>
                        {pkgPayments.length === 0 ? (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum pagamento registrado</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {pkgPayments.sort((a, b) => b.date.localeCompare(a.date)).map(pay => (
                              <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.65rem', background: 'var(--bg-modifier)', borderRadius: '0.35rem', fontSize: '0.78rem' }}>
                                <div>
                                  <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                                    {new Date(pay.date + 'T12:00').toLocaleDateString('pt-BR')}
                                  </span>
                                  {pay.note && <span style={{ color: 'var(--text-secondary)' }}>{pay.note}</span>}
                                </div>
                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                                  + {cSym} {pay.amount.toLocaleString('pt-BR')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Videos linked */}
                      <div>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Film size={12} /> Vídeos do Pacote ({pkgVideos.length})
                        </div>
                        {pkgVideos.length === 0 ? (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum vídeo vinculado</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {pkgVideos.map(v => (
                              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.65rem', background: 'var(--bg-modifier)', borderRadius: '0.35rem', fontSize: '0.78rem' }}>
                                <span style={{ color: 'var(--text-primary)' }}>{v.title}</span>
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                  {v.recorded && <span title="Gravado" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.35rem', borderRadius: '4px', background: 'rgba(52,211,153,0.12)', color: 'var(--success)' }}><Video size={11} /></span>}
                                  {v.edited && <span title="Editado" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.35rem', borderRadius: '4px', background: 'rgba(96,165,250,0.12)', color: 'var(--info)' }}><Scissors size={11} /></span>}
                                  {v.delivered && <span title="Entregue" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.35rem', borderRadius: '4px', background: 'rgba(245,158,11,0.12)', color: 'var(--amber)' }}><Package size={11} /></span>}
                                  {v.posted && <span title="Postado" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.35rem', borderRadius: '4px', background: 'rgba(168,85,247,0.12)', color: '#a855f7' }}><Smartphone size={11} /></span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Package info footer */}
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {pkg.start_date && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CalIcon size={11} />Início: {new Date(pkg.start_date + 'T12:00').toLocaleDateString('pt-BR')}</span>
                      )}
                      {pkg.end_date && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={11} />Fim: {new Date(pkg.end_date + 'T12:00').toLocaleDateString('pt-BR')}</span>
                      )}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><DollarSign size={11} />Valor/ciclo: {cSym} {(pkg.value || 0).toLocaleString('pt-BR')}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Repeat size={11} />Ciclo: {pkg.billing_cycle || 'Mensal'}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Package Modal */}
      {showCreateModal && (() => {
        const totalVids = Number(createForm.total_videos) || 0;
        const pkgValue = Number(createForm.value) || 0;
        const perVideo = totalVids > 0 ? pkgValue / totalVids : 0;
        const videoPresets = [4, 8, 12];
        return (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
            <div className="modal">
              <div className="modal-header">
                <h3><Package size={18} /> Novo Pacote</h3>
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
                  <label>Término do Contrato <span style={{ fontWeight: 400, opacity: 0.5 }}>(Vazio = Contínuo)</span></label>
                  <input type="date" className="form-control" value={createForm.end_date || ''} onChange={e => setCreateForm({ ...createForm, end_date: e.target.value })} />
                </div>
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><DollarSign size={13} /> Valor por Ciclo ({createForm.billing_cycle || 'Mensal'}) ({cSym})</label>
                    <input type="number" className="form-control" min="0" step="100" placeholder="0" value={createForm.value} onChange={e => setCreateForm({ ...createForm, value: e.target.value })} style={{ fontSize: '1.1rem', fontWeight: 600 }} />
                  </div>
                  {pkgValue > 0 && totalVids > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ≈ <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{cSym} {perVideo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>/vídeo
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={saveNewPkg} disabled={saving || !createForm.name.trim() || !createForm.client_id}>
                  {saving ? 'Salvando...' : 'Criar Pacote'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
