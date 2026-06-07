import { useState, useEffect } from 'react';
import {
  Users, Plus, X, Package, AlertTriangle, ChevronLeft,
  Edit, MessageCircle, Bookmark, Trash2, LayoutGrid, List, Search,
  DollarSign, ExternalLink, Mail, FileText,
} from 'lucide-react';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ConfirmModal from './ConfirmModal';

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

const OutlineBtn = ({ onClick, children, style = {}, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'transparent',
      border: '1px solid var(--amber)',
      color: disabled ? 'var(--text-muted)' : 'var(--amber)',
      borderRadius: 6,
      padding: '0.5rem 1.15rem',
      fontSize: '0.85rem',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      transition: 'background 0.18s',
      fontFamily: 'var(--font-body)',
      opacity: disabled ? 0.5 : 1,
      ...style,
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(212,135,10,0.08)'; }}
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
  const [bizProfile, setBizProfile] = useState({ currency: 'BRL', company_name: '', document_type: 'CPF/CNPJ', document_number: '', pix_key: '' });

  useEffect(() => {
    if (!user) return;
    supabase.from('user_profiles')
      .select('company_name, document_type, document_number, pix_key, currency')
      .eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setBizProfile(prev => ({ ...prev, ...data })); });
  }, [user]);

  const cSym = bizProfile.currency === 'USD' ? '$' : bizProfile.currency === 'EUR' ? '€' : 'R$';
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
  const [deleteClientConfirm, setDeleteClientConfirm] = useState(null);
  const [deleteRefConfirm, setDeleteRefConfirm] = useState(null);
  const [proposalModal, setProposalModal] = useState(null);
  const [proposalPkgs, setProposalPkgs] = useState([]);
  const [proposalNote, setProposalNote] = useState('');
  const [proposalValidity, setProposalValidity] = useState(30);
  const [generatingPDF, setGeneratingPDF] = useState(false);

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
          <IconBtn onClick={() => setDeleteRefConfirm(ref)} hoverColor="var(--danger)" title="Remover">
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

  /* ── Proposal ── */
  const openProposalModal = (client) => {
    const active = packages.filter(p => p.client_id === client.id && p.status === 'Ativo').map(p => p.id);
    const all = packages.filter(p => p.client_id === client.id).map(p => p.id);
    setProposalPkgs(active.length > 0 ? active : all);
    setProposalNote('');
    setProposalValidity(30);
    setProposalModal(client);
  };

  const generateProposalPDF = () => {
    const c = proposalModal;
    const selPkgs = packages.filter(p => proposalPkgs.includes(p.id));
    if (selPkgs.length === 0) return;
    setGeneratingPDF(true);
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      const compName = bizProfile.company_name || user?.user_metadata?.full_name || 'Produtora Audiovisual';
      const docType = bizProfile.document_type || 'CPF/CNPJ';
      const docNum = bizProfile.document_number || '';
      const pixKey = bizProfile.pix_key || '';
      const proposalId = `PROP-${Date.now().toString().slice(-6)}`;
      const today = new Date();
      const todayStr = today.toLocaleDateString('pt-BR');
      const validUntil = new Date(today);
      validUntil.setDate(validUntil.getDate() + proposalValidity);
      const validUntilStr = validUntil.toLocaleDateString('pt-BR');
      const totalValue = selPkgs.reduce((s, p) => s + (p.value || 0), 0);
      const dark = [18, 17, 15]; const amber = [212, 135, 10];
      const gray = [248, 247, 245]; const textDark = [40, 38, 35]; const textMuted = [130, 126, 120];

      // Header
      doc.setFillColor(...dark); doc.rect(0, 0, 210, 42, 'F');
      doc.setFillColor(...amber); doc.rect(0, 42, 210, 2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
      doc.text('PROPOSTA COMERCIAL', 20, 24);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(190, 183, 170);
      doc.text(proposalId, 190, 16, { align: 'right' });
      doc.text(`Data: ${todayStr}`, 190, 24, { align: 'right' });
      doc.setFontSize(9.5); doc.setTextColor(165, 158, 145);
      doc.text(compName, 20, 36);

      // DE / PARA boxes
      let y = 56;
      doc.setFillColor(...gray); doc.roundedRect(20, y, 80, 36, 2, 2, 'F');
      doc.setTextColor(...textMuted); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
      doc.text('DE', 28, y + 8);
      doc.setTextColor(...textDark); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.text(doc.splitTextToSize(compName, 68)[0], 28, y + 17);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...textMuted);
      if (docNum) doc.text(`${docType}: ${docNum}`, 28, y + 25);

      doc.setFillColor(...gray); doc.roundedRect(110, y, 80, 36, 2, 2, 'F');
      doc.setTextColor(...textMuted); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
      doc.text('PARA', 118, y + 8);
      doc.setTextColor(...textDark); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.text(doc.splitTextToSize(c.name, 66)[0], 118, y + 17);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...textMuted);
      if (c.contact) doc.text(c.contact, 118, y + 25);
      if (c.email) doc.text(doc.splitTextToSize(c.email, 66)[0], 118, y + 31);
      y += 46;

      // Services table
      doc.setTextColor(...textMuted); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      doc.text('SERVIÇOS PROPOSTOS', 20, y); y += 6;

      doc.setFillColor(...dark); doc.rect(20, y, 170, 9, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
      doc.text('PACOTE / SERVIÇO', 25, y + 6);
      doc.text('VÍDEOS', 120, y + 6);
      doc.text('CICLO', 143, y + 6);
      doc.text('VALOR', 188, y + 6, { align: 'right' });
      y += 9;

      selPkgs.forEach((pkg, i) => {
        if (i % 2 === 0) { doc.setFillColor(252, 251, 249); doc.rect(20, y, 170, 10, 'F'); }
        doc.setTextColor(...textDark); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
        doc.text(doc.splitTextToSize(pkg.name, 88)[0], 25, y + 7);
        doc.text(String(pkg.total_videos || '—'), 123, y + 7);
        doc.text(pkg.billing_cycle || 'Único', 143, y + 7);
        doc.setFont('helvetica', 'bold');
        doc.text(`${cSym} ${(pkg.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 188, y + 7, { align: 'right' });
        y += 10;
      });
      doc.setDrawColor(220, 218, 214); doc.setLineWidth(0.3);
      doc.rect(20, y - selPkgs.length * 10 - 9, 170, selPkgs.length * 10 + 9);

      // Total
      y += 3; doc.setFillColor(...amber); doc.rect(20, y, 170, 12, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
      doc.text('TOTAL', 25, y + 8.5);
      doc.text(`${cSym} ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 188, y + 8.5, { align: 'right' });
      y += 20;

      // Payment conditions
      doc.setTextColor(...textMuted); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      doc.text('CONDIÇÕES DE PAGAMENTO', 20, y); y += 6;
      const cycles = [...new Set(selPkgs.map(p => p.billing_cycle).filter(Boolean))];
      const condH = pixKey ? 22 : 14;
      doc.setFillColor(...gray); doc.roundedRect(20, y, 170, condH, 2, 2, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...textDark);
      doc.text(`Ciclo de cobrança: ${cycles.length > 0 ? cycles.join(', ') : 'A combinar'}`, 28, y + 9);
      if (pixKey) {
        doc.setTextColor(...textMuted); doc.text('Chave PIX: ', 28, y + 17);
        doc.setTextColor(...textDark); doc.setFont('helvetica', 'bold');
        doc.text(pixKey, 58, y + 17);
      }
      y += condH + 10;

      // Notes
      if (proposalNote.trim()) {
        doc.setTextColor(...textMuted); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        doc.text('OBSERVAÇÕES', 20, y); y += 6;
        const noteLines = doc.splitTextToSize(proposalNote.trim(), 158);
        const noteH = noteLines.length * 5 + 10;
        doc.setFillColor(...gray); doc.roundedRect(20, y, 170, noteH, 2, 2, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...textDark);
        doc.text(noteLines, 28, y + 8);
        y += noteH + 10;
      }

      // Validity banner
      doc.setFillColor(255, 248, 232); doc.setDrawColor(...amber); doc.setLineWidth(0.5);
      doc.roundedRect(20, y, 170, 12, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...amber);
      doc.text(`Proposta valida ate: ${validUntilStr}`, 105, y + 8, { align: 'center' });

      // Footer
      doc.setDrawColor(180, 175, 168); doc.setLineWidth(0.4);
      doc.line(62, 270, 148, 270);
      doc.setTextColor(...textDark); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.text(compName, 105, 278, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...textMuted);
      doc.text('Assinatura do Responsavel', 105, 284, { align: 'center' });
      doc.setFillColor(...amber); doc.rect(0, 290, 210, 7, 'F');

      doc.save(`Proposta_${c.name.split(' ')[0]}_${proposalId}.pdf`);
      toast.success('Proposta gerada com sucesso!');
      setGeneratingPDF(false);
      setProposalModal(null);
    }).catch(() => { toast.error('Erro ao gerar PDF'); setGeneratingPDF(false); });
  };

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
              <IconBtn onClick={() => setDeleteClientConfirm(c)} hoverColor="var(--danger)" title="Remover">
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
            <IconBtn onClick={() => setDeleteClientConfirm(c)} hoverColor="var(--danger)" title="Remover cliente">
              <X size={15} />
            </IconBtn>
          </div>
        </div>

        {/* Packages header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.85rem', borderTop: '0.5px solid var(--border)' }}>
          <SecLabel>
            Histórico · {clientPkgs.length} pacote{clientPkgs.length !== 1 ? 's' : ''} fechado{clientPkgs.length !== 1 ? 's' : ''}
          </SecLabel>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button
              onClick={e => { e.stopPropagation(); openProposalModal(c); }}
              title="Gerar proposta PDF"
              style={{ background: 'none', border: '0.5px solid var(--border-light)', borderRadius: 5, color: 'var(--text-muted)', cursor: 'pointer', padding: '0.28rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'var(--font-body)', transition: 'color 0.18s, border-color 0.18s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.borderColor = 'rgba(212,135,10,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
            >
              <FileText size={11} /> Proposta
            </button>
            <OutlineBtn onClick={e => { e.stopPropagation(); openPkgModal(c.id); }}>
              <Plus size={12} /> Pacote
            </OutlineBtn>
          </div>
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
      <div className="clients-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.02em', fontSize: '2rem', marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
            Clientes & Pacotes
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Gerencie seus clientes, pacotes de serviço e referências visuais.
          </p>
        </div>
        <div className="clients-header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>

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
                paddingLeft: '2rem', height: '32px', flex: 1, minWidth: 0,
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

          <OutlineBtn onClick={() => openClientModal()}>
            + Novo Cliente
          </OutlineBtn>
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
              <h3 style={{ fontWeight: 400 }}>{editClientData ? 'Editar Cliente' : 'Novo Cliente'}</h3>
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
              <OutlineBtn onClick={saveClient} disabled={saving}>
                {saving ? 'Salvando...' : editClientData ? 'Salvar' : 'Cadastrar'}
              </OutlineBtn>
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
                  <h3 style={{ fontWeight: 400 }}>{isEditing ? 'Editar Pacote' : 'Novo Pacote'}</h3>
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
                <OutlineBtn onClick={savePkg} disabled={saving || !pkgForm.name.trim()}>
                  {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar Pacote'}
                </OutlineBtn>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Proposal Modal ── */}
      {proposalModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setProposalModal(null); }}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 400 }}>Proposta — {proposalModal.name}</h3>
              <button className="modal-close" onClick={() => setProposalModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">

              {/* Package selection */}
              <div className="form-group">
                <label>Pacotes incluídos na proposta</label>
                {packages.filter(p => p.client_id === proposalModal.id).length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Nenhum pacote cadastrado para este cliente.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', marginTop: '0.25rem' }}>
                    {packages.filter(p => p.client_id === proposalModal.id).map(pkg => (
                      <label key={pkg.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0.75rem', borderRadius: 6, cursor: 'pointer', background: proposalPkgs.includes(pkg.id) ? 'rgba(212,135,10,0.05)' : 'transparent', border: `0.5px solid ${proposalPkgs.includes(pkg.id) ? 'rgba(212,135,10,0.25)' : 'var(--border)'}`, transition: 'background 0.15s' }}>
                        <input
                          type="checkbox"
                          checked={proposalPkgs.includes(pkg.id)}
                          onChange={e => setProposalPkgs(prev => e.target.checked ? [...prev, pkg.id] : prev.filter(id => id !== pkg.id))}
                          style={{ accentColor: 'var(--amber)', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{pkg.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                            {pkg.total_videos} vídeos · {cSym} {(pkg.value || 0).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: pkg.status === 'Ativo' ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                          {pkg.status}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Validity */}
              <div className="form-group">
                <label>Validade da proposta (dias)</label>
                <input
                  type="number" className="form-control" min={1} max={365}
                  value={proposalValidity}
                  onChange={e => setProposalValidity(Math.max(1, Number(e.target.value)))}
                  style={{ maxWidth: 120 }}
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label>Observações <span style={{ fontWeight: 400, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <textarea
                  className="form-control" rows={3}
                  placeholder="Condições especiais, inclui deslocamento, forma de entrega..."
                  value={proposalNote}
                  onChange={e => setProposalNote(e.target.value)}
                />
              </div>

              {/* Total preview */}
              {proposalPkgs.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-elevated)', borderRadius: 6, border: '0.5px solid var(--border)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {proposalPkgs.length} pacote{proposalPkgs.length !== 1 ? 's' : ''} selecionado{proposalPkgs.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--amber)', letterSpacing: '-0.01em' }}>
                    {cSym} {packages.filter(p => proposalPkgs.includes(p.id)).reduce((s, p) => s + (p.value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setProposalModal(null)}>Cancelar</button>
              <OutlineBtn onClick={generateProposalPDF} disabled={proposalPkgs.length === 0 || generatingPDF}>
                {generatingPDF ? 'Gerando...' : 'Baixar PDF'}
              </OutlineBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete client confirm ── */}
      {deleteClientConfirm && (
        <ConfirmModal
          title="Excluir cliente?"
          message={`"${deleteClientConfirm.name}" e todos os seus dados (pacotes, referências) serão removidos permanentemente.`}
          confirmLabel="Excluir"
          danger
          onConfirm={async () => { await handleDeleteClient(deleteClientConfirm.id); setDeleteClientConfirm(null); }}
          onCancel={() => setDeleteClientConfirm(null)}
        />
      )}

      {/* ── Delete reference confirm ── */}
      {deleteRefConfirm && (
        <ConfirmModal
          title="Remover referência?"
          message={`"${deleteRefConfirm.title}" será removida permanentemente.`}
          confirmLabel="Remover"
          danger
          onConfirm={async () => { await handleDeleteRef(deleteRefConfirm.id); setDeleteRefConfirm(null); }}
          onCancel={() => setDeleteRefConfirm(null)}
        />
      )}

      {/* ── Reference Modal ── */}
      {showRefModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRefModal(false); }}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ fontWeight: 400 }}>{editRefData ? 'Editar Referência' : 'Nova Referência'}</h3>
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
              <OutlineBtn onClick={saveRef} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </OutlineBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
