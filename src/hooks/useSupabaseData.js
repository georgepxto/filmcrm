import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const tmpId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export function useSupabaseData() {
  const { user } = useAuth();

  const [clients, setClients] = useState([]);
  const [packages, setPackages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [videos, setVideos] = useState([]);
  const [payments, setPayments] = useState([]);
  const [references, setReferences] = useState([]);
  const [pipelineSettings, setPipelineSettings] = useState({ notes: '', links: [] });
  const [loading, setLoading] = useState(true);

  // Ref so async closures always see the latest packages without stale closure
  const packagesRef = useRef(packages);
  useEffect(() => { packagesRef.current = packages; }, [packages]);

  // ─── Fetch all data ───
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cRes, pRes, sRes, vRes, payRes, rRes, psRes] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('packages').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('sessions').select('*').eq('user_id', user.id).order('date', { ascending: true }),
        supabase.from('videos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('references').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('pipeline_settings').select('*').eq('user_id', user.id).single(),
      ]);
      if (cRes.data) setClients(cRes.data);
      if (pRes.data) setPackages(pRes.data);
      if (sRes.data) setSessions(sRes.data);
      if (vRes.data) setVideos(vRes.data);
      if (payRes.data) setPayments(payRes.data);
      if (rRes.data) setReferences(rRes.data);
      if (psRes?.data) setPipelineSettings(psRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Clients ───
  const addClient = async (client) => {
    const id = tmpId();
    setClients(prev => [{ ...client, id, user_id: user.id, created_at: new Date().toISOString() }, ...prev]);
    const { data, error } = await supabase.from('clients').insert([{ ...client, user_id: user.id }]).select().single();
    if (error) { console.error(error?.code, error?.message); setClients(prev => prev.filter(c => c.id !== id)); return null; }
    setClients(prev => prev.map(c => c.id === id ? data : c));
    return data;
  };

  const updateClient = async (id, updates) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    const { data, error } = await supabase.from('clients').update(updates).eq('id', id).eq('user_id', user.id).select().single();
    if (error) { console.error(error?.code, error?.message); fetchAll(); return null; }
    setClients(prev => prev.map(c => c.id === id ? data : c));
    return data;
  };

  const deleteClient = async (id) => {
    setClients(prev => prev.filter(c => c.id !== id));
    setPackages(prev => prev.filter(p => p.client_id !== id));
    const { error } = await supabase.from('clients').delete().eq('id', id).eq('user_id', user.id);
    if (error) { console.error(error?.code, error?.message); fetchAll(); return false; }
    return true;
  };

  // ─── Packages ───
  const addPackage = async (pkg) => {
    const id = tmpId();
    setPackages(prev => [{ ...pkg, id, user_id: user.id, created_at: new Date().toISOString() }, ...prev]);
    const { data, error } = await supabase.from('packages').insert([{ ...pkg, user_id: user.id }]).select().single();
    if (error) { console.error(error?.code, error?.message); setPackages(prev => prev.filter(p => p.id !== id)); return null; }
    setPackages(prev => prev.map(p => p.id === id ? data : p));
    return data;
  };

  const updatePackage = async (id, updates) => {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    const { data, error } = await supabase.from('packages').update(updates).eq('id', id).eq('user_id', user.id).select().single();
    if (error) { console.error(error?.code, error?.message); fetchAll(); return null; }
    setPackages(prev => prev.map(p => p.id === id ? data : p));
    return data;
  };

  const deletePackage = async (id) => {
    setPackages(prev => prev.filter(p => p.id !== id));
    const { error } = await supabase.from('packages').delete().eq('id', id).eq('user_id', user.id);
    if (error) { console.error(error?.code, error?.message); fetchAll(); return false; }
    return true;
  };

  // ─── Sessions ───
  const addSession = async (session) => {
    const id = tmpId();
    setSessions(prev => [...prev, { ...session, id, user_id: user.id }].sort((a, b) => a.date.localeCompare(b.date)));
    const { data, error } = await supabase.from('sessions').insert([{ ...session, user_id: user.id }]).select().single();
    if (error) { console.error(error?.code, error?.message); setSessions(prev => prev.filter(s => s.id !== id)); return null; }
    setSessions(prev => prev.map(s => s.id === id ? data : s));
    return data;
  };

  const updateSession = async (id, updates) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    const { data, error } = await supabase.from('sessions').update(updates).eq('id', id).eq('user_id', user.id).select().single();
    if (error) { console.error(error?.code, error?.message); fetchAll(); return null; }
    setSessions(prev => prev.map(s => s.id === id ? data : s));
    return data;
  };

  const deleteSession = async (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    const { error } = await supabase.from('sessions').delete().eq('id', id).eq('user_id', user.id);
    if (error) { console.error(error?.code, error?.message); fetchAll(); return false; }
    return true;
  };

  // ─── Videos ───
  const addVideo = async (video) => {
    const id = tmpId();
    setVideos(prev => [{ ...video, id, user_id: user.id, created_at: new Date().toISOString() }, ...prev]);

    const pkg = video.package_id ? packagesRef.current.find(p => p.id === video.package_id) : null;
    const needsCounter = pkg && (video.edited || video.delivered || video.posted);
    const pkgUpdates = needsCounter ? {
      edited: (pkg.edited || 0) + (video.edited ? 1 : 0),
      delivered: (pkg.delivered || 0) + (video.delivered ? 1 : 0),
      posted: (pkg.posted || 0) + (video.posted ? 1 : 0),
    } : null;

    if (pkgUpdates) setPackages(prev => prev.map(p => p.id === video.package_id ? { ...p, ...pkgUpdates } : p));

    const [{ data, error }, pkgRes] = await Promise.all([
      supabase.from('videos').insert([{ ...video, user_id: user.id }]).select().single(),
      needsCounter
        ? supabase.from('packages').update(pkgUpdates).eq('id', video.package_id).eq('user_id', user.id).select().single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (error) { console.error(error?.code, error?.message); setVideos(prev => prev.filter(v => v.id !== id)); fetchAll(); return null; }
    setVideos(prev => prev.map(v => v.id === id ? data : v));
    if (pkgRes.data) setPackages(prev => prev.map(p => p.id === video.package_id ? pkgRes.data : p));
    return data;
  };

  const updateVideo = async (id, updates) => {
    const oldVideo = videos.find(v => v.id === id);
    setVideos(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));

    const editedDelta = oldVideo && updates.edited !== undefined && updates.edited !== oldVideo.edited ? (updates.edited ? 1 : -1) : 0;
    const deliveredDelta = oldVideo && updates.delivered !== undefined && updates.delivered !== oldVideo.delivered ? (updates.delivered ? 1 : -1) : 0;
    const postedDelta = oldVideo && updates.posted !== undefined && updates.posted !== oldVideo.posted ? (updates.posted ? 1 : -1) : 0;
    const hasCounterChange = (editedDelta || deliveredDelta || postedDelta) && oldVideo?.package_id;

    const pkg = hasCounterChange ? packagesRef.current.find(p => p.id === oldVideo.package_id) : null;
    const pkgUpdates = pkg ? {
      edited: Math.max(0, (pkg.edited || 0) + editedDelta),
      delivered: Math.max(0, (pkg.delivered || 0) + deliveredDelta),
      posted: Math.max(0, (pkg.posted || 0) + postedDelta),
    } : null;

    if (pkgUpdates) setPackages(prev => prev.map(p => p.id === oldVideo.package_id ? { ...p, ...pkgUpdates } : p));

    const [{ data, error }, pkgRes] = await Promise.all([
      supabase.from('videos').update(updates).eq('id', id).eq('user_id', user.id).select().single(),
      pkgUpdates
        ? supabase.from('packages').update(pkgUpdates).eq('id', oldVideo.package_id).eq('user_id', user.id).select().single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (error) {
      console.error(error?.code, error?.message);
      fetchAll();
      return null;
    }
    setVideos(prev => prev.map(v => v.id === id ? data : v));
    if (pkgRes.data) setPackages(prev => prev.map(p => p.id === oldVideo.package_id ? pkgRes.data : p));
    return data;
  };

  const deleteVideo = async (id) => {
    const video = videos.find(v => v.id === id);
    setVideos(prev => prev.filter(v => v.id !== id));

    const pkg = video?.package_id ? packagesRef.current.find(p => p.id === video.package_id) : null;
    const needsCounter = pkg && (video.edited || video.delivered || video.posted);
    const pkgUpdates = needsCounter ? {
      edited: Math.max(0, (pkg.edited || 0) - (video.edited ? 1 : 0)),
      delivered: Math.max(0, (pkg.delivered || 0) - (video.delivered ? 1 : 0)),
      posted: Math.max(0, (pkg.posted || 0) - (video.posted ? 1 : 0)),
    } : null;

    if (pkgUpdates) setPackages(prev => prev.map(p => p.id === video.package_id ? { ...p, ...pkgUpdates } : p));

    const [{ error }, pkgRes] = await Promise.all([
      supabase.from('videos').delete().eq('id', id).eq('user_id', user.id),
      pkgUpdates
        ? supabase.from('packages').update(pkgUpdates).eq('id', video.package_id).eq('user_id', user.id).select().single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (error) { console.error(error?.code, error?.message); fetchAll(); return false; }
    if (pkgRes.data) setPackages(prev => prev.map(p => p.id === video.package_id ? pkgRes.data : p));
    return true;
  };

  // ─── Payments ───
  const addPayment = async (payment) => {
    const id = tmpId();
    setPayments(prev => [{ ...payment, id, user_id: user.id }, ...prev]);

    const pkg = payment.package_id ? packagesRef.current.find(p => p.id === payment.package_id) : null;
    const pkgUpdates = pkg ? { paid: (pkg.paid || 0) + Number(payment.amount) } : null;
    if (pkgUpdates) setPackages(prev => prev.map(p => p.id === payment.package_id ? { ...p, ...pkgUpdates } : p));

    const [{ data, error }, pkgRes] = await Promise.all([
      supabase.from('payments').insert([{ ...payment, user_id: user.id }]).select().single(),
      pkgUpdates
        ? supabase.from('packages').update(pkgUpdates).eq('id', payment.package_id).eq('user_id', user.id).select().single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (error) { console.error(error?.code, error?.message); setPayments(prev => prev.filter(p => p.id !== id)); fetchAll(); return null; }
    setPayments(prev => prev.map(p => p.id === id ? data : p));
    if (pkgRes.data) setPackages(prev => prev.map(p => p.id === payment.package_id ? pkgRes.data : p));
    return data;
  };

  const deletePayment = async (id) => {
    const payment = payments.find(p => p.id === id);
    setPayments(prev => prev.filter(p => p.id !== id));

    const pkg = payment?.package_id ? packagesRef.current.find(p => p.id === payment.package_id) : null;
    const pkgUpdates = pkg ? { paid: Math.max(0, (pkg.paid || 0) - Number(payment.amount)) } : null;
    if (pkgUpdates) setPackages(prev => prev.map(p => p.id === payment.package_id ? { ...p, ...pkgUpdates } : p));

    const [{ error }, pkgRes] = await Promise.all([
      supabase.from('payments').delete().eq('id', id).eq('user_id', user.id),
      pkgUpdates
        ? supabase.from('packages').update(pkgUpdates).eq('id', payment.package_id).eq('user_id', user.id).select().single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (error) { console.error(error?.code, error?.message); fetchAll(); return false; }
    if (pkgRes.data) setPackages(prev => prev.map(p => p.id === payment.package_id ? pkgRes.data : p));
    return true;
  };

  // ─── References ───
  const addReference = async (reference) => {
    const id = tmpId();
    setReferences(prev => [{ ...reference, id, user_id: user.id, created_at: new Date().toISOString() }, ...prev]);
    const { data, error } = await supabase.from('references').insert([{ ...reference, user_id: user.id }]).select().single();
    if (error) { console.error(error?.code, error?.message); setReferences(prev => prev.filter(r => r.id !== id)); return null; }
    setReferences(prev => prev.map(r => r.id === id ? data : r));
    return data;
  };

  const updateReference = async (id, updates) => {
    setReferences(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    const { data, error } = await supabase.from('references').update(updates).eq('id', id).eq('user_id', user.id).select().single();
    if (error) { console.error(error?.code, error?.message); fetchAll(); return null; }
    setReferences(prev => prev.map(r => r.id === id ? data : r));
    return data;
  };

  const deleteReference = async (id) => {
    setReferences(prev => prev.filter(r => r.id !== id));
    const { error } = await supabase.from('references').delete().eq('id', id).eq('user_id', user.id);
    if (error) { console.error(error?.code, error?.message); fetchAll(); return false; }
    return true;
  };

  // ─── Pipeline Settings ───
  const updatePipelineSettings = async (updates) => {
    const newSettings = { ...pipelineSettings, ...updates, user_id: user.id };
    setPipelineSettings(newSettings);
    const { data, error } = await supabase.from('pipeline_settings').upsert([newSettings]).select().single();
    if (error) { console.error(error?.code, error?.message); return null; }
    setPipelineSettings(data);
    return data;
  };

  return {
    clients, packages, sessions, videos, payments, references,
    pipelineSettings, loading, refetch: fetchAll,
    addClient, updateClient, deleteClient,
    addPackage, updatePackage, deletePackage,
    addSession, updateSession, deleteSession,
    addVideo, updateVideo, deleteVideo,
    addPayment, deletePayment,
    addReference, updateReference, deleteReference,
    updatePipelineSettings,
  };
}
