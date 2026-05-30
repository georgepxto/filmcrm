import { useState } from 'react';
import { DollarSign, X, Undo2, Download } from 'lucide-react';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';
import { useAuth } from '../contexts/AuthContext';

/* ── Micro-components ── */
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

const SecLabel = ({ children, style = {} }) => (
  <span style={{
    fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: 'var(--text-muted)', opacity: 0.8, ...style,
  }}>
    {children}
  </span>
);

const miniMetricLabel = {
  fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.12em',
  color: 'var(--text-muted)', fontWeight: 600, opacity: 0.65, marginBottom: '0.2rem',
};

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

export default function Payments({ clients, packages, payments, addPayment, deletePayment }) {
  const { user } = useAuth();
  const cSym = user?.user_metadata?.currency === 'USD' ? '$' : user?.user_metadata?.currency === 'EUR' ? '€' : 'R$';
  const toast = useToast();
  const [filterClient, setFilterClient] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() };
  });

  const emptyForm = { client_id: '', package_id: '', date: new Date().toISOString().slice(0, 10), amount: 0, note: '' };
  const [form, setForm] = useState(emptyForm);

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '—';

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const viewMonthKey = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}`;

  const prevMonth = () => setViewMonth(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () => setViewMonth(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });

  const isActiveInMonth = (pkg) => {
    if (!pkg.start_date) return true;
    const dur = pkg.duration_months || 1;
    const start = new Date(pkg.start_date + 'T12:00');
    const end = new Date(pkg.start_date + 'T12:00');
    end.setMonth(end.getMonth() + dur);
    const monthStart = new Date(viewMonth.year, viewMonth.month, 1);
    const monthEnd = new Date(viewMonth.year, viewMonth.month + 1, 0);
    return start <= monthEnd && end >= monthStart;
  };

  const getPaymentStatus = (pkg) => {
    if (!pkg) return 'unknown';
    if (pkg.paid >= pkg.value) return 'paid';
    if (pkg.paid > 0) return 'partial';
    return 'overdue';
  };

  const filteredPkgs = packages
    .filter(p => !filterClient || p.client_id === filterClient)
    .filter(p => isActiveInMonth(p));

  const monthPayments = payments.filter(p => p.date.startsWith(viewMonthKey));
  const monthReceived = monthPayments.reduce((s, p) => s + p.amount, 0);

  const monthlyExpected = filteredPkgs.reduce((s, p) => {
    const dur = p.duration_months || 1;
    return s + (p.value / dur);
  }, 0);
  const totalOwed = filteredPkgs.reduce((s, p) => s + Math.max(0, p.value - p.paid), 0);

  const openPaymentModal = (pkg) => {
    setSelectedPkg(pkg);
    setForm({
      client_id: pkg.client_id,
      package_id: pkg.id,
      date: new Date().toISOString().slice(0, 10),
      amount: pkg.value - pkg.paid,
      note: '',
    });
    setShowModal(true);
  };

  const savePayment = async () => {
    const amount = Number(form.amount);
    const owed = selectedPkg ? Math.max(0, selectedPkg.value - selectedPkg.paid) : 0;
    if (!amount || amount <= 0) { toast.error('Informe um valor maior que zero'); return; }
    if (amount > owed) {
      toast.error(`Valor excede o saldo devedor (${cSym} ${owed.toLocaleString('pt-BR')})`);
      return;
    }
    setSaving(true);
    const result = await addPayment({
      client_id: form.client_id,
      package_id: form.package_id,
      date: form.date,
      amount,
      note: form.note,
    });
    setSaving(false);
    setShowModal(false);
    if (result) {
      toast.success(`Pagamento de ${cSym} ${amount.toLocaleString('pt-BR')} registrado`);
    } else {
      toast.error('Não foi possível registrar o pagamento. Tente novamente.');
    }
  };

  const handleUndoPayment = async () => {
    if (!confirmUndo) return;
    const pay = confirmUndo;
    setConfirmUndo(null);
    const result = await deletePayment(pay.id);
    if (result) {
      toast.success(`Pagamento de ${cSym} ${pay.amount.toLocaleString('pt-BR')} desfeito`);
    } else {
      toast.error('Não foi possível desfazer o pagamento. Tente novamente.');
    }
  };

  const handleGenerateReceipt = (pay, pkg) => {
    const clientName = clients.find(c => c.id === pkg.client_id)?.name || 'Cliente Desconhecido';
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      const compName = user?.user_metadata?.company_name || 'Produtora Audiovisual';
      const docType = user?.user_metadata?.document_type || 'CPF/CNPJ';
      const docNum = user?.user_metadata?.document_number || 'Não informado';
      const pix = user?.user_metadata?.pix_key || '';
      const receiptDate = new Date(pay.date + 'T12:00').toLocaleDateString('pt-BR');
      const receiptId = `REC-${Date.now().toString().slice(-6)}`;
      const primaryColor = [20, 20, 20];
      const accentColor = [212, 135, 10];
      const textColor = [60, 60, 60];
      const lightGray = [245, 245, 245];
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 45, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.text("RECIBO", 20, 28);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Nº ${receiptId}`, 165, 28);
      doc.setFillColor(...lightGray);
      doc.rect(20, 55, 170, 35, 'F');
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("VALOR RECEBIDO", 105, 65, null, null, "center");
      doc.setTextColor(...accentColor);
      doc.setFontSize(24);
      doc.text(`${cSym} ${pay.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 105, 80, null, null, "center");
      doc.setTextColor(...textColor);
      doc.setFontSize(10);
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(252, 252, 252);
      doc.rect(20, 100, 80, 40, 'FD');
      doc.setFont("helvetica", "bold");
      doc.text("EMITENTE", 25, 110);
      doc.setFont("helvetica", "normal");
      doc.text(compName, 25, 118);
      doc.text(`${docType}: ${docNum}`, 25, 125);
      doc.text(`Data: ${receiptDate}`, 25, 132);
      doc.rect(110, 100, 80, 40, 'FD');
      doc.setFont("helvetica", "bold");
      doc.text("PAGADOR", 115, 110);
      doc.setFont("helvetica", "normal");
      const clientLines = doc.splitTextToSize(clientName, 70);
      doc.text(clientLines, 115, 118);
      doc.setFont("helvetica", "bold");
      doc.text("REFERENTE A:", 20, 155);
      doc.setFont("helvetica", "normal");
      const titleLines = doc.splitTextToSize(pkg.title || pkg.name || 'Serviços Audiovisuais', 170);
      doc.text(titleLines, 20, 162);
      if (pay.note) {
        doc.setFont("helvetica", "italic");
        doc.text(`Obs: ${pay.note}`, 20, 162 + (titleLines.length * 6));
      }
      if (pix) {
        doc.setFillColor(...lightGray);
        doc.rect(20, 180, 170, 20, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("CHAVE PIX PARA FUTUROS PAGAMENTOS:", 25, 191);
        doc.setFont("helvetica", "normal");
        doc.text(pix, 100, 191);
      }
      doc.setDrawColor(150, 150, 150);
      doc.line(65, 250, 145, 250);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(compName, 105, 258, null, null, "center");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Assinatura do Recebedor", 105, 263, null, null, "center");
      doc.save(`Recibo_${clientName.split(' ')[0]}_${pay.amount}.pdf`);
      toast.success('Recibo Profissional gerado!');
    });
  };

  /* ── Status bullet ── */
  const statusBullet = (status) => {
    const cfg = {
      paid:    { dot: 'rgba(52,211,153,0.65)',   text: 'Pago',     textColor: 'rgba(52,211,153,0.75)' },
      partial: { dot: 'rgba(212,135,10,0.55)',    text: 'Parcial',  textColor: 'var(--text-muted)' },
      overdue: { dot: 'rgba(239,100,100,0.55)',   text: 'Pendente', textColor: 'var(--text-muted)' },
    };
    const { dot, text, textColor } = cfg[status] || cfg.overdue;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: textColor, flexShrink: 0 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        {text}
      </span>
    );
  };

  /* ── Icon button ── */
  const IconBtn = ({ onClick, title, hoverColor = 'var(--text-primary)', children }) => (
    <button
      onClick={onClick}
      title={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.15rem 0.25rem', borderRadius: 4, lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'color 0.18s' }}
      onMouseEnter={e => { e.currentTarget.style.color = hoverColor; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
    >
      {children}
    </button>
  );

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
            Pagamentos
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Acompanhe quem pagou, quem deve e o que está por vir.
          </p>
        </div>

        {/* Right: client filter + month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={fieldStyle}>
            <option value="">Todos os clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
            <button
              onClick={prevMonth}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem 0.45rem', fontSize: '1.1rem', lineHeight: 1, borderRadius: 4, transition: 'color 0.18s', fontFamily: 'serif' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              ‹
            </button>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 400, color: 'var(--text-primary)', minWidth: 115, textAlign: 'center', letterSpacing: '-0.01em', userSelect: 'none' }}>
              {monthNames[viewMonth.month]} {viewMonth.year}
            </span>
            <button
              onClick={nextMonth}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem 0.45rem', fontSize: '1.1rem', lineHeight: 1, borderRadius: 4, transition: 'color 0.18s', fontFamily: 'serif' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* ── Featured metric — Previsto/Mês ── */}
      <div style={{ padding: '1.75rem 2rem', border: '0.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)', marginBottom: '0.5rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.6rem', opacity: 0.8 }}>
          Previsto este mês
        </p>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.4rem, 5vw, 3rem)', fontWeight: 400, color: 'var(--amber)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '0.5rem' }}>
          {cSym} {monthlyExpected.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {filteredPkgs.length} contrato{filteredPkgs.length !== 1 ? 's' : ''} ativo{filteredPkgs.length !== 1 ? 's' : ''} em {monthNames[viewMonth.month]}
        </p>
      </div>

      {/* ── Secondary metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '2.5rem' }}>
        <div style={{ padding: '1rem 1.25rem', border: '0.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)' }}>
          <SecLabel style={{ display: 'block', marginBottom: '0.5rem' }}>Recebido no mês</SecLabel>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 400, color: 'var(--text-secondary)', lineHeight: 1, letterSpacing: '-0.01em' }}>
            {cSym} {monthReceived.toLocaleString('pt-BR')}
          </div>
        </div>
        <div style={{ padding: '1rem 1.25rem', border: '0.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: totalOwed > 0 ? 'rgba(239,100,100,0.5)' : 'rgba(52,211,153,0.5)', flexShrink: 0 }} />
            <SecLabel>A receber</SecLabel>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 400, color: 'var(--text-secondary)', lineHeight: 1, letterSpacing: '-0.01em' }}>
            {cSym} {totalOwed.toLocaleString('pt-BR')}
          </div>
        </div>
      </div>

      {/* ── Contracts section ── */}
      <div style={{ paddingTop: '1.5rem', borderTop: '0.5px solid var(--border)', marginBottom: '1.25rem' }}>
        <SecLabel>Contratos Ativos · {monthNames[viewMonth.month]}</SecLabel>
      </div>

      {filteredPkgs.length === 0 ? (
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.9, padding: '3rem 0', textAlign: 'center' }}>
          Nenhum contrato ativo para este período.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {filteredPkgs.map(pkg => {
            const status = getPaymentStatus(pkg);
            const owed = Math.max(0, pkg.value - pkg.paid);
            const progress = pkg.value > 0 ? (pkg.paid / pkg.value) * 100 : 0;
            const pkgPayments = payments.filter(p => p.package_id === pkg.id);

            return (
              <div key={pkg.id} style={{ padding: '1.25rem', border: '0.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* Client name + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 400, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    {getClientName(pkg.client_id)}
                  </h4>
                  {statusBullet(status)}
                </div>

                {/* Package name */}
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
                  {pkg.name}
                  {(pkg.duration_months || 1) > 1 && (
                    <span style={{ opacity: 0.7 }}>
                      {' '}· {pkg.duration_months} meses · {cSym} {(pkg.value / (pkg.duration_months || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/mês
                    </span>
                  )}
                </p>

                {/* Mini-table */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  {[
                    { label: 'Valor Total', value: pkg.value,  color: 'var(--text-secondary)' },
                    { label: 'Pago',        value: pkg.paid,   color: pkg.paid > 0 ? 'rgba(52,211,153,0.75)' : 'var(--text-muted)' },
                    { label: 'Devedor',     value: owed,       color: owed > 0 ? 'rgba(239,100,100,0.7)' : 'var(--text-muted)' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div style={miniMetricLabel}>{label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 300, color, letterSpacing: '-0.01em' }}>
                        {cSym} {value.toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Thin progress line */}
                <div style={{ height: 2, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginBottom: '1rem' }}>
                  <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: 'rgba(52,211,153,0.45)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                </div>

                {/* History */}
                <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '0.75rem', marginBottom: owed > 0 ? '0.75rem' : 0 }}>
                  <SecLabel style={{ display: 'block', marginBottom: '0.5rem' }}>Histórico</SecLabel>
                  {pkgPayments.length === 0 ? (
                    <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.7 }}>Sem registros ainda.</p>
                  ) : (
                    pkgPayments
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((pay, idx) => (
                        <div key={pay.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0', borderTop: idx > 0 ? '0.5px solid var(--border)' : 'none' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                            {new Date(pay.date + 'T12:00').toLocaleDateString('pt-BR')}
                          </span>
                          {pay.note && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', opacity: 0.7, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {pay.note}
                            </span>
                          )}
                          {!pay.note && <span style={{ flex: 1 }} />}
                          <span style={{ fontSize: '0.78rem', color: 'rgba(52,211,153,0.75)', fontWeight: 500, flexShrink: 0 }}>
                            +{cSym} {pay.amount.toLocaleString('pt-BR')}
                          </span>
                          <IconBtn onClick={() => setConfirmUndo(pay)} title="Desfazer pagamento" hoverColor="var(--danger)">
                            <Undo2 size={12} />
                          </IconBtn>
                          <IconBtn onClick={() => handleGenerateReceipt(pay, pkg)} title="Baixar Recibo PDF" hoverColor="var(--text-primary)">
                            <Download size={12} />
                          </IconBtn>
                        </div>
                      ))
                  )}
                </div>

                {/* Register payment button */}
                {owed > 0 && (
                  <OutlineBtn onClick={() => openPaymentModal(pkg)} style={{ width: '100%', justifyContent: 'center' }}>
                    + Registrar Pagamento
                  </OutlineBtn>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Payment modal ── */}
      {showModal && selectedPkg && (() => {
        const owed = Math.max(0, selectedPkg.value - selectedPkg.paid);
        const quickAmounts = [
          { label: '1/3',    value: Math.round(owed / 3), note: '1ª parcela (1/3)' },
          { label: 'Metade', value: Math.round(owed / 2), note: '1ª parcela (50%)' },
          { label: 'Total',  value: owed,                 note: 'Pagamento integral' },
        ];
        const inputAmount = Number(form.amount);
        const exceedsOwed = inputAmount > owed;

        return (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <div className="modal">
              <div className="modal-header">
                <h3 style={{ fontWeight: 400 }}>Registrar Pagamento</h3>
                <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-primary)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    {getClientName(selectedPkg.client_id)} — {selectedPkg.name}
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.78rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Total: </span>
                      <span style={{ fontWeight: 600 }}>{cSym} {selectedPkg.value.toLocaleString('pt-BR')}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Já pago: </span>
                      <span style={{ fontWeight: 600, color: 'rgba(52,211,153,0.75)' }}>{cSym} {selectedPkg.paid.toLocaleString('pt-BR')}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Falta: </span>
                      <span style={{ fontWeight: 700, color: 'rgba(239,100,100,0.75)' }}>{cSym} {owed.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Atalhos rápidos</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {quickAmounts.map(q => (
                      <button
                        key={q.label}
                        type="button"
                        className={`btn btn-sm ${Number(form.amount) === q.value ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', height: 'auto', padding: '0.5rem 0.25rem', gap: '0.1rem' }}
                        onClick={() => setForm({ ...form, amount: q.value, note: form.note || q.note })}
                      >
                        <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{q.label}</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.75 }}>{cSym} {q.value.toLocaleString('pt-BR')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Data</label>
                    <input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Valor ({cSym})</label>
                    <input
                      type="number" className="form-control" min="0" max={owed} step="1"
                      value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                      style={{ borderColor: exceedsOwed ? 'var(--danger)' : undefined }}
                    />
                    {exceedsOwed && (
                      <p style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.3rem' }}>
                        ⚠ Máximo: {cSym} {owed.toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Observação</label>
                  <input className="form-control" placeholder="Ex: 2ª parcela" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <OutlineBtn onClick={savePayment} disabled={saving || exceedsOwed || !form.amount || Number(form.amount) <= 0}>
                  {saving ? 'Salvando...' : `Registrar ${cSym} ${Number(form.amount).toLocaleString('pt-BR')}`}
                </OutlineBtn>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Confirm undo ── */}
      {confirmUndo && (
        <ConfirmModal
          title="Desfazer Pagamento"
          message={`Tem certeza que deseja desfazer o pagamento de ${cSym} ${confirmUndo.amount.toLocaleString('pt-BR')}${confirmUndo.note ? ` (${confirmUndo.note})` : ''}? O valor será subtraído do saldo pago do pacote.`}
          confirmLabel="Desfazer"
          cancelLabel="Cancelar"
          danger
          onConfirm={handleUndoPayment}
          onCancel={() => setConfirmUndo(null)}
        />
      )}
    </div>
  );
}
