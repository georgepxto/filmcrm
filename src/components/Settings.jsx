import { useState } from 'react';
import { Settings as SettingsIcon, User, Lock, Image as ImageIcon, Save, Building, DollarSign, FileText, Smartphone, Check, X, UploadCloud, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

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

  const handleAvatarUpload = async (event) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      setUploadingAvatar(true);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setAvatarUrl(data.publicUrl);
      toast.success('Imagem enviada! Clique em Salvar Perfil.');
    } catch (error) {
      toast.error('Erro no upload. Lembre-se de criar o bucket "avatars" como Público no Supabase.');
      console.error(error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);

  const isValidCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(cpf.substring(10, 11))) return false;
    return true;
  };

  const isValidCNPJ = (cnpj) => {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    let digits = cnpj.substring(size);
    let sum = 0, pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(0))) return false;
    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(1))) return false;
    return true;
  };

  const handleUpdateProfileData = async (e) => {
    e.preventDefault();
    setLoadingProfile(true);
    const { error } = await updateProfile({
      data: { 
        full_name: name, 
        avatar_url: avatarUrl,
        currency,
        company_name: companyName,
        document_type: documentType,
        document_number: documentNumber,
        pix_key: pixKey
      }
    });
    setLoadingProfile(false);
    if (error) {
      toast.error('Erro ao atualizar perfil');
    } else {
      toast.success('Perfil atualizado com sucesso');
    }
  };

  const handleUpdateBusinessData = async (e) => {
    e.preventDefault();
    if (documentNumber) {
      if (documentType === 'CPF' && !isValidCPF(documentNumber)) {
        toast.error('O CPF digitado é inválido.');
        return;
      }
      if (documentType === 'CNPJ' && !isValidCNPJ(documentNumber)) {
        toast.error('O CNPJ digitado é inválido.');
        return;
      }
    }
    setLoadingBusiness(true);
    const { error } = await updateProfile({
      data: { 
        full_name: name, 
        avatar_url: avatarUrl,
        currency,
        company_name: companyName,
        document_type: documentType,
        document_number: documentNumber,
        pix_key: pixKey
      }
    });
    setLoadingBusiness(false);
    if (error) {
      toast.error('Erro ao atualizar empresa');
    } else {
      toast.success('Empresa atualizada com sucesso');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    setLoadingPassword(true);
    const { error } = await updateProfile({ password });
    setLoadingPassword(false);
    if (error) {
      toast.error('Erro ao atualizar senha');
    } else {
      toast.success('Senha atualizada com sucesso');
      setPassword('');
      setConfirmPassword('');
    }
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

  const handleDocumentChange = (e) => {
    setDocumentNumber(formatDocument(e.target.value, documentType));
  };

  const handleDocumentTypeChange = (e) => {
    const newType = e.target.value;
    setDocumentType(newType);
    setDocumentNumber(formatDocument(documentNumber, newType));
  };

  const docDigits = documentNumber.replace(/\D/g, '');
  const isDocFilled = documentType === 'CPF' ? docDigits.length === 11 : docDigits.length === 14;
  const isDocValid = isDocFilled ? (documentType === 'CPF' ? isValidCPF(documentNumber) : isValidCNPJ(documentNumber)) : true;

  return (
    <div className="fade-in">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h2><SettingsIcon size={24} /> Configurações</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '700px' }}>
        {/* Profile Settings */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            <User size={20} color="var(--amber)" /> Perfil
          </h3>
          <form onSubmit={handleUpdateProfileData} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={32} color="var(--text-muted)" />
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: '250px' }}>
                <div className="form-group">
                  <label>Nome Completo</label>
                  <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
                </div>
                <div className="form-group">
                  <label>Foto de Perfil (Avatar)</label>
                  <div style={{ position: 'relative' }}>
                    <UploadCloud size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="file" 
                      accept="image/*"
                      className="form-control" 
                      onChange={handleAvatarUpload} 
                      disabled={uploadingAvatar}
                      style={{ paddingLeft: '2.5rem', paddingTop: '0.45rem' }} 
                    />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    {uploadingAvatar ? 'Enviando imagem para o servidor...' : 'Selecione uma imagem do seu computador para o avatar.'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loadingProfile}>
                {loadingProfile ? 'Salvando...' : <><Save size={16} /> Salvar Perfil</>}
              </button>
            </div>
          </form>
        </div>

        {/* Business Settings */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            <Building size={20} color="var(--amber)" /> Empresa & Faturamento
          </h3>
          <form onSubmit={handleUpdateBusinessData} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Nome da Produtora / Empresa</label>
                <div style={{ position: 'relative' }}>
                  <Building size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" className="form-control" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ex: Alba Effect Films" style={{ paddingLeft: '2.5rem' }} />
                </div>
              </div>
              <div className="form-group">
                <label>Documento ({documentType})</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <select className="form-control" value={documentType} onChange={handleDocumentTypeChange} style={{ width: '100px', flexShrink: 0 }}>
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                  </select>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <FileText size={16} style={{ position: 'absolute', left: '0.75rem', top: '1.25rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text" className="form-control" value={documentNumber} onChange={handleDocumentChange} placeholder={documentType === 'CPF' ? "000.000.000-00" : "00.000.000/0001-00"} style={{ paddingLeft: '2.5rem', borderColor: (!isDocValid && isDocFilled) ? 'var(--danger)' : (isDocValid && isDocFilled ? 'var(--success)' : undefined) }} />
                    {(!isDocValid && isDocFilled) && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <X size={12} /> {documentType} Inválido
                      </div>
                    )}
                    {(isDocValid && isDocFilled) && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Check size={12} /> {documentType} Válido
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Chave PIX Padrão</label>
                <div style={{ position: 'relative' }}>
                  <Smartphone size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="text" className="form-control" value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="E-mail, CPF, Celular ou Aleatória" style={{ paddingLeft: '2.5rem' }} />
                </div>
              </div>
              <div className="form-group">
                <label>Moeda Padrão</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <select className="form-control" value={currency} onChange={e => setCurrency(e.target.value)} style={{ paddingLeft: '2.5rem' }}>
                    <option value="BRL">R$ (Real Brasileiro)</option>
                    <option value="USD">$ (Dólar Americano)</option>
                    <option value="EUR">€ (Euro)</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loadingBusiness || (!isDocValid && isDocFilled)}
                style={(loadingBusiness || (!isDocValid && isDocFilled)) ? { opacity: 0.6, cursor: 'not-allowed', filter: 'grayscale(1)' } : {}}
              >
                {loadingBusiness ? 'Salvando...' : <><Save size={16} /> Salvar Empresa</>}
              </button>
            </div>
          </form>
        </div>

        {/* Appearance Settings */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            <Sun size={20} color="var(--amber)" /> Aparência
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Escolha o tema da interface. As cores quentes âmbar são preservadas em ambos os modos.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: theme === 'dark' ? '2px solid var(--amber)' : '2px solid var(--border)',
                background: theme === 'dark' ? 'var(--amber-glow)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div style={{
                width: '100%',
                height: '64px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0c0b09 0%, #141210 100%)',
                border: '1px solid #201e1b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
              }}>
                <div style={{ width: '28px', height: '100%', borderRadius: '4px', background: '#0e0d0b' }} />
                <div style={{ flex: 1, height: '100%', borderRadius: '4px', background: '#141210', display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px' }}>
                  <div style={{ height: '6px', borderRadius: '3px', background: '#201e1b', width: '70%' }} />
                  <div style={{ height: '6px', borderRadius: '3px', background: '#201e1b', width: '50%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Moon size={15} color={theme === 'dark' ? 'var(--amber)' : 'var(--text-muted)'} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: theme === 'dark' ? 'var(--amber)' : 'var(--text-secondary)' }}>
                  Escuro
                </span>
                {theme === 'dark' && <Check size={14} color="var(--amber)" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: theme === 'light' ? '2px solid var(--amber)' : '2px solid var(--border)',
                background: theme === 'light' ? 'var(--amber-glow)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div style={{
                width: '100%',
                height: '64px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f0ece3 0%, #ffffff 100%)',
                border: '1px solid #e2dbd0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
              }}>
                <div style={{ width: '28px', height: '100%', borderRadius: '4px', background: '#ebe7de' }} />
                <div style={{ flex: 1, height: '100%', borderRadius: '4px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px' }}>
                  <div style={{ height: '6px', borderRadius: '3px', background: '#e2dbd0', width: '70%' }} />
                  <div style={{ height: '6px', borderRadius: '3px', background: '#e2dbd0', width: '50%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sun size={15} color={theme === 'light' ? 'var(--amber)' : 'var(--text-muted)'} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: theme === 'light' ? 'var(--amber)' : 'var(--text-secondary)' }}>
                  Claro
                </span>
                {theme === 'light' && <Check size={14} color="var(--amber)" />}
              </div>
            </button>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            <Lock size={20} color="var(--amber)" /> Segurança
          </h3>
          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label>Nova Senha</label>
              <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="form-group">
              <label>Confirmar Nova Senha</label>
              <input type="password" className="form-control" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loadingPassword || !password || !confirmPassword}>
                {loadingPassword ? 'Atualizando...' : <><Save size={16} /> Atualizar Senha</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
