import { useState } from 'react';
import {
  Users, Plus, X, Package, Phone, Mail, AlertTriangle,
  Pause, CheckCircle, Play, Edit,
} from 'lucide-react';
import { uid } from '../data';

export default function Clients({ clients, setClients, packages, setPackages }) {
  const [showClientModal, setShowClientModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [editPackage, setEditPackage] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  const emptyClient = { name: '', contact: '', email: '' };
  const emptyPackage = { clientId: '', name: '', totalVideos: 4, delivered: 0, posted: 0, status: 'Ativo', value: 0, paid: 0 };
  const [clientForm, setClientForm] = useState(emptyClient);
  const [pkgForm, setPkgForm] = useState(emptyPackage);

  const openClientModal = (c = null) => {
    setEditClient(c);
    setClientForm(c ? { name: c.name, contact: c.contact, email: c.email } : emptyClient);
    setShowClientModal(true);
  };

  const saveClient = () => {
    if (!clientForm.name.trim()) return;
    if (editClient) {
      setClients(prev => prev.map(c => c.id === editClient.id ? { ...c, ...clientForm } : c));
    } else {
      setClients(prev => [...prev, { id: uid(), ...clientForm }]);
    }
    setShowClientModal(false);
  };

  const deleteClient = (id) => {
    setClients(prev => prev.filter(c => c.id !== id));
    setPackages(prev => prev.filter(p => p.clientId !== id));
    if (selectedClient === id) setSelectedClient(null);
  };

  const openPkgModal = (clientId, pkg = null) => {
    setEditPackage(pkg);
    setPkgForm(pkg ? { ...pkg } : { ...emptyPackage, clientId });
    setShowPackageModal(true);
  };

  const savePkg = () => {
    if (!pkgForm.name.trim()) return;
    const data = {
      ...pkgForm,
      totalVideos: Number(pkgForm.totalVideos),
      delivered: Number(pkgForm.delivered),
      posted: Number(pkgForm.posted),
      value: Number(pkgForm.value),
      paid: Number(pkgForm.paid),
    };
    if (editPackage) {
      setPackages(prev => prev.map(p => p.id === editPackage.id ? { ...p, ...data } : p));
    } else {
      setPackages(prev => [...prev, { id: uid(), ...data }]);
    }
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
          const clientPkgs = packages.filter(p => p.clientId === c.id);
          return (
            <div key={c.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setSelectedClient(selectedClient === c.id ? null : c.id)}>
              <div className="flex-between mb-1">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>{c.name}</h3>
                <div className="flex gap-1">
                  <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openClientModal(c); }} style={{ padding: '0.25rem 0.4rem' }}>
                    <Edit size={13} />
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); deleteClient(c.id); }} style={{ padding: '0.25rem 0.4rem' }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span><Phone size={12} style={{ display: 'inline', marginRight: 4 }} />{c.contact}</span>
                <span><Mail size={12} style={{ display: 'inline', marginRight: 4 }} />{c.email}</span>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {clientPkgs.length} pacote{clientPkgs.length !== 1 ? 's' : ''}
              </div>

              {/* Expanded packages */}
              {selectedClient === c.id && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }} onClick={e => e.stopPropagation()}>
                  <div className="flex-between mb-1">
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                      <Package size={12} style={{ display: 'inline', marginRight: 4 }} /> Pacotes
                    </span>
                    <button className="btn btn-primary btn-sm" onClick={() => openPkgModal(c.id)}>
                      <Plus size={14} /> Pacote
                    </button>
                  </div>
                  {clientPkgs.length === 0 ? (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum pacote cadastrado</p>
                  ) : (
                    clientPkgs.map(pkg => {
                      const remaining = pkg.totalVideos - pkg.delivered;
                      const progress = pkg.totalVideos > 0 ? (pkg.delivered / pkg.totalVideos) * 100 : 0;
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
                              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{pkg.totalVideos}</div>
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
              <h3><Users size={18} /> {editClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
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
                  <input className="form-control" placeholder="(00) 00000-0000" value={clientForm.contact} onChange={e => setClientForm({ ...clientForm, contact: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input className="form-control" type="email" placeholder="email@exemplo.com" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowClientModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveClient}>{editClient ? 'Salvar' : 'Cadastrar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Package Modal */}
      {showPackageModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPackageModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3><Package size={18} /> {editPackage ? 'Editar Pacote' : 'Novo Pacote'}</h3>
              <button className="modal-close" onClick={() => setShowPackageModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nome do Pacote</label>
                <input className="form-control" placeholder="Ex: Pacote Premium Mensal" value={pkgForm.name} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total de Vídeos</label>
                  <input type="number" className="form-control" min="1" value={pkgForm.totalVideos} onChange={e => setPkgForm({ ...pkgForm, totalVideos: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Vídeos Entregues</label>
                  <input type="number" className="form-control" min="0" value={pkgForm.delivered} onChange={e => setPkgForm({ ...pkgForm, delivered: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Vídeos Postados</label>
                  <input type="number" className="form-control" min="0" value={pkgForm.posted} onChange={e => setPkgForm({ ...pkgForm, posted: e.target.value })} />
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
              <div className="form-row">
                <div className="form-group">
                  <label>Valor do Pacote (R$)</label>
                  <input type="number" className="form-control" min="0" step="100" value={pkgForm.value} onChange={e => setPkgForm({ ...pkgForm, value: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Valor Pago (R$)</label>
                  <input type="number" className="form-control" min="0" step="100" value={pkgForm.paid} onChange={e => setPkgForm({ ...pkgForm, paid: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPackageModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={savePkg}>{editPackage ? 'Salvar' : 'Criar Pacote'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
