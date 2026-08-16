import { ArrowLeft, Camera, CirclePlus, Edit3, Eye, EyeOff, ExternalLink, ImagePlus, Layers3, LayoutDashboard, LoaderCircle, LogOut, Package, Palette, Ruler, Save, Settings, ShoppingBag, Tags, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import FormField from '../components/FormField.jsx'
import { useStore } from '../context/StoreContext.jsx'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import {
  deleteCategory, deleteCoupon, deleteProduct, loadAdminDashboard, saveCategory,
  saveCoupon, saveProduct, saveStoreSettings, signInAdmin, signOutAdmin, updateOrderStatus,
} from '../services/admin.js'
import { money, slugify } from '../utils/format.js'
import { buildVariantCombinations, countVariantCombinations, getVariantCombinationKey, getVariationGroups, MAX_VARIANT_COMBINATIONS, VARIATION_PRESETS } from '../utils/variants.js'

const emptyProduct = {
  id: null, name: '', slug: '', category_id: '', sku: '', barcode_type: 'none', barcode: '',
  brand: 'Flip', unit: 'Unidade', condition: 'Novo', description: '', price: '', cost_price: '',
  stock: '', purchase_recurrence: '', has_brand: true, has_variations: false, variation_type: '',
  weight_kg: '', height_cm: '', length_cm: '', width_cm: '',
  is_featured: false, is_active: true, imageUrls: '', files: [],
  variationGroups: [], variants: [], unique_price: true,
}

const emptyCoupon = { id: null, code: '', type: 'percentage', value: '', starts_at: '', ends_at: '', is_active: true }
const paymentOptions = ['Pix', 'Cartão de crédito e débito', 'Dinheiro', 'Transferência', 'Boleto', 'Link de pagamento']
const deliveryOptions = ['Entrega em domicílio', 'PAC', 'SEDEX', 'Motoboy', 'Retirada', 'Entrega digital']

function AdminHeader({ onSignOut, showSignOut }) {
  return (
    <header className="admin-header">
      <Brand compact />
      <div><Link to="/"><ArrowLeft size={17} /> Ver catálogo</Link>{showSignOut && <button type="button" onClick={onSignOut}><LogOut size={17} /> Sair</button>}</div>
    </header>
  )
}

function AdminLogin({ onAuthenticated }) {
  const [form, setForm] = useState({ email: 'apps@flipsolucoes.com.br', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError('')
    try {
      const { session } = await signInAdmin(form.email, form.password)
      if (session?.user?.app_metadata?.role !== 'admin') {
        await signOutAdmin()
        throw new Error('Este usuário não possui permissão de administrador.')
      }
      onAuthenticated(session)
    } catch (loginError) { setError(loginError.message) } finally { setLoading(false) }
  }
  return (
    <div className="admin-shell"><AdminHeader /><main className="admin-login"><form onSubmit={submit}><span className="admin-icon"><LayoutDashboard /></span><span className="kicker">Área restrita</span><h1>Painel Flip</h1><p>Acesse com o usuário administrador da Flip.</p><FormField label="E-mail"><input type="email" required autoComplete="username" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></FormField><FormField label="Senha"><span className="password-field"><input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></FormField>{error && <div className="form-error">{error}</div>}<button className="button button--primary button--full" disabled={loading}>{loading ? 'Entrando…' : 'Entrar no painel'}</button></form></main></div>
  )
}

function AdminSetupRequired() {
  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="admin-login">
        <div className="admin-login__panel">
          <span className="admin-icon"><LayoutDashboard /></span>
          <span className="kicker">Configuração necessária</span>
          <h1>Painel Flip</h1>
          <p>Configure o Supabase para liberar o acesso administrativo.</p>
        </div>
      </main>
    </div>
  )
}

function ProductEditor({ product, categories, onCancel, onSaved }) {
  const [form, setForm] = useState(() => {
    if (!product) return { ...emptyProduct, variationGroups: [], variants: [], files: [] }
    const variationGroups = getVariationGroups(product)
    return {
      ...emptyProduct, ...product, category_id: product.category?.id || '',
      sku: product.sku || '', barcode_type: product.barcode_type || 'none', barcode: product.barcode || '',
      brand: product.brand || 'Flip', cost_price: product.cost_price ?? '', stock: product.stock ?? '',
      purchase_recurrence: product.purchase_recurrence || '', has_brand: product.has_brand !== false,
      has_variations: product.has_variations || Boolean(product.variants?.length), variation_type: product.variation_type || '',
      unique_price: !product.variants?.some((item) => item.price_override !== null && item.price_override !== undefined),
      weight_kg: product.weight_kg ?? '', height_cm: product.height_cm ?? '', length_cm: product.length_cm ?? '', width_cm: product.width_cm ?? '',
      imageUrls: product.images?.map((item) => item.url).join('\n') || '',
      variationGroups,
      variants: product.variants?.length
        ? product.variants.map((item) => ({ ...item, price_override: item.price_override ?? '', stock: item.stock ?? '' }))
        : [],
      files: [],
    }
  })
  const [section, setSection] = useState('general')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [customValues, setCustomValues] = useState({})
  const [selectedVariantKeys, setSelectedVariantKeys] = useState([])
  const [bulkEdit, setBulkEdit] = useState({ price_override: '', stock: '' })
  const margin = Number(form.price) > 0 && Number(form.cost_price) >= 0 && form.cost_price !== ''
    ? Math.round(((Number(form.price) - Number(form.cost_price)) / Number(form.price)) * 100)
    : null
  const previewImages = useMemo(() => [
    ...form.imageUrls.split('\n').map((url) => url.trim()).filter(Boolean).map((url) => ({ url, label: 'Imagem atual', source: 'saved', objectUrl: false })),
    ...form.files.map((file, fileIndex) => ({ url: URL.createObjectURL(file), label: file.name, source: 'upload', fileIndex, objectUrl: true })),
  ], [form.imageUrls, form.files])
  useEffect(() => () => previewImages.filter((item) => item.objectUrl).forEach((item) => URL.revokeObjectURL(item.url)), [previewImages])
  const variantKeys = useMemo(() => form.variants.map(getVariantCombinationKey), [form.variants])
  const allVariantsSelected = variantKeys.length > 0 && variantKeys.every((key) => selectedVariantKeys.includes(key))
  useEffect(() => setSelectedVariantKeys((current) => current.filter((key) => variantKeys.includes(key))), [variantKeys.join('|')])
  const sections = [
    ['general', 'Informações gerais'],
    ['price', 'Preço'],
    ['photos', 'Fotos'],
    ['stock', 'Estoque e variações'],
  ]
  const change = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [key]: value, ...(key === 'name' && !current.id ? { slug: slugify(value) } : {}) }))
  }
  const setVariant = (index, key, value) => setForm((current) => ({
    ...current,
    variants: current.variants.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
  }))
  const updateVariationGroups = (updater) => setForm((current) => {
    const variationGroups = typeof updater === 'function' ? updater(current.variationGroups) : updater
    const combinationCount = countVariantCombinations(variationGroups)
    if (combinationCount > MAX_VARIANT_COMBINATIONS) {
      setError(`O limite é de ${MAX_VARIANT_COMBINATIONS} combinações. Remova uma opção antes de continuar.`)
      return current
    }
    setError('')
    return {
      ...current,
      variationGroups,
      variation_type: variationGroups.map((group) => group.type).join(', '),
      variants: buildVariantCombinations(variationGroups, current.variants),
    }
  })
  const toggleVariationType = (type) => updateVariationGroups((groups) => groups.some((group) => group.type === type)
    ? groups.filter((group) => group.type !== type)
    : [...groups, { type, values: [] }])
  const toggleVariationValue = (type, value) => updateVariationGroups((groups) => groups.map((group) => group.type === type
    ? { ...group, values: group.values.includes(value) ? group.values.filter((item) => item !== value) : [...group.values, value] }
    : group))
  const addCustomVariationValue = (type) => {
    const value = customValues[type]?.trim()
    if (!value) return
    updateVariationGroups((groups) => groups.map((group) => group.type === type && !group.values.includes(value)
      ? { ...group, values: [...group.values, value] }
      : group))
    setCustomValues((current) => ({ ...current, [type]: '' }))
  }
  const toggleUniquePrice = (enabled) => setForm((current) => ({
    ...current,
    unique_price: enabled,
    variants: enabled ? current.variants.map((variant) => ({ ...variant, price_override: '' })) : current.variants,
  }))
  const toggleVariantSelection = (key) => setSelectedVariantKeys((current) => current.includes(key)
    ? current.filter((item) => item !== key)
    : [...current, key])
  const toggleAllVariants = () => setSelectedVariantKeys(allVariantsSelected ? [] : variantKeys)
  const applyBulkEdit = () => {
    if (!selectedVariantKeys.length) return
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant) => {
        if (!selectedVariantKeys.includes(getVariantCombinationKey(variant))) return variant
        return {
          ...variant,
          ...(!current.unique_price && bulkEdit.price_override !== '' ? { price_override: bulkEdit.price_override } : {}),
          ...(bulkEdit.stock !== '' ? { stock: bulkEdit.stock } : {}),
        }
      }),
    }))
    setBulkEdit({ price_override: '', stock: '' })
  }
  const addFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length) setForm((current) => ({ ...current, files: [...current.files, ...selectedFiles] }))
    event.target.value = ''
  }
  const removeImage = (image) => setForm((current) => image.source === 'upload'
    ? { ...current, files: current.files.filter((_, index) => index !== image.fileIndex) }
    : {
        ...current,
        imageUrls: current.imageUrls.split('\n').map((url) => url.trim()).filter((url) => url && url !== image.url).join('\n'),
      })
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      if (form.has_variations && (!form.variationGroups.length || !form.variants.length)) {
        throw new Error('Selecione ao menos um tipo e uma opção de variação.')
      }
      await saveProduct({ product: form, imageUrls: form.imageUrls.split('\n'), variants: form.variants, files: form.files })
      onSaved()
    } catch (saveError) { setError(saveError.message) } finally { setSaving(false) }
  }
  return (
    <form className="admin-editor" onSubmit={submit}>
      <div className="admin-editor__head"><div><span className="kicker">{form.id ? 'Editar produto' : 'Novo produto'}</span><h2>{form.id ? form.name : 'Cadastrar produto'}</h2></div><button type="button" onClick={onCancel}>Cancelar</button></div>
      <div className="product-editor-layout">
        <aside className="product-editor-nav">{sections.map(([id, label]) => <button type="button" key={id} className={section === id ? 'is-active' : ''} onClick={() => setSection(id)}>{label}</button>)}</aside>
        <div className="product-editor-panel">
          {section === 'general' && <div className="admin-form-grid">
            <FormField label="Título"><input required maxLength={160} value={form.name} onChange={change('name')} placeholder="Ex.: Caneca personalizada" /></FormField>
            <FormField label="Slug"><input required value={form.slug} onChange={change('slug')} /></FormField>
            <FormField label="Descrição"><textarea value={form.description} onChange={change('description')} placeholder="Explique o produto, possibilidades de personalização, prazo e observações importantes." /></FormField>
            <FormField label="Categoria"><select required value={form.category_id} onChange={change('category_id')}><option value="">Selecione</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
            <FormField label="SKU / referência" optional><input value={form.sku} onChange={change('sku')} placeholder="Ex.: CAN-001" /></FormField>
            <FormField label="Tipo de código de barras"><select value={form.barcode_type} onChange={change('barcode_type')}><option value="none">Não possui</option><option value="ean">EAN</option><option value="upc">UPC</option><option value="isbn">ISBN</option><option value="custom">Outro</option></select></FormField>
            <FormField label="Código de barras" optional><input value={form.barcode} onChange={change('barcode')} disabled={form.barcode_type === 'none'} /></FormField>
            <FormField label="Condição"><input value={form.condition} onChange={change('condition')} /></FormField>
            <FormField label="Unidade"><input value={form.unit} onChange={change('unit')} /></FormField>
            <FormField label="Recorrência de compra" optional><input value={form.purchase_recurrence} onChange={change('purchase_recurrence')} placeholder="Ex.: compra única" /></FormField>
            <FormField label="Marca"><input value={form.brand} onChange={change('brand')} disabled={!form.has_brand} /></FormField>
            <div className="admin-checks"><label><input type="checkbox" checked={!form.has_brand} onChange={(event) => setForm({ ...form, has_brand: !event.target.checked, brand: event.target.checked ? '' : form.brand || 'Flip' })} /> Não possui marca ou é um kit</label></div>
            <FormField label="Peso (kg)" optional><input type="number" min="0" step="0.001" value={form.weight_kg} onChange={change('weight_kg')} /></FormField>
            <FormField label="Altura (cm)" optional><input type="number" min="0" step="0.01" value={form.height_cm} onChange={change('height_cm')} /></FormField>
            <FormField label="Comprimento (cm)" optional><input type="number" min="0" step="0.01" value={form.length_cm} onChange={change('length_cm')} /></FormField>
            <FormField label="Largura (cm)" optional><input type="number" min="0" step="0.01" value={form.width_cm} onChange={change('width_cm')} /></FormField>
            <div className="admin-checks"><label><input type="checkbox" checked={form.is_active} onChange={change('is_active')} /> Produto ativo</label><label><input type="checkbox" checked={form.is_featured} onChange={change('is_featured')} /> Exibir em destaque</label></div>
          </div>}
          {section === 'stock' && <div className="product-section">
            <FormField label="Este produto possui variações?"><div className="admin-radio-row"><label><input type="radio" name="has-variations" checked={!form.has_variations} onChange={() => setForm({ ...form, has_variations: false })} /> Não</label><label><input type="radio" name="has-variations" checked={form.has_variations} onChange={() => setForm({ ...form, has_variations: true })} /> Sim</label></div></FormField>
            {!form.has_variations && <FormField label="Estoque" optional><input type="number" min="0" step="1" value={form.stock} onChange={change('stock')} placeholder="Quantidade disponível" /></FormField>}
            {form.has_variations && <>
              <div className="variation-builder">
                <div className="variation-builder__intro"><strong>Escolhas rápidas</strong><p>Selecione um ou mais tipos. As opções escolhidas serão cruzadas automaticamente.</p></div>
                <div className="variation-type-picker">
                  {VARIATION_PRESETS.map((preset) => {
                    const Icon = preset.type === 'Cor' ? Palette : preset.type === 'Tamanho' ? Ruler : preset.type === 'Material' ? Layers3 : Tags
                    const active = form.variationGroups.some((group) => group.type === preset.type)
                    return <button type="button" key={preset.type} className={active ? 'is-active' : ''} aria-pressed={active} onClick={() => toggleVariationType(preset.type)}><Icon size={18} />{preset.type}</button>
                  })}
                </div>
                <label className="unique-price-toggle">
                  <input type="checkbox" checked={form.unique_price} onChange={(event) => toggleUniquePrice(event.target.checked)} />
                  <i aria-hidden="true" />
                  <span>
                    <strong>Valor único</strong>
                    <small>Usar o preço de venda do produto em todas as combinações.</small>
                    {form.unique_price && <small className={`unique-price-value ${Number(form.price) > 0 ? '' : 'is-missing'}`} aria-live="polite">
                      Preço aplicado: <b>{Number(form.price) > 0 ? money(form.price) : 'não informado'}</b>
                    </small>}
                  </span>
                </label>
                {form.variationGroups.length === 0 && <div className="variation-builder__empty">Escolha Cor, Tamanho, Material ou Personalizado para começar.</div>}
                <div className="variation-group-list">
                  {form.variationGroups.map((group) => {
                    const preset = VARIATION_PRESETS.find((item) => item.type === group.type)
                    const availableValues = [...new Set([...(preset?.values || []), ...group.values])]
                    return <section className="variation-group" key={group.type}>
                      <header><div><strong>{group.type}</strong><small>{group.values.length} {group.values.length === 1 ? 'opção selecionada' : 'opções selecionadas'}</small></div><button type="button" onClick={() => toggleVariationType(group.type)} aria-label={`Remover ${group.type}`}><X size={17} /></button></header>
                      <div className="variation-value-picker">
                        {availableValues.map((value) => <button type="button" key={value} className={group.values.includes(value) ? 'is-active' : ''} aria-pressed={group.values.includes(value)} onClick={() => toggleVariationValue(group.type, value)}>{value}</button>)}
                      </div>
                      <div className="variation-custom-value"><input maxLength={30} value={customValues[group.type] || ''} onChange={(event) => setCustomValues((current) => ({ ...current, [group.type]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomVariationValue(group.type) } }} placeholder={`Outra opção de ${group.type.toLocaleLowerCase('pt-BR')}`} /><button type="button" onClick={() => addCustomVariationValue(group.type)}><CirclePlus size={17} /> Adicionar</button></div>
                    </section>
                  })}
                </div>
              </div>
              {form.variants.length > 0 && <div className="variant-combinations">
                <div className="variant-combinations__head"><div><strong>Cruzamentos gerados</strong><span>{form.variants.length} {form.variants.length === 1 ? 'combinação' : 'combinações'} gerada{form.variants.length === 1 ? '' : 's'}</span></div><p>Defina preço e estoque individualmente quando necessário.</p></div>
                <div className={`variant-bulk-editor ${form.unique_price ? 'is-unique-price' : ''}`}>
                  <label className="variant-select-all"><input type="checkbox" checked={allVariantsSelected} onChange={toggleAllVariants} /><span>Selecionar todos</span><small>{selectedVariantKeys.length} selecionada(s)</small></label>
                  {!form.unique_price && <label><span>Preço em massa (R$)</span><input type="number" min="0" step="0.01" inputMode="decimal" value={bulkEdit.price_override} onChange={(event) => setBulkEdit((current) => ({ ...current, price_override: event.target.value }))} placeholder="Sem alteração" /></label>}
                  <label><span>Estoque em massa</span><input type="number" min="0" step="1" inputMode="numeric" value={bulkEdit.stock} onChange={(event) => setBulkEdit((current) => ({ ...current, stock: event.target.value }))} placeholder="Sem alteração" /></label>
                  <button type="button" onClick={applyBulkEdit} disabled={!selectedVariantKeys.length || (bulkEdit.stock === '' && (form.unique_price || bulkEdit.price_override === ''))}><Edit3 size={16} /> Aplicar</button>
                </div>
                <div className="variant-editor-list">
                  {form.variants.map((variant, index) => {
                    const variantKey = getVariantCombinationKey(variant)
                    return <div className={`variant-row ${form.unique_price ? 'is-unique-price' : ''} ${selectedVariantKeys.includes(variantKey) ? 'is-selected' : ''}`} key={variantKey}>
                    <label className="variant-select"><input type="checkbox" checked={selectedVariantKeys.includes(variantKey)} onChange={() => toggleVariantSelection(variantKey)} /><span className="sr-only">Selecionar {variant.name}</span></label>
                    <div className="variant-row__name"><small>Combinação</small><strong>{variant.name}</strong></div>
                    {!form.unique_price && <label><span>Preço (R$) <em>opcional</em></span><input type="number" min="0" step="0.01" inputMode="decimal" value={variant.price_override} onChange={(event) => setVariant(index, 'price_override', event.target.value)} placeholder="Preço padrão" /></label>}
                    <label><span>Estoque <em>opcional</em></span><input type="number" min="0" step="1" inputMode="numeric" value={variant.stock} onChange={(event) => setVariant(index, 'stock', event.target.value)} placeholder="Sem limite" /></label>
                  </div>})}
                </div>
              </div>}
              <p className="admin-hint">Exemplo de cruzamento: Preto · Madeira · P. Cada combinação será exibida separadamente na sacolinha.</p>
            </>}
          </div>}
          {section === 'photos' && <div className="admin-form-grid admin-photos">
            <div className="photo-upload-panel">
              <span className="photo-upload-title">Adicionar fotos <em>(opcional)</em></span>
              <div className="photo-upload-actions">
                <label className="file-field"><ImagePlus size={18} /><span>{form.files.length ? `${form.files.length} arquivo(s) selecionado(s)` : 'Enviar do dispositivo'}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addFiles} /></label>
                <label className="file-field"><Camera size={18} /><span>Usar câmera</span><input type="file" accept="image/*" capture="environment" onChange={addFiles} /></label>
              </div>
              <p>Formatos aceitos: JPG, PNG e WebP. No celular, você pode fotografar o produto diretamente.</p>
            </div>
            <div className="image-preview-grid" aria-live="polite">
              {previewImages.length ? previewImages.map((item, index) => <figure key={`${item.url}-${index}`}><img src={item.url} alt={`Prévia de ${item.label}`} /><figcaption>{item.label}</figcaption><button type="button" onClick={() => removeImage(item)} aria-label={`Remover ${item.label}`}><Trash2 size={16} /></button></figure>) : <p>As imagens adicionadas aparecerão aqui antes de salvar.</p>}
            </div>
          </div>}
          {section === 'price' && <div className="admin-form-grid">
            <FormField label="Preço de venda (R$)"><input type="number" min="0" step="0.01" inputMode="decimal" required value={form.price} onChange={change('price')} placeholder="0,00" /></FormField>
            <FormField label="Preço de custo (R$)" optional><input type="number" min="0" step="0.01" inputMode="decimal" value={form.cost_price} onChange={change('cost_price')} placeholder="0,00" /></FormField>
            <div className="price-summary"><span>Margem de lucro</span><strong>{margin === null ? 'Informe preço e custo' : `${margin}%`}</strong></div>
          </div>}
        </div>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="admin-editor__footer">
        <button className="button button--primary" disabled={saving}><Save size={17} /> {saving ? 'Salvando…' : 'Salvar produto'}</button>
      </div>
    </form>
  )
}

