import { useState } from 'react';
import { Settings as SettingsIcon, User, Lock, Image as ImageIcon, Save, Building, DollarSign, FileText, Smartphone, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

export default function Settings() {
  const { user, updateProfile } = useAuth();
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
                  <label>URL do Avatar (Foto)</label>
                  <div style={{ position: 'relative' }}>
                    <ImageIcon size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="url" className="form-control" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://exemplo.com/foto.jpg" style={{ paddingLeft: '2.5rem' }} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Cole o link direto de uma imagem para usar como seu avatar.</p>
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
