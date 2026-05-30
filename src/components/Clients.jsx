import { useState } from 'react';
import {
  Users, Plus, X, Package, AlertTriangle, ChevronLeft,
  Edit, MessageCircle, Bookmark, Trash2, LayoutGrid, List, Search,
  DollarSign, ExternalLink, Mail,
} from 'lucide-react';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`;
};

const getPlatformName = (url) => {
  if (!url) return 'Web';
  try {
    const h = new URL(url).hostname;
    if (h.includes('youtube') || h.includes('youtu.be')) return 'YouTube';
    if (h.includes('instagram')) return 'Instagram';
    if (h.includes('tiktok')) return 'TikTok';
    if (h.includes('vimeo')) return 'Vimeo';
    if (h.includes('pinterest')) return 'Pinterest';
    return h.replace('www.', '');
  } catch { return 'Link'; }
};

/* ── Reusable micro-components ── */
const SecLabel = ({ children, style = {} }) => (
  <span style={{
    fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: 'var(--text-muted)', opacity: 0.8,
    ...style,
  }}>
    {children}
  </span>
);

const OutlineBtn = ({ onClick, children, size = 'sm', style = {} }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      background: 'transparent',
      border: '1px solid var(--amber)',
      color: 'var(--amber)',
      borderRadius: 6,
      padding: size === 'sm' ? '0.28rem 0.65rem' : '0.45rem 0.9rem',
      fontSize: size === 'sm' ? '0.75rem' : '0.82rem',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      transition: 'background 0.18s, color 0.18s',
      fontFamily: 'var(--font-body)',
      ...style,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,135,10,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
  >
    {children}
  </button>
);

const IconBtn = ({ onClick, children, hoverColor = 'var(--amber)', title = '' }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      background: 'none', border: 'none',
      color: 'var(--text-muted)', cursor: 'pointer',
      width: 28, height: 28,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 4, padding: 0, transition: 'color 0.18s',
      flexShrink: 0,
    }}
    onMouseEnter={e => { e.currentTarget.style.color = hoverColor; }}
    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
  >
    {children}
  </button>
);

export default function Clients({
  clients, packages, references,
  addClient, updateClient, deleteClient,
  addPackage, updatePackage,
  addReference, updateReference, deleteReference,
}) {
  const { user } = useAuth();
  const cSym = user?.user_metadata?.currency === 'USD' ? '$' : user?.user_metadata?.currency === 'EUR' ? '€' : 'R$';
  const toast = useToast();
  const [showClientModal, setShowClientModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editClientData, setEditClientData] = useState(null);
  const [editPackageData, setEditPackageData] = useState(null);
  const [showRefModal, setShowRefModal] = useState(false);
  const [editRefData, setEditRefData] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [expandedGridClient, setExpandedGridClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');

  const emptyClient = { name: '', contact: '', email: '' };
  const emptyPackage = { client_id: '', name: '', total_videos: 4, edited: 0, delivered: 0, posted: 0, status: 'Ativo', value: '', paid: 0, start_date: new Date().toISOString().slice(0, 10), end_date: '', billing_cycle: 'Mensal' };
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
    if (!clientForm.name.trim()) { toast.error('Informe o nome do cliente'); return; }
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
      client_id: pkg.client_id, name: pkg.name, total_videos: pkg.total_videos,
      delivered: pkg.delivered, posted: pkg.posted, status: pkg.status, value: pkg.value,
      paid: pkg.paid, duration_months: pkg.duration_months || 1,
      start_date: pkg.start_date || new Date().toISOString().slice(0, 10),
    } : { ...emptyPackage, client_id: clientId });
    setShowPackageModal(true);
  };

  const savePkg = async () => {
    if (!pkgForm.name.trim()) { toast.error('Informe o nome do pacote'); return; }
    if (!pkgForm.client_id) { toast.error('Selecione um cliente para o pacote'); return; }
    setSaving(true);
    const data = {
      ...pkgForm,
      total_videos: Number(pkgForm.total_videos), edited: Number(pkgForm.edited) || 0,
      delivered: Number(pkgForm.delivered), posted: Number(pkgForm.posted),
      value: Number(pkgForm.value), paid: Number(pkgForm.paid),
      duration_months: Number(pkgForm.duration_months) || 1,
      start_date: pkgForm.start_date, end_date: pkgForm.end_date || null,
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
    if (!refForm.title.trim()) { toast.error('Informe o título da referência'); return; }
    if (!refForm.url.trim()) { toast.error('Informe a URL da referência'); return; }
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

  const getStatusBadge = (status) => {
    const map = { 'Ativo': 'active', 'Pausado': 'paused', 'Concluído': 'concluded' };
    return map[status] || 'active';
  };

  /* ── Package Card ── */
  const renderPackageCard = (pkg, c) => {
    const remaining = pkg.total_videos - pkg.delivered;
    const progress = pkg.total_videos > 0 ? (pkg.delivered / pkg.total_videos) * 100 : 0;
    const isLow = remaining <= 2 && pkg.status === 'Ativo';

    const metricCols = [
      { label: 'Total',     value: pkg.total_videos,  color: 'var(--text-secondary)' },
      { label: 'Editados',  value: pkg.edited || 0,   color: 'var(--info)' },
      { label: 'Entregues', value: pkg.delivered,      color: 'var(--success)' },
      { label: 'Postados',  value: pkg.posted,         color: 'var(--info)' },
      { label: 'Restantes', value: remaining,          color: isLow ? 'var(--danger)' : 'var(--text-secondary)' },
    ];

    return (
      <div
        key={pkg.id}
        style={{
          marginBottom: '0.5rem',
          padding: '1rem',
          border: isLow ? '0.5px solid rgba(239,68,68,0.35)' : '0.5px solid var(--border)',
          borderRadius: 8,
          background: isLow ? 'rgba(239,68,68,0.04)' : 'var(--bg-card)',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                {pkg.name}
              </span>
              <span
                className={`badge badge-${getStatusBadge(pkg.status)}`}
                style={{ borderRadius: 3, fontSize: '0.58rem', letterSpacing: '0.08em' }}
              >
                {pkg.status}
              </span>
            </div>
            {/* Metadata: no icons, just text with · */}
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
              {pkg.billing_cycle || 'Mensal'}
              {' · '}
              {pkg.end_date
                ? `Até ${new Date(pkg.end_date + 'T12:00').toLocaleDateString('pt-BR')}`
                : 'Contínuo'}
              {' · '}
              {cSym} {Number(pkg.value || 0).toLocaleString('pt-BR')} / ciclo
            </p>
          </div>
          {/* Editar — text only, amber on hover */}
          <button
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: '0.73rem',
              cursor: 'pointer', padding: '0.2rem 0.4rem',
              borderRadius: 4, transition: 'color 0.18s',
              flexShrink: 0, fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            onClick={() => openPkgModal(c.id, pkg)}
          >
            Editar
          </button>
        </div>

        {/* Low package warning */}
        {isLow && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.73rem', color: 'var(--danger)' }}>
            <AlertTriangle size={12} />
            {remaining === 0 ? 'Pacote finalizado!' : `${remaining} vídeo${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}`}
          </div>
        )}

        {/* Metrics grid */}
        <div className="pkg-stats-grid" style={{ marginTop: '0.85rem' }}>
          {metricCols.map(({ label, value, color }) => (
            <div key={label}>
              <div style={{
                fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.12em',
                color: 'var(--text-muted)', fontWeight: 600, opacity: 0.7, marginBottom: '0.15rem',
              }}>
                {label}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 300,
                color, lineHeight: 1,
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar — subtle */}
        <div style={{ marginTop: '0.85rem' }}>
          <div className="progress-bar" style={{ height: 3, background: 'var(--border)' }}>
            <div
              className={`progress-fill${isLow ? ' danger' : ''}`}
              style={{ width: `${progress}%`, background: isLow ? 'var(--danger)' : 'rgba(212,135,10,0.5)' }}
            />
          </div>
          <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', marginTop: '0.25rem', opacity: 0.7 }}>
            {progress.toFixed(0)}% entregue
          </div>
        </div>
      </div>
    );
  };

  /* ── Reference Card ── */
  const renderRefCard = (ref, c) => (
    <div
      key={ref.id}
      style={{
        padding: '1rem',
        border: '0.5px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-card)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        transition: 'border-color 0.18s',
      }}
      onClick={() => window.open(ref.url, '_blank')}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <h4 style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3, flex: 1 }}>
          {ref.title}
        </h4>
        <div style={{ display: 'flex', gap: 0 }} onClick={e => e.stopPropagation()}>
          <IconBtn onClick={() => openRefModal(c.id, ref)} hoverColor="var(--amber)" title="Editar">
            <Edit size={12} />
          </IconBtn>
          <IconBtn onClick={() => handleDeleteRef(ref.id)} hoverColor="var(--danger)" title="Remover">
            <Trash2 size={12} />
          </IconBtn>
        </div>
      </div>
      {ref.notes && (
        <p style={{
          fontSize: '0.73rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {ref.notes}
        </p>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '0.5rem', borderTop: '0.5px solid var(--border)', marginTop: 'auto',
      }}>
        <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', opacity: 0.65 }}>
          {getPlatformName(ref.url)}
        </span>
        <ExternalLink size={10} style={{ color: 'var(--text-muted)', opacity: 0.45 }} />
      </div>
    </div>
  );

  /* ── Client Item (3 modes) ── */
  const renderClientItem = (c, mode) => {
    const clientPkgs = packages.filter(p => p.client_id === c.id);
    const isGrid = mode === 'grid';
    const isListItem = mode === 'list-item';
    const isListDetail = mode === 'list-detail';
    const isExpanded = isListDetail || (isGrid && selectedClient === c.id);
    const isSelected = isListItem && selectedClient === c.id;

    /* ── LIST ITEM (left sidebar) ── */
    if (isListItem) {
      return (
        <div
          key={c.id + mode}
          onClick={() => setSelectedClient(c.id)}
          style={{
            padding: '0.75rem 0.85rem',
            border: '0.5px solid var(--border)',
            borderRadius: 8,
            background: 'var(--bg-card)',
            cursor: 'pointer',
            boxShadow: isSelected ? 'inset 2px 0 0 var(--amber)' : 'none',
            transition: 'border-color 0.18s, box-shadow 0.18s',
          }}
          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-light)'; }}
          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <p style={{
            fontWeight: 500, fontSize: '0.88rem',
            color: isSelected ? 'var(--amber-light)' : 'var(--text-primary)',
            margin: 0, lineHeight: 1.3,
          }}>
            {c.name}
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', opacity: 0.8 }}>
            {c.contact || '—'} · {clientPkgs.length} pacote{clientPkgs.length !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }

    /* ── GRID CARD ── */
    if (isGrid) {
      const gridExpanded = expandedGridClient === c.id;
      return (
        <div key={c.id + mode} className="card" style={{ padding: '1rem', gridColumn: gridExpanded ? 'span 2' : undefined }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 400,
                letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)', lineHeight: 1.2,
              }}>
                {c.name}
              </h3>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', opacity: 0.8 }}>
                {c.contact || '—'}{c.email ? ` · ${c.email}` : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 0 }} onClick={e => e.stopPropagation()}>
              {c.contact && (
                <a
                  href={`https://wa.me/${c.contact.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, cursor: 'pointer', transition: 'color 0.18s', textDecoration: 'none' }}
                  title="WhatsApp"
                  onMouseEnter={e => { e.currentTarget.style.color = '#25D366'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <MessageCircle size={14} />
                </a>
              )}
              <IconBtn onClick={() => openClientModal(c)} hoverColor="var(--amber)" title="Editar">
                <Edit size={14} />
              </IconBtn>
              <IconBtn onClick={() => handleDeleteClient(c.id)} hoverColor="var(--danger)" title="Remover">
                <X size={14} />
              </IconBtn>
            </div>
          </div>

          {/* Footer: expand toggle + add package */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.65rem', borderTop: '0.5px solid var(--border)' }}>
            <button
              onClick={() => setExpandedGridClient(gridExpanded ? null : c.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.73rem', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'color 0.18s', fontFamily: 'var(--font-body)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              {clientPkgs.length} pacote{clientPkgs.length !== 1 ? 's' : ''}
              <span style={{ fontSize: '0.55rem', opacity: 0.5 }}>{gridExpanded ? '▲' : '▼'}</span>
            </button>
            <OutlineBtn onClick={e => { e.stopPropagation(); openPkgModal(c.id); }}>
              <Plus size={12} /> Pacote
            </OutlineBtn>
          </div>

          {/* Expanded detail */}
          {gridExpanded && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '0.5px solid var(--border)' }}>
              <SecLabel style={{ display: 'block', marginBottom: '0.75rem' }}>
                Histórico · {clientPkgs.length} pacote{clientPkgs.length !== 1 ? 's' : ''} fechado{clientPkgs.length !== 1 ? 's' : ''}
              </SecLabel>
              {clientPkgs.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  Nenhum pacote criado ainda.
                </p>
              ) : (
                clientPkgs.map(pkg => renderPackageCard(pkg, c))
              )}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '0.5px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <SecLabel>Referências (Moodboard)</SecLabel>
                  <OutlineBtn onClick={() => openRefModal(c.id)}>
                    <Plus size={12} /> Add
                  </OutlineBtn>
                </div>
                {references.filter(r => r.client_id === c.id).length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                    Nenhuma referência salva ainda.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                    {references.filter(r => r.client_id === c.id).map(ref => renderRefCard(ref, c))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    /* ── LIST DETAIL ── */
    return (
      <div key={c.id + mode} className="card" style={{ padding: '1.5rem', animation: 'fadeIn 0.3s' }}>
        {/* Client header */}
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>
              {c.name}
            </h3>
            <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              {c.contact && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{c.contact}</p>}
              {c.email && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{c.email}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }} onClick={e => e.stopPropagation()}>
            {c.contact && (
              <a
                href={`https://wa.me/${c.contact.replace(/\D/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, cursor: 'pointer', transition: 'color 0.18s', textDecoration: 'none' }}
                title="Falar no WhatsApp"
                onMouseEnter={e => { e.currentTarget.style.color = '#25D366'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <MessageCircle size={15} />
              </a>
            )}
            <IconBtn onClick={() => openClientModal(c)} hoverColor="var(--amber)" title="Editar cliente">
              <Edit size={15} />
            </IconBtn>
            <IconBtn onClick={() => handleDeleteClient(c.id)} hoverColor="var(--danger)" title="Remover cliente">
              <X size={15} />
            </IconBtn>
          </div>
        </div>

        {/* Packages header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.85rem', borderTop: '0.5px solid var(--border)' }}>
          <SecLabel>
            Histórico · {clientPkgs.length} pacote{clientPkgs.length !== 1 ? 's' : ''} fechado{clientPkgs.length !== 1 ? 's' : ''}
          </SecLabel>
          <OutlineBtn onClick={e => { e.stopPropagation(); openPkgModal(c.id); }}>
            <Plus size={12} /> Pacote
          </OutlineBtn>
        </div>

        {/* Packages list */}
        <div style={{ marginTop: '1rem' }}>
          {clientPkgs.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.8, padding: '0.25rem 0' }}>
              Nenhum pacote criado ainda.
            </p>
          ) : (
            clientPkgs.map(pkg => renderPackageCard(pkg, c))
          )}
        </div>

        {/* References */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <SecLabel>Referências (Moodboard)</SecLabel>
            <OutlineBtn onClick={() => openRefModal(c.id)}>
              <Plus size={12} /> Add
            </OutlineBtn>
          </div>
          {references.filter(r => r.client_id === c.id).length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
              Nenhuma referência salva ainda.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {references.filter(r => r.client_id === c.id).map(ref => renderRefCard(ref, c))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ── Page ── */
  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div className="page-header">
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.02em' }}>
          Clientes & Pacotes
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{
              position: 'absolute', left: '0.6rem', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.6,
            }} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-control"
              style={{
                paddingLeft: '2rem', height: '32px', minWidth: '180px',
                background: 'var(--bg-elevated)', border: '0.5px solid var(--border)',
                fontSize: '0.82rem',
              }}
            />
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: '0.1rem' }}>
            {[
              { mode: 'list', Icon: List },
              { mode: 'grid', Icon: LayoutGrid },
            ].map(({ mode, Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  background: 'none', border: 'none',
                  color: viewMode === mode ? 'var(--amber)' : 'var(--text-muted)',
                  padding: '0.3rem 0.4rem', cursor: 'pointer', borderRadius: 4,
                  transition: 'color 0.18s',
                }}
                title={mode === 'list' ? 'Lista' : 'Grade'}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>

          <button className="btn btn-primary" onClick={() => openClientModal()}>
            <Plus size={15} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* ── No clients ── */}
      {clients.length === 0 && (
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.9, padding: '3rem 0', textAlign: 'center' }}>
          Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" para começar.
        </p>
      )}

      {/* ── Grid view ── */}
      {viewMode === 'grid' && clients.length > 0 && (
        <div className="card-grid">
          {filteredClients.length === 0
            ? <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', gridColumn: '1/-1' }}>Nenhum cliente encontrado.</p>
            : filteredClients.map(c => renderClientItem(c, 'grid'))
          }
        </div>
      )}

      {/* ── List view ── */}
      {viewMode === 'list' && clients.length > 0 && (
        <div className={`clients-list-layout${selectedClient ? ' has-selected' : ''}`}>
          <div className="clients-list-sidebar">
            {filteredClients.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', marginTop: '2rem' }}>
                Nenhum cliente encontrado.
              </p>
            ) : (
              filteredClients.map(c => renderClientItem(c, 'list-item'))
            )}
          </div>

          <div className="clients-list-detail">
            {selectedClient && clients.find(c => c.id === selectedClient) ? (
              <>
                <button
                  className="btn btn-secondary btn-sm mobile-back-btn"
                  onClick={() => setSelectedClient(null)}
                  style={{ marginBottom: '1rem' }}
                >
                  <ChevronLeft size={14} /> Voltar à lista
                </button>
                {renderClientItem(clients.find(c => c.id === selectedClient), 'list-detail')}
              </>
            ) : (
              <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.9 }}>
                  Selecione um cliente à esquerda para ver seu histórico de pacotes e referências.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Client Modal ── */}
      {showClientModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowClientModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3><Users size={16} /> {editClientData ? 'Editar Cliente' : 'Novo Cliente'}</h3>
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
                    className="form-control" placeholder="(00) 00000-0000"
                    value={clientForm.contact} inputMode="numeric" maxLength={16}
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

      {/* ── Package Modal ── */}
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
                  <h3><Package size={16} /> {isEditing ? 'Editar Pacote' : 'Novo Pacote'}</h3>
                  {clientName && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      para <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{clientName}</span>
                    </p>
                  )}
                </div>
                <button className="modal-close" onClick={() => setShowPackageModal(false)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nome do Pacote</label>
                  <input className="form-control" placeholder="Ex: Mensal Premium" value={pkgForm.name} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Vídeos por mês</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {videoPresets.map(n => (
                      <button
                        key={n} type="button"
                        className={`btn btn-sm ${Number(pkgForm.total_videos) === n ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', height: 'auto', padding: '0.5rem 0.25rem', gap: '0.05rem' }}
                        onClick={() => setPkgForm({ ...pkgForm, total_videos: n })}
                      >
                        <span style={{ fontSize: '1rem', fontWeight: 700 }}>{n}</span>
                        <span style={{ fontSize: '0.62rem', opacity: 0.65 }}>vídeos</span>
                      </button>
                    ))}
                    <div style={{ flex: 1 }}>
                      <input
                        type="number" className="form-control" min="1" placeholder="Outro"
                        value={videoPresets.includes(Number(pkgForm.total_videos)) ? '' : pkgForm.total_videos}
                        onChange={e => setPkgForm({ ...pkgForm, total_videos: e.target.value })}
                        style={{ height: '100%', textAlign: 'center', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
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
                  <label>Término <span style={{ fontWeight: 400, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(vazio = contínuo)</span></label>
                  <input type="date" className="form-control" value={pkgForm.end_date || ''} onChange={e => setPkgForm({ ...pkgForm, end_date: e.target.value })} />
                </div>
                <div style={{ background: 'var(--bg-primary)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <DollarSign size={12} /> Valor por Ciclo ({pkgForm.billing_cycle || 'Mensal'}) ({cSym})
                    </label>
                    <input
                      type="number" className="form-control" min="0" step="100" placeholder="0"
                      value={pkgForm.value}
                      onChange={e => setPkgForm({ ...pkgForm, value: e.target.value })}
                      style={{ fontSize: '1.1rem', fontWeight: 600 }}
                    />
                  </div>
                  {pkgValue > 0 && totalVids > 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ≈ <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{cSym} {perVideo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span> / vídeo
                    </p>
                  )}
                </div>
                {isEditing && (
                  <>
                    <p style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '0.6rem', marginTop: '0.25rem', opacity: 0.8, fontWeight: 700 }}>
                      Progresso & Status
                    </p>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Editados</label>
                        <input type="number" className="form-control" min="0" max={totalVids} value={pkgForm.edited || 0} onChange={e => setPkgForm({ ...pkgForm, edited: e.target.value })} />
                      </div>
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
                        <label>Valor Pago ({cSym})</label>
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

      {/* ── Reference Modal ── */}
      {showRefModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRefModal(false); }}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3><Bookmark size={16} /> {editRefData ? 'Editar Referência' : 'Nova Referência'}</h3>
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
                <label>Anotações <span style={{ fontWeight: 400, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
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
