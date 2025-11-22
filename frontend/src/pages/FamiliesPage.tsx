import { useState, useEffect } from 'react';
import { familiesService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import './CRUDPage.css';

interface Family {
  id: string;
  name: string;
}

export default function FamiliesPage() {
  const { showAlert, showConfirm } = useModal();
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    try {
      setLoading(true);
      const data = await familiesService.getAll();
      setFamilies(data);
    } catch (error) {
      console.error('Error loading families:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await familiesService.update(editingId, formData);
      } else {
        await familiesService.create(formData);
      }
      setFormData({ name: '' });
      setShowForm(false);
      setEditingId(null);
      loadFamilies();
    } catch (error: any) {
      console.error('Error saving family:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    }
  };

  const handleEdit = (family: Family) => {
    setFormData({ name: family.name });
    setEditingId(family.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette famille ?');
    if (!confirmed) return;
    try {
      await familiesService.delete(id);
      loadFamilies();
    } catch (error) {
      console.error('Error deleting family:', error);
      await showAlert('Erreur lors de la suppression', 'error');
    }
  };

  // Filtrer les familles selon la recherche
  const getFilteredFamilies = () => {
    if (!searchTerm) return families;
    const searchLower = searchTerm.toLowerCase();
    return families.filter((family) => family.name.toLowerCase().includes(searchLower));
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="crud-page">
      <div className="page-header">
        <h1>Gestion des Familles</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '' }); }}>
          + Nouvelle famille
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Modifier' : 'Créer'} une famille</h2>
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
        {families.length > 0 && (
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
                placeholder="🔍 Rechercher par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
        {getFilteredFamilies().length === 0 ? (
          <div className="empty-state-placeholder">
            <h3>{searchTerm ? 'Aucun résultat' : 'Aucune famille'}</h3>
            <p>{searchTerm ? 'Aucune famille ne correspond à votre recherche' : 'Créez votre première famille pour commencer'}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredFamilies().map((family) => (
                <tr key={family.id}>
                  <td>{family.name}</td>
                  <td>
                    <button onClick={() => handleEdit(family)}>Modifier</button>
                    <button onClick={() => handleDelete(family.id)} className="delete">
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

