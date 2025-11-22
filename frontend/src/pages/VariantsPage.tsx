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
  const [familySearch, setFamilySearch] = useState('');
  const [excludedVariantSearch, setExcludedVariantSearch] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');

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
      setFamilySearch('');
      setExcludedVariantSearch('');
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving variant:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    }
  };

  const handleEdit = (variant: Variant) => {
    setFormData({ 
      familyId: variant.familyId, 
      name: variant.name, 
      code: variant.code,
      excludedVariantIds: variant.excludedVariantIds || [],
    });
    setFamilySearch('');
    setExcludedVariantSearch('');
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

  // Filtrer les familles selon la recherche
  const getFilteredFamilies = () => {
    if (!familySearch) return families;
    const searchLower = familySearch.toLowerCase();
    return families.filter((family) => family.name.toLowerCase().includes(searchLower));
  };

  // Gérer la sélection d'une famille (une seule sélection)
  const handleFamilyToggle = (familyId: string) => {
    setFormData({ ...formData, familyId: formData.familyId === familyId ? '' : familyId });
  };

  // Filtrer les variantes exclues selon la recherche
  const getFilteredExcludedVariants = () => {
    let filtered = variants.filter(v => v.familyId === formData.familyId && v.id !== editingId);
    
    if (excludedVariantSearch) {
      const searchLower = excludedVariantSearch.toLowerCase();
      filtered = filtered.filter((variant) => 
        variant.name.toLowerCase().includes(searchLower) ||
        variant.code.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  };

  // Filtrer les variantes du tableau selon la recherche
  const getFilteredVariantsForTable = () => {
    if (!tableSearchTerm) return variants;
    const searchLower = tableSearchTerm.toLowerCase();
    return variants.filter((variant) => 
      variant.name.toLowerCase().includes(searchLower) ||
      variant.code.toLowerCase().includes(searchLower) ||
      (variant.family && variant.family.name.toLowerCase().includes(searchLower))
    );
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="crud-page">
      <div className="page-header">
        <h1>Gestion des Variantes</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ familyId: '', name: '', code: '', excludedVariantIds: [] }); setFamilySearch(''); setExcludedVariantSearch(''); }}>
          + Nouvelle variante
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Modifier' : 'Créer'} une variante</h2>
          <form onSubmit={handleSubmit}>
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
              <input
                type="text"
                placeholder="Rechercher une variante..."
                value={excludedVariantSearch}
                onChange={(e) => setExcludedVariantSearch(e.target.value)}
                disabled={!formData.familyId}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  opacity: !formData.familyId ? 0.5 : 1,
                }}
              />
              <div className="variants-checkboxes">
                {getFilteredExcludedVariants().length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
                    {!formData.familyId 
                      ? 'Sélectionnez d\'abord une famille pour voir les variantes'
                      : excludedVariantSearch
                      ? 'Aucune variante ne correspond à votre recherche'
                      : 'Aucune autre variante disponible pour cette famille'}
                  </p>
                ) : (
                  getFilteredExcludedVariants().map((variant) => (
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
                  ))
                )}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit">Enregistrer</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setFamilySearch(''); setExcludedVariantSearch(''); }}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        {variants.length > 0 && (
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
                placeholder="🔍 Rechercher par nom, code ou famille..."
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
        {getFilteredVariantsForTable().length === 0 ? (
          <div className="empty-state-placeholder">
            <h3>{tableSearchTerm ? 'Aucun résultat' : 'Aucune variante'}</h3>
            <p>{tableSearchTerm ? 'Aucune variante ne correspond à votre recherche' : 'Créez votre première variante pour commencer'}</p>
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
              {getFilteredVariantsForTable().map((variant) => (
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

