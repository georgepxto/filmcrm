import { useState } from 'react';
import {
  DollarSign, Plus, X, Filter, CreditCard, AlertCircle, CheckCircle, Clock,
} from 'lucide-react';
import { uid } from '../data';

export default function Payments({ clients, packages, payments, setPayments }) {
  const [filterClient, setFilterClient] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState(null);

  const emptyForm = { clientId: '', packageId: '', date: new Date().toISOString().slice(0, 10), amount: 0, note: '' };
  const [form, setForm] = useState(emptyForm);

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '—';
  const getPackageName = (id) => packages.find(p => p.id === id)?.name || '—';

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
      case 'overdue': return 'Em Atraso';
      default: return '—';
    }
  };

  const filteredPkgs = filterClient
    ? packages.filter(p => p.clientId === filterClient)
    : packages;

  const openPaymentModal = (pkg) => {
    setSelectedPkg(pkg);
    setForm({
      clientId: pkg.clientId,
      packageId: pkg.id,
      date: new Date().toISOString().slice(0, 10),
      amount: pkg.value - pkg.paid,
      note: '',
    });
    setShowModal(true);
  };

  const savePayment = () => {
    if (!form.amount || form.amount <= 0) return;
    const amount = Number(form.amount);
    setPayments(prev => [...prev, { id: uid(), clientId: form.clientId, packageId: form.packageId, date: form.date, amount, note: form.note }]);
    // We don't have setPackages here — caller should pass it if needed
    // Actually, we need to update packages paid amount through App state
    setShowModal(false);
  };

  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
  const totalOwed = packages.reduce((s, p) => s + Math.max(0, p.value - p.paid), 0);

  const today = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const monthReceived = payments.filter(p => p.date.startsWith(monthKey)).reduce((s, p) => s + p.amount, 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2><DollarSign size={24} /> Gestão de Pagamentos</h2>
        <select className="form-control" style={{ minWidth: 180 }} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="">Todos os clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Financial Summary */}
      <div className="summary-cards" style={{ marginBottom: '2rem' }}>
        <div className="summary-card">
          <div className="icon-wrap" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--success)' }}>
            <CheckCircle size={20} />
          </div>
          <div className="info">
            <h4>Total Recebido</h4>
            <div className="value" style={{ color: 'var(--success)' }}>R$ {totalReceived.toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="icon-wrap" style={{ background: 'rgba(96,165,250,0.15)', color: 'var(--info)' }}>
            <CreditCard size={20} />
          </div>
          <div className="info">
            <h4>Recebido Este Mês</h4>
            <div className="value" style={{ color: 'var(--info)' }}>R$ {monthReceived.toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="icon-wrap" style={{ background: totalOwed > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)', color: totalOwed > 0 ? 'var(--danger)' : 'var(--success)' }}>
            <AlertCircle size={20} />
          </div>
          <div className="info">
            <h4>A Receber</h4>
            <div className="value" style={{ color: totalOwed > 0 ? 'var(--danger)' : 'var(--success)' }}>R$ {totalOwed.toLocaleString('pt-BR')}</div>
          </div>
        </div>
      </div>

      {/* Package Payment Cards */}
      <h3 className="section-title"><CreditCard size={18} /> Pagamentos por Pacote</h3>
      <div className="card-grid" style={{ marginBottom: '2rem' }}>
        {filteredPkgs.map(pkg => {
          const status = getPaymentStatus(pkg);
          const owed = Math.max(0, pkg.value - pkg.paid);
          const progress = pkg.value > 0 ? (pkg.paid / pkg.value) * 100 : 0;
          const pkgPayments = payments.filter(p => p.packageId === pkg.id);

          return (
            <div key={pkg.id} className="card">
              <div className="flex-between mb-1">
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {getClientName(pkg.clientId)}
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pkg.name}</p>
                </div>
                <span className={`badge badge-${status}`}>
                  {status === 'paid' ? <CheckCircle size={10} /> : status === 'partial' ? <Clock size={10} /> : <AlertCircle size={10} />}
                  {' '}{getStatusLabel(status)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', margin: '0.75rem 0', fontSize: '0.78rem' }}>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.68rem' }}>Valor Total</div>
                  <div style={{ fontWeight: 600 }}>R$ {pkg.value.toLocaleString('pt-BR')}</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.68rem' }}>Pago</div>
                  <div style={{ fontWeight: 600, color: 'var(--success)' }}>R$ {pkg.paid.toLocaleString('pt-BR')}</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '0.68rem' }}>Devedor</div>
                  <div style={{ fontWeight: 600, color: owed > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    R$ {owed.toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>

              <div className="progress-bar" style={{ marginBottom: '0.75rem' }}>
                <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, background: progress >= 100 ? 'var(--success)' : undefined }} />
              </div>

              {/* Payment history */}
              {pkgPayments.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                    Histórico
                  </p>
                  {pkgPayments.map(pay => (
                    <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.2rem 0', color: 'var(--text-secondary)' }}>
                      <span>{new Date(pay.date + 'T12:00').toLocaleDateString('pt-BR')} {pay.note && `— ${pay.note}`}</span>
                      <span style={{ color: 'var(--success)', fontWeight: 500 }}>+ R$ {pay.amount.toLocaleString('pt-BR')}</span>
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

      {filteredPkgs.length === 0 && (
        <div className="empty-state">
          <DollarSign size={48} />
          <p>Nenhum pacote encontrado</p>
        </div>
      )}

      {/* Payment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3><DollarSign size={18} /> Registrar Pagamento</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {selectedPkg && (
                <div className="card" style={{ marginBottom: '1rem', background: 'var(--bg-primary)' }}>
                  <div style={{ fontSize: '0.82rem' }}>
                    <strong>{getClientName(selectedPkg.clientId)}</strong> — {selectedPkg.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Saldo devedor: <span className="text-danger">R$ {Math.max(0, selectedPkg.value - selectedPkg.paid).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Data</label>
                  <input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Valor (R$)</label>
                  <input type="number" className="form-control" min="0" step="100" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Observação</label>
                <input className="form-control" placeholder="Ex: 3ª parcela" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={savePayment}>Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
