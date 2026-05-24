import { useState } from 'react';
import {
  DollarSign, Plus, X, CreditCard, AlertCircle, CheckCircle, Clock, Undo2, ChevronLeft, ChevronRight, CalendarDays, Download,
} from 'lucide-react';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';
import { useAuth } from '../contexts/AuthContext';

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

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'partial': return 'Parcial';
      case 'overdue': return 'Pendente';
      default: return '—';
    }
  };

  const filteredPkgs = packages
    .filter(p => !filterClient || p.client_id === filterClient)
    .filter(p => isActiveInMonth(p));

  const monthPayments = payments.filter(p => p.date.startsWith(viewMonthKey));
  const monthReceived = monthPayments.reduce((s, p) => s + p.amount, 0);
  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);

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
    if (!amount || amount <= 0) return;
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
      toast.error('Erro ao registrar pagamento');
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
      toast.error('Erro ao desfazer pagamento');
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

      // Colors
      const primaryColor = [20, 20, 20];
      const accentColor = [212, 135, 10]; // Amber
      const textColor = [60, 60, 60];
      const lightGray = [245, 245, 245];

      // Top Bar Header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 45, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.text("RECIBO", 20, 28);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Nº ${receiptId}`, 165, 28);

      // Value Block
      doc.setFillColor(...lightGray);
      doc.rect(20, 55, 170, 35, 'F');
      
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("VALOR RECEBIDO", 105, 65, null, null, "center");

      doc.setTextColor(...accentColor);
      doc.setFontSize(24);
      doc.text(`${cSym} ${pay.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 105, 80, null, null, "center");

      // Details Setup
      doc.setTextColor(...textColor);
      doc.setFontSize(10);
      
      // Emitente Box
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(252, 252, 252);
      doc.rect(20, 100, 80, 40, 'FD');
      
      doc.setFont("helvetica", "bold");
      doc.text("EMITENTE", 25, 110);
      doc.setFont("helvetica", "normal");
      doc.text(compName, 25, 118);
      doc.text(`${docType}: ${docNum}`, 25, 125);
      doc.text(`Data: ${receiptDate}`, 25, 132);

      // Cliente Box
      doc.rect(110, 100, 80, 40, 'FD');
      
      doc.setFont("helvetica", "bold");
      doc.text("PAGADOR", 115, 110);
      doc.setFont("helvetica", "normal");
      const clientLines = doc.splitTextToSize(clientName, 70);
      doc.text(clientLines, 115, 118);

      // Reference Area
      doc.setFont("helvetica", "bold");
      doc.text("REFERENTE A:", 20, 155);
      doc.setFont("helvetica", "normal");
      const titleLines = doc.splitTextToSize(pkg.title || pkg.name || 'Serviços Audiovisuais', 170);
      doc.text(titleLines, 20, 162);
      
      if (pay.note) {
        doc.setFont("helvetica", "italic");
        doc.text(`Obs: ${pay.note}`, 20, 162 + (titleLines.length * 6));
      }

      // PIX info
      if (pix) {
        doc.setFillColor(...lightGray);
        doc.rect(20, 180, 170, 20, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("CHAVE PIX PARA FUTUROS PAGAMENTOS:", 25, 191);
        doc.setFont("helvetica", "normal");
        doc.text(pix, 100, 191);
      }

      // Signature Line
      doc.setDrawColor(150, 150, 150);
      doc.line(65, 250, 145, 250);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(compName, 105, 258, null, null, "center");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Assinatura do Recebedor", 105, 263, null, null, "center");

      // Generate & Save
      doc.save(`Recibo_${clientName.split(' ')[0]}_${pay.amount}.pdf`);
      toast.success('Recibo Profissional gerado!');
    });
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2><DollarSign size={24} /> Gestão de Pagamentos</h2>
        <select className="form-control" style={{ minWidth: 180, width: 'auto', maxWidth: 320 }} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="">Todos os clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 200, justifyContent: 'center' }}>
          <CalendarDays size={16} style={{ color: 'var(--amber)' }} />
          <span style={{ fontSize: '1.05rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
            {monthNames[viewMonth.month]} {viewMonth.year}
          </span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      <div className="summary-cards" style={{ marginBottom: '2rem' }}>
        <div className="summary-card">
          <div className="icon-wrap" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--success)' }}><CheckCircle size={20} /></div>
          <div className="info"><h4>Recebido no Mês</h4><div className="value" style={{ color: 'var(--success)' }}>{cSym} {monthReceived.toLocaleString('pt-BR')}</div></div>
        </div>
        <div className="summary-card">
          <div className="icon-wrap" style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--info)' }}><CreditCard size={20} /></div>
          <div className="info"><h4>Previsto/Mês</h4><div className="value" style={{ color: 'var(--info)' }}>{cSym} {monthlyExpected.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div></div>
        </div>
        <div className="summary-card">
          <div className="icon-wrap" style={{ background: totalOwed > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)', color: totalOwed > 0 ? 'var(--danger)' : 'var(--success)' }}><AlertCircle size={20} /></div>
          <div className="info"><h4>A Receber (Contratos Ativos)</h4><div className="value" style={{ color: totalOwed > 0 ? 'var(--danger)' : 'var(--success)' }}>{cSym} {totalOwed.toLocaleString('pt-BR')}</div></div>
        </div>
      </div>

      <h3 className="section-title"><CreditCard size={18} /> Contratos Ativos em {monthNames[viewMonth.month]}</h3>
      <div className="card-grid" style={{ marginBottom: '2rem' }}>
        {filteredPkgs.map(pkg => {
          const status = getPaymentStatus(pkg);
          const owed = Math.max(0, pkg.value - pkg.paid);
          const progress = pkg.value > 0 ? (pkg.paid / pkg.value) * 100 : 0;
          const pkgPayments = payments.filter(p => p.package_id === pkg.id);

          return (
            <div key={pkg.id} className="card">
              <div className="flex-between mb-1">
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{getClientName(pkg.client_id)}</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {pkg.name}
                    {(pkg.duration_months || 1) > 1 && (
                      <span style={{ marginLeft: '0.5rem', background: 'rgba(212,135,10,0.12)', color: 'var(--amber)', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600 }}>
                        {pkg.duration_months} meses · {cSym} {(pkg.value / (pkg.duration_months || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/mês
                      </span>
                    )}
                  </p>
                </div>
                <span className={`badge badge-${status}`}>
                  {status === 'paid' ? <CheckCircle size={10} /> : status === 'partial' ? <Clock size={10} /> : <AlertCircle size={10} />}
                  {' '}{getStatusLabel(status)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', margin: '0.75rem 0', fontSize: '0.78rem' }}>
                <div><div className="text-muted" style={{ fontSize: '0.68rem' }}>Valor Total</div><div style={{ fontWeight: 600 }}>{cSym} {pkg.value.toLocaleString('pt-BR')}</div></div>
                <div><div className="text-muted" style={{ fontSize: '0.68rem' }}>Pago</div><div style={{ fontWeight: 600, color: 'var(--success)' }}>{cSym} {pkg.paid.toLocaleString('pt-BR')}</div></div>
                <div><div className="text-muted" style={{ fontSize: '0.68rem' }}>Devedor</div><div style={{ fontWeight: 600, color: owed > 0 ? 'var(--danger)' : 'var(--success)' }}>{cSym} {owed.toLocaleString('pt-BR')}</div></div>
              </div>

              <div className="progress-bar" style={{ marginBottom: '0.75rem' }}>
                <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, background: progress >= 100 ? 'var(--success)' : undefined }} />
              </div>

              {pkgPayments.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>Histórico</p>
                  {pkgPayments.map(pay => (
                    <div key={pay.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.25rem 0', color: 'var(--text-secondary)', gap: '0.5rem' }}>
                      <span style={{ flex: 1 }}>{new Date(pay.date + 'T12:00').toLocaleDateString('pt-BR')} {pay.note && `— ${pay.note}`}</span>
                      <span style={{ color: 'var(--success)', fontWeight: 500, flexShrink: 0 }}>+ {cSym} {pay.amount.toLocaleString('pt-BR')}</span>
                      <button
                        onClick={() => setConfirmUndo(pay)}
                        title="Desfazer pagamento"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.15rem 0.35rem', borderRadius: 4, lineHeight: 1, flexShrink: 0, transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                        onMouseOver={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                        onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
                      >
                        <Undo2 size={13} />
                      </button>
                      <button
                        onClick={() => handleGenerateReceipt(pay, pkg)}
                        title="Baixar Recibo PDF"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--info)', padding: '0.15rem 0.35rem', borderRadius: 4, lineHeight: 1, flexShrink: 0, transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                        onMouseOver={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(96,165,250,0.1)'; }}
                        onMouseOut={e => { e.currentTarget.style.color = 'var(--info)'; e.currentTarget.style.background = 'none'; }}
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {owed > 0 && (
                <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => openPaymentModal(pkg)}>
                  <Plus size={14} /> Registrar Pagamento
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filteredPkgs.length === 0 && <div className="empty-state"><DollarSign size={48} /><p>Nenhum pacote encontrado</p></div>}

      {showModal && selectedPkg && (() => {
        const owed = Math.max(0, selectedPkg.value - selectedPkg.paid);
        const quickAmounts = [
          { label: '1/3', value: Math.round(owed / 3), note: '1ª parcela (1/3)' },
          { label: 'Metade', value: Math.round(owed / 2), note: '1ª parcela (50%)' },
          { label: 'Total', value: owed, note: 'Pagamento integral' },
        ];
        const inputAmount = Number(form.amount);
        const exceedsOwed = inputAmount > owed;

        return (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <div className="modal">
              <div className="modal-header">
                <h3><DollarSign size={18} /> Registrar Pagamento</h3>
                <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                {/* Package info banner */}
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
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
                      <span style={{ fontWeight: 600, color: 'var(--success)' }}>{cSym} {selectedPkg.paid.toLocaleString('pt-BR')}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Falta: </span>
                      <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{cSym} {owed.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                {/* Quick fill buttons */}
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

                {/* Amount + date */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Data</label>
                    <input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Valor ({cSym})</label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      max={owed}
                      step="1"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })}
                      style={{ borderColor: exceedsOwed ? 'var(--danger)' : undefined }}
                    />
                    {exceedsOwed && (
                      <p style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.3rem' }}>
                        ⚠ Máximo permitido: {cSym} {owed.toLocaleString('pt-BR')}
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
                <button className="btn btn-primary" onClick={savePayment} disabled={saving || exceedsOwed || !form.amount || Number(form.amount) <= 0}>
                  {saving ? 'Salvando...' : `Registrar ${cSym} ${Number(form.amount).toLocaleString('pt-BR')}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirm undo modal */}
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
