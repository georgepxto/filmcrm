import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole]     = useState('user');

  const fetchRole = async (uid) => {
    if (!uid) { setRole('user'); return; }
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', uid)
        .single();
      setRole(data?.role || 'user');
    } catch {
      setRole('user');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      await fetchRole(u?.id);  // aguarda role antes de liberar loading
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        await fetchRole(u?.id);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  };

  const updateProfile = async (updates) => {
    const { data, error } = await supabase.auth.updateUser(updates);
    if (data?.user) setUser(data.user);
    return { data, error };
  };

  return (
    <AuthContext.Provider value={{
      user, loading, role,
      isAdmin: role === 'admin',
      signIn, signUp, signOut, resetPassword, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
