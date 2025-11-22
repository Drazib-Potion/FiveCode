import { useState, useEffect } from 'react';
import { productTypesService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import './CRUDPage.css';

interface ProductType {
  id: string;
  name: string;
  code: string;
}

export default function ProductTypesPage() {
  const { showAlert, showConfirm } = useModal();
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await productTypesService.getAll();
      setProductTypes(data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await productTypesService.update(editingId, formData);
      } else {
        await productTypesService.create(formData);
      }
      setFormData({ name: '', code: '' });
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving product type:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    }
  };

  const handleEdit = (productType: ProductType) => {
    setFormData({
      name: productType.name,
      code: productType.code,
    });
    setEditingId(productType.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer ce type de produit ?');
    if (!confirmed) return;
    try {
      await productTypesService.delete(id);
      loadData();
    } catch (error: any) {
      console.error('Error deleting product type:', error);
      const message = error.response?.data?.message || 'Erreur lors de la suppression';
      await showAlert(message, 'error');
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="crud-page">
      <div className="page-header">
        <h1>Gestion des Types de produit</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', code: '' }); }}>
          + Nouveau type de produit
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Modifier' : 'Créer'} un type de produit</h2>
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
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
                maxLength={10}
                placeholder="Ex: A, B, C..."
              />
            </div>
            <div className="form-actions">
              <button type="submit">Enregistrer</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        {productTypes.length === 0 ? (
          <div className="empty-state-placeholder">
            <h3>Aucun type de produit</h3>
            <p>Créez votre premier type de produit pour commencer</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {productTypes.map((productType) => (
                <tr key={productType.id}>
                  <td>{productType.name}</td>
                  <td>{productType.code}</td>
                  <td>
                    <button onClick={() => handleEdit(productType)}>Modifier</button>
                    <button onClick={() => handleDelete(productType.id)} className="delete">
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

