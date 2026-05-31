import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAdminData() {
  const [users, setUsers]                           = useState([]);
  const [subscriptions, setSubscriptions]           = useState([]);
  const [subscriptionPayments, setSubPayments]      = useState([]);
  const [plans, setPlans]                           = useState([]);
  const [auditLog, setAuditLog]                     = useState([]);
  const [loading, setLoading]                       = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [
      usersRes,
      subsRes,
      paymentsRes,
      plansRes,
      auditRes,
    ] = await Promise.all([
      supabase.rpc('admin_get_users'),
      supabase
        .from('subscriptions')
        .select('*, plan:plans(*)')
        .order('created_at', { ascending: false }),
      supabase
        .from('subscription_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('plans')
        .select('*')
        .order('sort_order'),
      supabase
        .from('admin_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300),
    ]);

    setUsers(usersRes.data || []);
    setSubscriptions(subsRes.data || []);
    setSubPayments(paymentsRes.data || []);
    setPlans(plansRes.data || []);
    setAuditLog(auditRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Plan mutations (direct, via RLS) ──
  const updatePlan = async (id, updates) => {
    const { data, error } = await supabase
      .from('plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error) setPlans(prev => prev.map(p => p.id === id ? data : p));
    return { data, error };
  };

  const createPlan = async (plan) => {
    const { data, error } = await supabase
      .from('plans')
      .insert(plan)
      .select()
      .single();
    if (!error) setPlans(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
    return { data, error };
  };

  // ── Subscription mutations (admin) ──
  const updateSubscriptionLocal = (id, updates) =>
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));

  const removeSubscription = (id) =>
    setSubscriptions(prev => prev.filter(s => s.id !== id));

  // ── User profile updates (after admin actions) ──
  const updateUserLocal = (id, updates) =>
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));

  return {
    users,
    subscriptions,
    subscriptionPayments,
    plans,
    auditLog,
    loading,
    refetch: fetchAll,
    updatePlan,
    createPlan,
    updateSubscriptionLocal,
    removeSubscription,
    updateUserLocal,
  };
}
