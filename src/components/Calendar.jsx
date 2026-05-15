import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, X, Clock, User, Clapperboard, Filter, Plus, RefreshCw, MessageCircle
} from 'lucide-react';
import { SERVICE_TYPES } from '../data';
import { useToast } from './Toast';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

export default function Calendar({ clients, sessions, addSession, updateSession, deleteSession }) {
  const toast = useToast();
  const gcal = useGoogleCalendar();
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [editSession, setEditSession] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncToGoogle, setSyncToGoogle] = useState(true);

  const emptyForm = { client_id: '', time_start: '09:00', time_end: '10:00', service: SERVICE_TYPES[0], status: 'Pendente' };
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

  // Fetch Google Calendar events when month changes or when signed in
  const fetchGoogleEvents = useCallback(() => {
    if (!gcal.isSignedIn) return;
    const timeMin = new Date(year, month, 1);
    const timeMax = new Date(year, month + 1, 0, 23, 59, 59);
    gcal.fetchEvents(timeMin.toISOString(), timeMax.toISOString());
  }, [gcal.isSignedIn, year, month]);

  useEffect(() => {
    fetchGoogleEvents();
  }, [fetchGoogleEvents]);

  // Parse Google events to get date -> events map
  const googleEventsByDate = {};
  gcal.events.forEach(ev => {
    const start = ev.start?.dateTime || ev.start?.date || '';
    const dateKey = start.slice(0, 10);
    if (!googleEventsByDate[dateKey]) googleEventsByDate[dateKey] = [];
    googleEventsByDate[dateKey].push(ev);
  });

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const filtered = filterClient
    ? sessions.filter(s => s.client_id === filterClient)
    : sessions;

  const getClientName = (id) => clients.find(c => c.id === id)?.name || 'Desconhecido';
  const getClientPhone = (id) => clients.find(c => c.id === id)?.contact || '';

  const openDay = (day, isCurrent) => {
    if (!isCurrent) return;
    setSelectedDay(day);
    setShowModal(true);
    setEditSession(null);
    setForm({ ...emptyForm, client_id: clients[0]?.id || '' });
  };

  const formatTimeRange = (session) => {
    const start = session.time_start || session.time || '—';
    const end = session.time_end;
    if (end) return `${start} — ${end}`;
    return start;
  };

  const handleSaveSession = async () => {
    if (!form.client_id) return;
    setSaving(true);
    const dateStr = getDateStr(selectedDay);
    const clientName = getClientName(form.client_id);

    if (editSession) {
      const result = await updateSession(editSession.id, {
        client_id: form.client_id,
        time_start: form.time_start,
        time_end: form.time_end,
        service: form.service,
        status: form.status,
        date: dateStr,
      });
      result ? toast.success('Gravação atualizada') : toast.error('Erro ao atualizar');
    } else {
      const result = await addSession({
        client_id: form.client_id,
        time_start: form.time_start,
        time_end: form.time_end,
        service: form.service,
        status: form.status,
        date: dateStr,
      });
      if (result) {
        toast.success('Gravação agendada');
        // Push to Google Calendar if connected and sync enabled
        if (gcal.isSignedIn && syncToGoogle) {
          const gcalResult = await gcal.createEvent({
            summary: `📹 ${clientName} — ${form.service}`,
            description: `Gravação via FilmmakerCRM\nCliente: ${clientName}\nServiço: ${form.service}\nStatus: ${form.status}`,
            date: dateStr,
            timeStart: form.time_start,
            timeEnd: form.time_end,
          });
          if (gcalResult) {
            toast.success('Sincronizado com Google Calendar');
            fetchGoogleEvents();
          }
        }
      } else {
        toast.error('Erro ao agendar');
      }
    }

    setSaving(false);
    setEditSession(null);
    setForm({ ...emptyForm, client_id: clients[0]?.id || '' });
  };

  const handleDeleteSession = async (id) => {
    const result = await deleteSession(id);
    result ? toast.success('Gravação removida') : toast.error('Erro ao remover');
  };

  const editSess = (s) => {
    setEditSession(s);
    setForm({
      client_id: s.client_id,
      time_start: s.time_start || s.time || '09:00',
      time_end: s.time_end || '',
      service: s.service,
      status: s.status,
    });
  };

  const cancelEdit = () => {
    setEditSession(null);
    setForm({ ...emptyForm, client_id: clients[0]?.id || '' });
  };

  const handleStartTimeChange = (e) => {
    const val = e.target.value;
    let newForm = { ...form, time_start: val };
    
    if (val) {
      if (!form.time_end) {
        const [h, m] = val.split(':');
        const endH = String((parseInt(h, 10) + 1) % 24).padStart(2, '0');
        newForm.time_end = `${endH}:${m}`;
      } else if (form.time_start) {
         const [sH, sM] = form.time_start.split(':').map(Number);
         const [eH, eM] = form.time_end.split(':').map(Number);
         let diff = (eH * 60 + eM) - (sH * 60 + sM);
         if (diff < 0) diff += 24 * 60;
         
         const [nH, nM] = val.split(':').map(Number);
         let newEndMin = nH * 60 + nM + diff;
         const newEH = String(Math.floor(newEndMin / 60) % 24).padStart(2, '0');
         const newEM = String(newEndMin % 60).padStart(2, '0');
         newForm.time_end = `${newEH}:${newEM}`;
      }
    }
    setForm(newForm);
  };

  const dayEvents = selectedDay
    ? filtered.filter(s => s.date === getDateStr(selectedDay))
        .sort((a, b) => (a.time_start || a.time || '').localeCompare(b.time_start || b.time || ''))
    : [];

  // Count unique clients per day
  const getDayClientCount = (dateStr) => {
    const daySessionsList = filtered.filter(s => s.date === dateStr);
    const uniqueClients = new Set(daySessionsList.map(s => s.client_id));
    return uniqueClients.size;
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2><CalendarDays size={24} /> Calendário de Gravações</h2>
        <div className="flex gap-1" style={{ alignItems: 'center' }}>
          {/* Google Calendar connect/disconnect */}
          {gcal.ready && (
            gcal.isSignedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={fetchGoogleEvents} title="Sincronizar">
                  <RefreshCw size={14} className={gcal.loading ? 'login-spinner' : ''} />
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--success)', border: '1px solid rgba(52,211,153,0.25)', fontSize: '0.72rem', gap: '0.3rem' }}
                  onClick={gcal.signOut}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                  Google conectado
                </button>
              </div>
            ) : (
              <button
                className="btn btn-sm"
                style={{ background: 'rgba(96,165,250,0.12)', color: 'var(--info)', border: '1px solid rgba(96,165,250,0.25)', fontSize: '0.72rem', gap: '0.3rem' }}
                onClick={gcal.signIn}
              >
                <CalendarDays size={13} />
                Conectar Google Agenda
              </button>
            )
          )}
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
      <div className="calendar-wrapper">
        <div className="calendar-grid">
        {dayNames.map(d => <div key={d} className="calendar-header-cell">{d}</div>)}
        {cells.map((cell, i) => {
          const dateStr = cell.current ? getDateStr(cell.day) : '';
          const crmEvents = cell.current ? filtered.filter(s => s.date === dateStr) : [];
          const gEvents = cell.current ? (googleEventsByDate[dateStr] || []) : [];
          const totalEvents = crmEvents.length + gEvents.length;
          const isToday = dateStr === todayStr;
          const clientCount = cell.current ? getDayClientCount(dateStr) : 0;
          return (
            <div
              key={i}
              className={`calendar-cell${!cell.current ? ' other-month' : ''}${isToday ? ' today' : ''}${totalEvents > 0 ? ' has-events' : ''}`}
              onClick={() => openDay(cell.day, cell.current)}
            >
              <div className="day-number">
                {cell.day}
                {clientCount > 1 && (
                  <span className="day-client-count" title={`${clientCount} clientes`}>
                    {clientCount}
                  </span>
                )}
              </div>
              {crmEvents.slice(0, 2).map(ev => (
                <div key={ev.id} className={`calendar-event ${(ev.status || '').toLowerCase()}`}>
                  {(ev.time_start || ev.time || '—').slice(0, 5)} {getClientName(ev.client_id).split(' ')[0]}
                </div>
              ))}
              {gEvents.slice(0, crmEvents.length >= 2 ? 1 : 2).map(gev => (
                <div key={gev.id} className="calendar-event google-event" title="Google Calendar">
                  {(gev.start?.dateTime || '').slice(11, 16) || '○'} {(gev.summary || '').slice(0, 12)}
                </div>
              ))}
              {totalEvents > 3 && (
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', paddingLeft: '0.35rem' }}>
                  +{totalEvents - 3} mais
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>
                <CalendarDays size={18} />
                {selectedDay && `${selectedDay} de ${monthNames[month]}`}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {/* Existing CRM events for this day */}
              {dayEvents.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <p className="text-muted mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Agendamentos do dia ({dayEvents.length})
                  </p>
                  {dayEvents.map(ev => (
                    <div key={ev.id} className="card" style={{ marginBottom: '0.5rem', padding: '0.75rem' }}>
                      <div className="flex-between">
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {getClientName(ev.client_id)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={11} />
                              {formatTimeRange(ev)}
                            </span>
                            <span>•</span>
                            <span>{ev.service}</span>
                          </div>
                        </div>
                        <div className="flex gap-1" style={{ alignItems: 'center' }}>
                          <span className={`badge badge-${(ev.status || '').toLowerCase()}`}>{ev.status}</span>
                          {getClientPhone(ev.client_id) && (
                            <a href={`https://wa.me/${getClientPhone(ev.client_id).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.4rem', color: '#25D366', borderColor: 'rgba(37,211,102,0.3)' }} title="Falar no WhatsApp">
                              <MessageCircle size={13} />
                            </a>
                          )}
                          <button className="btn btn-secondary btn-sm" onClick={() => editSess(ev)} style={{ padding: '0.25rem 0.5rem' }}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSession(ev.id)} style={{ padding: '0.25rem 0.5rem' }}>×</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Google Calendar events for this day */}
              {(() => {
                const dayGEvents = selectedDay ? (googleEventsByDate[getDateStr(selectedDay)] || []) : [];
                if (dayGEvents.length === 0) return null;
                return (
                  <div style={{ marginBottom: '1rem' }}>
                    <p className="text-muted mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CalendarDays size={12} style={{ color: 'var(--info)' }} />
                      Google Agenda ({dayGEvents.length})
                    </p>
                    {dayGEvents.map(gev => {
                      const startTime = (gev.start?.dateTime || '').slice(11, 16);
                      const endTime = (gev.end?.dateTime || '').slice(11, 16);
                      return (
                        <div key={gev.id} className="card" style={{ marginBottom: '0.5rem', padding: '0.75rem', borderLeft: '3px solid var(--info)' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {gev.summary || '(Sem título)'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {startTime && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={11} /> {startTime}{endTime ? ` — ${endTime}` : ''}</span>}
                            {gev.location && <><span>•</span><span>{gev.location}</span></>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Form */}
              <div style={{ 
                borderTop: dayEvents.length > 0 ? '1px solid var(--border)' : 'none',
                paddingTop: dayEvents.length > 0 ? '1rem' : 0,
              }}>
                <p className="text-muted mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {editSession ? 'Editar Agendamento' : <><Plus size={12} /> Novo Agendamento</>}
                </p>
                <div className="form-group">
                  <label><User size={12} style={{ display: 'inline', marginRight: 4 }} />Cliente</label>
                  <select className="form-control" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                    <option value="">Selecione...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />Início</label>
                    <input type="time" className="form-control" value={form.time_start} onChange={handleStartTimeChange} />
                  </div>
                  <div className="form-group">
                    <label><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />Fim</label>
                    <input type="time" className="form-control" value={form.time_end} onChange={e => setForm({ ...form, time_end: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label><Clapperboard size={12} style={{ display: 'inline', marginRight: 4 }} />Tipo de Serviço</label>
                    <select className="form-control" value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}>
                      {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                    </select>
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
              </div>
            </div>
            <div className="modal-footer" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              {editSession && (
                <button className="btn btn-secondary" onClick={cancelEdit} style={{ marginRight: 'auto' }}>
                  Cancelar Edição
                </button>
              )}
              {!editSession && gcal.isSignedIn && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: 'auto', cursor: 'pointer' }}>
                  <input type="checkbox" checked={syncToGoogle} onChange={e => setSyncToGoogle(e.target.checked)} style={{ accentColor: 'var(--amber)' }} />
                  Sincronizar com Google
                </label>
              )}
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setEditSession(null); }}>Fechar</button>
              <button className="btn btn-primary" onClick={handleSaveSession} disabled={saving}>
                {saving ? 'Salvando...' : editSession ? 'Salvar Alterações' : 'Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
