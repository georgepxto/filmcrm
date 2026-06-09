import { useState } from 'react';
import { Plus, Edit2, Check, X } from 'lucide-react';
import { useToast } from '../Toast';

const emptyPlan = { slug: '', name: '', description: '', price_monthly: 0, price_yearly: 0, features: [], limits: {}, is_active: true, sort_order: 0 };

export default function AdminPlans({ plans, updatePlan, createPlan }) {
  const { success, error } = useToast();
  const [editingId, setEditingId]   = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyPlan);
  const [saving, setSaving]         = useState(false);
  const [featureInput, setFeatureInput] = useState('');

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({
      ...p,
      features: Array.isArray(p.features) ? p.features : [],
    });
    setFeatureInput('');
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const { error: e } = await updatePlan(editingId, {
        name: editForm.name,
        description: editForm.description,
        price_monthly: Number(editForm.price_monthly),
        price_yearly: Number(editForm.price_yearly),
        features: editForm.features,
        limits: editForm.limits,
        is_active: editForm.is_active,
        sort_order: Number(editForm.sort_order),
      });
      if (e) throw e;
      success('Plano atualizado.');
      setEditingId(null);
    } catch { error('Erro ao salvar plano.'); }
    setSaving(false);
  };

  const saveCreate = async () => {
    if (!createForm.slug || !createForm.name) { error('Preencha slug e nome.'); return; }
    setSaving(true);
    try {
      const { error: e } = await createPlan({
        slug: createForm.slug,
        name: createForm.name,
        description: createForm.description,
        price_monthly: Number(createForm.price_monthly),
        price_yearly: Number(createForm.price_yearly),
        features: createForm.features,
        limits: createForm.limits,
        is_active: createForm.is_active,
        sort_order: Number(createForm.sort_order),
      });
      if (e) throw e;
      success('Plano criado.');
      setShowCreate(false);
      setCreateForm(emptyPlan);
    } catch { error('Erro ao criar plano.'); }
    setSaving(false);
  };

  const addFeature = (form, setForm, input, setInput) => {
    const t = input.trim();
    if (!t) return;
    setForm(f => ({ ...f, features: [...(f.features || []), t] }));
    setInput('');
  };

  const removeFeature = (form, setForm, idx) =>
    setForm(f => ({ ...f, features: f.features.filter((_, i) => i !== idx) }));

  const PlanForm = ({ form, setForm, fi, setFi }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
      <div className="form-group">
        <label>Nome</label>
        <input className="form-control" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="form-group">
        <label>Slug</label>
        <input className="form-control" value={form.slug || ''} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
      </div>
      <div className="form-group" style={{ gridColumn: 'span 2' }}>
        <label>Descrição</label>
        <input className="form-control" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="form-group">
        <label>Preço mensal (R$)</label>
        <input className="form-control" type="number" min="0" step="0.01" value={form.price_monthly || 0} onChange={e => setForm(f => ({ ...f, price_monthly: e.target.value }))} />
      </div>
      <div className="form-group">
        <label>Preço anual (R$)</label>
        <input className="form-control" type="number" min="0" step="0.01" value={form.price_yearly || 0} onChange={e => setForm(f => ({ ...f, price_yearly: e.target.value }))} />
      </div>
      <div className="form-group">
        <label>Ordem de exibição</label>
        <input className="form-control" type="number" min="0" value={form.sort_order || 0} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
      </div>
      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ marginBottom: 0 }}>Ativo</label>
        <input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
      </div>
      <div className="form-group" style={{ gridColumn: 'span 2' }}>
        <label>Features</label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input className="form-control" placeholder="Adicionar feature…" value={fi} onChange={e => setFi(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(form, setForm, fi, setFi); } }} />
          <button className="btn btn-secondary" onClick={() => addFeature(form, setForm, fi, setFi)} style={{ flexShrink: 0, padding: '0 0.75rem' }}>+</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(form.features || []).map((f, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}>
              {f}
              <button onClick={() => removeFeature(form, setForm, i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '0.15rem' }}>Planos</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Mudanças não afetam assinaturas existentes — apenas novas adesões.</p>
        </div>
        <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }} onClick={() => { setShowCreate(!showCreate); setCreateForm(emptyPlan); }}>
          <Plus size={14} />Novo plano
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--amber-glow-strong)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Novo plano</h3>
          <PlanForm form={createForm} setForm={setCreateForm} fi={featureInput} setFi={setFeatureInput} />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={saveCreate} disabled={saving} style={{ fontSize: '0.82rem' }}>
              {saving ? 'Criando…' : 'Criar plano'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)} style={{ fontSize: '0.82rem' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Plan list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {plans.map(p => (
          <div key={p.id} className="card" style={{ padding: '1.5rem' }}>
            {editingId === p.id ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <h3 style={{ fontSize: '1rem' }}>Editando: {p.name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" onClick={saveEdit} disabled={saving} style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Check size={12} />{saving ? 'Salvando…' : 'Salvar'}
                    </button>
                    <button className="btn btn-secondary" onClick={cancelEdit} style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <X size={12} />Cancelar
                    </button>
                  </div>
                </div>
                <PlanForm form={editForm} setForm={setEditForm} fi={featureInput} setFi={setFeatureInput} />
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>{p.name}</h3>
                    <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '0.15rem 0.4rem', borderRadius: 3, border: '1px solid var(--border)' }}>
                      {p.slug}
                    </span>
                    {!p.is_active && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0.15rem 0.4rem', borderRadius: 3 }}>
                        Inativo
                      </span>
                    )}
                  </div>
                  {p.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{p.description}</p>}
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <p style={{ fontSize: '0.72rem', letterSpacing: '-0.01em', color: 'var(--text-muted)', fontWeight: 600 }}>Mensal</p>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--amber)' }}>
                        {p.price_monthly > 0 ? `R$ ${p.price_monthly}` : 'Grátis'}
                      </p>
                    </div>
                    {p.price_yearly > 0 && (
                      <div>
                        <p style={{ fontSize: '0.72rem', letterSpacing: '-0.01em', color: 'var(--text-muted)', fontWeight: 600 }}>Anual</p>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>R$ {p.price_yearly}</p>
                      </div>
                    )}
                  </div>
                  {Array.isArray(p.features) && p.features.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {p.features.map((f, i) => (
                        <span key={i} style={{ fontSize: '0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.2rem 0.5rem', color: 'var(--text-secondary)' }}>{f}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }} onClick={() => startEdit(p)}>
                  <Edit2 size={12} />Editar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
