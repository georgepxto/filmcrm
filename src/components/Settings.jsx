import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';

/* ── Shared styles ── */
const labelStyle = {
  display: 'block',
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: '0.4rem',
  opacity: 0.85,
};

const inputBase = {
  background: 'var(--bg-elevated)',
  border: '0.5px solid var(--border)',
  borderRadius: 6,
};

const SecLabel = ({ children }) => (
  <span style={{
    fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: 'var(--text-muted)', opacity: 0.8,
  }}>
    {children}
  </span>
);

const OutlineBtn = ({ onClick, children, disabled, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    style={{
      background: 'transparent',
      border: '1px solid var(--amber)',
      color: disabled ? 'var(--text-muted)' : 'var(--amber)',
      borderRadius: 6,
      padding: '0.5rem 1.15rem',
      fontSize: '0.85rem',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      transition: 'background 0.18s',
      fontFamily: 'var(--font-body)',
      opacity: disabled ? 0.5 : 1,
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(212,135,10,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
  >
    {children}
  </button>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: '1.1rem' }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const avatarInputRef = useRef(null);

  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
  const [currency, setCurrency] = useState(user?.user_metadata?.currency || 'BRL');
  const [companyName, setCompanyName] = useState(user?.user_metadata?.company_name || '');
  const [documentType, setDocumentType] = useState(user?.user_metadata?.document_type || 'CPF');
  const [documentNumber, setDocumentNumber] = useState(user?.user_metadata?.document_number || '');
  const [pixKey, setPixKey] = useState(user?.user_metadata?.pix_key || '');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingBusiness, setLoadingBusiness] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);

  const handleAvatarUpload = async (event) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      setUploadingAvatar(true);
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setAvatarUrl(data.publicUrl);
      toast.success('Foto enviada! Clique em Salvar perfil.');
    } catch (error) {
      toast.error('Erro no upload. Verifique se o bucket "avatars" é Público no Supabase.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const isValidCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    return rest === parseInt(cpf.substring(10, 11));
  };

  const isValidCNPJ = (cnpj) => {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    let digits = cnpj.substring(size);
    let sum = 0, pos = size - 7;
    for (let i = size; i >= 1; i--) { sum += numbers.charAt(size - i) * pos--; if (pos < 2) pos = 9; }
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(0))) return false;
    size++;
    numbers = cnpj.substring(0, size);
    sum = 0; pos = size - 7;
    for (let i = size; i >= 1; i--) { sum += numbers.charAt(size - i) * pos--; if (pos < 2) pos = 9; }
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    return result === parseInt(digits.charAt(1));
  };

  const formatDocument = (val, type) => {
    let v = val.replace(/\D/g, '');
    if (type === 'CPF') {
      if (v.length > 11) v = v.substring(0, 11);
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      if (v.length > 14) v = v.substring(0, 14);
      v = v.replace(/^(\d{2})(\d)/, '$1.$2');
      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
      v = v.replace(/(\d{4})(\d)/, '$1-$2');
    }
    return v;
  };

  const handleDocumentChange = (e) => setDocumentNumber(formatDocument(e.target.value, documentType));
  const handleDocumentTypeChange = (e) => {
    const newType = e.target.value;
    setDocumentType(newType);
    setDocumentNumber(formatDocument(documentNumber, newType));
  };

  const docDigits = documentNumber.replace(/\D/g, '');
  const isDocFilled = documentType === 'CPF' ? docDigits.length === 11 : docDigits.length === 14;
  const isDocValid = isDocFilled ? (documentType === 'CPF' ? isValidCPF(documentNumber) : isValidCNPJ(documentNumber)) : true;

  const handleUpdateProfileData = async (e) => {
    e.preventDefault();
    setLoadingProfile(true);
    const { error } = await updateProfile({ data: { full_name: name, avatar_url: avatarUrl, currency, company_name: companyName, document_type: documentType, document_number: documentNumber, pix_key: pixKey } });
    setLoadingProfile(false);
    error ? toast.error('Erro ao atualizar perfil') : toast.success('Perfil atualizado com sucesso');
  };

  const handleUpdateBusinessData = async (e) => {
    e.preventDefault();
    if (documentNumber) {
      if (documentType === 'CPF' && !isValidCPF(documentNumber)) { toast.error('O CPF digitado é inválido.'); return; }
      if (documentType === 'CNPJ' && !isValidCNPJ(documentNumber)) { toast.error('O CNPJ digitado é inválido.'); return; }
    }
    setLoadingBusiness(true);
    const { error } = await updateProfile({ data: { full_name: name, avatar_url: avatarUrl, currency, company_name: companyName, document_type: documentType, document_number: documentNumber, pix_key: pixKey } });
    setLoadingBusiness(false);
    error ? toast.error('Erro ao atualizar empresa') : toast.success('Empresa atualizada com sucesso');
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('As senhas não coincidem'); return; }
    if (password.length < 6) { toast.error('A senha deve ter no mínimo 6 caracteres'); return; }
    setLoadingPassword(true);
    const { error } = await updateProfile({ password });
    setLoadingPassword(false);
    if (error) { toast.error('Erro ao atualizar senha'); }
    else { toast.success('Senha atualizada com sucesso'); setPassword(''); setConfirmPassword(''); }
  };

  const avatarInitial = (name || user?.email || '?').charAt(0).toUpperCase();

  /* ── Appearance mini-card preview ── */
  const ThemeCard = ({ value, label }) => {
    const selected = theme === value;
    const dark = value === 'dark';
    const lines = [{ w: '75%', o: 0.9 }, { w: '50%', o: 0.6 }, { w: '65%', o: 0.45 }];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
        <button
          type="button"
          onClick={() => setTheme(value)}
          style={{
            width: 118, height: 74,
            border: selected ? '1px solid var(--amber)' : '0.5px solid var(--border)',
            borderRadius: 8,
            background: dark ? '#0e0d0b' : '#f0ece3',
            cursor: 'pointer',
            position: 'relative',
            padding: '10px 10px 10px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 5,
            transition: 'border-color 0.18s',
          }}
        >
          {/* Mini sidebar strip */}
          <div style={{ position: 'absolute', left: 8, top: 10, bottom: 10, width: 2, borderRadius: 99, background: dark ? '#252220' : '#d4ccc0' }} />
          {/* Content lines */}
          {lines.map((l, i) => (
            <div key={i} style={{ height: 3, borderRadius: 99, background: dark ? `rgba(255,255,255,${l.o * 0.12})` : `rgba(0,0,0,${l.o * 0.1})`, width: l.w }} />
          ))}
          {/* Selection indicator */}
          {selected && (
            <div style={{ position: 'absolute', top: 6, right: 6, width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)' }} />
          )}
        </button>
        <span style={{ fontSize: '0.65rem', color: selected ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: selected ? 600 : 400, letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="fade-in" style={{ maxWidth: 720 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: '0.3rem', color: 'var(--text-primary)' }}>
          Configurações
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Ajustes do seu perfil, empresa e preferências.
        </p>
      </div>

      {/* ══ PERFIL ══ */}
      <section>
        <SecLabel>Perfil</SecLabel>
        <form onSubmit={handleUpdateProfileData}>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--text-muted)', lineHeight: 1 }}>{avatarInitial}</span>
                )}
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                style={{ background: 'none', border: 'none', color: 'rgba(212,135,10,0.6)', fontSize: '0.7rem', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', transition: 'color 0.18s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(212,135,10,0.6)'; }}
              >
                {uploadingAvatar ? 'Enviando...' : 'Trocar foto'}
              </button>
            </div>

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Field label="Nome completo">
                <input type="text" className="form-control" style={inputBase} value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
              </Field>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <OutlineBtn type="submit" disabled={loadingProfile}>
              {loadingProfile ? 'Salvando...' : 'Salvar perfil'}
            </OutlineBtn>
          </div>
        </form>
      </section>

      {/* ══ EMPRESA & FATURAMENTO ══ */}
      <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '0.5px solid var(--border)' }}>
        <SecLabel>Empresa &amp; Faturamento</SecLabel>
        <form onSubmit={handleUpdateBusinessData} style={{ marginTop: '1.5rem' }}>
          <div className="form-row">
            <Field label="Nome da produtora / empresa">
              <input type="text" className="form-control" style={inputBase} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex: Alba Effect Films" />
            </Field>

            <Field label={`Documento (${documentType})`}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <select
                  className="form-control"
                  value={documentType}
                  onChange={handleDocumentTypeChange}
                  style={{ ...inputBase, width: 90, flexShrink: 0 }}
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                </select>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    className="form-control"
                    style={inputBase}
                    value={documentNumber}
                    onChange={handleDocumentChange}
                    placeholder={documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0001-00'}
                  />
                  {isDocFilled && (
                    <p style={{ fontSize: '0.68rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: isDocValid ? 'rgba(52,211,153,0.7)' : 'rgba(239,100,100,0.7)' }}>
                      <span style={{ fontSize: '0.5rem' }}>●</span>
                      {isDocValid ? `${documentType} válido` : `${documentType} inválido`}
                    </p>
                  )}
                </div>
              </div>
            </Field>

            <Field label="Chave PIX padrão">
              <input type="text" className="form-control" style={inputBase} value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="E-mail, CPF, celular ou chave aleatória" />
            </Field>

            <Field label="Moeda padrão">
              <select className="form-control" style={inputBase} value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="BRL">R$ — Real Brasileiro</option>
                <option value="USD">$ — Dólar Americano</option>
                <option value="EUR">€ — Euro</option>
              </select>
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <OutlineBtn type="submit" disabled={loadingBusiness || (!isDocValid && isDocFilled)}>
              {loadingBusiness ? 'Salvando...' : 'Salvar empresa'}
            </OutlineBtn>
          </div>
        </form>
      </section>

      {/* ══ APARÊNCIA ══ */}
      <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '0.5px solid var(--border)' }}>
        <SecLabel>Aparência</SecLabel>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
          As cores âmbar são preservadas em ambos os modos.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <ThemeCard value="dark" label="Escuro" />
          <ThemeCard value="light" label="Claro" />
        </div>
      </section>

      {/* ══ SEGURANÇA ══ */}
      <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '0.5px solid var(--border)' }}>
        <SecLabel>Segurança</SecLabel>
        <form onSubmit={handleUpdatePassword} style={{ marginTop: '1.5rem' }}>
          <div className="form-row" style={{ marginBottom: '0.75rem' }}>
            <Field label="Nova senha">
              <input type="password" className="form-control" style={inputBase} value={password} onChange={e => setPassword(e.target.value)} placeholder="Nova senha" />
            </Field>
            <Field label="Confirmar nova senha">
              <input type="password" className="form-control" style={inputBase} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" />
            </Field>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.7, marginBottom: '1.5rem' }}>
            Recomendamos no mínimo 8 caracteres, com letras e números.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <OutlineBtn type="submit" disabled={loadingPassword || !password || !confirmPassword}>
              {loadingPassword ? 'Atualizando...' : 'Atualizar senha'}
            </OutlineBtn>
          </div>
        </form>
      </section>

      {/* Bottom spacing */}
      <div style={{ height: '4rem' }} />
    </div>
  );
}
