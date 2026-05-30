import { useState } from 'react';
import { Eye, EyeOff, Loader, Calendar, Users, LayoutGrid, DollarSign, Lock, Mail, KeyRound, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import BrandLogo from './BrandLogo';

const FEATURES = [
  { icon: <Calendar size={16} />, label: 'Calendário inteligente de gravações' },
  { icon: <Users size={16} />, label: 'Controle completo de clientes e pacotes' },
  { icon: <LayoutGrid size={16} />, label: 'Pipeline de pós-produção Kanban' },
  { icon: <DollarSign size={16} />, label: 'Gestão financeira com histórico' },
];

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password);
        if (err) setError(translateError(err.message));
      } else if (mode === 'register') {
        if (!name.trim()) { setError('Informe seu nome.'); setLoading(false); return; }
        if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); setLoading(false); return; }
        const { error: err } = await signUp(email, password, name);
        if (err) {
          setError(translateError(err.message));
        } else {
          setSuccess('Conta criada! Verifique seu email para confirmar.');
          setMode('login');
        }
      } else if (mode === 'reset') {
        const { error: err } = await resetPassword(email);
        if (err) {
          setError(translateError(err.message));
        } else {
          setSuccess('Email de redefinição enviado! Verifique sua caixa de entrada.');
          setMode('login');
        }
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    }

    setLoading(false);
  };

  const translateError = (msg) => {
    if (msg.includes('Invalid login credentials')) return 'Email ou senha inválidos.';
    if (msg.includes('Email not confirmed')) return 'Email não confirmado. Verifique sua caixa de entrada.';
    if (msg.includes('User already registered')) return 'Este email já está cadastrado.';
    if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde um momento.';
    if (msg.includes('Password should be')) return 'A senha deve ter no mínimo 6 caracteres.';
    return msg;
  };

  const switchMode = (next) => { setMode(next); setError(''); setSuccess(''); };

  return (
    <div className="login-page">
      {/* Background layers */}
      <div className="bg-overlay" />
      {/* Light effects */}
      <div className="light-orb-main" />
      <div className="light-orb-secondary" />
      <div className="light-beam" />
      <div className="lens-flare" />

      <div className="login-card">

        {/* ── Left column — Presentation ── */}
        <div className="login-left">
          <div className="login-brand">
            <img src="/assets/takeone-icon.png" alt="TakeOne" className="login-brand-icon" />
            <div className="login-brand-text"><BrandLogo /></div>
          </div>
          <p className="login-tagline">Gestão Cinematográfica</p>

          <ul className="login-features">
            {FEATURES.map(f => (
              <li key={f.label} className="login-feature">
                <span className="login-feature-icon">{f.icon}</span>
                <span className="login-feature-label">{f.label}</span>
              </li>
            ))}
          </ul>

          <div className="login-left-footer">
            <Lock size={11} aria-hidden="true" />
            <span>Seus dados na nuvem, acessíveis de qualquer dispositivo.</span>
          </div>
        </div>

        {/* ── Right column — Form ── */}
        <div className="login-right">
          <div className="glass-inner-glow" />
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>
              {mode === 'login' && <>Bem-vindo <em>de volta</em></>}
              {mode === 'register' && 'Crie sua conta.'}
              {mode === 'reset' && 'Redefinir senha.'}
            </h2>
            <p className="login-subtitle">
              {mode === 'login' && 'Acesse seu painel de gestão'}
              {mode === 'register' && 'Comece a gerenciar seus projetos'}
              {mode === 'reset' && 'Enviaremos um link para seu email'}
            </p>

            {error && <div className="login-alert login-alert-error">{error}</div>}
            {success && <div className="login-alert login-alert-success">{success}</div>}

            {mode === 'register' && (
              <div className="login-field">
                <label htmlFor="login-name">Nome completo</label>
                <div className="login-input-wrap">
                  <User size={16} className="login-input-icon" aria-hidden="true" />
                  <input
                    id="login-name"
                    type="text"
                    className="form-control"
                    placeholder="Seu nome"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="login-field">
              <label htmlFor="login-email">Email</label>
              <div className="login-input-wrap">
                <Mail size={16} className="login-input-icon" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  className="form-control"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div className="login-field">
                <label htmlFor="login-password">Senha</label>
                <div className="login-input-wrap login-password-wrap">
                  <KeyRound size={16} className="login-input-icon" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <button type="button" className="login-forgot" onClick={() => switchMode('reset')}>
                Esqueci minha senha
              </button>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <Loader size={16} className="login-spinner" />
              ) : (
                <>
                  {mode === 'login' && 'Entrar'}
                  {mode === 'register' && 'Criar conta'}
                  {mode === 'reset' && 'Enviar link'}
                </>
              )}
            </button>

            <div className="login-switch">
              {mode === 'login' ? (
                <p>
                  Não tem conta?{' '}
                  <button type="button" className="login-link" onClick={() => switchMode('register')}>
                    Criar conta
                  </button>
                </p>
              ) : (
                <p>
                  Já tem conta?{' '}
                  <button type="button" className="login-link" onClick={() => switchMode('login')}>
                    Fazer login
                  </button>
                </p>
              )}
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
