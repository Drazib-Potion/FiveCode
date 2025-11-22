import { useState, useEffect } from 'react';
import { productsService, familiesService, productTypesService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import './CRUDPage.css';

interface Product {
  id: string;
  name: string;
  code: string;
  family: {
    id: string;
    name: string;
  };
  productType: {
    id: string;
    name: string;
    code: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Family {
  id: string;
  name: string;
}

interface ProductType {
  id: string;
  name: string;
  code: string;
}

export default function ProductsPage() {
  const { showAlert, showConfirm } = useModal();
  const [products, setProducts] = useState<Product[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', familyId: '', productTypeId: '' });
  const [familySearch, setFamilySearch] = useState('');
  const [productTypeSearch, setProductTypeSearch] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');

  useEffect(() => {
    loadProducts();
    loadFamilies();
    loadProductTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsService.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      await showAlert('Erreur lors du chargement des produits', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadFamilies = async () => {
    try {
      const data = await familiesService.getAll();
      setFamilies(data);
    } catch (error) {
      console.error('Error loading families:', error);
    }
  };

  const loadProductTypes = async () => {
    try {
      const data = await productTypesService.getAll();
      setProductTypes(data);
    } catch (error) {
      console.error('Error loading product types:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await productsService.create(formData);
      setFormData({ name: '', code: '', familyId: '', productTypeId: '' });
      setFamilySearch('');
      setProductTypeSearch('');
      setShowForm(false);
      loadProducts();
    } catch (error: any) {
      console.error('Error creating product:', error);
      await showAlert(error.response?.data?.message || 'Erreur lors de la création du produit', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer ce produit ?');
    if (!confirmed) return;
    try {
      await productsService.delete(id);
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      await showAlert('Erreur lors de la suppression', 'error');
    }
  };

  // Filtrer les familles selon la recherche
  const getFilteredFamilies = () => {
    if (!familySearch) return families;
    const searchLower = familySearch.toLowerCase();
    return families.filter((family) => family.name.toLowerCase().includes(searchLower));
  };

  // Filtrer les types de produit selon la recherche
  const getFilteredProductTypes = () => {
    if (!productTypeSearch) return productTypes;
    const searchLower = productTypeSearch.toLowerCase();
    return productTypes.filter((productType) => 
      productType.name.toLowerCase().includes(searchLower) ||
      productType.code.toLowerCase().includes(searchLower)
    );
  };

  // Gérer la sélection d'un type de produit (une seule sélection)
  const handleProductTypeToggle = (productTypeId: string) => {
    setFormData({ ...formData, productTypeId: formData.productTypeId === productTypeId ? '' : productTypeId });
  };

  // Gérer la sélection d'une famille (une seule sélection)
  const handleFamilyToggle = (familyId: string) => {
    setFormData({ ...formData, familyId: formData.familyId === familyId ? '' : familyId }    );
  };

  // Filtrer les produits du tableau selon la recherche
  const getFilteredProducts = () => {
    if (!tableSearchTerm) return products;
    const searchLower = tableSearchTerm.toLowerCase();
    return products.filter((product) => 
      product.name.toLowerCase().includes(searchLower) ||
      product.code.toLowerCase().includes(searchLower) ||
      product.family.name.toLowerCase().includes(searchLower) ||
      (product.productType && product.productType.name.toLowerCase().includes(searchLower)) ||
      (product.productType && product.productType.code.toLowerCase().includes(searchLower))
    );
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="crud-page">
      <div className="page-header">
        <h1>Liste des Produits</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => {
              setShowForm(true);
              setFormData({ name: '', code: '', familyId: '', productTypeId: '' });
              setFamilySearch('');
              setProductTypeSearch('');
            }}
          >
            + Nouveau produit
          </button>
        </div>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>Créer un produit</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="Code unique du produit"
              />
            </div>
            <div className="form-group">
              <label>Type de produit</label>
              <input
                type="text"
                placeholder="Rechercher un type de produit..."
                value={productTypeSearch}
                onChange={(e) => setProductTypeSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
              <div style={{ 
                border: '1px solid #ddd', 
                borderRadius: '4px', 
                padding: '10px', 
                maxHeight: '200px', 
                overflowY: 'auto',
                backgroundColor: '#f9f9f9'
              }}>
                {getFilteredProductTypes().length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
                    {productTypeSearch ? 'Aucun type de produit ne correspond à votre recherche' : 'Aucun type de produit disponible'}
                  </p>
                ) : (
                  getFilteredProductTypes().map((productType) => (
                    <label
                      key={productType.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        marginBottom: '4px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.productTypeId === productType.id}
                        onChange={() => handleProductTypeToggle(productType.id)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      <span>{productType.name} ({productType.code})</span>
                    </label>
                  ))
                )}
              </div>
              <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                {formData.productTypeId ? '1 type de produit sélectionné' : 'Aucun type de produit sélectionné'}
              </small>
            </div>
            <div className="form-group">
              <label>Famille</label>
              <input
                type="text"
                placeholder="Rechercher une famille..."
                value={familySearch}
                onChange={(e) => setFamilySearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
              <div style={{ 
                border: '1px solid #ddd', 
                borderRadius: '4px', 
                padding: '10px', 
                maxHeight: '200px', 
                overflowY: 'auto',
                backgroundColor: '#f9f9f9'
              }}>
                {getFilteredFamilies().length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
                    {familySearch ? 'Aucune famille ne correspond à votre recherche' : 'Aucune famille disponible'}
                  </p>
                ) : (
                  getFilteredFamilies().map((family) => (
                    <label
                      key={family.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        marginBottom: '4px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.familyId === family.id}
                        onChange={() => handleFamilyToggle(family.id)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      <span>{family.name}</span>
                    </label>
                  ))
                )}
              </div>
              <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                {formData.familyId ? '1 famille sélectionnée' : 'Aucune famille sélectionnée'}
              </small>
            </div>
            <div className="form-actions">
              <button type="submit">Enregistrer</button>
              <button type="button" onClick={() => { setShowForm(false); setFamilySearch(''); setProductTypeSearch(''); }}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        {products.length > 0 && (
          <div style={{ 
            marginBottom: '20px',
            paddingTop: '10px',
            paddingLeft: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}>
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '400px',
            }}>
              <input
                type="text"
                placeholder="🔍 Rechercher par nom, code, famille ou type..."
                value={tableSearchTerm}
                onChange={(e) => setTableSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4a90e2';
                  e.target.style.boxShadow = '0 2px 8px rgba(74, 144, 226, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              />
            </div>
          </div>
        )}
        {getFilteredProducts().length === 0 ? (
          <div className="empty-state-placeholder">
            <h3>{tableSearchTerm ? 'Aucun résultat' : 'Aucun produit'}</h3>
            <p>{tableSearchTerm ? 'Aucun produit ne correspond à votre recherche' : 'Créez votre premier produit pour commencer'}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Code</th>
                <th>Type de produit</th>
                <th>Famille</th>
                <th>Date de création</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredProducts().map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                  </td>
                  <td>
                    <strong style={{ fontFamily: 'monospace', fontSize: '1.1em' }}>
                      {product.code}
                    </strong>
                  </td>
                  <td>
                    <strong>{product.productType?.name || 'N/A'}</strong>
                    {product.productType && (
                      <span style={{ color: '#7f8c8d', fontSize: '0.9em', marginLeft: '0.5rem' }}>
                        ({product.productType.code})
                      </span>
                    )}
                  </td>
                  <td>
                    <strong>{product.family.name}</strong>
                  </td>
                  <td>
                    {new Date(product.createdAt).toLocaleString('fr-FR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <button onClick={() => handleDelete(product.id)} className="delete">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

