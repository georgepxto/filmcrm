import { useState } from 'react';
import {
  Film, Plus, X, Calendar, CheckSquare, Square, MessageCircle
} from 'lucide-react';
import { useToast } from './Toast';

const STAGES = [
  { key: 'recorded', label: 'Gravado', color: 'var(--warning)' },
  { key: 'edited', label: 'Editado', color: 'var(--amber)' },
  { key: 'delivered', label: 'Entregue', color: 'var(--info)' },
  { key: 'posted', label: 'Postado', color: 'var(--success)' },
];

const STAGE_ORDER = ['recorded', 'edited', 'delivered', 'posted'];

export default function PostControl({ clients, videos, packages, addVideo, updateVideo, deleteVideo }) {
  const toast = useToast();
  const [filterClient, setFilterClient] = useState('');
  const [viewMode, setViewMode] = useState('kanban');
  const [showModal, setShowModal] = useState(false);
  const [editVideoData, setEditVideoData] = useState(null);
  const [saving, setSaving] = useState(false);

  // Drag state
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const emptyForm = { client_id: '', package_id: '', title: '', recorded: false, edited: false, delivered: false, posted: false, planned_date: '', actual_date: '' };
  const [form, setForm] = useState(emptyForm);

  const getName = (id) => clients.find(c => c.id === id)?.name || '—';
  const getPhone = (id) => clients.find(c => c.id === id)?.contact || '';
  const filtered = filterClient ? videos.filter(v => v.client_id === filterClient) : videos;

  const getStage = (v) => {
    if (v.posted) return 'posted';
    if (v.delivered) return 'delivered';
    if (v.edited) return 'edited';
    return 'recorded';
  };

  // ── Drag & Drop handlers ──
  const handleDragStart = (e, videoId) => {
    setDraggedId(videoId);
    e.dataTransfer.effectAllowed = 'move';
    // Add ghost image effect
    e.dataTransfer.setData('text/plain', videoId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStageKey) => {
    e.preventDefault();
    if (!draggedId) return;
    setDragOverColumn(null);

    const targetIdx = STAGE_ORDER.indexOf(targetStageKey);
    const updates = {};
    STAGE_ORDER.forEach((stage, idx) => {
      updates[stage] = idx <= targetIdx;
    });
    // If dropping in posted, record actual date
    if (targetStageKey === 'posted') {
      const video = videos.find(v => v.id === draggedId);
      if (video && !video.posted) {
        updates.actual_date = new Date().toISOString().slice(0, 10);
      }
    }

    const result = await updateVideo(draggedId, updates);
    setDraggedId(null);
    if (result) {
      const stageLabel = STAGES.find(s => s.key === targetStageKey)?.label || '';
      toast.success(`Vídeo movido para "${stageLabel}"`);
    }
  };

  // ── List view toggle ──
  const toggleStage = async (videoId, stage) => {
    const v = videos.find(x => x.id === videoId);
    if (!v) return;
    const upd = { [stage]: !v[stage] };
    const order = STAGE_ORDER;
    if (v[stage]) { for (let i = order.indexOf(stage) + 1; i < order.length; i++) upd[order[i]] = false; }
    await updateVideo(videoId, upd);
  };

  const openModal = (video = null) => {
    setEditVideoData(video);
    if (video) {
      setForm({ client_id: video.client_id, package_id: video.package_id || '', title: video.title, recorded: video.recorded, edited: video.edited, delivered: video.delivered, posted: video.posted, planned_date: video.planned_date || '', actual_date: video.actual_date || '' });
    } else {
      const cId = filterClient || clients[0]?.id || '';
      const cp = packages.filter(p => p.client_id === cId);
      setForm({ ...emptyForm, client_id: cId, package_id: cp[0]?.id || '' });
    }
    setShowModal(true);
  };

  const saveVid = async () => {
    if (!form.title.trim() || !form.client_id) return;
    setSaving(true);
    if (editVideoData) {
      const result = await updateVideo(editVideoData.id, form);
      result ? toast.success('Vídeo atualizado') : toast.error('Erro ao atualizar vídeo');
    } else {
      const result = await addVideo(form);
      result ? toast.success(`Vídeo "${form.title}" adicionado`) : toast.error('Erro ao adicionar vídeo');
    }
    setSaving(false);
    setShowModal(false);
  };

  const cpf = packages.filter(p => p.client_id === form.client_id);

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
          <button className="btn btn-primary" onClick={() => openModal()}><Plus size={16} /> Vídeo</button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="kanban-board">
          {STAGES.map(stage => {
            const col = filtered.filter(v => getStage(v) === stage.key);
            const isDragTarget = dragOverColumn === stage.key;
            return (
              <div
                key={stage.key}
                className={`kanban-column${isDragTarget ? ' kanban-drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={() => setDragOverColumn(stage.key)}
                onDragLeave={(e) => {
                  // Only clear if leaving the column entirely (not entering a child)
                  if (!e.currentTarget.contains(e.relatedTarget)) setDragOverColumn(null);
                }}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <div className="kanban-column-header" style={{ borderColor: isDragTarget ? stage.color : 'var(--amber-dim)' }}>
                  <span style={{ color: isDragTarget ? stage.color : undefined }}>{stage.label}</span>
                  <span className="count">{col.length}</span>
                </div>

                {col.map(v => (
                  <div
                    key={v.id}
                    className={`kanban-card${draggedId === v.id ? ' kanban-dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, v.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="kanban-drag-handle" title="Arraste para mover">⠿</div>
                    <h5>{v.title}</h5>
                    <div className="flex-between">
                      <p>{getName(v.client_id)}</p>
                      {getPhone(v.client_id) && (
                        <a href={`https://wa.me/${getPhone(v.client_id).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#25D366', marginLeft: '0.5rem' }} title="Falar no WhatsApp" onDragStart={e => e.preventDefault()}>
                          <MessageCircle size={13} />
                        </a>
                      )}
                    </div>
                    {v.planned_date && (
                      <p style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={10} /> {new Date(v.planned_date + 'T12:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="flex gap-1" style={{ fontSize: '0.65rem' }}>
                        {STAGES.map(s => (
                          <span key={s.key} style={{ color: v[s.key] ? s.color : 'var(--text-muted)', opacity: v[s.key] ? 1 : 0.35 }}>●</span>
                        ))}
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem' }}
                        onClick={() => deleteVideo(v.id)}
                        title="Excluir"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                ))}

                {col.length === 0 && (
                  <div className={`kanban-empty${isDragTarget ? ' kanban-empty-active' : ''}`}>
                    {isDragTarget ? '↓ Solte aqui' : 'Nenhum vídeo'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Vídeo</th><th>Cliente</th><th>Gravado</th><th>Editado</th><th>Entregue</th><th>Postado</th><th>Previsão</th><th>Postagem Real</th><th></th></tr></thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v.title}</td>
                  <td>{getName(v.client_id)}</td>
                  {STAGES.map(s => (
                    <td key={s.key}><button onClick={() => toggleStage(v.id, s.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: v[s.key] ? s.color : 'var(--text-muted)', padding: 0 }}>{v[s.key] ? <CheckSquare size={18} /> : <Square size={18} />}</button></td>
                  ))}
                  <td>{v.planned_date ? new Date(v.planned_date + 'T12:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td>{v.actual_date ? new Date(v.actual_date + 'T12:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-secondary btn-sm" onClick={() => openModal(v)} style={{ padding: '0.2rem 0.4rem' }}><Film size={12} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteVideo(v.id)} style={{ padding: '0.2rem 0.4rem' }}><X size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && <div className="empty-state mt-2"><Film size={48} /><p>Nenhum vídeo encontrado</p></div>}

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header"><h3><Film size={18} /> {editVideoData ? 'Editar Vídeo' : 'Novo Vídeo'}</h3><button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button></div>
            <div className="modal-body">
              <div className="form-group"><label>Título</label><input className="form-control" placeholder="Ex: Reel Behind the Scenes" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div className="form-row">
                <div className="form-group"><label>Cliente</label><select className="form-control" value={form.client_id} onChange={e => { const p = packages.filter(x => x.client_id === e.target.value); setForm({ ...form, client_id: e.target.value, package_id: p[0]?.id || '' }); }}><option value="">Selecione...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="form-group"><label>Pacote</label><select className="form-control" value={form.package_id} onChange={e => setForm({ ...form, package_id: e.target.value })}><option value="">Selecione...</option>{cpf.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Data Prevista</label><input type="date" className="form-control" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} /></div>
                <div className="form-group"><label>Data Real de Postagem</label><input type="date" className="form-control" value={form.actual_date} onChange={e => setForm({ ...form, actual_date: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveVid} disabled={saving}>{saving ? 'Salvando...' : editVideoData ? 'Salvar' : 'Adicionar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
