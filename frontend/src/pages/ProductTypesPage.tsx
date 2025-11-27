import { useState, useEffect, useCallback, useMemo } from 'react';
import { productTypesService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import Loader from '../components/Loader';
import DataTable from '../components/DataTable';
import { ProductType } from '../utils/types';
import { useAuth } from '../contexts/AuthContext';

export default function ProductTypesPage() {
  const { showAlert, showConfirm } = useModal();
  const { canEditContent } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!canEditContent) {
      setShowForm(false);
      setEditingId(null);
    }
  }, [canEditContent]);

  const fetchProductTypesTable = useCallback(
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
        const response = await productTypesService.getAll(offset, limit, search);
        const data: ProductType[] = Array.isArray(response) ? response : response.data || [];
        return {
          data,
          hasMore:
            typeof response.hasMore === 'boolean'
              ? response.hasMore
              : data.length === limit,
        };
      } catch (error) {
        console.error('Error loading data:', error);
        await showAlert('Erreur lors du chargement des types de produit', 'error');
        return [];
      }
    },
    [showAlert],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await productTypesService.update(editingId, formData);
      } else {
        await productTypesService.create(formData);
      }
      setFormData({ name: '', code: '' });
      setShowForm(false);
      setEditingId(null);
      setReloadKey((prev) => prev + 1);
    } catch (error: any) {
      console.error('Error saving product type:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (productType: ProductType) => {
    if (!canEditContent) return;
    setFormData({
      name: productType.name,
      code: productType.code,
    });
    setEditingId(productType.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!canEditContent) return;
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer ce type de produit ?');
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await productTypesService.delete(id);
      setReloadKey((prev) => prev + 1);
    } catch (error: any) {
      console.error('Error deleting product type:', error);
      const message = error.response?.data?.message || 'Erreur lors de la suppression';
      await showAlert(message, 'error');
    } finally {
      setDeletingId(null);
    }
  };


  const productTypeColumns = useMemo(
    () => [
      {
        header: 'Nom',
        render: (productType: ProductType) => (
          <span className="text-gray-dark font-medium">{productType.name}</span>
        ),
      },
      {
        header: 'Code',
        render: (productType: ProductType) => (
          <span className="text-gray-dark font-mono font-semibold">{productType.code}</span>
        ),
      },
    ],
    [],
  );

  const renderProductTypeActions = (productType: ProductType) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleEdit(productType)}
        className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple text-white hover:opacity-90 hover:shadow-lg"
      >
        Modifier
      </button>
      <button
        onClick={() => handleDelete(productType.id)}
        disabled={deletingId === productType.id}
        className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple-dark text-white hover:opacity-90 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:opacity-100 flex items-center gap-2"
      >
        {deletingId === productType.id && <Loader size="sm" />}
        {deletingId === productType.id ? 'Suppression...' : 'Supprimer'}
      </button>
    </div>
  );

  return (
    <div className="w-full animate-fade-in">
      <div className="flex justify-between items-center mb-10 pb-4 border-b-2 border-purple/20">
        <h1 className="m-0 text-3xl font-bold text-purple">Gestion des Types de produit</h1>
        {canEditContent && (
        <button 
          onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', code: '' }); }}
          className="bg-linear-to-r from-purple to-purple-light text-white border-none px-6 py-3 rounded-lg cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
        >
          + Nouveau type de produit
        </button>
        )}
      </div>

      {showForm && (
        <div className="bg-linear-to-br from-white to-gray-light/30 p-8 rounded-2xl shadow-xl mb-6 border-2 border-purple/20 animate-slide-in backdrop-blur-sm">
          <h2 className="mt-0 mb-6 text-2xl font-bold bg-linear-to-r from-purple to-purple-light bg-clip-text text-transparent">
            {editingId ? 'Modifier' : 'Créer'} un type de produit
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
            <div className="mb-5">
              <label className="block mb-2.5 text-gray-dark font-semibold text-sm uppercase tracking-wide">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
                maxLength={10}
                placeholder="Ex: A, B, C..."
                className="w-full px-4 py-3.5 border-2 border-gray-light rounded-xl text-base bg-white focus:outline-none focus:border-purple focus:ring-4 focus:ring-purple/20 transition-all duration-300 shadow-sm hover:border-purple/50 font-mono font-semibold"
              />
            </div>
            <div className="flex gap-4 mt-8 pt-6 border-t-2 border-gray-light">
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
          columns={productTypeColumns}
          fetchData={fetchProductTypesTable}
          limit={20}
          reloadKey={reloadKey}
          emptyMessage={
            searchTerm
              ? 'Aucun type de produit ne correspond à votre recherche'
              : 'Créez votre premier type de produit pour commencer'
          }
          renderActions={canEditContent ? renderProductTypeActions : undefined}
          searchPlaceholder="🔍 Rechercher par nom ou code..."
          searchTerm={searchTerm}
          onSearch={(term) => setSearchTerm(term)}
        />
      </div>
    </div>
  );
}


