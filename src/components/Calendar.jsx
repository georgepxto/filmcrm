import { useState } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, X, Clock, User, Clapperboard, Filter,
} from 'lucide-react';
import { uid, SERVICE_TYPES } from '../data';

export default function Calendar({ clients, sessions, setSessions }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [editSession, setEditSession] = useState(null);

  const emptyForm = { clientId: '', time: '09:00', service: SERVICE_TYPES[0], status: 'Pendente' };
  const [form, setForm] = useState(emptyForm);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, current: false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, current: true });
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) cells.push({ day: i, current: false });

  const getDateStr = (day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const filtered = filterClient
    ? sessions.filter(s => s.clientId === filterClient)
    : sessions;

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '—';

  const openDay = (day, isCurrent) => {
    if (!isCurrent) return;
    setSelectedDay(day);
    setShowModal(true);
    setEditSession(null);
    setForm({ ...emptyForm, clientId: clients[0]?.id || '' });
  };

  const saveSession = () => {
    if (!form.clientId) return;
    const dateStr = getDateStr(selectedDay);
    if (editSession) {
      setSessions(prev => prev.map(s => s.id === editSession.id ? { ...s, ...form, date: dateStr } : s));
    } else {
      setSessions(prev => [...prev, { id: uid(), ...form, date: dateStr }]);
    }
    setShowModal(false);
    setEditSession(null);
  };

  const deleteSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const editSess = (s) => {
    setEditSession(s);
    setForm({ clientId: s.clientId, time: s.time, service: s.service, status: s.status });
  };

  const dayEvents = selectedDay
    ? filtered.filter(s => s.date === getDateStr(selectedDay))
    : [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2><CalendarDays size={24} /> Calendário de Gravações</h2>
        <div className="flex gap-1">
          <div style={{ position: 'relative' }}>
            <Filter size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <select
              className="form-control"
              style={{ paddingLeft: '2rem', minWidth: 180 }}
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
            >
              <option value="">Todos os clientes</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Month Nav */}
      <div className="flex-between mb-2">
        <button className="btn btn-secondary btn-sm" onClick={() => setViewDate(new Date(year, month - 1, 1))}>
          <ChevronLeft size={16} />
        </button>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
          {monthNames[month]} <span className="text-amber">{year}</span>
        </h3>
        <button className="btn btn-secondary btn-sm" onClick={() => setViewDate(new Date(year, month + 1, 1))}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {dayNames.map(d => <div key={d} className="calendar-header-cell">{d}</div>)}
        {cells.map((cell, i) => {
          const dateStr = cell.current ? getDateStr(cell.day) : '';
          const events = cell.current ? filtered.filter(s => s.date === dateStr) : [];
          const isToday = dateStr === todayStr;
          return (
            <div
              key={i}
              className={`calendar-cell${!cell.current ? ' other-month' : ''}${isToday ? ' today' : ''}${events.length > 0 ? ' has-events' : ''}`}
              onClick={() => openDay(cell.day, cell.current)}
            >
              <div className="day-number">{cell.day}</div>
              {events.slice(0, 3).map(ev => (
                <div key={ev.id} className={`calendar-event ${ev.status.toLowerCase()}`}>
                  {ev.time} {getClientName(ev.clientId).split(' ')[0]}
                </div>
              ))}
              {events.length > 3 && (
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', paddingLeft: '0.35rem' }}>
                  +{events.length - 3} mais
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3>
                <CalendarDays size={18} />
                {selectedDay && `${selectedDay} de ${monthNames[month]}`}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {/* Existing events for this day */}
              {dayEvents.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p className="text-muted mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Agendamentos do dia
                  </p>
                  {dayEvents.map(ev => (
                    <div key={ev.id} className="card" style={{ marginBottom: '0.5rem', padding: '0.75rem' }}>
                      <div className="flex-between">
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {getClientName(ev.clientId)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {ev.time} — {ev.service}
                          </div>
                        </div>
                        <div className="flex gap-1" style={{ alignItems: 'center' }}>
                          <span className={`badge badge-${ev.status.toLowerCase()}`}>{ev.status}</span>
                          <button className="btn btn-secondary btn-sm" onClick={() => editSess(ev)} style={{ padding: '0.25rem 0.5rem' }}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteSession(ev.id)} style={{ padding: '0.25rem 0.5rem' }}>×</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Form */}
              <p className="text-muted mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {editSession ? 'Editar Agendamento' : 'Novo Agendamento'}
              </p>
              <div className="form-group">
                <label><User size={12} style={{ display: 'inline', marginRight: 4 }} />Cliente</label>
                <select className="form-control" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />Horário</label>
                  <input type="time" className="form-control" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option>Pendente</option>
                    <option>Confirmado</option>
                    <option>Concluído</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label><Clapperboard size={12} style={{ display: 'inline', marginRight: 4 }} />Tipo de Serviço</label>
                <select className="form-control" value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}>
                  {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setEditSession(null); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveSession}>
                {editSession ? 'Salvar Alterações' : 'Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
