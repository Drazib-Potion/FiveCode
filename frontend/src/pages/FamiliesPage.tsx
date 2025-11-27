import { useState, useEffect, useCallback, useMemo } from 'react';
import { familiesService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import { Family } from '../utils/types';
import { useAuth } from '../contexts/AuthContext';

export default function FamiliesPage() {
  const { showAlert, showConfirm } = useModal();
  const { canEditContent } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);


  const fetchFamiliesTable = useCallback(
    async ({
      offset,
      limit,
      search,
    }: {
      offset: number;
      limit: number;
      search?: string;
    }) => {
      try {
        const response = await familiesService.getAll(offset, limit, search);
        const data: Family[] = Array.isArray(response) ? response : response.data || [];
        return {
          data,
          hasMore:
            typeof response.hasMore === 'boolean'
              ? response.hasMore
              : data.length === limit,
        };
      } catch (error) {
        console.error('Error loading families:', error);
        await showAlert('Erreur lors du chargement des familles', 'error');
        return [];
      }
    },
    [showAlert],
  );

  useEffect(() => {
    if (!canEditContent) {
      setShowForm(false);
      setEditingId(null);
    }
  }, [canEditContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await familiesService.update(editingId, formData);
      } else {
        await familiesService.create(formData);
      }
      setFormData({ name: '' });
      setShowForm(false);
      setEditingId(null);
      setReloadKey((prev) => prev + 1);
    } catch (error: any) {
      console.error('Error saving family:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (family: Family) => {
    if (!canEditContent) return;
    setFormData({ name: family.name });
    setEditingId(family.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!canEditContent) return;
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette famille ?');
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await familiesService.delete(id);
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error deleting family:', error);
      await showAlert('Erreur lors de la suppression', 'error');
    } finally {
      setDeletingId(null);
    }
  };


  const familyColumns = useMemo(
    () => [
      {
        header: 'Nom',
        render: (family: Family) => (
          <span className="text-gray-dark font-medium">{family.name}</span>
        ),
      },
    ],
    [],
  );

  const renderFamilyActions = (family: Family) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleEdit(family)}
        className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple text-white hover:opacity-90 hover:shadow-lg"
      >
        Modifier
      </button>
      <button
        onClick={() => handleDelete(family.id)}
        disabled={deletingId === family.id}
        className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple-dark text-white hover:opacity-90 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:opacity-100 flex items-center gap-2"
      >
        {deletingId === family.id && <Loader size="sm" />}
        {deletingId === family.id ? 'Suppression...' : 'Supprimer'}
      </button>
    </div>
  );

  return (
    <div className="w-full animate-fade-in">
      <div className="flex justify-between items-center mb-10 pb-4 border-b-2 border-purple/20 page-header-responsive">
        <h1 className="m-0 text-3xl font-bold text-purple">Gestion des Familles</h1>
        {canEditContent && (
          <button 
            onClick={() => {
              if (!canEditContent) return;
              setShowForm(true);
              setEditingId(null);
              setFormData({ name: '' });
            }}
            className="bg-linear-to-r from-purple to-purple-light text-white border-none px-6 py-3 rounded-lg cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
          >
            + Nouvelle famille
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-linear-to-br from-white to-gray-light/30 p-8 rounded-2xl shadow-xl mb-6 border-2 border-purple/20 animate-slide-in backdrop-blur-sm">
          <h2 className="mt-0 mb-6 text-2xl font-bold bg-linear-to-r from-purple to-purple-light bg-clip-text text-transparent">
            {editingId ? 'Modifier' : 'Créer'} une famille
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block mb-2.5 text-gray-dark font-semibold text-sm uppercase tracking-wide">Nom</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-3.5 border-2 border-gray-light rounded-xl text-base bg-white focus:outline-none focus:border-purple focus:ring-4 focus:ring-purple/20 transition-all duration-300 shadow-sm hover:border-purple/50"
              />
            </div>
            <div className="flex gap-4 mt-8 pt-6 border-t-2 border-gray-light form-buttons-responsive">
              <button 
                type="submit"
                disabled={submitting}
                className="flex-1 px-8 py-3.5 border-none rounded-xl cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg bg-linear-to-r from-purple-light to-purple text-white hover:from-purple hover:to-purple-dark hover:shadow-xl hover:scale-105 active:scale-100 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center justify-center gap-2"
              >
                {submitting && <Loader size="sm" />}
                {submitting ? 'Enregistrement...' : '✓ Enregistrer'}
              </button>
              <button 
                type="button" 
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="flex-1 px-8 py-3.5 border-none rounded-xl cursor-pointer text-base font-semibold transition-all duration-300 shadow-md bg-purple-dark text-white hover:opacity-90 hover:shadow-lg hover:scale-105 active:scale-100"
              >
                ✕ Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-purple/20 animate-fade-in">
        <DataTable
          columns={familyColumns}
          fetchData={fetchFamiliesTable}
          limit={20}
          reloadKey={reloadKey}
          emptyMessage={
            searchTerm
              ? 'Aucune famille ne correspond à votre recherche'
              : 'Créez votre première famille pour commencer'
          }
          renderActions={canEditContent ? renderFamilyActions : undefined}
          searchPlaceholder="🔍 Rechercher par nom..."
          searchTerm={searchTerm}
          onSearch={(term) => setSearchTerm(term)}
        />
      </div>
    </div>
  );
}


