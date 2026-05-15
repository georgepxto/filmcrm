import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useSupabaseData() {
  const { user } = useAuth();

  const [clients, setClients] = useState([]);
  const [packages, setPackages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [videos, setVideos] = useState([]);
  const [payments, setPayments] = useState([]);
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Fetch all data ───
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cRes, pRes, sRes, vRes, payRes, rRes] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('packages').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('sessions').select('*').eq('user_id', user.id).order('date', { ascending: true }),
        supabase.from('videos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('references').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (cRes.data) setClients(cRes.data);
      if (pRes.data) setPackages(pRes.data);
      if (sRes.data) setSessions(sRes.data);
      if (vRes.data) setVideos(vRes.data);
      if (payRes.data) setPayments(payRes.data);
      if (rRes.data) setReferences(rRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── Clients CRUD ───
  const addClient = async (client) => {
    const { data, error } = await supabase
      .from('clients')
      .insert([{ ...client, user_id: user.id }])
      .select()
      .single();
    if (error) { console.error('addClient error:', error); return null; }
    setClients(prev => [data, ...prev]);
    return data;
  };

  const updateClient = async (id, updates) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) { console.error('updateClient error:', error); return null; }
    setClients(prev => prev.map(c => c.id === id ? data : c));
    return data;
  };

  const deleteClient = async (id) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) { console.error('deleteClient error:', error); return false; }
    setClients(prev => prev.filter(c => c.id !== id));
    // Also remove related packages
    setPackages(prev => prev.filter(p => p.client_id !== id));
    return true;
  };

  // ─── Packages CRUD ───
  const addPackage = async (pkg) => {
    const { data, error } = await supabase
      .from('packages')
      .insert([{ ...pkg, user_id: user.id }])
      .select()
      .single();
    if (error) { console.error('addPackage error:', error); return null; }
    setPackages(prev => [data, ...prev]);
    return data;
  };

  const updatePackage = async (id, updates) => {
    const { data, error } = await supabase
      .from('packages')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) { console.error('updatePackage error:', error); return null; }
    setPackages(prev => prev.map(p => p.id === id ? data : p));
    return data;
  };

  const deletePackage = async (id) => {
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) { console.error('deletePackage error:', error); return false; }
    setPackages(prev => prev.filter(p => p.id !== id));
    return true;
  };

  // ─── Sessions CRUD ───
  const addSession = async (session) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ ...session, user_id: user.id }])
      .select()
      .single();
    if (error) { console.error('addSession error:', error); return null; }
    setSessions(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)));
    return data;
  };

  const updateSession = async (id, updates) => {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) { console.error('updateSession error:', error); return null; }
    setSessions(prev => prev.map(s => s.id === id ? data : s));
    return data;
  };

  const deleteSession = async (id) => {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) { console.error('deleteSession error:', error); return false; }
    setSessions(prev => prev.filter(s => s.id !== id));
    return true;
  };

  // ─── Videos CRUD ───
  const addVideo = async (video) => {
    const { data, error } = await supabase
      .from('videos')
      .insert([{ ...video, user_id: user.id }])
      .select()
      .single();
    if (error) { console.error('addVideo error:', error); return null; }
    setVideos(prev => [data, ...prev]);
    return data;
  };

  const updateVideo = async (id, updates) => {
    const { data, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) { console.error('updateVideo error:', error); return null; }
    setVideos(prev => prev.map(v => v.id === id ? data : v));
    return data;
  };

  const deleteVideo = async (id) => {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) { console.error('deleteVideo error:', error); return false; }
    setVideos(prev => prev.filter(v => v.id !== id));
    return true;
  };

  // ─── Payments CRUD ───
  const addPayment = async (payment) => {
    const { data, error } = await supabase
      .from('payments')
      .insert([{ ...payment, user_id: user.id }])
      .select()
      .single();
    if (error) { console.error('addPayment error:', error); return null; }
    setPayments(prev => [data, ...prev]);

    // Also update the package's paid amount
    if (payment.package_id) {
      const pkg = packages.find(p => p.id === payment.package_id);
      if (pkg) {
        const newPaid = pkg.paid + Number(payment.amount);
        await updatePackage(payment.package_id, { paid: newPaid });
      }
    }

    return data;
  };

  const deletePayment = async (id) => {
    // Find the payment first to know how much to reverse
    const payment = payments.find(p => p.id === id);
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) { console.error('deletePayment error:', error); return false; }
    setPayments(prev => prev.filter(p => p.id !== id));

    // Reverse the amount from the package's paid total
    if (payment?.package_id) {
      const pkg = packages.find(p => p.id === payment.package_id);
      if (pkg) {
        const newPaid = Math.max(0, pkg.paid - Number(payment.amount));
        await updatePackage(payment.package_id, { paid: newPaid });
      }
    }
    return true;
  };

  // ─── References CRUD ───
  const addReference = async (reference) => {
    const { data, error } = await supabase
      .from('references')
      .insert([{ ...reference, user_id: user.id }])
      .select()
      .single();
    if (error) { console.error('addReference error:', error); return null; }
    setReferences(prev => [data, ...prev]);
    return data;
  };

  const updateReference = async (id, updates) => {
    const { data, error } = await supabase
      .from('references')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) { console.error('updateReference error:', error); return null; }
    setReferences(prev => prev.map(r => r.id === id ? data : r));
    return data;
  };

  const deleteReference = async (id) => {
    const { error } = await supabase.from('references').delete().eq('id', id).eq('user_id', user.id);
    if (error) { console.error('deleteReference error:', error); return false; }
    setReferences(prev => prev.filter(r => r.id !== id));
    return true;
  };

  return {
    // Data
    clients,
    packages,
    sessions,
    videos,
    payments,
    references,
    loading,
    refetch: fetchAll,

    // Clients
    addClient,
    updateClient,
    deleteClient,

    // Packages
    addPackage,
    updatePackage,
    deletePackage,

    // Sessions
    addSession,
    updateSession,
    deleteSession,

    // Videos
    addVideo,
    updateVideo,
    deleteVideo,

    // Payments
    addPayment,
    deletePayment,

    // References
    addReference,
    updateReference,
    deleteReference,
  };
}