function ProductsTab({ data, reload, demo }) {
  const [editing, setEditing] = useState(undefined)
  const [category, setCategory] = useState({ name: '', slug: '' })
  const [error, setError] = useState('')
  const remove = async (product) => {
    if (!window.confirm(`Excluir ${product.name}?`)) return
    try { await deleteProduct(product.id); reload() } catch (removeError) { setError(removeError.message) }
  }
  const addCategory = async (event) => {
    event.preventDefault(); setError('')
    try { await saveCategory({ ...category, slug: category.slug || slugify(category.name) }); setCategory({ name: '', slug: '' }); reload() } catch (saveError) { setError(saveError.message) }
  }
  const removeCategory = async (item) => {
    if (!window.confirm(`Excluir a categoria ${item.name}? Os produtos ficarão sem categoria.`)) return
    try { await deleteCategory(item.id); reload() } catch (removeError) { setError(removeError.message) }
  }
  if (editing !== undefined) return <ProductEditor product={editing} categories={data.categories} onCancel={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); reload() }} />
  return (
    <div className="admin-stack">
      <section className="admin-card">
        <div className="admin-card__head"><div><span className="kicker">Catálogo</span><h2>Produtos cadastrados</h2></div><button className="button button--primary" disabled={demo} onClick={() => setEditing(null)}><CirclePlus size={17} /> Novo produto</button></div>
        {demo && <div className="notice">Conecte o Supabase para liberar as operações de cadastro.</div>}
        <div className="admin-table admin-table--products">
          <div className="admin-table__head"><span>Produto</span><span>Categoria</span><span>Preço</span><span>Status</span><span /></div>
          {data.products.map((product) => <div key={product.id}><span className="admin-product"><img src={product.images?.[0]?.url} alt="" /><b>{product.name}</b></span><span>{product.category.name}</span><span>{money(product.price)}</span><span><i className={`status-dot ${product.is_active ? 'is-active' : ''}`} />{product.is_active ? 'Ativo' : 'Oculto'}</span><span className="row-actions"><button disabled={demo} onClick={() => setEditing(product)} aria-label={`Editar ${product.name}`}><Edit3 size={16} /></button><button disabled={demo} onClick={() => remove(product)} aria-label={`Excluir ${product.name}`}><Trash2 size={16} /></button></span></div>)}
        </div>
      </section>
      <section className="admin-card">
        <div className="admin-card__head"><div><span className="kicker">Organização</span><h2>Categorias</h2></div></div>
        <form className="inline-admin-form" onSubmit={addCategory}><input aria-label="Nome da categoria" disabled={demo} value={category.name} onChange={(event) => setCategory({ name: event.target.value, slug: slugify(event.target.value) })} placeholder="Nome da categoria" required /><button className="button button--secondary" disabled={demo}><CirclePlus size={16} /> Adicionar</button></form>
        <div className="category-admin-list">{data.categories.map((item) => <span key={item.id}>{item.name}<button disabled={demo} onClick={() => removeCategory(item)} aria-label={`Excluir categoria ${item.name}`}><Trash2 size={14} /></button></span>)}</div>
      </section>
      {error && <div className="form-error">{error}</div>}
    </div>
  )
}

