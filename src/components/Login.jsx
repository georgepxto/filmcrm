import { useState } from 'react';
import { Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Panel — Branding */}
        <div className="login-branding">
          <div className="login-branding-content">
            <div className="login-logo">
              <h1>Film<span>CRM</span></h1>
            </div>
            <p className="login-tagline">Gestão Cinematográfica</p>
            <div className="login-features">
              <div className="login-feature">— Calendário inteligente de gravações</div>
              <div className="login-feature">— Controle completo de clientes e pacotes</div>
              <div className="login-feature">— Pipeline de pós-produção Kanban</div>
              <div className="login-feature">— Gestão financeira com histórico</div>
            </div>
            <div className="login-branding-footer">
              <p>Seus dados na nuvem, acessíveis de qualquer dispositivo.</p>
            </div>
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="login-form-panel">
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

            {error && (
              <div className="login-alert login-alert-error">{error}</div>
            )}

            {success && (
              <div className="login-alert login-alert-success">{success}</div>
            )}

            {mode === 'register' && (
              <div className="login-field">
                <label htmlFor="login-name">Nome completo</label>
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
            )}

            <div className="login-field">
              <label htmlFor="login-email">Email</label>
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

            {mode !== 'reset' && (
              <div className="login-field">
                <label htmlFor="login-password">Senha</label>
                <div className="login-password-wrap">
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
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <button
                type="button"
                className="login-link login-forgot"
                onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}
              >
                Esqueci minha senha
              </button>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
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
                  <button type="button" className="login-link" onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>
                    Criar conta
                  </button>
                </p>
              ) : (
                <p>
                  Já tem conta?{' '}
                  <button type="button" className="login-link" onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
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
