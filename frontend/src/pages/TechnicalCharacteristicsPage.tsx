import { useState, useEffect } from 'react';
import { technicalCharacteristicsService, familiesService, variantsService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import { formatFieldType, getFieldTypeOptions } from '../utils/fieldTypeFormatter';
import './CRUDPage.css';

interface TechnicalCharacteristic {
  id: string;
  name: string;
  type: string;
  familyId?: string;
  variantId?: string;
  position: number;
  family?: { name: string };
  variant?: { name: string };
}

interface Family {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
  familyId: string;
}

export default function TechnicalCharacteristicsPage() {
  const { showAlert, showConfirm } = useModal();
  const [technicalCharacteristics, setTechnicalCharacteristics] = useState<TechnicalCharacteristic[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'string',
    familyId: '',
    variantId: '',
    position: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [technicalCharacteristicsData, familiesData, variantsData] = await Promise.all([
        technicalCharacteristicsService.getAll(),
        familiesService.getAll(),
        variantsService.getAll(),
      ]);
      setTechnicalCharacteristics(technicalCharacteristicsData);
      setFamilies(familiesData);
      setVariants(variantsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData: any = {
        name: formData.name,
        type: formData.type,
        position: formData.position,
      };
      if (formData.familyId) submitData.familyId = formData.familyId;
      if (formData.variantId) submitData.variantId = formData.variantId;

      if (editingId) {
        await technicalCharacteristicsService.update(editingId, submitData);
      } else {
        await technicalCharacteristicsService.create(submitData);
      }
      setFormData({ name: '', type: 'string', familyId: '', variantId: '', position: 0 });
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (error) {
      console.error('Error saving technical characteristic:', error);
      await showAlert('Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleEdit = (technicalCharacteristic: TechnicalCharacteristic) => {
    setFormData({
      name: technicalCharacteristic.name,
      type: technicalCharacteristic.type,
      familyId: technicalCharacteristic.familyId || '',
      variantId: technicalCharacteristic.variantId || '',
      position: technicalCharacteristic.position,
    });
    setEditingId(technicalCharacteristic.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette caractéristique technique ?');
    if (!confirmed) return;
    try {
      await technicalCharacteristicsService.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting technical characteristic:', error);
      await showAlert('Erreur lors de la suppression', 'error');
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="crud-page">
      <div className="page-header">
        <h1>Gestion des Caractéristiques techniques</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', type: 'string', familyId: '', variantId: '', position: 0 }); }}>
          + Nouvelle caractéristique technique
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Modifier' : 'Créer'} une caractéristique technique</h2>
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
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                {getFieldTypeOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Famille (optionnel)</label>
              <select
                value={formData.familyId}
                onChange={(e) => setFormData({ ...formData, familyId: e.target.value })}
              >
                <option value="">Aucune</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Variante (optionnel)</label>
              <select
                value={formData.variantId}
                onChange={(e) => setFormData({ ...formData, variantId: e.target.value })}
              >
                <option value="">Aucune</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Position</label>
              <input
                type="number"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 0 })}
                min="0"
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
        {technicalCharacteristics.length === 0 ? (
          <div className="empty-state-placeholder">
            <h3>Aucune caractéristique technique</h3>
            <p>Créez votre première caractéristique technique pour commencer</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Famille</th>
                <th>Variante</th>
                <th>Position</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {technicalCharacteristics.map((technicalCharacteristic) => (
                <tr key={technicalCharacteristic.id}>
                  <td>{technicalCharacteristic.name}</td>
                  <td>{formatFieldType(technicalCharacteristic.type)}</td>
                  <td>{technicalCharacteristic.family?.name || 'N/A'}</td>
                  <td>{technicalCharacteristic.variant?.name || 'N/A'}</td>
                  <td>{technicalCharacteristic.position}</td>
                  <td>
                    <button onClick={() => handleEdit(technicalCharacteristic)}>Modifier</button>
                    <button onClick={() => handleDelete(technicalCharacteristic.id)} className="delete">
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