function SettingsTab({ settings: initialSettings, reload, demo }) {
  const [settings, setSettings] = useState(initialSettings)
  const [status, setStatus] = useState('')
  useEffect(() => setSettings(initialSettings), [initialSettings])
  const set = (key, value) => setSettings((current) => ({ ...current, [key]: value }))
  const toggleList = (key, value) => setSettings((current) => {
    const values = current[key] || []
    return { ...current, [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] }
  })
  const submit = async (event) => {
    event.preventDefault(); setStatus('Salvando…')
    try {
      await saveStoreSettings({ ...settings, logo_url: settings.custom_logo_url || null, payment_methods: settings.payment_methods || [], delivery_methods: settings.delivery_methods || [] })
      setStatus('Alterações salvas.'); reload()
    } catch (error) { setStatus(error.message) }
  }
  return (
    <form className="admin-card admin-settings" onSubmit={submit}>
      <div className="admin-card__head"><div><span className="kicker">Identidade e contato</span><h2>Informações da loja</h2></div></div>
      <div className="admin-form-grid">
        <FormField label="Nome da loja"><input disabled={demo} value={settings.name || ''} onChange={(event) => set('name', event.target.value)} /></FormField>
        <FormField label="Slogan"><input disabled={demo} value={settings.slogan || ''} onChange={(event) => set('slogan', event.target.value)} /></FormField>
        <FormField label="WhatsApp"><input disabled={demo} value={settings.whatsapp || ''} onChange={(event) => set('whatsapp', event.target.value)} /></FormField>
        <FormField label="Telefone"><input disabled={demo} value={settings.phone || ''} onChange={(event) => set('phone', event.target.value)} /></FormField>
        <FormField label="E-mail"><input disabled={demo} value={settings.email || ''} onChange={(event) => set('email', event.target.value)} /></FormField>
        <FormField label="Endereço"><input disabled={demo} value={settings.address || ''} onChange={(event) => set('address', event.target.value)} /></FormField>
        <FormField label="Instagram" optional><input disabled={demo} value={settings.instagram_url || ''} onChange={(event) => set('instagram_url', event.target.value)} /></FormField>
        <FormField label="Logo personalizada (URL)" optional><input disabled={demo} value={settings.custom_logo_url || ''} onChange={(event) => set('custom_logo_url', event.target.value)} placeholder="Deixe vazio para usar a logo oficial" /></FormField>
        <FormField label="Imagem do destaque" optional><input disabled={demo} value={settings.hero_image_url || ''} onChange={(event) => set('hero_image_url', event.target.value)} /></FormField>
        <FormField label="Sobre a loja"><textarea disabled={demo} value={settings.about || ''} onChange={(event) => set('about', event.target.value)} /></FormField>
        <div className="field choice-field"><span>Formas de pagamento</span><div className="check-grid">{paymentOptions.map((option) => <label key={option}><input disabled={demo} type="checkbox" checked={(settings.payment_methods || []).includes(option)} onChange={() => toggleList('payment_methods', option)} /><span>{option}</span></label>)}</div></div>
        <div className="field choice-field"><span>Formas de entrega</span><div className="check-grid">{deliveryOptions.map((option) => <label key={option}><input disabled={demo} type="checkbox" checked={(settings.delivery_methods || []).includes(option)} onChange={() => toggleList('delivery_methods', option)} /><span>{option}</span></label>)}</div></div>
      </div>
      {status && <p className="admin-status">{status}</p>}
      <button className="button button--primary" disabled={demo}><Save size={17} /> Salvar alterações</button>
    </form>
  )
}

