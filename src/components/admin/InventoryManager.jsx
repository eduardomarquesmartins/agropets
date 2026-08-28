import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, FileText, Search, Star, Edit, Trash2, 
  Upload, X, CheckCircle, RefreshCw, ShieldCheck, Clock,
  Sparkles, Scale
} from 'lucide-react';
import { useProductStore } from '../../store/productStore';
import { useCategoryStore } from '../../store/categoryStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useAuthStore } from '../../store/authStore';
import { supabase, uploadProductImage } from '../../services/supabase';
import { slugify, capitalizeTitle } from '../../utils/stringUtils';
import toast from 'react-hot-toast';

const InventoryManager = ({ openModal, editingItem, setEditingItem, isEditingProduct, setIsEditingProduct }) => {
  const { products, addProduct, updateProduct, deleteProduct, updateStock } = useProductStore();
  const { categories, addCategory, addSubCategory } = useCategoryStore();
  const { settings } = useSettingsStore();
  const { addLog } = useInventoryStore();
  const { user } = useAuthStore();

  const [productSearch, setProductSearch] = useState('');
  const [activeInventoryTab, setActiveInventoryTab] = useState('list'); // 'list' or 'xml-import'
  
  // XML/Manual Import States
  const [xmlData, setXmlData] = useState(null);
  const [isParsingXml, setIsParsingXml] = useState(false);
  const [entryMode, setEntryMode] = useState('xml');
  const [manualItems, setManualItems] = useState([]);
  const [manualSearch, setManualSearch] = useState('');
  const [isDraggingXml] = useState(false);
  const [xmlPendingMatchIndex, setXmlPendingMatchIndex] = useState(null);

  // Product Editor States
  const [productForm, setProductForm] = useState({
    name: '', price: '', oldPrice: '', category: 'cachorros', subCategory: '', brand: '', img: '', stock: '10', sku: '',
    description: '', vitamins: '', composition: '', weight: '',
    status: 'active', isFeatured: false, tags: '', images: [],
    maxInstallments: '',
    variations: []
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTone, setAiTone] = useState('professional');
  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [showQuickAddSubCategory, setShowQuickAddSubCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newSubCatName, setNewSubCatName] = useState('');

  // Robust Filtering
  const filteredProducts = products.filter(p => {
    const search = productSearch.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(search) ||
      (p.brand || '').toLowerCase().includes(search) ||
      (p.category || '').toLowerCase().includes(search) ||
      (p.sku || '').toLowerCase().includes(search)
    );
  });

  // Sync product form when editingItem changes
  useEffect(() => {
    if (editingItem && isEditingProduct) {
      setProductForm({
        ...editingItem,
        price: (editingItem.price || 0).toString(),
        oldPrice: editingItem.oldPrice ? editingItem.oldPrice.toString() : '',
        stock: (editingItem.stock || 0).toString(),
        sku: editingItem.sku || '',
        subCategory: editingItem.subCategory || '',
        vitamins: editingItem.vitamins || '',
        composition: editingItem.composition || '',

        weight: editingItem.weight || '',
        status: editingItem.status || 'active',
        isFeatured: editingItem.isFeatured || false,
        images: editingItem.images || (editingItem.img ? [editingItem.img] : []),
        tags: Array.isArray(editingItem.tags) ? editingItem.tags.join(', ') : (editingItem.tags || ''),
        maxInstallments: editingItem.maxInstallments ? editingItem.maxInstallments.toString() : '',
        variations: editingItem.variations || []
      });
    } else if (!editingItem && isEditingProduct) {
      setProductForm({
        name: '', price: '', oldPrice: '', category: 'cachorros', subCategory: '', brand: '', img: '', stock: '10', sku: '',
        description: '', vitamins: '', composition: '', weight: '',
        status: 'active', isFeatured: false, tags: '', images: [],
        maxInstallments: '',
        variations: []
      });
    }
  }, [editingItem, isEditingProduct]);

  // Handlers
  const handleQuickAddCategory = () => {
    if (!newCatName.trim()) return;
    addCategory({ name: newCatName, img: settings.logo || 'https://images.unsplash.com/photo-1541591419107-bb5e172d5d7b?q=80&w=300&auto=format&fit=crop' });
    setProductForm({ ...productForm, category: slugify(newCatName) });
    setNewCatName('');
    setShowQuickAddCategory(false);
    toast.success('Categoria adicionada!');
  };

  const handleQuickAddSubCategory = () => {
    if (!newSubCatName.trim()) return;
    addSubCategory(productForm.category, { name: newSubCatName });
    setProductForm({ ...productForm, subCategory: slugify(newSubCatName) });
    setNewSubCatName('');
    setShowQuickAddSubCategory(false);
    toast.success('Sub-categoria adicionada!');
  };

  const handleImageUpload = async (e, type, index = 0) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5MB.');
      return;
    }

    const toastId = toast.loading('Fazendo upload da imagem...');
    try {
      const publicUrl = await uploadProductImage(file);
      
      const newImages = [...(productForm.images || [])];
      newImages[index] = publicUrl;

      setProductForm({
        ...productForm,
        images: newImages,
        img: index === 0 ? publicUrl : (productForm.img || publicUrl)
      });
      toast.success('Imagem enviada com sucesso!', { id: toastId });
    } catch {
      toast.error('Erro ao fazer upload da imagem.', { id: toastId });
    }
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('Deseja realmente excluir este produto? Esta ação não pode ser desfeita.')) {
      deleteProduct(id);
      toast.success('Produto removido do estoque.');
    }
  };

  const handleProductSubmit = async (e) => {
    if (e) e.preventDefault();
    
    const toastId = toast.loading(editingItem ? 'Atualizando produto...' : 'Cadastrando produto...');
    
    try {
      const data = {
        ...productForm,
        price: parseFloat(productForm.price) || 0,
        oldPrice: productForm.oldPrice ? parseFloat(productForm.oldPrice) : null,
        stock: parseInt(productForm.stock) || 0,
        tags: typeof productForm.tags === 'string' ? productForm.tags.split(',').map(t => t.trim()).filter(t => t !== '') : productForm.tags
      };
      
      if (editingItem) {
        await updateProduct(editingItem.id, data);
      } else {
        const newId = crypto.randomUUID();
        const newProduct = { ...data, id: newId };
        await addProduct(newProduct);
        
        if (xmlPendingMatchIndex !== null && xmlData) {
          const newItems = [...xmlData.items];
          newItems[xmlPendingMatchIndex] = {
            ...newItems[xmlPendingMatchIndex],
            matchedProductId: newId,
            matchedProductName: data.name
          };
          setXmlData({ ...xmlData, items: newItems });
          setXmlPendingMatchIndex(null);
        }
      }
      
      setIsEditingProduct(false);
      setEditingItem(null);
      toast.success(editingItem ? 'Produto atualizado!' : 'Produto cadastrado com sucesso!', { id: toastId });
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      toast.error('Erro ao salvar produto no banco de dados. Verifique sua conexão ou se todos os campos estão corretos.', { id: toastId });
    }
  };

  const handleGenerateDescription = async (tone = 'professional') => {
    const { name, category, brand, price } = productForm;
    if (!name) {
      toast.error('Insira o nome do produto para a IA trabalhar!');
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Sua sessão expirou. Entre novamente para gerar a descrição.');
      }

      const response = await fetch('/api/generate-product-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name,
          brand,
          category,
          price: String(price || ''),
          tone,
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.html) {
        throw new Error(data.error || 'Não foi possível gerar a descrição com IA.');
      }

      setProductForm({ ...productForm, description: data.html });
      toast.success('Descrição gerada com IA!');
    } catch (error) {
      toast.error(error.message || 'Erro na geração IA. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addManualItem = (product) => {
    if (manualItems.find(item => item.matchedProductId === product.id)) {
      toast.error('Este produto já está na lista!');
      return;
    }
    setManualItems([...manualItems, {
      xProd: product.name,
      cEAN: product.tags?.[0] || 'N/A',
      qCom: 1,
      matchedProductId: product.id,
      matchedProductName: product.name
    }]);
    setManualSearch('');
  };

  const removeManualItem = (id) => {
    setManualItems(manualItems.filter(item => item.matchedProductId !== id));
  };

  const updateManualQty = (id, qty) => {
    setManualItems(manualItems.map(item => 
      item.matchedProductId === id ? { ...item, qCom: Math.max(1, parseFloat(qty) || 0) } : item
    ));
  };

  const handleXmlUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processXmlFile(file);
  };

  const processXmlFile = (file) => {
    setIsParsingXml(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(event.target.result, "text/xml");
        const nNF = xmlDoc.getElementsByTagName("nNF")[0]?.textContent;
        const dhEmi = xmlDoc.getElementsByTagName("dhEmi")[0]?.textContent;
        const xNomeEmit = xmlDoc.getElementsByTagName("xNome")[0]?.textContent;
        const dets = xmlDoc.getElementsByTagName("det");
        const items = Array.from(dets).map(det => {
          const prod = det.getElementsByTagName("prod")[0];
          return {
            cProd: prod.getElementsByTagName("cProd")[0]?.textContent,
            cEAN: prod.getElementsByTagName("cEAN")[0]?.textContent,
            xProd: prod.getElementsByTagName("xProd")[0]?.textContent,
            qCom: parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || "0"),
            vUnCom: parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || "0"),
            vProd: parseFloat(prod.getElementsByTagName("vProd")[0]?.textContent || "0"),
          };
        });

        const mappedItems = items.map(item => {
          const match = products.find(p => p.name.toLowerCase().includes(item.xProd.toLowerCase()) || (p.tags && p.tags.includes(item.cEAN)));
          return { ...item, matchedProductId: match?.id || null, matchedProductName: match?.name || null };
        });

        setXmlData({ nNF, dhEmi, xNomeEmit, items: mappedItems });
        toast.success(`Nota Fiscal ${nNF} lida com sucesso!`);
      } catch {
        toast.error("Erro ao processar arquivo XML.");
      } finally {
        setIsParsingXml(false);
      }
    };
    reader.readAsText(file);
  };

  const handleAutoCreateMissing = async () => {
    if (!xmlData) return;
    const newItems = [...xmlData.items];
    let createdCount = 0;
    for (const [idx, item] of newItems.entries()) {
      if (!item.matchedProductId) {
        const newId = crypto.randomUUID();
        const newProduct = {
          id: newId,
          name: item.xProd,
          price: item.vUnCom * 1.5,
          oldPrice: null,
          stock: 0,
          category: 'geral',
          tags: [item.cEAN, `ref:${item.cProd}`].filter(Boolean),
          status: 'active',
          img: settings.logo || 'https://images.unsplash.com/photo-1516733729877-db5363bdc06c?q=80&w=300&auto=format&fit=crop'
        };
        await addProduct(newProduct);
        newItems[idx] = { ...item, matchedProductId: newId, matchedProductName: item.xProd };
        createdCount++;
      }
    }
    setXmlData({ ...xmlData, items: newItems });
    toast.success(`${createdCount} novos produtos cadastrados e vinculados!`);
  };

  const processXmlStock = async () => {
    if (!xmlData) return;
    setIsParsingXml(true);
    try {
      for (const item of xmlData.items) {
        if (item.matchedProductId) {
          const product = products.find(p => p.id === item.matchedProductId);
          const newStock = (product?.stock || 0) + item.qCom;
          await updateStock(item.matchedProductId, newStock);
          await addLog({
            productId: item.matchedProductId,
            productName: product?.name || item.matchedProductName,
            type: 'entry',
            quantity: item.qCom,
            reason: `Entrada NF-e #${xmlData.nNF} (${xmlData.xNomeEmit})`,
            userId: user.id
          });
        }
      }
      toast.success('Produtos atualizados com sucesso!');
      setXmlData(null);
      setActiveInventoryTab('list');
    } catch {
      toast.error("Erro ao finalizar entrada de estoque.");
    } finally {
      setIsParsingXml(false);
    }
  };

  const renderProductEditor = () => (
    <div className="admin-dashboard-content fade-in product-editor-full">
      <div className="dashboard-intro">
        <div className="intro-text">
          <button className="btn-back-minimal" onClick={() => setIsEditingProduct(false)}>← Voltar ao estoque</button>
          <h1>{editingItem ? 'Editar Produto' : 'Novo Produto'}</h1>
          <p>Complete todos os detalhes para uma melhor performance de vendas.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary-modern" onClick={() => setIsEditingProduct(false)} style={{ height: '48px', padding: '0 2rem' }}>Descartar</button>
          <button className="btn-primary-modern" onClick={handleProductSubmit} style={{ height: '48px', padding: '0 2rem' }}>
             {editingItem ? 'Salvar Alterações' : 'Publicar Produto'}
          </button>
        </div>
      </div>

      <div className="product-editor-grid">
        <div className="editor-main-col">
          <div className="bento-item">
            <h3 className="section-title-editor">📦 Informações Principais</h3>
            <div className="form-group">
              <label>Título do Produto</label>
              <input type="text" className="admin-input-xl" required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Ex: Ração Premier 15kg" />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Marca</label>
                <input type="text" value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} placeholder="Ex: Premier, Royal Canin" />
              </div>
              <div className="form-group">
                <label>Status do Produto</label>
                <select value={productForm.status} onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}>
                  <option value="active">Ativo (Visível na loja)</option>
                  <option value="draft">Rascunho (Privado)</option>
                  <option value="inactive">Inativo (Indisponível)</option>
                </select>
              </div>
            </div>

            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Setor (Categoria)
                  <button className="btn-inline-add" onClick={() => setShowQuickAddCategory(true)}>+ Nova</button>
                </label>
                {showQuickAddCategory ? (
                   <div className="quick-add-box">
                     <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nome do setor..." autoFocus onKeyPress={(e) => e.key === 'Enter' && handleQuickAddCategory()} />
                     <button className="btn-save-inline" onClick={handleQuickAddCategory}><CheckCircle size={14} /></button>
                     <button className="btn-cancel-inline" onClick={() => setShowQuickAddCategory(false)}><X size={14} /></button>
                   </div>
                ) : (
                  <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value, subCategory: '' })}>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{capitalizeTitle(cat.name)}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Departamento (Sub-categoria)
                  <button className="btn-inline-add" onClick={() => setShowQuickAddSubCategory(true)}>+ Novo</button>
                </label>
                {showQuickAddSubCategory ? (
                   <div className="quick-add-box">
                     <input type="text" value={newSubCatName} onChange={(e) => setNewSubCatName(e.target.value)} placeholder="Nome do depto..." autoFocus onKeyPress={(e) => e.key === 'Enter' && handleQuickAddSubCategory()} />
                     <button className="btn-save-inline" onClick={handleQuickAddSubCategory}><CheckCircle size={14} /></button>
                     <button className="btn-cancel-inline" onClick={() => setShowQuickAddSubCategory(false)}><X size={14} /></button>
                   </div>
                ) : (
                  <select value={productForm.subCategory} onChange={(e) => setProductForm({ ...productForm, subCategory: e.target.value })}>
                    <option value="">Selecione um departamento...</option>
                    {categories.find(c => c.id === productForm.category)?.subCategories?.map(sub => (
                      <option key={sub.id} value={sub.id}>{capitalizeTitle(sub.name)}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="bento-item" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="section-title-editor" style={{ margin: 0 }}>📝 Descrição & Conteúdo</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select value={aiTone} onChange={(e) => setAiTone(e.target.value)} className="ai-tone-select">
                  <option value="professional">Profissional</option>
                  <option value="emotional">Humano</option>
                  <option value="technical">Técnico</option>
                </select>
                <button className={`btn-ai-generate-full ${isGenerating ? 'loading' : ''}`} onClick={() => handleGenerateDescription(aiTone)} disabled={isGenerating}>
                   {isGenerating ? 'IA escrevendo...' : 'Gerar Texto'}
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>Descrição Completa (Suporta HTML)</label>
              <textarea 
                className="admin-textarea-xl"
                value={productForm.description} 
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Descreva os benefícios, diferenciais e modo de uso do produto..."
              />
            </div>

            <div className="form-row">
              <div className="form-group"><label>Vitaminas & Nutrientes</label><textarea value={productForm.vitamins} onChange={(e) => setProductForm({ ...productForm, vitamins: e.target.value })} style={{ minHeight: '80px' }} /></div>
              <div className="form-group"><label>Composição Básica</label><textarea value={productForm.composition} onChange={(e) => setProductForm({ ...productForm, composition: e.target.value })} style={{ minHeight: '80px' }} /></div>
            </div>
          </div>
        </div>

        <div className="editor-side-col">
          <div className="bento-item">
            <h3 className="section-title-editor">💰 Preço & Estoque (Padrão)</h3>
            <div className="form-row">
              <div className="form-group"><label>Preço Venda (R$)</label><input type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></div>
              <div className="form-group"><label>Preço Original (R$)</label><input type="number" step="0.01" value={productForm.oldPrice} onChange={(e) => setProductForm({ ...productForm, oldPrice: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Qtd. em Estoque</label><input type="number" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} /></div>
              <div className="form-group"><label>Peso/Volume</label><input type="text" value={productForm.weight} onChange={(e) => setProductForm({ ...productForm, weight: e.target.value })} placeholder="Ex: 500g, 10kg" /></div>
            </div>
            <div className="form-row" style={{ marginTop: '0.8rem' }}>
              <div className="form-group" title="Deixe vazio para usar o padrão da loja">
                <label>Máx. Parcelas (Personalizado)</label>
                <input 
                  type="number" 
                  placeholder={`Padrão: ${settings.maxInstallments || 3}x`}
                  value={productForm.maxInstallments} 
                  onChange={(e) => setProductForm({ ...productForm, maxInstallments: e.target.value })} 
                />
              </div>
            </div>
          </div>
          
          <div className="bento-item" style={{ marginTop: '1.5rem' }}>
            <h3 className="section-title-editor">⚖️ Variações de Peso/Preço</h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
              Use este campo se o mesmo produto tiver pesos diferentes (ex: 1kg, 10kg).
            </p>
            
            <div className="variations-editor-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {(productForm.variations || []).map((v, vIdx) => (
                <div key={vIdx} className="variation-edit-row" style={{ 
                  background: '#f8fafc', 
                  padding: '12px', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 40px',
                  gap: '8px',
                  alignItems: 'end'
                }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.65rem' }}>Peso</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 10kg" 
                      value={v.weight} 
                      onChange={(e) => {
                        const newVars = [...productForm.variations];
                        newVars[vIdx].weight = e.target.value;
                        setProductForm({ ...productForm, variations: newVars });
                      }} 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.65rem' }}>Preço (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={v.price} 
                      onChange={(e) => {
                        const newVars = [...productForm.variations];
                        newVars[vIdx].price = e.target.value;
                        setProductForm({ ...productForm, variations: newVars });
                      }} 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.65rem' }}>Estoque</label>
                    <input 
                      type="number" 
                      value={v.stock} 
                      onChange={(e) => {
                        const newVars = [...productForm.variations];
                        newVars[vIdx].stock = e.target.value;
                        setProductForm({ ...productForm, variations: newVars });
                      }} 
                    />
                  </div>
                  <button 
                    type="button" 
                    className="btn-remove-variation" 
                    onClick={() => {
                      const newVars = productForm.variations.filter((_, i) => i !== vIdx);
                      setProductForm({ ...productForm, variations: newVars });
                    }}
                    style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', height: '38px', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              <button 
                type="button" 
                className="btn-add-variation-modern"
                onClick={() => {
                  setProductForm({
                    ...productForm,
                    variations: [...(productForm.variations || []), { weight: '', price: '', stock: '' }]
                  });
                }}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  borderRadius: '10px', 
                  border: '1px dashed var(--brand-p)', 
                  background: 'var(--brand-p-soft)',
                  color: 'var(--brand-p)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} /> Adicionar Opção de Peso
              </button>
            </div>
          </div>

          <div className="bento-item" style={{ marginTop: '1.5rem' }}>
            <h3 className="section-title-editor">🖼️ Fotos do Produto</h3>
            <div className="images-editor-grid">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className={`image-slot ${idx === 0 ? 'main' : ''}`}>
                   {(productForm.images?.[idx] || (productForm.img && idx === 0)) ? (
                      <div className="image-preview-wrapper-full">
                         <img src={idx === 0 && !productForm.images?.[0] ? productForm.img : productForm.images?.[idx]} alt="" />
                         <button type="button" onClick={() => {
                            const newImgs = [...(productForm.images || [])];
                            newImgs.splice(idx, 1);
                            setProductForm({ ...productForm, images: newImgs, img: idx === 0 ? (newImgs[0] || '') : productForm.img });
                         }} className="btn-remove-img-full"><X size={12} /></button>
                         {idx === 0 && <span className="label-main-img">CAPA</span>}
                      </div>
                   ) : (
                      <label className="upload-placeholder-full">
                         <Upload size={20} color="#94a3b8" />
                         <span style={{ fontSize: '0.6rem', marginTop: '4px' }}>UPLOAD {idx + 1}</span>
                         <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'product', idx)} style={{ display: 'none' }} />
                      </label>
                   )}
                </div>
              ))}
            </div>
          </div>

          <div className="bento-item" style={{ marginTop: '1.5rem' }}>
            <h3 className="section-title-editor">🚀 Visibilidade & SEO</h3>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <input type="checkbox" id="pref-feat-full" checked={productForm.isFeatured} onChange={(e) => setProductForm({ ...productForm, isFeatured: e.target.checked })} style={{ width: '20px', height: '20px' }} />
              <label htmlFor="pref-feat-full" style={{ margin: 0, fontWeight: 700, cursor: 'pointer' }}>Produto em Destaque 🌟</label>
            </div>
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Tags de Busca (vírgulas)</label>
              <input type="text" value={productForm.tags} onChange={(e) => setProductForm({ ...productForm, tags: e.target.value })} placeholder="venda-rapida, premium, lancamento..." />
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  const renderXmlImport = () => (
    <div className="admin-dashboard-content fade-in xml-import-view">
      <div className="dashboard-intro">
        <div className="intro-text">
          <div className="breadcrumb-admin">Estoque / Entrada de Carga</div>
          <h1>Entrada de Estoque</h1>
          <p>Gerencie a chegada de mercadorias via NF-e XML ou conferência manual da DANFE.</p>
        </div>
        <div className="entry-mode-toggle">
          <button className={`mode-btn ${entryMode === 'xml' ? 'active' : ''}`} onClick={() => { setEntryMode('xml'); setXmlData(null); }}>
             <FileText size={16} /> Importar XML
          </button>
          <button className={`mode-btn ${entryMode === 'manual' ? 'active' : ''}`} onClick={() => { setEntryMode('manual'); setXmlData(null); }}>
             <Edit size={16} /> Conferência Manual (Papel)
          </button>
        </div>
      </div>

      {!xmlData ? (
        <div 
          className={`bento-item xml-dropzone ${isDraggingXml ? 'dragging' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); processXmlFile(e.dataTransfer.files[0]); }}
        >
          <label className="xml-upload-label">
            <Upload size={40} color="var(--brand-p)" />
            <h3>Carregar Nota Fiscal Eletrônica</h3>
            <p>Arraste o arquivo .xml aqui ou clique para selecionar</p>
            <input type="file" accept=".xml" onChange={handleXmlUpload} style={{ display: 'none' }} />
          </label>
        </div>
      ) : (
        <div className="xml-review-container">
          <div className="invoice-summary-card">
              <div className="summary-header">
                 <div className="summary-badge"><ShieldCheck size={14} /> NF-e Processada</div>
                 <button className="btn-close-summary" onClick={() => setXmlData(null)}><X size={18} /></button>
              </div>
              <div className="summary-body">
                 <div className="sum-column"><label>Número da Nota</label><strong>#{xmlData.nNF}</strong></div>
                 <div className="sum-column"><label>Data de Emissão</label><strong>{new Date(xmlData.dhEmi).toLocaleDateString()}</strong></div>
                 <div className="sum-column"><label>Fornecedor</label><strong>{xmlData.xNomeEmit}</strong></div>
                 <div className="sum-column"><label>Produtos na Nota</label><strong>{xmlData.items.length} itens</strong></div>
              </div>
          </div>

          <div className="bento-item" style={{ marginTop: '1.5rem', padding: '0', overflow: 'hidden' }}>
            <div className="admin-table-wrapper">
              <table className="admin-table modern-table">
                <thead>
                  <tr>
                    <th>📦 Item na Nota</th>
                    <th>🏷️ EAN / Código</th>
                    <th>🔢 Qtd.</th>
                    <th>🔍 Match no Catálogo</th>
                    <th style={{ textAlign: 'center' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {xmlData.items.map((item, idx) => (
                    <tr key={idx} className={item.matchedProductId ? 'row-matched' : 'row-unmatched'}>
                      <td>{item.xProd}</td>
                      <td>{item.cEAN || 'N/A'}</td>
                      <td>{item.qCom} un.</td>
                      <td>
                        {item.matchedProductId ? (
                          <div className="matched-product-badge"><CheckCircle size={14} /><span>{item.matchedProductName}</span></div>
                        ) : (
                          <div className="manual-select-wrapper" style={{ display: 'flex', gap: '8px' }}>
                            <select className="admin-select-sm" onChange={(e) => {
                                const newItems = [...xmlData.items];
                                const p = products.find(prod => prod.id === e.target.value);
                                newItems[idx].matchedProductId = p?.id;
                                newItems[idx].matchedProductName = p?.name;
                                setXmlData({ ...xmlData, items: newItems });
                              }}>
                              <option value="">Vincular existente...</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button className="btn-action-outline edit" onClick={() => {
                                setXmlPendingMatchIndex(idx);
                                openModal('product', { name: item.xProd, tags: [item.cEAN], price: item.vUnCom, stock: item.qCom });
                              }}><Plus size={14} /></button>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.matchedProductId ? <span className="status-capsule green glow">SALVAR +{item.qCom}</span> : <span className="status-capsule gray">⚠️ Pendente</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="xml-actions-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
             {xmlData.items.some(i => !i.matchedProductId) && (
                <button className="btn-secondary-modern" style={{ height: '48px', padding: '0 1.5rem' }} onClick={handleAutoCreateMissing}>
                  <Plus size={18} /> Cadastrar itens novos (Auto)
                </button>
              )}
             <button className="btn-secondary-modern" style={{ height: '48px', padding: '0 2rem' }} onClick={() => setXmlData(null)}>Descartar Nota</button>
             <button className="btn-finalize-entry" style={{ margin: 0, width: 'auto', minWidth: '300px', height: '48px', padding: '0 2rem' }} onClick={processXmlStock} disabled={xmlData.items.filter(i => i.matchedProductId).length === 0}>
                <RefreshCw size={18} className={isParsingXml ? 'spin' : ''} /> Finalizar Entrada ({xmlData.items.filter(i => i.matchedProductId).length} itens)
             </button>
          </div>
        </div>
      )}

      {entryMode === 'manual' && !xmlData && (
        <div className="manual-entry-container scale-in">
          <div className="bento-item search-manual-wrapper">
            <h3 className="section-title-editor"><Search size={18} /> buscar produtos para conferência </h3>
            <div className="header-search-advanced" style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '12px', marginTop: '1rem', gap: '12px' }}>
               <Search size={20} color="var(--brand-p)" />
               <input 
                 type="text" 
                 placeholder="Digite o nome ou bipe o código de barras para adicionar..." 
                 value={manualSearch}
                 onChange={(e) => setManualSearch(e.target.value)}
                 autoFocus
                 style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '1rem', fontWeight: 600 }}
               />
            </div>
            
            {manualSearch && (
              <div className="search-results-dropdown-advanced bento-item" style={{ marginTop: '0.5rem', padding: '0.5rem' }}>
                {manualSearch.replace(/\D/g, '').length === 44 && (
                  <div className="search-result-item-advanced nfe-detect" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', cursor: 'pointer', background: '#f0fdf4', borderRadius: '8px' }} onClick={() => {
                     setXmlData({
                        nNF: manualSearch.slice(-9),
                        dhEmi: new Date().toISOString(),
                        xNomeEmit: 'IMPORTADO VIA CHAVE DE ACESSO',
                        items: []
                     });
                     setEntryMode('xml');
                     setManualSearch('');
                     toast.success('Nota Fiscal importada com sucesso via Chave!');
                  }}>
                    <div className="upload-icon-circle" style={{ width: '40px', height: '40px', marginBottom: 0, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                       <ShieldCheck size={20} color="var(--brand-p)" />
                    </div>
                    <div className="result-info" style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="res-name" style={{ fontWeight: 800, color: '#166534' }}>✨ Importar NF-e via Chave de Acesso</span>
                      <span className="res-stock" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Clique para buscar dados fiscais da nota {manualSearch.slice(0, 4)}...</span>
                    </div>
                  </div>
                )}

                {products.filter(p => p.name.toLowerCase().includes(manualSearch.toLowerCase()) || (p.tags && p.tags.some?.(t => t.includes(manualSearch)))).slice(0, 5).map(p => (
                  <div key={p.id} className="search-result-item-advanced" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onClick={() => addManualItem(p)}>
                    <img src={p.img} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
                    <div className="result-info" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span className="res-name" style={{ fontWeight: 800 }}>{p.name}</span>
                      <span className="res-stock" style={{ fontSize: '0.8rem', opacity: 0.7 }}>Em estoque: {p.stock} un. • R$ {(p.price || 0).toFixed(2)}</span>
                    </div>
                    <div className="btn-add-circle" style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={16} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bento-item" style={{ padding: '0', overflow: 'hidden', marginTop: '1.5rem' }}>
             <div className="table-header-simple" style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', fontWeight: 800, color: 'var(--brand-p)' }}>
               <Clock size={16} /> Itens da conferência atual ({manualItems.length})
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table modern-table">
                <thead>
                  <tr>
                    <th>📦 Produto</th>
                    <th>Estoque Atual</th>
                    <th>🔢 Qtd. Chegando</th>
                    <th>📈 Novo Total</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {manualItems.map(item => {
                    const product = products.find(p => p.id === item.matchedProductId);
                    return (
                      <tr key={item.matchedProductId}>
                        <td>
                          <div className="user-cell" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={product?.img} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                            <div className="xml-prod-desc" style={{ display: 'flex', flexDirection: 'column' }}>
                               <span className="prod-name-xml" style={{ fontWeight: 800 }}>{item.matchedProductName}</span>
                               <span className="prod-sku-xml" style={{ fontSize: '0.75rem', opacity: 0.7 }}>{product?.brand}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{product?.stock || 0} un.</td>
                        <td>
                          <div className="manual-qty-input-wrapper">
                             <input 
                               type="number" 
                               min="1"
                               value={item.qCom} 
                               onChange={(e) => updateManualQty(item.matchedProductId, e.target.value)}
                               style={{ width: '80px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center', fontWeight: 800 }}
                             />
                          </div>
                        </td>
                        <td>
                          <span className="status-capsule green glow" style={{ fontSize: '0.9rem', padding: '6px 15px', fontWeight: 900 }}>
                             {(product?.stock || 0) + (parseFloat(item.qCom) || 0)} un.
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn-action-outline delete red" onClick={() => removeManualItem(item.matchedProductId)}><Trash2 size={16} color="#ef4444" /></button>
                        </td>
                      </tr>
                    );
                  })}
                  {manualItems.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>Nenhum item na conferência. Busque um produto acima para começar.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {manualItems.length > 0 && (
            <div className="xml-actions-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
               <button className="btn-secondary-modern" style={{ height: '48px', padding: '0 2rem' }} onClick={() => setManualItems([])}>
                  Limpar Lista
               </button>
               <button className="btn-finalize-entry primary" style={{ background: 'var(--brand-p)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, minWidth: '300px', height: '48px', padding: '0 2rem', cursor: 'pointer' }} onClick={() => {
                 setXmlData({ nNF: 'MANUAL_' + new Date().getTime().toString().slice(-4), dhEmi: new Date().toISOString(), xNomeEmit: 'CONFERÊNCIA MANUAL', items: manualItems });
                 setManualItems([]);
                 setEntryMode('xml');
               }}>
                  <ShieldCheck size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} /> Revisar Entrada ({manualItems.length} itens)
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (isEditingProduct) return renderProductEditor();
  if (activeInventoryTab === 'xml-import') return renderXmlImport();

  return (
    <div className="admin-dashboard-content fade-in">
      <div className="dashboard-intro">
        <div className="intro-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-p)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
            <Package size={14} /> Gestão de Catálogo
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Inventário</h1>
          <p>Gerencie o catálogo e níveis de estoque em tempo real.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary-modern" onClick={() => setActiveInventoryTab('xml-import')}>
            <FileText size={18} /> Entrada NF-e
          </button>
          <button className="btn-primary-modern" onClick={() => { setEditingItem(null); setIsEditingProduct(true); }}>
            <Plus size={18} /> Novo Produto
          </button>
        </div>
      </div>

      <div className="bento-grid" style={{ marginBottom: '2rem' }}>
        <div className="bento-item bento-stat" style={{ gridColumn: 'span 4' }}>
          <h3 style={{ fontSize: '0.7rem', color: 'var(--text-p)' }}>Total de Itens</h3>
          <div className="value">{products.length}</div>
          <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Catálogo completo</p>
        </div>
        <div className="bento-item bento-stat" style={{ gridColumn: 'span 4' }}>
          <h3 style={{ fontSize: '0.7rem', color: 'var(--text-p)' }}>Baixo Estoque</h3>
          <div className="value" style={{ color: products.filter(p => p.stock <= 5).length > 0 ? '#f59e0b' : 'inherit' }}>
            {products.filter(p => p.stock <= 5).length}
          </div>
          <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Abaixo do limite</p>
        </div>
        <div className="bento-item bento-stat" style={{ gridColumn: 'span 4' }}>
          <h3 style={{ fontSize: '0.7rem', color: 'var(--text-p)' }}>Valor em Estoque</h3>
          <div className="value" style={{ fontSize: '1.5rem', marginTop: '0.8rem' }}>
            R$ {products.reduce((acc, p) => acc + (Number(p.price || 0) * Number(p.stock || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Custo total estimado</p>
        </div>
      </div>

      <div className="bento-item" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem' }}>
           <Search size={16} />
           <input type="text" placeholder="Buscar por nome, marca ou setor..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} style={{ width: '100%', border: 'none', outline: 'none' }} />
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th className="hide-mobile">Status</th>
                <th>Estoque</th>
                <th>Preço</th>
                <th style={{ textAlign: 'right', padding: '1.25rem' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id}>
                  <td style={{ padding: '0.75rem 1.25rem' }}>
                    <div className="product-info-cell" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ position: 'relative' }}>
                        <img 
                          src={p.img || 'https://images.unsplash.com/photo-1541591419107-bb5e172d5d7b?q=80&w=300&auto=format&fit=crop'} 
                          alt="" 
                          className="admin-product-img" 
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                        {p.isFeatured && (
                          <div style={{ position: 'absolute', top: -6, right: -6, background: '#f59e0b', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <Star size={10} fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="product-names" style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="p-name" style={{ fontWeight: 800 }}>{p.name}</span>
                        <span className="p-sku" style={{ fontSize: '0.75rem', opacity: 0.7 }}>{p.category} • {p.brand || 'Premium'} • SKU: {p.sku || p.id?.slice(0,6)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="hide-mobile">
                    <span className={`status-capsule ${p.status === 'active' || p.status === 'Ativo' ? 'green' : (p.status === 'draft' || p.status === 'Rascunho') ? 'orange' : 'gray'}`} style={{ fontWeight: 800, fontSize: '0.7rem' }}>
                      {p.status === 'active' || p.status === 'Ativo' ? 'Ativo' : (p.status === 'draft' || p.status === 'Rascunho') ? 'Rascunho' : 'Arquivado'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 800 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{p.stock !== undefined ? p.stock : 0} un.</span>
                      {p.stock <= (settings.lowStockThreshold || 5) && (
                        <span className={`inventory-badge ${p.stock <= 2 ? 'critical' : 'warning'}`} style={{ fontSize: '0.65rem', padding: '4px 10px', borderRadius: '100px', background: p.stock <= 2 ? '#fee2e2' : '#fef3c7', color: p.stock <= 2 ? '#b91c1c' : '#b45309', fontWeight: 800 }}>
                          {p.stock <= 2 ? 'ALERTA' : 'BAIXO'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 900, color: 'var(--brand-p)' }}>R$ {(p.price || 0).toFixed(2).replace('.', ',')}</td>
                  <td style={{ textAlign: 'right', padding: '1.25rem' }}>
                    <div className="action-buttons-modern" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn-action-outline edit" onClick={() => { setEditingItem(p); setIsEditingProduct(true); }} title="Editar Produto"><Edit size={14} /></button>
                      <button className="btn-action-outline delete" onClick={() => handleDeleteProduct(p.id)} title="Excluir Produto"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                    <p style={{ fontWeight: 700 }}>Nenhum produto encontrado na busca.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryManager;
