import { useState, useEffect } from 'react';
import { technicalCharacteristicsService, familiesService, variantsService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import { formatFieldType, getFieldTypeOptions } from '../utils/fieldTypeFormatter';
import './CRUDPage.css';

interface TechnicalCharacteristic {
  id: string;
  name: string;
  type: string;
  enumOptions?: string[] | null;
  enumMultiple?: boolean | null;
  families?: Array<{ family: { id: string; name: string } }>;
  variants?: Array<{ variant: { id: string; name: string } }>;
}

interface Family {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
  familyId: string;
  family?: {
    id: string;
    name: string;
  };
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
    enumOptions: [] as string[],
    enumMultiple: false,
    familyIds: [] as string[],
    variantIds: [] as string[],
  });
  const [newEnumOption, setNewEnumOption] = useState('');
  const [familySearch, setFamilySearch] = useState('');
  const [variantSearch, setVariantSearch] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');

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

  // Filtrer les familles selon la recherche
  const getFilteredFamilies = () => {
    if (!familySearch) return families;
    const searchLower = familySearch.toLowerCase();
    return families.filter((family) => family.name.toLowerCase().includes(searchLower));
  };

  // Filtrer les variantes selon les familles sélectionnées et la recherche
  const getFilteredVariants = () => {
    if (formData.familyIds.length === 0) {
      return []; // Aucune variante affichée si aucune famille n'est sélectionnée
    }
    let filtered = variants.filter((variant) => formData.familyIds.includes(variant.familyId));
    
    // Appliquer le filtre de recherche
    if (variantSearch) {
      const searchLower = variantSearch.toLowerCase();
      filtered = filtered.filter((variant) => 
        variant.name.toLowerCase().includes(searchLower) ||
        (variant.family && variant.family.name.toLowerCase().includes(searchLower))
      );
    }
    
    return filtered;
  };

  // Filtrer les caractéristiques techniques du tableau selon la recherche
  const getFilteredTechnicalCharacteristics = () => {
    if (!tableSearchTerm) return technicalCharacteristics;
    const searchLower = tableSearchTerm.toLowerCase();
    return technicalCharacteristics.filter((tc) => 
      tc.name.toLowerCase().includes(searchLower) ||
      tc.type.toLowerCase().includes(searchLower) ||
      (tc.families && tc.families.some((f: any) => f.family.name.toLowerCase().includes(searchLower))) ||
      (tc.variants && tc.variants.some((v: any) => v.variant.name.toLowerCase().includes(searchLower)))
    );
  };

  const handleFamilyToggle = (familyId: string) => {
    const isSelected = formData.familyIds.includes(familyId);
    if (isSelected) {
      // Désélectionner la famille et retirer les variantes de cette famille
      const newFamilyIds = formData.familyIds.filter((id) => id !== familyId);
      const newVariantIds = formData.variantIds.filter((variantId) => {
        const variant = variants.find((v) => v.id === variantId);
        return variant && variant.familyId !== familyId;
      });
      setFormData({ ...formData, familyIds: newFamilyIds, variantIds: newVariantIds });
    } else {
      // Sélectionner la famille
      setFormData({ ...formData, familyIds: [...formData.familyIds, familyId] });
    }
  };

  const handleVariantToggle = (variantId: string) => {
    const isSelected = formData.variantIds.includes(variantId);
    if (isSelected) {
      setFormData({
        ...formData,
        variantIds: formData.variantIds.filter((id) => id !== variantId),
      });
    } else {
      setFormData({
        ...formData,
        variantIds: [...formData.variantIds, variantId],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData: any = {
        name: formData.name,
        type: formData.type,
      };
      if (formData.type === 'enum') {
        submitData.enumOptions = formData.enumOptions.filter(opt => opt.trim().length > 0);
        submitData.enumMultiple = formData.enumMultiple;
      }
      if (formData.familyIds.length > 0) submitData.familyIds = formData.familyIds;
      if (formData.variantIds.length > 0) submitData.variantIds = formData.variantIds;

      if (editingId) {
        await technicalCharacteristicsService.update(editingId, submitData);
      } else {
        await technicalCharacteristicsService.create(submitData);
      }
      setFormData({ name: '', type: 'string', enumOptions: [], enumMultiple: false, familyIds: [], variantIds: [] });
      setNewEnumOption('');
      setFamilySearch('');
      setVariantSearch('');
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving technical characteristic:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    }
  };

  const handleEdit = (technicalCharacteristic: TechnicalCharacteristic) => {
    setFormData({
      name: technicalCharacteristic.name,
      type: technicalCharacteristic.type,
      enumOptions: technicalCharacteristic.enumOptions || [],
      enumMultiple: technicalCharacteristic.enumMultiple ?? false,
      familyIds: technicalCharacteristic.families?.map(f => f.family.id) || [],
      variantIds: technicalCharacteristic.variants?.map(v => v.variant.id) || [],
    });
    setNewEnumOption('');
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
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', type: 'string', enumOptions: [], enumMultiple: false, familyIds: [], variantIds: [] }); setNewEnumOption(''); setFamilySearch(''); setVariantSearch(''); }}>
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
                onChange={(e) => {
                  const newType = e.target.value;
                  setFormData({ 
                    ...formData, 
                    type: newType,
                    enumOptions: newType === 'enum' ? formData.enumOptions : [],
                    enumMultiple: newType === 'enum' ? formData.enumMultiple : false
                  });
                }}
                required
              >
                {getFieldTypeOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {formData.type === 'enum' && (
              <>
                <div className="form-group">
                  <label>Type de sélection</label>
                  <select
                    value={formData.enumMultiple ? 'multiple' : 'unique'}
                    onChange={(e) => setFormData({ ...formData, enumMultiple: e.target.value === 'multiple' })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="unique">Sélection unique</option>
                    <option value="multiple">Sélection multiple</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Options enum (une par ligne ou séparées par des virgules)</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="Ajouter une option..."
                    value={newEnumOption}
                    onChange={(e) => setNewEnumOption(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newEnumOption.trim()) {
                          setFormData({
                            ...formData,
                            enumOptions: [...formData.enumOptions, newEnumOption.trim()],
                          });
                          setNewEnumOption('');
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newEnumOption.trim()) {
                        setFormData({
                          ...formData,
                          enumOptions: [...formData.enumOptions, newEnumOption.trim()],
                        });
                        setNewEnumOption('');
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#4a90e2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Ajouter
                  </button>
                </div>
                {formData.enumOptions.length > 0 && (
                  <div style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    padding: '8px',
                    backgroundColor: '#f5f5f5',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}>
                    {formData.enumOptions.map((option, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          border: '1px solid #d0d0d0',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#4a90e2';
                          e.currentTarget.style.backgroundColor = '#f0f7ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#d0d0d0';
                          e.currentTarget.style.backgroundColor = '#ffffff';
                        }}
                      >
                        <span style={{ 
                          color: '#333',
                          fontWeight: '500',
                          fontSize: '14px',
                        }}>{option}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              enumOptions: formData.enumOptions.filter((_, i) => i !== index),
                            });
                          }}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#c0392b';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#e74c3c';
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  {formData.enumOptions.length > 0 
                    ? `${formData.enumOptions.length} option(s) définie(s)` 
                    : 'Aucune option définie'}
                </small>
              </div>
              </>
            )}
            <div className="form-group">
              <label>Familles (optionnel)</label>
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
                        checked={formData.familyIds.includes(family.id)}
                        onChange={() => handleFamilyToggle(family.id)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      <span>{family.name}</span>
                    </label>
                  ))
                )}
              </div>
              <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                {formData.familyIds.length > 0 ? `${formData.familyIds.length} famille(s) sélectionnée(s)` : 'Aucune famille sélectionnée'}
              </small>
            </div>
            <div className="form-group">
              <label>Variantes (optionnel - filtrées selon les familles sélectionnées)</label>
              <input
                type="text"
                placeholder="Rechercher une variante..."
                value={variantSearch}
                onChange={(e) => setVariantSearch(e.target.value)}
                disabled={formData.familyIds.length === 0}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  opacity: formData.familyIds.length === 0 ? 0.5 : 1,
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
                {getFilteredVariants().length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
                    {formData.familyIds.length === 0 
                      ? 'Sélectionnez d\'abord une ou plusieurs familles pour voir les variantes'
                      : variantSearch
                      ? 'Aucune variante ne correspond à votre recherche'
                      : 'Aucune variante disponible pour les familles sélectionnées'}
                  </p>
                ) : (
                  getFilteredVariants().map((variant) => (
                    <label
                      key={variant.id}
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
                        checked={formData.variantIds.includes(variant.id)}
                        onChange={() => handleVariantToggle(variant.id)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      <span>
                        {variant.name}
                        {variant.family && (
                          <span style={{ color: '#666', marginLeft: '4px' }}>
                            ({variant.family.name})
                          </span>
                        )}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                {formData.variantIds.length > 0 ? `${formData.variantIds.length} variante(s) sélectionnée(s)` : 'Aucune variante sélectionnée'}
              </small>
            </div>
            <div className="form-actions">
              <button type="submit">Enregistrer</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setFamilySearch(''); setVariantSearch(''); }}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        {technicalCharacteristics.length > 0 && (
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
                placeholder="🔍 Rechercher par nom, type, famille ou variante..."
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
        {getFilteredTechnicalCharacteristics().length === 0 ? (
          <div className="empty-state-placeholder">
            <h3>{tableSearchTerm ? 'Aucun résultat' : 'Aucune caractéristique technique'}</h3>
            <p>{tableSearchTerm ? 'Aucune caractéristique technique ne correspond à votre recherche' : 'Créez votre première caractéristique technique pour commencer'}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Familles</th>
                <th>Variantes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredTechnicalCharacteristics().map((technicalCharacteristic) => (
                <tr key={technicalCharacteristic.id}>
                  <td>{technicalCharacteristic.name}</td>
                  <td>{formatFieldType(technicalCharacteristic.type)}</td>
                  <td>
                    {technicalCharacteristic.families && technicalCharacteristic.families.length > 0
                      ? technicalCharacteristic.families.map(f => f.family.name).join(', ')
                      : 'N/A'}
                  </td>
                  <td>
                    {technicalCharacteristic.variants && technicalCharacteristic.variants.length > 0
                      ? technicalCharacteristic.variants.map(v => v.variant.name).join(', ')
                      : 'N/A'}
                  </td>
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