function CouponsTab({ coupons, reload, demo }) {
  const [form, setForm] = useState(emptyCoupon)
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault(); setError('')
    try { await saveCoupon(form); setForm(emptyCoupon); reload() } catch (saveError) { setError(saveError.message) }
  }
  const remove = async (coupon) => {
    if (!window.confirm(`Excluir o cupom ${coupon.code}?`)) return
    try { await deleteCoupon(coupon.id); reload() } catch (removeError) { setError(removeError.message) }
  }
  return (
    <div className="admin-stack"><form className="admin-card" onSubmit={submit}><div className="admin-card__head"><div><span className="kicker">Promoções</span><h2>{form.id ? 'Editar cupom' : 'Novo cupom'}</h2></div></div><div className="inline-admin-form inline-admin-form--coupon"><input disabled={demo} required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="FLIP10" /><select disabled={demo} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="percentage">Percentual</option><option value="fixed">Valor fixo</option></select><input disabled={demo} type="number" min="0.01" step="0.01" required value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder="Valor" /><button className="button button--primary" disabled={demo}><Save size={16} /> Salvar</button></div>{error && <div className="form-error">{error}</div>}</form><section className="admin-card"><div className="admin-table admin-table--coupons"><div className="admin-table__head"><span>Código</span><span>Tipo</span><span>Valor</span><span>Status</span><span /></div>{coupons.map((coupon) => <div key={coupon.id}><b>{coupon.code}</b><span>{coupon.type === 'percentage' ? 'Percentual' : 'Fixo'}</span><span>{coupon.type === 'percentage' ? `${coupon.value}%` : money(coupon.value)}</span><span>{coupon.is_active ? 'Ativo' : 'Inativo'}</span><span className="row-actions"><button disabled={demo} onClick={() => setForm(coupon)} aria-label={`Editar cupom ${coupon.code}`}><Edit3 size={16} /></button><button disabled={demo} onClick={() => remove(coupon)} aria-label={`Excluir cupom ${coupon.code}`}><Trash2 size={16} /></button></span></div>)}</div></section></div>
  )
}

