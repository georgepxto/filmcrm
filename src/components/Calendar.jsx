import { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, X, Clock, User, Clapperboard, Filter, Plus, RefreshCw, MessageCircle, ChevronDown
} from 'lucide-react';
import { SERVICE_TYPES } from '../data';
import { useToast } from './Toast';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';

const formatPhone = (val) => {
  if (!val) return '';
  const digits = val.replace(/\D/g, '');
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`;
};

export default function Calendar({ clients, sessions, addSession, updateSession, deleteSession, addClient }) {
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

  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: '', contact: '', email: '' });
  const [savingClient, setSavingClient] = useState(false);

  const emptyForm = { client_id: '', title: '', date: '', time_start: '09:00', time_end: '10:00', service: SERVICE_TYPES[0], status: 'Pendente', is_all_day: false, date_end: '' };
  const [form, setForm] = useState(emptyForm);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  const getEventTitle = (ev) => {
    if (ev.client_id) return getClientName(ev.client_id);
    return ev.title || 'Evento Pessoal';
  };

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

  const isDateBetween = (targetDate, startDate, endDate) => {
    if (!endDate) return targetDate === startDate;
    return targetDate >= startDate && targetDate <= endDate;
  };

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
    const startStr = ev.start?.dateTime || ev.start?.date || '';
    const endStr = ev.end?.dateTime || ev.end?.date || '';
    if (!startStr) return;

    const startKey = startStr.slice(0, 10);
    const endKey = endStr ? endStr.slice(0, 10) : startKey;

    if (ev.end?.date && endKey > startKey) {
      let current = new Date(startKey + 'T12:00:00');
      let endObj = new Date(endKey + 'T12:00:00');
      while (current < endObj) {
        const dKey = current.toISOString().slice(0, 10);
        if (!googleEventsByDate[dKey]) googleEventsByDate[dKey] = [];
        googleEventsByDate[dKey].push(ev);
        current.setDate(current.getDate() + 1);
      }
    } else {
      if (!googleEventsByDate[startKey]) googleEventsByDate[startKey] = [];
      googleEventsByDate[startKey].push(ev);
    }
  });

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const filtered = filterClient
    ? sessions.filter(s => s.client_id === filterClient)
    : sessions;

  const getClientName = (id) => {
    const name = clients.find(c => c.id === id)?.name;
    if (!name) return 'Desconhecido';
    return name.trim().split(/\s+/).slice(0, 2).join(' ');
  };
  const getClientPhone = (id) => clients.find(c => c.id === id)?.contact || '';

  const openDay = (day, isCurrent) => {
    if (!isCurrent) return;
    setSelectedDay(day);
    setShowModal(true);
    setEditSession(null);
    setForm({ ...emptyForm, client_id: '', date: getDateStr(day) });
  };

  const formatTimeRange = (session) => {
    if (session.is_all_day) return 'O dia todo';
    const start = session.time_start || session.time || '—';
    const end = session.time_end;
    if (end) return `${start} — ${end}`;
    return start;
  };

  const handleCreateClient = async () => {
    if (!newClientForm.name.trim()) { toast.error('Informe o nome do cliente'); return; }
    setSavingClient(true);
    const result = await addClient(newClientForm);
    if (result) {
      toast.success('Cliente criado!');
      setForm({ ...form, client_id: result.id });
      setNewClientForm({ name: '', contact: '', email: '' });
      setShowNewClientModal(false);
    } else {
      toast.error('Não foi possível criar o cliente. Tente novamente.');
    }
    setSavingClient(false);
  };

  const handleSaveSession = async () => {
    if (!form.client_id && (!form.title || !form.title.trim())) {
      toast.error('Selecione um cliente ou dê um título ao evento');
      return;
    }
    const dateStr = form.date || getDateStr(selectedDay);
    if (!dateStr) { toast.error('Informe a data da sessão'); return; }
    if (!form.is_all_day && !form.time_start) { toast.error('Informe o horário de início'); return; }
    setSaving(true);
    const clientName = form.client_id ? getClientName(form.client_id) : form.title;

    if (editSession) {
      const result = await updateSession(editSession.id, {
        client_id: form.client_id || null,
        title: form.title || '',
        time_start: form.is_all_day ? null : form.time_start,
        time_end: form.is_all_day ? null : form.time_end,
        service: form.service,
        status: form.status,
        date: dateStr,
        is_all_day: form.is_all_day,
        date_end: form.date_end || null,
      });
      if (result) {
        toast.success('Atualizado');
        if (gcal.isSignedIn && syncToGoogle && editSession.google_event_id) {
          await gcal.updateEvent(editSession.google_event_id, {
            summary: form.client_id ? `📹 ${clientName} — ${form.service}` : `📅 ${clientName}`,
            description: `Via FilmmakerCRM\n${form.client_id ? `Cliente: ${clientName}\nServiço: ${form.service}\nStatus: ${form.status}` : `Evento Pessoal`}`,
            date: dateStr,
            timeStart: form.is_all_day ? null : form.time_start,
            timeEnd: form.is_all_day ? null : form.time_end,
          });
          fetchGoogleEvents();
        }
      } else {
        toast.error('Não foi possível atualizar a sessão. Tente novamente.');
      }
    } else {
      const result = await addSession({
        client_id: form.client_id || null,
        title: form.title || '',
        time_start: form.is_all_day ? null : form.time_start,
        time_end: form.is_all_day ? null : form.time_end,
        service: form.service,
        status: form.status,
        date: form.date || dateStr,
        is_all_day: form.is_all_day,
        date_end: form.date_end || null,
      });
      if (result) {
        toast.success('Gravação agendada');
        // Push to Google Calendar if connected and sync enabled
        if (gcal.isSignedIn && syncToGoogle) {
          const gcalResult = await gcal.createEvent({
            summary: form.client_id ? `📹 ${clientName} — ${form.service}` : `📅 ${clientName}`,
            description: `Via FilmmakerCRM\n${form.client_id ? `Cliente: ${clientName}\nServiço: ${form.service}\nStatus: ${form.status}` : `Evento Pessoal`}`,
            date: dateStr,
            timeStart: form.is_all_day ? null : form.time_start,
            timeEnd: form.is_all_day ? null : form.time_end,
          });
          if (gcalResult && gcalResult.id) {
            await updateSession(result.id, { google_event_id: gcalResult.id });
            toast.success('Sincronizado com Google Calendar');
            fetchGoogleEvents();
          }
        }
      } else {
        toast.error('Não foi possível agendar a sessão. Tente novamente.');
      }
    }

    setSaving(false);
    setEditSession(null);
    setForm({ ...emptyForm, client_id: clients[0]?.id || '' });
  };

  const handleDeleteSession = async (ev) => {
    const result = await deleteSession(ev.id);
    if (result) {
      toast.success('Gravação removida');
      if (gcal.isSignedIn && ev.google_event_id) {
        await gcal.deleteEvent(ev.google_event_id);
        fetchGoogleEvents();
      }
    } else {
      toast.error('Erro ao remover');
    }
  };

  const editSess = (s) => {
    setEditSession(s);
    setForm({
      client_id: s.client_id || '',
      title: s.title || '',
      date: s.date,
      time_start: s.time_start || s.time || '09:00',
      time_end: s.time_end || '',
      service: s.service,
      status: s.status,
      is_all_day: s.is_all_day || false,
      date_end: s.date_end || '',
    });
  };

  const cancelEdit = () => {
    setEditSession(null);
    setForm({ ...emptyForm, client_id: '', date: getDateStr(selectedDay) });
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
    ? filtered.filter(s => isDateBetween(getDateStr(selectedDay), s.date, s.date_end))
        .sort((a, b) => {
          if (a.is_all_day && !b.is_all_day) return -1;
          if (!a.is_all_day && b.is_all_day) return 1;
          return (a.time_start || a.time || '').localeCompare(b.time_start || b.time || '');
        })
    : [];

  // Count total events per day (CRM + Google Calendar)
  const getDayEventCount = (dateStr) => {
    const crmCount = filtered.filter(s => isDateBetween(dateStr, s.date, s.date_end)).length;
    const googleCount = googleEventsByDate[dateStr]?.length || 0;
    return crmCount + googleCount;
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
          const currentDayStr = cell.current ? getDateStr(cell.day) : '';
          const crmEvents = cell.current ? filtered.filter(s => isDateBetween(currentDayStr, s.date, s.date_end)).sort((a, b) => {
              if (a.is_all_day && !b.is_all_day) return -1;
              if (!a.is_all_day && b.is_all_day) return 1;
              return (a.time_start || a.time || '').localeCompare(b.time_start || b.time || '');
            }) : [];
          const gEvents = cell.current ? (googleEventsByDate[currentDayStr] || []).sort((a, b) => {
            const timeA = a.start?.dateTime || a.start?.date || '';
            const timeB = b.start?.dateTime || b.start?.date || '';
            return timeA.localeCompare(timeB);
          }) : [];
          const totalEvents = crmEvents.length + gEvents.length;
          const isToday = currentDayStr === todayStr;
          const eventCount = cell.current ? getDayEventCount(currentDayStr) : 0;
          const visibleCount = Math.min(crmEvents.length, 2) + Math.min(gEvents.length, crmEvents.length >= 2 ? 1 : 2);
          return (
            <div
              key={i}
              className={`calendar-cell${!cell.current ? ' other-month' : ''}${isToday ? ' today' : ''}${totalEvents > 0 ? ' has-events' : ''}`}
              onClick={() => openDay(cell.day, cell.current)}
            >
              <div className="day-number">
                {cell.day}
                {eventCount > 1 && (
                  <span className="day-client-count" title={`${eventCount} eventos`}>
                    {eventCount}
                  </span>
                )}
              </div>
              {crmEvents.slice(0, 2).map(ev => {
                const isStart = currentDayStr === ev.date;
                const isEnd = !ev.date_end || currentDayStr === ev.date_end;
                const dateObj = new Date(currentDayStr + 'T12:00:00');
                const showText = isStart || dateObj.getDay() === 0;

                const allDayStyle = ev.is_all_day ? {
                  background: 'var(--amber)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.15rem 0.25rem',
                  borderTopLeftRadius: isStart ? '4px' : '0',
                  borderBottomLeftRadius: isStart ? '4px' : '0',
                  borderTopRightRadius: isEnd ? '4px' : '0',
                  borderBottomRightRadius: isEnd ? '4px' : '0',
                  marginLeft: isStart ? '0' : '-4px',
                  marginRight: isEnd ? '0' : '-4px',
                  position: 'relative',
                  zIndex: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  minHeight: '20px'
                } : {};

                // normalize status to match CSS classes (use english class names for calendar-event)
                const statusLower = (ev.status || '').toLowerCase();
                let statusClass = statusLower;
                if (statusLower === 'pendente') statusClass = 'pending';
                else if (statusLower === 'confirmado') statusClass = 'confirmed';
                else if (statusLower === 'concluído' || statusLower === 'concluido') statusClass = 'completed';

                return (
                  <div 
                    key={ev.id} 
                    className={`calendar-event ${statusClass}`} 
                    style={allDayStyle}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cell.current) {
                        setSelectedDay(cell.day);
                        setShowModal(true);
                        editSess(ev);
                      }
                    }}
                  >
                    {ev.is_all_day 
                      ? (showText 
                          ? `Dia todo ${getEventTitle(ev)}` 
                          : <span style={{ opacity: 0 }}>{`Dia todo ${getEventTitle(ev)}`}</span>
                        ) 
                      : `${(ev.time_start || ev.time || '—').slice(0, 5)} ${getEventTitle(ev)}`
                    }
                  </div>
                );
              })}
              {gEvents.slice(0, crmEvents.length >= 2 ? 1 : 2).map(gev => (
                <div key={gev.id} className="calendar-event google-event" title="Google Calendar">
                  {(gev.start?.dateTime || '').slice(11, 16) || '○'} {(gev.summary || '').slice(0, 12)}
                </div>
              ))}
              {totalEvents > visibleCount && (
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', paddingLeft: '0.35rem' }}>
                  +{totalEvents - visibleCount} mais
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h3>
                  <CalendarDays size={18} />
                  {selectedDay && `${selectedDay} de ${monthNames[month]}`}
                </h3>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.35rem', color: editSession ? 'var(--amber)' : 'var(--text-muted)' }}>
                  {editSession ? '— Modo de Edição' : <><Plus size={12} /> Novo Agendamento</>}
                </span>
              </div>
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
                            {getEventTitle(ev)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={11} />
                              {formatTimeRange(ev)}
                            </span>
                            {ev.is_all_day && <span className="badge" style={{ background: 'var(--amber)', color: '#fff', opacity: 1, padding: '0.1rem 0.3rem' }}>Dia Todo</span>}
                            {ev.date_end && ev.date_end !== ev.date && <span className="badge" style={{ background: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.3rem' }}>Até {ev.date_end.split('-').reverse().join('/')}</span>}
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
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSession(ev)} style={{ padding: '0.25rem 0.5rem' }}>×</button>
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
                borderTop: !editSession && dayEvents.length > 0 ? '1px solid var(--border)' : 'none',
                paddingTop: !editSession && dayEvents.length > 0 ? '1rem' : 0,
                backgroundColor: editSession ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                border: editSession ? '1px solid var(--amber)' : 'none',
                padding: editSession ? '1rem' : (!editSession && dayEvents.length > 0 ? '1rem 0 0 0' : 0),
                borderRadius: editSession ? '0.5rem' : 0,
                marginTop: editSession ? '1rem' : 0,
              }}>

                <div className="form-group">
                  <label><User size={12} style={{ display: 'inline', marginRight: 4 }} />Cliente / Projeto <span style={{ fontWeight: 400, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                  <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                    <div 
                      className="form-control" 
                      style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'var(--bg-input)', position: 'relative' }}
                      onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                    >
                      {form.client_id ? clients.find(c => c.id === form.client_id)?.name : 'Nenhum (Evento Pessoal)'}
                      <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', color: 'var(--text-muted)' }} />
                    </div>
                    {clientDropdownOpen && (
                      <>
                        <div 
                          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} 
                          onClick={(e) => { e.stopPropagation(); setClientDropdownOpen(false); }} 
                        />
                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: '3.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.35rem', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', padding: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <input 
                            type="text" 
                            placeholder="Buscar cliente..." 
                            value={clientSearch}
                            onChange={e => setClientSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="form-control"
                            autoFocus
                            style={{ marginBottom: '0.25rem', height: '32px', fontSize: '0.85rem' }}
                          />
                          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            <div 
                              style={{ padding: '0.5rem', cursor: 'pointer', borderRadius: '0.25rem', background: form.client_id === '' ? 'var(--bg-modifier)' : 'transparent', color: form.client_id === '' ? 'var(--amber)' : 'var(--text-primary)', fontSize: '0.85rem' }}
                              onClick={() => { setForm({ ...form, client_id: '', title: '' }); setClientDropdownOpen(false); setClientSearch(''); }}
                            >
                              Nenhum (Evento Pessoal)
                            </div>
                            {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                              <div 
                                key={c.id} 
                                style={{ padding: '0.5rem', cursor: 'pointer', borderRadius: '0.25rem', background: form.client_id === c.id ? 'var(--bg-modifier)' : 'transparent', color: form.client_id === c.id ? 'var(--amber)' : 'var(--text-primary)', fontSize: '0.85rem' }}
                                onClick={() => { setForm({ ...form, client_id: c.id, title: '' }); setClientDropdownOpen(false); setClientSearch(''); }}
                              >
                                {c.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    <button className="btn btn-secondary" onClick={() => setShowNewClientModal(true)} title="Novo Cliente" style={{ padding: '0 0.75rem', flexShrink: 0 }} disabled={!!form.title}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                {!form.client_id && (
                  <div className="form-group">
                    <label><CalendarDays size={12} style={{ display: 'inline', marginRight: 4 }} />Título do Evento</label>
                    <input type="text" className="form-control" placeholder="Ex: Reunião, Viagem, Feriado..." value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
                  </div>
                )}
                <div className="form-row" style={{ marginTop: '0.75rem', marginBottom: '0.75rem', background: 'var(--bg-modifier)', padding: '0.65rem 0.85rem', borderRadius: '0.35rem', border: '1px solid var(--border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-primary)', width: '100%', userSelect: 'none' }}>
                    <div className="toggle-switch">
                      <input type="checkbox" checked={form.is_all_day} onChange={e => setForm({ ...form, is_all_day: e.target.checked })} />
                      <span className="toggle-slider"></span>
                    </div>
                    Evento de Dia Inteiro
                  </label>
                </div>
                {!form.is_all_day && (
                  <div className="form-row">
                    <div className="form-group">
                      <label><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />Início</label>
                      <input type="time" className="form-control" value={form.time_start || ''} onChange={handleStartTimeChange} />
                    </div>
                    <div className="form-group">
                      <label><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />Fim</label>
                      <input type="time" className="form-control" value={form.time_end || ''} onChange={e => setForm({ ...form, time_end: e.target.value })} />
                    </div>
                  </div>
                )}
                {form.is_all_day && (
                  <div className="form-row">
                    <div className="form-group">
                      <label><CalendarDays size={12} style={{ display: 'inline', marginRight: 4 }} />Data Inicial</label>
                      <input type="date" className="form-control" value={form.date || (selectedDay ? getDateStr(selectedDay) : '')} onChange={e => setForm({ ...form, date: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label><CalendarDays size={12} style={{ display: 'inline', marginRight: 4 }} />Data Final</label>
                      <input type="date" className="form-control" value={form.date_end || ''} onChange={e => setForm({ ...form, date_end: e.target.value })} min={form.date || (selectedDay ? getDateStr(selectedDay) : '')} />
                    </div>
                  </div>
                )}
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
      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowNewClientModal(false); }} style={{ zIndex: 1100 }}>
          <div className="modal">
            <div className="modal-header">
              <h3><User size={18} /> Novo Cliente</h3>
              <button className="modal-close" onClick={() => setShowNewClientModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nome</label>
                <input className="form-control" placeholder="Nome completo" value={newClientForm.name} onChange={e => setNewClientForm({ ...newClientForm, name: e.target.value })} autoFocus />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contato</label>
                  <input
                    className="form-control"
                    placeholder="(00) 00000-0000"
                    value={newClientForm.contact}
                    inputMode="numeric"
                    maxLength={16}
                    onChange={e => setNewClientForm({ ...newClientForm, contact: formatPhone(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Email <span style={{ fontWeight: 400, opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                  <input className="form-control" type="email" placeholder="email@exemplo.com" value={newClientForm.email} onChange={e => setNewClientForm({ ...newClientForm, email: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewClientModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateClient} disabled={savingClient}>
                {savingClient ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
