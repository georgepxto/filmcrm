import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setSubscription(null); setLoading(false); return; }
    supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('user_id', user.id)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setSubscription(data || null);
        setLoading(false);
      });
  }, [user]);

  return { subscription, loading };
}
