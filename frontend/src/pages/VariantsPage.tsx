import { useState, useEffect } from 'react';
import { variantsService, familiesService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import './CRUDPage.css';

interface Variant {
  id: string;
  name: string;
  code: string;
  familyId: string;
  family?: { name: string };
  excludedVariantIds?: string[];
}

interface Family {
  id: string;
  name: string;
}

export default function VariantsPage() {
  const { showAlert, showConfirm } = useModal();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    familyId: '', 
    name: '', 
    code: '',
    excludedVariantIds: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [variantsData, familiesData] = await Promise.all([
        variantsService.getAll(),
        familiesService.getAll(),
      ]);
      setVariants(variantsData);
      setFamilies(familiesData);
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
        await variantsService.update(editingId, formData);
      } else {
        await variantsService.create(formData as { familyId: string; name: string; code: string; excludedVariantIds?: string[] });
      }
      setFormData({ familyId: '', name: '', code: '', excludedVariantIds: [] });
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (error) {
      console.error('Error saving variant:', error);
      await showAlert('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleEdit = (variant: Variant) => {
    setFormData({ 
      familyId: variant.familyId, 
      name: variant.name, 
      code: variant.code,
      excludedVariantIds: variant.excludedVariantIds || [],
    });
    setEditingId(variant.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette variante ?');
    if (!confirmed) return;
    try {
      await variantsService.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting variant:', error);
      await showAlert('Erreur lors de la suppression', 'error');
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="crud-page">
      <div className="page-header">
        <h1>Gestion des Variantes</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ familyId: '', name: '', code: '', excludedVariantIds: [] }); }}>
          + Nouvelle variante
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Modifier' : 'Créer'} une variante</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Famille</label>
              <select
                value={formData.familyId}
                onChange={(e) => setFormData({ ...formData, familyId: e.target.value })}
                required
              >
                <option value="">Sélectionner une famille</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
            </div>
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
                placeholder="Ex: 1"
              />
            </div>
            <div className="form-group">
              <label>Variantes exclues (ne peuvent pas être sélectionnées avec cette variante)</label>
              <div className="variants-checkboxes">
                {variants
                  .filter(v => v.familyId === formData.familyId && v.id !== editingId)
                  .map((variant) => (
                    <label key={variant.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.excludedVariantIds.includes(variant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              excludedVariantIds: [...formData.excludedVariantIds, variant.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              excludedVariantIds: formData.excludedVariantIds.filter(id => id !== variant.id),
                            });
                          }
                        }}
                        disabled={!formData.familyId}
                      />
                      <span>{variant.name}</span>
                    </label>
                  ))}
              </div>
              {formData.familyId && variants.filter(v => v.familyId === formData.familyId && v.id !== editingId).length === 0 && (
                <p className="no-variants">Aucune autre variante disponible pour cette famille</p>
              )}
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
        {variants.length === 0 ? (
          <div className="empty-state-placeholder">
            <h3>Aucune variante</h3>
            <p>Créez votre première variante pour commencer</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Code</th>
                <th>Famille</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.id}>
                  <td>{variant.name}</td>
                  <td>{variant.code}</td>
                  <td>{variant.family?.name || 'N/A'}</td>
                  <td>
                    <button onClick={() => handleEdit(variant)}>Modifier</button>
                    <button onClick={() => handleDelete(variant.id)} className="delete">
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

