import { useState } from 'react';
import {
  Film, Filter, Plus, X, Calendar, CheckSquare, Square, ChevronRight,
} from 'lucide-react';
import { uid } from '../data';

const STAGES = [
  { key: 'recorded', label: 'Gravado', color: 'var(--warning)' },
  { key: 'edited', label: 'Editado', color: 'var(--amber)' },
  { key: 'delivered', label: 'Entregue', color: 'var(--info)' },
  { key: 'posted', label: 'Postado', color: 'var(--success)' },
];

export default function PostControl({ clients, videos, setVideos, packages }) {
  const [filterClient, setFilterClient] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [showModal, setShowModal] = useState(false);
  const [editVideo, setEditVideo] = useState(null);

  const emptyForm = { clientId: '', packageId: '', title: '', recorded: false, edited: false, delivered: false, posted: false, plannedDate: '', actualDate: '' };
  const [form, setForm] = useState(emptyForm);

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '—';

  const filtered = filterClient ? videos.filter(v => v.clientId === filterClient) : videos;

  const toggleStage = (videoId, stage) => {
    setVideos(prev => prev.map(v => {
      if (v.id !== videoId) return v;
      const updated = { ...v, [stage]: !v[stage] };
      // Auto-cascade: if unchecking a stage, uncheck later stages
      const order = ['recorded', 'edited', 'delivered', 'posted'];
      const idx = order.indexOf(stage);
      if (!updated[stage]) {
        for (let i = idx + 1; i < order.length; i++) updated[order[i]] = false;
      }
      return updated;
    }));
  };

  const openModal = (video = null) => {
    setEditVideo(video);
    if (video) {
      setForm({ ...video });
    } else {
      const cId = filterClient || clients[0]?.id || '';
      const clientPkgs = packages.filter(p => p.clientId === cId);
      setForm({ ...emptyForm, clientId: cId, packageId: clientPkgs[0]?.id || '' });
    }
    setShowModal(true);
  };

  const saveVideo = () => {
    if (!form.title.trim() || !form.clientId) return;
    if (editVideo) {
      setVideos(prev => prev.map(v => v.id === editVideo.id ? { ...v, ...form } : v));
    } else {
      setVideos(prev => [...prev, { id: uid(), ...form }]);
    }
    setShowModal(false);
  };

  const deleteVideo = (id) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  // Get current stage for kanban placement
  const getVideoStage = (v) => {
    if (v.posted) return 'posted';
    if (v.delivered) return 'delivered';
    if (v.edited) return 'edited';
    if (v.recorded) return 'recorded';
    return 'recorded'; // not started goes to first column
  };

  const advanceVideo = (videoId) => {
    setVideos(prev => prev.map(v => {
      if (v.id !== videoId) return v;
      const updated = { ...v };
      if (!updated.recorded) { updated.recorded = true; }
      else if (!updated.edited) { updated.edited = true; }
      else if (!updated.delivered) { updated.delivered = true; }
      else if (!updated.posted) { updated.posted = true; updated.actualDate = new Date().toISOString().slice(0, 10); }
      return updated;
    }));
  };

  const clientPkgsForForm = packages.filter(p => p.clientId === form.clientId);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2><Film size={24} /> Controle de Postagens</h2>
        <div className="flex gap-1">
          <select className="form-control" style={{ minWidth: 180 }} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
            <option value="">Todos os clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className={`btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setViewMode('kanban')}>Kanban</button>
          <button className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setViewMode('list')}>Lista</button>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={16} /> Vídeo
          </button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="kanban-board">
          {STAGES.map(stage => {
            const stageVideos = filtered.filter(v => getVideoStage(v) === stage.key && !STAGES.slice(STAGES.indexOf(stage) + 1).some(s => v[s.key]));
            // Better: show videos whose current highest stage matches
            const columnVideos = filtered.filter(v => {
              const highest = getVideoStage(v);
              return highest === stage.key;
            });
            return (
              <div key={stage.key} className="kanban-column">
                <div className="kanban-column-header" style={{ borderColor: stage.color }}>
                  <span>{stage.label}</span>
                  <span className="count">{columnVideos.length}</span>
                </div>
                {columnVideos.map(v => (
                  <div key={v.id} className="kanban-card">
                    <h5>{v.title}</h5>
                    <p>{getClientName(v.clientId)}</p>
                    {v.plannedDate && (
                      <p style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={10} /> {new Date(v.plannedDate + 'T12:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="flex gap-1" style={{ fontSize: '0.65rem' }}>
                        {STAGES.map(s => (
                          <span key={s.key} style={{ color: v[s.key] ? s.color : 'var(--text-muted)', opacity: v[s.key] ? 1 : 0.4 }}>●</span>
                        ))}
                      </div>
                      {!v.posted && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.15rem 0.4rem', fontSize: '0.68rem' }}
                          onClick={() => advanceVideo(v.id)}
                        >
                          Avançar <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {columnVideos.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Nenhum vídeo
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vídeo</th>
                <th>Cliente</th>
                <th>Gravado</th>
                <th>Editado</th>
                <th>Entregue</th>
                <th>Postado</th>
                <th>Previsão</th>
                <th>Postagem Real</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v.title}</td>
                  <td>{getClientName(v.clientId)}</td>
                  {STAGES.map(s => (
                    <td key={s.key}>
                      <button
                        onClick={() => toggleStage(v.id, s.key)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: v[s.key] ? s.color : 'var(--text-muted)', padding: 0 }}
                      >
                        {v[s.key] ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                  ))}
                  <td>{v.plannedDate ? new Date(v.plannedDate + 'T12:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td>{v.actualDate ? new Date(v.actualDate + 'T12:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-secondary btn-sm" onClick={() => openModal(v)} style={{ padding: '0.2rem 0.4rem' }}>
                        <Film size={12} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteVideo(v.id)} style={{ padding: '0.2rem 0.4rem' }}>
                        <X size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="empty-state mt-2">
          <Film size={48} />
          <p>Nenhum vídeo encontrado</p>
        </div>
      )}

      {/* Video Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3><Film size={18} /> {editVideo ? 'Editar Vídeo' : 'Novo Vídeo'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Título</label>
                <input className="form-control" placeholder="Ex: Reel Behind the Scenes" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cliente</label>
                  <select className="form-control" value={form.clientId} onChange={e => {
                    const pkgs = packages.filter(p => p.clientId === e.target.value);
                    setForm({ ...form, clientId: e.target.value, packageId: pkgs[0]?.id || '' });
                  }}>
                    <option value="">Selecione...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Pacote</label>
                  <select className="form-control" value={form.packageId} onChange={e => setForm({ ...form, packageId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {clientPkgsForForm.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Data Prevista</label>
                  <input type="date" className="form-control" value={form.plannedDate} onChange={e => setForm({ ...form, plannedDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Data Real de Postagem</label>
                  <input type="date" className="form-control" value={form.actualDate} onChange={e => setForm({ ...form, actualDate: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveVideo}>{editVideo ? 'Salvar' : 'Adicionar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
