import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Film, Plus, X, Calendar, CheckSquare, Square, Search,
  Trash2, Edit3, MessageCircle, Clock, ClipboardList, User, CheckCircle, Activity,
  PieChart, AlertCircle, StickyNote
} from 'lucide-react';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';

const OutlineBtn = ({ onClick, children, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'transparent', border: '1px solid var(--amber)', color: disabled ? 'var(--text-muted)' : 'var(--amber)',
      borderRadius: 6, padding: '0.5rem 1.15rem', fontSize: '0.85rem', fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      transition: 'background 0.18s', fontFamily: 'var(--font-body)', opacity: disabled ? 0.5 : 1,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,135,10,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
  >
    {children}
  </button>
);

const STAGE_ORDER = ['edited', 'delivered', 'posted'];

const filterFieldStyle = {
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

const getStatus = (v) => {
  if (v.posted) return { label: 'Postado', color: '#34d399', bg: 'rgba(52,211,153,0.12)' };
  if (v.delivered) return { label: 'Entregue', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' };
  if (v.edited) return { label: 'Editado', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  return { label: 'Não iniciado', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' };
};

export default function PostControl({ clients, videos, packages, addVideo, updateVideo, deleteVideo, pipelineSettings, updatePipelineSettings }) {
  const toast = useToast();
  const [filterClient, setFilterClient] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editVideoData, setEditVideoData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [history, setHistory] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const getStatusColor = (label) => {
    if (label === 'Postado') return 'var(--success)';
    if (label === 'Entregue') return 'var(--info)';
    if (label === 'Editado') return 'var(--warning)';
    return 'var(--danger)';
  };

  const pushHistory = (videoId, fromLabel, toLabel) => {
    const v = videos.find(x => x.id === videoId);
    if (!v) return;
    const entry = { key: Date.now(), title: v.title, client: clients.find(c => c.id === v.client_id)?.name || '—', from: fromLabel, to: toLabel, timestamp: Date.now() };
    setHistory(prev => {
      const next = [entry, ...prev.slice(0, 9)];
      updatePipelineSettings({ history: next });
      return next;
    });
  };

  const [localNotes, setLocalNotes] = useState('');
  useEffect(() => {
    if (pipelineSettings?.notes !== undefined) {
      setLocalNotes(pipelineSettings.notes);
    }
  }, [pipelineSettings?.notes]);

  const HISTORY_TTL = 24 * 60 * 60 * 1000;
  const historyInitRef = useRef(false);

  useEffect(() => {
    if (pipelineSettings && !historyInitRef.current) {
      historyInitRef.current = true;
      const stored = pipelineSettings.history || [];
      setHistory(stored.filter(h => Date.now() - h.timestamp < HISTORY_TTL));
    }
  }, [pipelineSettings]);

  const saveNotes = () => {
    if (pipelineSettings && localNotes !== pipelineSettings.notes) {
      updatePipelineSettings({ notes: localNotes });
      toast.success('Notas salvas');
    }
  };

  const emptyForm = { client_id: '', package_id: '', title: '', edited: false, delivered: false, posted: false, planned_date: '' };
  const [form, setForm] = useState(emptyForm);

  const getName = (id) => clients.find(c => c.id === id)?.name || '—';
  const getPhone = (id) => clients.find(c => c.id === id)?.contact || '';
  const getPkgName = (id) => packages.find(p => p.id === id)?.name || '';

  const filtered = useMemo(() => {
    let list = [...videos];
    if (filterClient) list = list.filter(v => v.client_id === filterClient);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(v => v.title.toLowerCase().includes(q) || getName(v.client_id).toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (a.posted !== b.posted) return a.posted ? 1 : -1;
      if (a.planned_date && b.planned_date) return a.planned_date.localeCompare(b.planned_date);
      if (a.planned_date) return -1;
      if (b.planned_date) return 1;
      return 0;
    });
    return list;
  }, [videos, filterClient, searchQuery, clients]);

  // Widget Computations
  const totalVideos = videos.length;
  const doneCount = videos.filter(v => v.posted).length;
  const overdueVideos = videos.filter(v => v.planned_date && !v.posted && new Date(v.planned_date + 'T23:59:59') < new Date());
  
  const upcomingDeadlines = useMemo(() => {
    return videos
      .filter(v => !v.posted && v.planned_date)
      .sort((a, b) => a.planned_date.localeCompare(b.planned_date))
      .slice(0, 4);
  }, [videos]);

  const toggleDone = async (videoId) => {
    const v = videos.find(x => x.id === videoId);
    if (!v) return;
    const prevLabel = getStatus(v).label;
    if (v.posted) {
      await updateVideo(videoId, { edited: false, delivered: false, posted: false });
      toast.success('↩ Vídeo reaberto');
      pushHistory(videoId, prevLabel, 'Não iniciado');
    } else {
      await updateVideo(videoId, { edited: true, delivered: true, posted: true });
      toast.success('✓ Vídeo concluído');
      pushHistory(videoId, prevLabel, 'Postado');
    }
  };

  const cycleStatus = async (videoId) => {
    const v = videos.find(x => x.id === videoId);
    if (!v) return;
    const prevLabel = getStatus(v).label;
    let upd;
    if (!v.edited) upd = { edited: true, delivered: false, posted: false };
    else if (!v.delivered) upd = { edited: true, delivered: true, posted: false };
    else if (!v.posted) upd = { edited: true, delivered: true, posted: true };
    else upd = { edited: false, delivered: false, posted: false };
    const result = await updateVideo(videoId, upd);
    if (result) {
      const status = getStatus({ ...v, ...upd });
      toast.success(`→ ${status.label}`);
      pushHistory(videoId, prevLabel, status.label);
    }
  };

  const openModal = (video = null) => {
    setEditVideoData(video);
    if (video) {
      setForm({ client_id: video.client_id, package_id: video.package_id || '', title: video.title, edited: video.edited, delivered: video.delivered, posted: video.posted, planned_date: video.planned_date || '' });
    } else {
      const cId = filterClient || '';
      const cp = packages.filter(p => p.client_id === cId);
      setForm({ ...emptyForm, client_id: cId, package_id: cp[0]?.id || '' });
    }
    setShowModal(true);
  };

  const saveVid = async () => {
    if (!form.title.trim()) { toast.error('Informe o título do vídeo'); return; }
    if (!form.client_id) { toast.error('Selecione um cliente'); return; }
    if (!form.package_id) { toast.error('Selecione um pacote para vincular o vídeo'); return; }
    // Sanitize: empty string in a date column causes 400 from Supabase
    const payload = { ...form, planned_date: form.planned_date || null };
    setSaving(true);
    let ok = false;
    if (editVideoData) {
      const result = await updateVideo(editVideoData.id, payload);
      if (result) { toast.success('Vídeo atualizado'); ok = true; }
      else toast.error('Não foi possível atualizar o vídeo. Tente novamente.');
    } else {
      const result = await addVideo(payload);
      if (result) { toast.success(`"${form.title}" adicionado ao pipeline`); ok = true; }
      else toast.error('Não foi possível adicionar o vídeo. Tente novamente.');
    }
    setSaving(false);
    if (ok) setShowModal(false);
  };

  const handleDelete = async (id) => {
    const result = await deleteVideo(id);
    if (result) toast.success('Vídeo removido');
  };

  const cpf = packages.filter(p => p.client_id === form.client_id);

  // Table column styles
  const colTask = { flex: '1 1 0', minWidth: 180 };
  const colClient = { width: 160, flexShrink: 0 };
  const colDone = { width: 90, flexShrink: 0, display: 'flex', justifyContent: 'center' };
  const colProgress = { width: 140, flexShrink: 0, display: 'flex', justifyContent: 'center' };
  const colDate = { width: 110, flexShrink: 0 };
  const colActions = { width: 60, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.02em', fontSize: '2rem', marginBottom: '0.3rem', color: 'var(--text-primary)' }}>Pipeline de Produção</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Acompanhe o status de edição, entrega e publicação de cada vídeo.
          </p>
        </div>
        <OutlineBtn onClick={() => openModal()}>
          + Novo Vídeo
        </OutlineBtn>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
        Gerencie todos os seus vídeos em produção e acesse utilitários rápidos na barra lateral.
      </p>

      {/* Filters */}
      <div className="pkg-filters" style={{ padding: 0, marginBottom: '1rem', gap: '0.5rem' }}>
        <div className="pkg-search" style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.5, pointerEvents: 'none' }} />
          <input type="text" placeholder="Buscar vídeo..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...filterFieldStyle, paddingLeft: '1.75rem', width: '100%', cursor: 'text' }} />
        </div>
        <select style={filterFieldStyle} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="">Todos os clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Main Grid Layout */}
      <div className="post-layout">
        
        {/* LEFT COLUMN: TABLE AND FILTERS */}
        <div style={{ minWidth: 0 }}>

          <div className="post-desktop-table">
          {/* Table */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden'
          }}>
            {/* Header row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-muted)',
              background: 'var(--bg-secondary)'
            }}>
              <div style={{ ...colTask, display: 'flex', alignItems: 'center', gap: '6px' }}><ClipboardList size={14} /> Tarefa</div>
              <div style={{ ...colClient, display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Cliente</div>
              <div style={{ ...colDone, alignItems: 'center', gap: '6px' }}><CheckCircle size={14} /> Feito</div>
              <div style={{ ...colProgress, alignItems: 'center', gap: '6px' }}><Activity size={14} /> Progresso</div>
              <div style={{ ...colDate, display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Previsão</div>
              <div style={{ ...colActions }}></div>
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Film size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.85rem' }}>Nenhum vídeo encontrado</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => openModal()}>
                  <Plus size={14} /> Criar primeiro vídeo
                </button>
              </div>
            ) : (
              filtered.map((v, i) => {
                const status = getStatus(v);
                const isDone = v.posted;
                const overdue = v.planned_date && !v.posted && new Date(v.planned_date + 'T23:59:59') < new Date();
                const phone = getPhone(v.client_id);
                const isHovered = hoveredRow === v.id;

                return (
                  <div key={v.id}
                    onMouseEnter={() => setHoveredRow(v.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '1rem',
                      padding: '0.65rem 1.25rem',
                      borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: isHovered ? 'rgba(255,255,255,0.02)' : 'transparent',
                      transition: 'background 0.15s ease',
                      opacity: isDone ? 0.5 : 1,
                    }}>

                    {/* Task */}
                    <div style={{ ...colTask, display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                      <span style={{
                        fontSize: '0.88rem', fontWeight: 500,
                        color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: isDone ? 'line-through' : 'none',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {v.title}
                      </span>
                      {overdue && (
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 700, color: 'var(--danger)',
                          padding: '0.1rem 0.35rem', background: 'rgba(239,68,68,0.1)',
                          borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap'
                        }}>ATRASADO</span>
                      )}
                    </div>

                    {/* Client */}
                    <div style={{ ...colClient, display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getName(v.client_id)}
                      </span>
                      {phone && isHovered && (
                        <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#25D366', display: 'flex', flexShrink: 0 }} title="WhatsApp">
                          <MessageCircle size={12} />
                        </a>
                      )}
                    </div>

                    {/* Done checkbox */}
                    <div style={{ ...colDone, alignItems: 'center' }}>
                      <button onClick={() => toggleDone(v.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: isDone ? 'var(--success)' : 'var(--text-muted)',
                        padding: 0, display: 'flex', transition: 'color 0.15s'
                      }}>
                        {isDone ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </div>

                    {/* Progress badge */}
                    <div style={{ ...colProgress, alignItems: 'center' }}>
                      <button onClick={() => cycleStatus(v.id)} style={{
                        background: status.bg, border: 'none',
                        color: status.color, fontSize: '0.73rem', fontWeight: 600,
                        padding: '0.25rem 0.75rem', borderRadius: '100px',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                      }}
                        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'}
                        onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
                        {status.label}
                      </button>
                    </div>

                    {/* Date */}
                    <div style={{ ...colDate, display: 'flex', alignItems: 'center', fontSize: '0.78rem', color: overdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {v.planned_date ? new Date(v.planned_date + 'T12:00').toLocaleDateString('pt-BR') : '—'}
                    </div>

                    {/* Actions */}
                    <div className="post-row-actions" style={{ ...colActions, alignItems: 'center', gap: '0.25rem', opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s' }}>
                      <button onClick={() => openModal(v)} title="Editar"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => setDeleteConfirm(v)} title="Excluir"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Footer count */}
            {filtered.length > 0 && (
              <div style={{
                padding: '0.6rem 1rem', borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: '0.73rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)'
              }}>
                <span>TOTAL <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong></span>
                <span>{doneCount} de {videos.length} concluídos</span>
              </div>
            )}
          </div>
          </div>{/* /post-desktop-table */}

          {/* Mobile card list */}
          <div className="post-mobile-list">
            {filtered.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Film size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.85rem' }}>Nenhum vídeo encontrado</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => openModal()}>
                  <Plus size={14} /> Criar primeiro vídeo
                </button>
              </div>
            ) : (
              filtered.map(v => {
                const status = getStatus(v);
                const overdue = v.planned_date && !v.posted && new Date(v.planned_date + 'T23:59:59') < new Date();
                return (
                  <div
                    key={v.id}
                    className="card"
                    style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', opacity: v.posted ? 0.6 : 1 }}
                    onClick={() => cycleStatus(v.id)}
                  >
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 500, color: v.posted ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: v.posted ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.title}
                        </span>
                        {overdue && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--danger)', padding: '0.1rem 0.35rem', background: 'rgba(239,68,68,0.1)', borderRadius: '4px', flexShrink: 0 }}>ATRASADO</span>}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{getName(v.client_id)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: status.color, background: status.bg, padding: '0.25rem 0.6rem', borderRadius: '100px', whiteSpace: 'nowrap' }}>
                        {status.label}
                      </span>
                      <button onClick={e => { e.stopPropagation(); openModal(v); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                        <Edit3 size={13} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteConfirm(v); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: WIDGETS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Widget 1: Produtividade */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <PieChart size={16} color="var(--primary)" /> Produtividade
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{totalVideos}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Concluídos</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--success)' }}>{doneCount}</p>
              </div>
            </div>
            {overdueVideos.length > 0 && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} color="var(--danger)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 500 }}>
                  {overdueVideos.length} {overdueVideos.length === 1 ? 'vídeo atrasado' : 'vídeos atrasados'}
                </span>
              </div>
            )}
          </div>

          {/* Widget 2: Próximos Prazos */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <Calendar size={16} color="var(--primary)" /> Próximos Prazos
            </h4>
            {upcomingDeadlines.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum prazo urgente.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {upcomingDeadlines.map(v => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{getName(v.client_id)}</p>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', flexShrink: 0, background: 'rgba(212, 135, 10, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {new Date(v.planned_date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Widget 3: Bloco de Notas */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <StickyNote size={16} color="var(--primary)" /> Notas Rápidas
            </h4>
            <textarea
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Ideias, lembretes, links..."
              style={{
                width: '100%', height: '120px', resize: 'vertical',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                border: '1px solid var(--border)', borderRadius: '8px',
                padding: '0.75rem', fontSize: '0.82rem', fontFamily: 'inherit',
                outline: 'none', transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.borderColor = 'var(--border)' }}
            />
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>Salva automaticamente ao sair</p>
          </div>

          {/* Widget 4: Histórico da Sessão */}
          {history.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)', flexWrap: 'wrap' }}>
                  <Clock size={16} color="var(--amber)" /> Histórico da Sessão
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400, fontFamily: 'var(--font-body)' }}>(expira em 24h)</span>
                </h4>
                <button onClick={() => setHistory([])} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}>
                  Limpar
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {history.map((h, i) => (
                  <div key={h.key} style={{ paddingBottom: '0.5rem', borderBottom: i < history.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{h.client}</span>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{h.from}</span>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <span style={{ color: getStatusColor(h.to), fontWeight: 600 }}>{h.to}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <ConfirmModal
          title="Excluir vídeo?"
          message={`"${deleteConfirm.title}" será removido do pipeline permanentemente.`}
          confirmLabel="Excluir"
          danger
          onConfirm={async () => { await handleDelete(deleteConfirm.id); setDeleteConfirm(null); }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontWeight: 400 }}>{editVideoData ? 'Editar Vídeo' : 'Novo Vídeo'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Título do Vídeo</label>
                <input className="form-control" placeholder="Ex: Reel Behind the Scenes" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Cliente</label>
                  <select className="form-control" value={form.client_id} onChange={e => { const p = packages.filter(x => x.client_id === e.target.value); setForm({ ...form, client_id: e.target.value, package_id: p[0]?.id || '' }); }}>
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Pacote</label>
                  <select className="form-control" value={form.package_id} onChange={e => setForm({ ...form, package_id: e.target.value })}>
                    <option value="">Selecione um pacote...</option>
                    {cpf.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Data Prevista</label>
                <input type="date" className="form-control" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <OutlineBtn onClick={saveVid} disabled={saving}>
                {saving ? 'Salvando...' : editVideoData ? 'Salvar' : 'Adicionar'}
              </OutlineBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
