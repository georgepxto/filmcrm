import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Toast';

export default function AdminGate({ children }) {
  const { isAdmin, loading } = useAuth();
  const { error } = useToast();

  useEffect(() => {
    if (!loading && !isAdmin) {
      error('Acesso restrito a administradores.');
    }
  }, [loading, isAdmin]);

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
}
