import { useState } from 'react';
import {
  Users, Plus, X, Package, Phone, Mail, AlertTriangle,
  Pause, CheckCircle, Play, Edit,
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

export default function Clients({ clients, packages, addClient, updateClient, deleteClient, addPackage, updatePackage }) {
  const toast = useToast();
  const [showClientModal, setShowClientModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editClientData, setEditClientData] = useState(null);
  const [editPackageData, setEditPackageData] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyClient = { name: '', contact: '', email: '' };
  const emptyPackage = { client_id: '', name: '', total_videos: 4, delivered: 0, posted: 0, status: 'Ativo', value: 0, paid: 0, duration_months: 1, start_date: new Date().toISOString().slice(0, 10) };
  const [clientForm, setClientForm] = useState(emptyClient);
  const [pkgForm, setPkgForm] = useState(emptyPackage);

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

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2><Users size={24} /> Clientes & Pacotes</h2>
        <button className="btn btn-primary" onClick={() => openClientModal()}>
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="card-grid">
        {clients.map(c => {
          const clientPkgs = packages.filter(p => p.client_id === c.id);
          const isExpanded = selectedClient === c.id;
          return (
            <div key={c.id} className="card">
              <div className="flex-between mb-1">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>{c.name}</h3>
                <div className="flex gap-1">
                  <button className="btn btn-secondary btn-sm" onClick={() => openClientModal(c)} style={{ padding: '0.25rem 0.4rem' }}>
                    <Edit size={13} />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteClient(c.id)} style={{ padding: '0.25rem 0.4rem' }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span><Phone size={12} style={{ display: 'inline', marginRight: 4 }} />{c.contact || '—'}</span>
                {c.email && <span><Mail size={12} style={{ display: 'inline', marginRight: 4 }} />{c.email}</span>}
              </div>

              {/* Footer actions — always visible */}
              <div className="flex-between" style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedClient(isExpanded ? null : c.id)}
                  style={{ fontSize: '0.72rem', gap: '0.35rem' }}
                >
                  <Package size={13} />
                  {clientPkgs.length} pacote{clientPkgs.length !== 1 ? 's' : ''}
                  <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>{isExpanded ? '▲' : '▼'}</span>
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => openPkgModal(c.id)}>
                  <Plus size={14} /> Pacote
                </button>
              </div>

              {/* Expanded packages list */}
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
            </div>
          );
        })}
      </div>

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
        const durMonths = Number(pkgForm.duration_months) || 1;
        const perVideo = totalVids > 0 ? pkgValue / totalVids : 0;
        const monthlyValue = durMonths > 0 ? pkgValue / durMonths : pkgValue;
        const videoPresets = [4, 8, 12];
        const durationPresets = [
          { label: 'Avulso', value: 1 },
          { label: '3 meses', value: 3 },
          { label: '6 meses', value: 6 },
          { label: '12 meses', value: 12 },
        ];

        // Compute end date
        const endDate = (() => {
          if (!pkgForm.start_date) return null;
          const d = new Date(pkgForm.start_date + 'T12:00');
          d.setMonth(d.getMonth() + durMonths);
          return d;
        })();

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
                <div className="form-group">
                  <label>Duração do Contrato</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {durationPresets.map(d => (
                      <button
                        key={d.value}
                        type="button"
                        className={`btn btn-sm ${durMonths === d.value ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, justifyContent: 'center', fontSize: '0.72rem', padding: '0.45rem 0.25rem' }}
                        onClick={() => setPkgForm({ ...pkgForm, duration_months: d.value })}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  {!durationPresets.some(d => d.value === durMonths) && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--amber)', marginBottom: '0.3rem' }}>Personalizado: {durMonths} meses</div>
                  )}
                </div>

                {/* Start date + summary */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Início do Contrato</label>
                    <input type="date" className="form-control" value={pkgForm.start_date} onChange={e => setPkgForm({ ...pkgForm, start_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Término</label>
                    <div className="form-control" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', cursor: 'default', background: 'var(--bg-primary)' }}>
                      {endDate ? endDate.toLocaleDateString('pt-BR') : '—'}
                    </div>
                  </div>
                </div>

                {/* Section 3: Valor */}
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label>💰 Valor Total do Contrato (R$)</label>
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
                      {durMonths > 1 && (
                        <span>≈ <span style={{ color: 'var(--success)', fontWeight: 600 }}>R$ {monthlyValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>/mês</span>
                      )}
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
    </div>
  );
}
