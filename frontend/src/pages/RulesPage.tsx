import { useState, useEffect } from 'react';
import { rulesService, fieldsService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import { formatFieldType } from '../utils/fieldTypeFormatter';
import './CRUDPage.css';

interface Rule {
  id: string;
  fieldId: string;
  ruleType: string;
  config: any;
  field?: { name: string; type: string };
}

interface Field {
  id: string;
  name: string;
  type: string;
}

export default function RulesPage() {
  const { showAlert, showConfirm } = useModal();
  const [rules, setRules] = useState<Rule[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fieldId: '',
    ruleType: 'raw',
    config: '{}',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rulesData, fieldsData] = await Promise.all([
        rulesService.getAll(),
        fieldsService.getAll(),
      ]);
      setRules(rulesData);
      setFields(fieldsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let config;
      try {
        config = JSON.parse(formData.config);
      } catch {
        await showAlert('Le config doit être un JSON valide', 'error');
        return;
      }

      const submitData = {
        fieldId: formData.fieldId,
        ruleType: formData.ruleType,
        config,
      };

      if (editingId) {
        await rulesService.update(editingId, submitData);
      } else {
        await rulesService.create(submitData);
      }
      setFormData({ fieldId: '', ruleType: 'raw', config: '{}' });
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving rule:', error);
      await showAlert(error.response?.data?.message || 'Erreur lors de la sauvegarde', 'error');
    }
  };

  const handleEdit = (rule: Rule) => {
    setFormData({
      fieldId: rule.fieldId,
      ruleType: rule.ruleType,
      config: JSON.stringify(rule.config, null, 2),
    });
    setEditingId(rule.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette règle ?');
    if (!confirmed) return;
    try {
      await rulesService.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting rule:', error);
      await showAlert('Erreur lors de la suppression', 'error');
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="crud-page">
      <div className="page-header">
        <h1>Gestion des Règles</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ fieldId: '', ruleType: 'raw', config: '{}' }); }}>
          + Nouvelle règle
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Modifier' : 'Créer'} une règle</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Caractéristique technique</label>
              <select
                value={formData.fieldId}
                onChange={(e) => setFormData({ ...formData, fieldId: e.target.value })}
                required
                disabled={!!editingId}
              >
                <option value="">Sélectionner une caractéristique technique</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name} ({formatFieldType(field.type)})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Type de règle</label>
              <select
                value={formData.ruleType}
                onChange={(e) => setFormData({ ...formData, ruleType: e.target.value })}
                required
              >
                <option value="raw">Raw (copie la valeur)</option>
                <option value="map">Map (conversion clé/valeur)</option>
                <option value="pad_left">Pad Left (complète à gauche)</option>
                <option value="range_bin">Range Bin (classe dans une catégorie)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Configuration (JSON)</label>
              <textarea
                value={formData.config}
                onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                required
                rows={6}
                placeholder='{"mapping": {"value1": "code1"}} ou {"length": 3, "char": "0"} ou {"ranges": [{"min": 0, "max": 10, "code": "A"}]}'
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
        {rules.length === 0 ? (
          <div className="empty-state-placeholder">
            <h3>Aucune règle</h3>
            <p>Créez votre première règle pour commencer</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Caractéristique technique</th>
                <th>Type de règle</th>
                <th>Configuration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.field?.name || 'N/A'}</td>
                  <td>{rule.ruleType}</td>
                  <td>
                    <pre style={{ fontSize: '0.8rem', margin: 0 }}>
                      {JSON.stringify(rule.config, null, 2)}
                    </pre>
                  </td>
                  <td>
                    <button onClick={() => handleEdit(rule)}>Modifier</button>
                    <button onClick={() => handleDelete(rule.id)} className="delete">
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