const orderStatuses = ['new', 'contacted', 'confirmed', 'completed', 'cancelled']
const statusLabel = { new: 'Novo', contacted: 'Em atendimento', confirmed: 'Confirmado', completed: 'Concluído', cancelled: 'Cancelado' }

function OrdersTab({ orders, reload, demo }) {
  const update = async (id, status) => { try { await updateOrderStatus(id, status); reload() } catch (error) { window.alert(error.message) } }
  return (
    <section className="admin-card"><div className="admin-card__head"><div><span className="kicker">Atendimento</span><h2>Pedidos recebidos</h2></div></div>{!orders.length ? <div className="admin-empty"><ShoppingBag /><h3>Nenhum pedido ainda</h3><p>Os pedidos registrados aparecerão aqui.</p></div> : <div className="admin-table admin-table--orders"><div className="admin-table__head"><span>Pedido</span><span>Cliente</span><span>Total</span><span>Data</span><span>Status</span></div>{orders.map((order) => <div key={order.id}><b>#{order.id.slice(0, 8).toUpperCase()}</b><span>{order.customer_name}<small>{order.customer_phone}</small></span><strong>{money(order.total)}</strong><span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span><select disabled={demo} value={order.status} onChange={(event) => update(order.id, event.target.value)}>{orderStatuses.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}</select></div>)}</div>}</section>
  )
}

function AdminDashboard({ onSignOut }) {
  const { refreshCatalog } = useStore()
  const [tab, setTab] = useState('products')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const demo = !isSupabaseConfigured

  useEffect(() => {
    document.querySelector('.admin-tabs button.is-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [tab])
  const reload = async () => {
    setError('')
    try { const result = await loadAdminDashboard(); setData(result); await refreshCatalog() } catch (loadError) { setError(loadError.message) }
  }
  useEffect(() => { reload() }, [])
  const tabs = useMemo(() => [
    ['products', Package, 'Produtos'], ['orders', ShoppingBag, 'Pedidos'], ['coupons', Tags, 'Cupons'], ['settings', Settings, 'Empresa'],
  ], [])
  if (!data) return <div className="admin-shell"><AdminHeader showSignOut={!demo} onSignOut={onSignOut} /><div className="admin-loading"><LoaderCircle className="spin" /> {error || 'Carregando painel…'}</div></div>
  return (
    <div className="admin-shell"><AdminHeader showSignOut={!demo} onSignOut={onSignOut} /><main className="admin-main"><div className="admin-title"><div><span className="kicker">Administração</span><h1>Painel {data.settings.name}</h1></div><a href="/" target="_blank">Abrir loja <ExternalLink size={16} /></a></div>{demo && <div className="demo-admin-banner"><b>Modo de demonstração.</b> O painel está disponível para aprovação visual; cadastros serão liberados ao conectar o Supabase.</div>}<nav className="admin-tabs">{tabs.map(([id, Icon, label]) => <button className={tab === id ? 'is-active' : ''} key={id} onClick={() => setTab(id)}><Icon size={17} /> {label}</button>)}</nav>{error && <div className="form-error">{error}</div>}{tab === 'products' && <ProductsTab data={data} reload={reload} demo={demo} />}{tab === 'orders' && <OrdersTab orders={data.orders} reload={reload} demo={demo} />}{tab === 'coupons' && <CouponsTab coupons={data.coupons} reload={reload} demo={demo} />}{tab === 'settings' && <SettingsTab settings={data.settings} reload={reload} demo={demo} />}</main></div>
  )
}

export default function AdminPage() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    if (!supabase) { setSession(null); return undefined }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!isSupabaseConfigured) return <AdminSetupRequired />
  if (session === undefined) return <div className="admin-loading"><LoaderCircle className="spin" /> Verificando sessão…</div>
  const isAdmin = session?.user?.app_metadata?.role === 'admin'
  if (!session || !isAdmin) return <AdminLogin onAuthenticated={setSession} />
  return <AdminDashboard onSignOut={async () => { await signOutAdmin(); setSession(null) }} />
}
