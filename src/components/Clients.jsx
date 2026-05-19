import { useState } from 'react';
import {
  Users, Plus, X, Package, Phone, Mail, AlertTriangle,
  Pause, CheckCircle, Play, Edit, MessageCircle, Link as LinkIcon, Bookmark, Trash2, LayoutGrid, List, Search
} from 'lucide-react';
import { useToast } from './Toast';

const formatPhone = (value) => {
  // Remove everything that's not a digit
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`;
};

export default function Clients({ clients, packages, references, addClient, updateClient, deleteClient, addPackage, updatePackage, addReference, updateReference, deleteReference }) {
  const toast = useToast();
  const [showClientModal, setShowClientModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editClientData, setEditClientData] = useState(null);
  const [editPackageData, setEditPackageData] = useState(null);
  const [showRefModal, setShowRefModal] = useState(false);
  const [editRefData, setEditRefData] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');

  const emptyClient = { name: '', contact: '', email: '' };
  const emptyPackage = { client_id: '', name: '', total_videos: 4, delivered: 0, posted: 0, status: 'Ativo', value: '', paid: 0, start_date: new Date().toISOString().slice(0, 10), end_date: '', billing_cycle: 'Mensal' };
  const emptyRef = { client_id: '', title: '', url: '', notes: '' };
  const [clientForm, setClientForm] = useState(emptyClient);
  const [pkgForm, setPkgForm] = useState(emptyPackage);
  const [refForm, setRefForm] = useState(emptyRef);

  const openClientModal = (c = null) => {
    setEditClientData(c);
    setClientForm(c ? { name: c.name, contact: c.contact, email: c.email } : emptyClient);
    setShowClientModal(true);
  };

  const saveClient = async () => {
    if (!clientForm.name.trim()) return;
    setSaving(true);
    if (editClientData) {
      const result = await updateClient(editClientData.id, clientForm);
      result ? toast.success('Cliente atualizado') : toast.error('Erro ao atualizar cliente');
    } else {
      const result = await addClient(clientForm);
      result ? toast.success(`Cliente "${clientForm.name}" cadastrado`) : toast.error('Erro ao cadastrar cliente');
    }
    setSaving(false);
    setShowClientModal(false);
  };

  const handleDeleteClient = async (id) => {
    const name = clients.find(c => c.id === id)?.name || '';
    const result = await deleteClient(id);
    if (selectedClient === id) setSelectedClient(null);
    result ? toast.success(`Cliente "${name}" removido`) : toast.error('Erro ao remover cliente');
  };

  const openPkgModal = (clientId, pkg = null) => {
    setEditPackageData(pkg);
    setPkgForm(pkg ? { 
      client_id: pkg.client_id,
      name: pkg.name,
      total_videos: pkg.total_videos,
      delivered: pkg.delivered,
      posted: pkg.posted,
      status: pkg.status,
      value: pkg.value,
      paid: pkg.paid,
      duration_months: pkg.duration_months || 1,
      start_date: pkg.start_date || new Date().toISOString().slice(0, 10),
    } : { ...emptyPackage, client_id: clientId });
    setShowPackageModal(true);
  };

  const savePkg = async () => {
    if (!pkgForm.name.trim()) return;
    setSaving(true);
    const data = {
      ...pkgForm,
      total_videos: Number(pkgForm.total_videos),
      delivered: Number(pkgForm.delivered),
      posted: Number(pkgForm.posted),
      value: Number(pkgForm.value),
      paid: Number(pkgForm.paid),
      duration_months: Number(pkgForm.duration_months) || 1,
      start_date: pkgForm.start_date,
      end_date: pkgForm.end_date || null,
    };
    if (editPackageData) {
      const result = await updatePackage(editPackageData.id, data);
      result ? toast.success('Pacote atualizado') : toast.error('Erro ao atualizar pacote');
    } else {
      const result = await addPackage(data);
      result ? toast.success(`Pacote "${pkgForm.name}" criado`) : toast.error('Erro ao criar pacote');
    }
    setSaving(false);
    setShowPackageModal(false);
  };

  const openRefModal = (clientId, ref = null) => {
    setEditRefData(ref);
    setRefForm(ref ? { client_id: ref.client_id, title: ref.title, url: ref.url, notes: ref.notes } : { ...emptyRef, client_id: clientId });
    setShowRefModal(true);
  };

  const saveRef = async () => {
    if (!refForm.title.trim() || !refForm.url.trim()) return;
    setSaving(true);
    if (editRefData) {
      const result = await updateReference(editRefData.id, refForm);
      result ? toast.success('Referência atualizada') : toast.error('Erro ao atualizar referência');
    } else {
      const result = await addReference(refForm);
      result ? toast.success('Referência adicionada') : toast.error('Erro ao adicionar referência');
    }
    setSaving(false);
    setShowRefModal(false);
  };

  const handleDeleteRef = async (id) => {
    const result = await deleteReference(id);
    result ? toast.success('Referência removida') : toast.error('Erro ao remover referência');
  };

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

  const renderClientItem = (c, mode) => {
    const clientPkgs = packages.filter(p => p.client_id === c.id);
    const isGrid = mode === 'grid';
    const isListItem = mode === 'list-item';
    const isListDetail = mode === 'list-detail';
    
    const isExpanded = isListDetail || (isGrid && selectedClient === c.id);
    const isSelectedListItem = isListItem && selectedClient === c.id;

    return (
      <div 
        key={c.id + mode} 
        className="card"
        style={isListItem ? { 
          padding: '0.85rem', 
          cursor: 'pointer', 
          transition: 'all 0.2s ease', 
          border: isSelectedListItem ? '1px solid var(--amber)' : '1px solid var(--border)',
          background: isSelectedListItem ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-card)'
        } : (isListDetail ? { padding: '1.5rem', animation: 'fadeIn 0.3s' } : {})} 
        onClick={() => { if (isListItem) setSelectedClient(c.id); }}
      >
        <div className="flex-between" style={{ marginBottom: isExpanded || isGrid ? '1rem' : 0 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: isListDetail ? '1.35rem' : '1.05rem', margin: 0, color: isListDetail || isSelectedListItem ? 'var(--amber)' : 'var(--text-primary)' }}>{c.name}</h3>
            {isListItem && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '1rem' }}>
                <span><Phone size={11} style={{ display: 'inline', marginRight: 4 }} />{c.contact || '—'}</span>
                <span><Package size={11} style={{ display: 'inline', marginRight: 4 }} />{clientPkgs.length} pct{clientPkgs.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          
          {(isGrid || isListDetail) && (
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              {c.contact && (
                <a href={`https://wa.me/${c.contact.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.4rem', color: '#25D366', borderColor: 'rgba(37,211,102,0.3)' }} title="Falar no WhatsApp">
                  <MessageCircle size={13} />
                </a>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => openClientModal(c)} style={{ padding: '0.25rem 0.4rem' }}>
                <Edit size={13} />
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteClient(c.id)} style={{ padding: '0.25rem 0.4rem' }}>
                <X size={13} />
              </button>
            </div>
          )}
        </div>

        {(isExpanded || isGrid) && (
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span><Phone size={12} style={{ display: 'inline', marginRight: 4 }} />{c.contact || '—'}</span>
              {c.email && <span><Mail size={12} style={{ display: 'inline', marginRight: 4 }} />{c.email}</span>}
            </div>

            <div className="flex-between" style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              {isGrid ? (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => { e.stopPropagation(); setSelectedClient(isExpanded ? null : c.id); }}
                  style={{ fontSize: '0.72rem', gap: '0.35rem' }}
                >
                  <Package size={13} />
                  {clientPkgs.length} pacote{clientPkgs.length !== 1 ? 's' : ''}
                  <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>{isExpanded ? '▲' : '▼'}</span>
                </button>
              ) : (
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Package size={12} style={{ display: 'inline', marginRight: 4 }} /> 
                  Histórico: {clientPkgs.length} pacote{clientPkgs.length !== 1 ? 's' : ''} fechado{clientPkgs.length !== 1 ? 's' : ''}
                </span>
              )}
              <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); openPkgModal(c.id); }}>
                <Plus size={14} /> Pacote
              </button>
            </div>

            {isExpanded && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <div className="flex-between mb-1">
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                    <Package size={12} style={{ display: 'inline', marginRight: 4 }} /> Pacotes
                  </span>
                </div>
                {clientPkgs.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum pacote cadastrado</p>
                ) : (
                  clientPkgs.map(pkg => {
                    const remaining = pkg.total_videos - pkg.delivered;
                    const progress = pkg.total_videos > 0 ? (pkg.delivered / pkg.total_videos) * 100 : 0;
                    const isLow = remaining <= 2 && pkg.status === 'Ativo';
                    return (
                      <div
                        key={pkg.id}
                        className="card"
                        style={{
                          marginBottom: '0.5rem',
                          padding: '0.85rem',
                          border: isLow ? '1px solid rgba(239,68,68,0.3)' : undefined,
                          background: isLow ? 'rgba(239,68,68,0.05)' : undefined,
                        }}
                      >
                        <div className="flex-between">
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{pkg.name}</span>
                            <span className={`badge badge-${getStatusBadge(pkg.status)}`} style={{ marginLeft: '0.5rem' }}>
                              {getStatusIcon(pkg.status)} {pkg.status}
                            </span>
                            <div style={{ marginTop: '0.2rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              <span style={{ marginRight: '0.5rem' }}>🔄 {pkg.billing_cycle || 'Mensal'}</span>
                              <span style={{ marginRight: '0.5rem' }}>⏳ {pkg.end_date ? `Até ${new Date(pkg.end_date + 'T12:00').toLocaleDateString('pt-BR')}` : 'Contínuo'}</span>
                              <span>💰 R$ {Number(pkg.value || 0).toLocaleString('pt-BR')} / ciclo</span>
                            </div>
                          </div>
                          <button className="btn btn-secondary btn-sm" onClick={() => openPkgModal(c.id, pkg)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}>
                            Editar
                          </button>
                        </div>

                        {isLow && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 500 }}>
                            <AlertTriangle size={14} />
                            {remaining === 0 ? 'Pacote finalizado!' : `Apenas ${remaining} vídeo${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}`}
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.72rem' }}>
                          <div>
                            <div className="text-muted">Total</div>
                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{pkg.total_videos}</div>
                          </div>
                          <div>
                            <div className="text-muted">Entregues</div>
                            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--success)' }}>{pkg.delivered}</div>
                          </div>
                          <div>
                            <div className="text-muted">Postados</div>
                            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--info)' }}>{pkg.posted}</div>
                          </div>
                          <div>
                            <div className="text-muted">Restantes</div>
                            <div style={{ fontWeight: 600, fontSize: '1rem', color: isLow ? 'var(--danger)' : 'var(--amber)' }}>{remaining}</div>
                          </div>
                        </div>

                        <div style={{ marginTop: '0.5rem' }}>
                          <div className="progress-bar">
                            <div className={`progress-fill${isLow ? ' danger' : ''}`} style={{ width: `${progress}%` }} />
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', textAlign: 'right' }}>
                            {progress.toFixed(0)}% entregue
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {isExpanded && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <div className="flex-between mb-1">
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                    <Bookmark size={12} style={{ display: 'inline', marginRight: 4 }} /> Referências (Moodboard)
                  </span>
                  <button className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => openRefModal(c.id)}>
                    <Plus size={12} /> Add
                  </button>
                </div>
                
                {references.filter(r => r.client_id === c.id).length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma referência salva</p>
                ) : (
                  <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                    {references.filter(r => r.client_id === c.id).map(ref => (
                      <div key={ref.id} className="card" style={{ padding: '0.75rem', position: 'relative' }}>
                        <h4 style={{ fontSize: '0.85rem', marginBottom: '0.2rem', paddingRight: '1rem' }}>{ref.title}</h4>
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', marginBottom: '0.5rem' }}>
                          <LinkIcon size={10} /> Abrir Link
                        </a>
                        {ref.notes && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0' }}>{ref.notes}</p>}
                        
                        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.2rem' }}>
                          <button onClick={() => openRefModal(c.id, ref)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit size={12} /></button>
                          <button onClick={() => handleDeleteRef(ref.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="fade-in">
      <div className="page-header" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <h2><Users size={24} /> Clientes & Pacotes</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input" style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '2rem', height: '32px', minWidth: '200px' }}
            />
          </div>
          <div style={{ display: 'flex', background: 'var(--bg-modifier)', padding: '0.2rem', borderRadius: '0.5rem', border: '1px solid var(--border)', marginRight: '0.5rem' }}>
            <button className="btn btn-sm" style={{ padding: '0.25rem 0.5rem', background: viewMode === 'list' ? 'var(--bg-card)' : 'transparent', color: viewMode === 'list' ? 'var(--amber)' : 'var(--text-muted)', border: 'none', boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none' }} onClick={() => setViewMode('list')} title="Visualizar em Lista">
              <List size={14} />
            </button>
            <button className="btn btn-sm" style={{ padding: '0.25rem 0.5rem', background: viewMode === 'grid' ? 'var(--bg-card)' : 'transparent', color: viewMode === 'grid' ? 'var(--amber)' : 'var(--text-muted)', border: 'none', boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.2)' : 'none' }} onClick={() => setViewMode('grid')} title="Visualizar em Grade">
              <LayoutGrid size={14} />
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => openClientModal()}>
            <Plus size={16} /> Novo Cliente
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="card-grid">
          {filteredClients.map(c => renderClientItem(c, 'grid'))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {filteredClients.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>Nenhum cliente encontrado.</p>
            ) : (
              filteredClients.map(c => renderClientItem(c, 'list-item'))
            )}
          </div>
          <div style={{ position: 'sticky', top: '2rem' }}>
            {selectedClient && clients.find(c => c.id === selectedClient) ? (
              renderClientItem(clients.find(c => c.id === selectedClient), 'list-detail')
            ) : (
              <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Users size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Selecione um cliente</h3>
                <p style={{ fontSize: '0.85rem' }}>Clique em um cliente na lista ao lado para ver seu histórico, pacotes e referências.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {clients.length === 0 && (
        <div className="empty-state">
          <Users size={48} />
          <p>Nenhum cliente cadastrado ainda</p>
        </div>
      )}

      {/* Client Modal */}
      {showClientModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowClientModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3><Users size={18} /> {editClientData ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button className="modal-close" onClick={() => setShowClientModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nome</label>
                <input className="form-control" placeholder="Nome completo" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contato</label>
                  <input
                    className="form-control"
                    placeholder="(00) 00000-0000"
                    value={clientForm.contact}
                    inputMode="numeric"
                    maxLength={16}
                    onChange={e => setClientForm({ ...clientForm, contact: formatPhone(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Email <span style={{ fontWeight: 400, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                  <input className="form-control" type="email" placeholder="email@exemplo.com" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowClientModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveClient} disabled={saving}>
                {saving ? 'Salvando...' : editClientData ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Package Modal */}
      {showPackageModal && (() => {
        const isEditing = !!editPackageData;
        const clientName = clients.find(c => c.id === pkgForm.client_id)?.name || '';
        const totalVids = Number(pkgForm.total_videos) || 0;
        const pkgValue = Number(pkgForm.value) || 0;
        const perVideo = totalVids > 0 ? pkgValue / totalVids : 0;
        const videoPresets = [4, 8, 12];

        return (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPackageModal(false); }}>
            <div className="modal">
              <div className="modal-header">
                <div>
                  <h3><Package size={18} /> {isEditing ? 'Editar Pacote' : 'Novo Pacote'}</h3>
                  {clientName && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      para <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{clientName}</span>
                    </p>
                  )}
                </div>
                <button className="modal-close" onClick={() => setShowPackageModal(false)}><X size={18} /></button>
              </div>
              <div className="modal-body">

                {/* Section 1: Basics */}
                <div className="form-group">
                  <label>Nome do Pacote</label>
                  <input className="form-control" placeholder="Ex: Mensal Premium" value={pkgForm.name} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} />
                </div>

                {/* Quick presets for video count */}
                <div className="form-group">
                  <label>Vídeos por mês</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {videoPresets.map(n => (
                      <button
                        key={n}
                        type="button"
                        className={`btn btn-sm ${Number(pkgForm.total_videos) === n ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', height: 'auto', padding: '0.5rem 0.25rem', gap: '0.05rem' }}
                        onClick={() => setPkgForm({ ...pkgForm, total_videos: n })}
                      >
                        <span style={{ fontSize: '1rem', fontWeight: 700 }}>{n}</span>
                        <span style={{ fontSize: '0.62rem', opacity: 0.65 }}>vídeos</span>
                      </button>
                    ))}
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        placeholder="Outro"
                        value={videoPresets.includes(Number(pkgForm.total_videos)) ? '' : pkgForm.total_videos}
                        onChange={e => setPkgForm({ ...pkgForm, total_videos: e.target.value })}
                        style={{ height: '100%', textAlign: 'center', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Duration */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Ciclo de Cobrança</label>
                    <select className="form-control" value={pkgForm.billing_cycle || 'Mensal'} onChange={e => setPkgForm({ ...pkgForm, billing_cycle: e.target.value })}>
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
                    <input type="date" className="form-control" value={pkgForm.start_date || ''} onChange={e => setPkgForm({ ...pkgForm, start_date: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Término do Contrato <span style={{ fontWeight: 400, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(Deixe vazio para Contínuo)</span></label>
                  <input type="date" className="form-control" value={pkgForm.end_date || ''} onChange={e => setPkgForm({ ...pkgForm, end_date: e.target.value })} />
                </div>

                {/* Section 3: Valor */}
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label>💰 Valor por Ciclo ({pkgForm.billing_cycle || 'Mensal'}) (R$)</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      step="100"
                      placeholder="0"
                      value={pkgForm.value}
                      onChange={e => setPkgForm({ ...pkgForm, value: e.target.value })}
                      style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.02em' }}
                    />
                  </div>
                  {pkgValue > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {totalVids > 0 && (
                        <span>≈ <span style={{ color: 'var(--amber)', fontWeight: 600 }}>R$ {perVideo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>/vídeo</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 4: Advanced (only when editing) */}
                {isEditing && (
                  <>
                    <p style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.6rem', marginTop: '0.5rem' }}>
                      Progresso & Status
                    </p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Entregues</label>
                        <input type="number" className="form-control" min="0" max={totalVids} value={pkgForm.delivered} onChange={e => setPkgForm({ ...pkgForm, delivered: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Postados</label>
                        <input type="number" className="form-control" min="0" max={Number(pkgForm.delivered)} value={pkgForm.posted} onChange={e => setPkgForm({ ...pkgForm, posted: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Valor Pago (R$)</label>
                        <input type="number" className="form-control" min="0" max={pkgValue} step="100" value={pkgForm.paid} onChange={e => setPkgForm({ ...pkgForm, paid: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Status</label>
                        <select className="form-control" value={pkgForm.status} onChange={e => setPkgForm({ ...pkgForm, status: e.target.value })}>
                          <option>Ativo</option>
                          <option>Pausado</option>
                          <option>Concluído</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowPackageModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={savePkg} disabled={saving || !pkgForm.name.trim()}>
                  {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Pacote'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Reference Modal */}
      {showRefModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRefModal(false); }}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3><Bookmark size={18} /> {editRefData ? 'Editar Referência' : 'Nova Referência'}</h3>
              <button className="modal-close" onClick={() => setShowRefModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Título / Ideia</label>
                <input className="form-control" placeholder="Ex: Transição de câmera Reels" value={refForm.title} onChange={e => setRefForm({ ...refForm, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Link (URL)</label>
                <input className="form-control" placeholder="https://instagram.com/..." value={refForm.url} onChange={e => setRefForm({ ...refForm, url: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Anotações (Opcional)</label>
                <textarea className="form-control" rows="3" placeholder="Gostei da iluminação, podemos usar a mesma paleta" value={refForm.notes} onChange={e => setRefForm({ ...refForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRefModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveRef} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
