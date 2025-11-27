import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { variantsService, familiesService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import Loader from '../components/Loader';
import DataTable from '../components/DataTable';
import SearchableSelectPanel from '../components/SearchableSelectPanel';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { Variant, Family } from '../utils/types';
import { useAuth } from '../contexts/AuthContext';

export default function VariantsPage() {
  const { showAlert, showConfirm } = useModal();
  const { canEditContent } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    familyId: '', 
    name: '', 
    code: '',
    variantLevel: 'FIRST' as 'FIRST' | 'SECOND',
  });
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const fetchVariantsTable = useCallback(
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
        const response = await variantsService.getAll(undefined, offset, limit, search);
        const data: Variant[] = Array.isArray(response) ? response : response.data || [];
        return {
          data,
          hasMore:
            typeof response.hasMore === 'boolean'
              ? response.hasMore
              : data.length === limit,
        };
      } catch (error) {
        console.error('Error loading data:', error);
        await showAlert('Erreur lors du chargement des variantes', 'error');
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

  const fetchFamilies = useCallback(async ({
    offset,
    limit,
    search,
  }: {
    offset: number;
    limit: number;
    search?: string;
  }) => {
    const response = await familiesService.getAll(offset, limit, search);
    const data: Family[] = Array.isArray(response) ? response : response.data || [];
    return data.map((family) => ({
      key: family.id,
      label: family.name,
      value: family.id,
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    if (!canEditContent) return;
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await variantsService.update(editingId, formData);
      } else {
        await variantsService.create(formData as { familyId: string; name: string; code: string; variantLevel: 'FIRST' | 'SECOND' });
      }
      setFormData({ familyId: '', name: '', code: '', variantLevel: 'FIRST' });
      setShowForm(false);
      setEditingId(null);
      setReloadKey((prev) => prev + 1);
    } catch (error: any) {
      console.error('Error saving variant:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (variant: Variant) => {
    if (!canEditContent) return;
      setFormData({ 
        familyId: variant.familyId, 
        name: variant.name, 
        code: variant.code,
        variantLevel: variant.variantLevel,
      });
      setEditingId(variant.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!canEditContent) return;
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette variante ?');
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await variantsService.delete(id);
      setReloadKey((prev) => prev + 1);
    } catch (error) {
      console.error('Error deleting variant:', error);
      await showAlert('Erreur lors de la suppression', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const variantLevelOptions = [
    { value: 'FIRST' as const, label: 'Variante 1' },
    { value: 'SECOND' as const, label: 'Variante 2' },
  ];

  const variantColumns = useMemo(
    () => [
      {
        header: 'Nom',
        render: (variant: Variant) => (
          <span className="text-gray-dark font-medium">{variant.name}</span>
        ),
      },
      {
        header: 'Code',
        render: (variant: Variant) => (
          <span className="text-gray-dark font-mono font-semibold">{variant.code}</span>
        ),
      },
      {
        header: 'Type',
        render: (variant: Variant) => (
          <span className="text-gray-dark font-medium">
            {variant.variantLevel === 'FIRST' ? 'Variante 1' : 'Variante 2'}
          </span>
        ),
      },
      {
        header: 'Famille',
        render: (variant: Variant) => (
          <span className="text-gray-dark font-medium">
            {variant.family?.name || 'N/A'}
          </span>
        ),
      },
    ],
    [],
  );

  const renderVariantActions = (variant: Variant) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleEdit(variant)}
        className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple text-white hover:opacity-90 hover:shadow-lg"
      >
        Modifier
      </button>
      <button
        onClick={() => handleDelete(variant.id)}
        disabled={deletingId === variant.id}
        className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple-dark text-white hover:opacity-90 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:opacity-100 flex items-center gap-2"
      >
        {deletingId === variant.id && <Loader size="sm" />}
        {deletingId === variant.id ? 'Suppression...' : 'Supprimer'}
      </button>
    </div>
  );

  return (
    <div className="w-full animate-fade-in">
      <div className="flex justify-between items-center mb-10 pb-4 border-b-2 border-purple/20">
        <h1 className="m-0 text-3xl font-bold text-purple">Gestion des Variantes</h1>
        {canEditContent && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setFormData({ familyId: '', name: '', code: '', variantLevel: 'FIRST' }); }}
            className="bg-linear-to-r from-purple to-purple-light text-white border-none px-6 py-3 rounded-lg cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
          >
          + Nouvelle variante
        </button>
        )}
      </div>

      {canEditContent && showForm && (
        <div className="bg-linear-to-br from-white to-gray-light/30 p-8 rounded-2xl shadow-xl mb-6 border-2 border-purple/20 animate-slide-in backdrop-blur-sm">
          <h2 className="mt-0 mb-6 text-2xl font-bold bg-linear-to-r from-purple to-purple-light bg-clip-text text-transparent">
            {editingId ? 'Modifier' : 'Créer'} une variante
          </h2>
          <form onSubmit={handleSubmit}>
            <SearchableSelectPanel
              className="mb-5"
              label="Famille"
              fetchOptions={fetchFamilies}
              limit={30}
              selectedKeys={formData.familyId ? [formData.familyId] : []}
              onToggle={(key) => {
                setFormData({ ...formData, familyId: formData.familyId === key ? '' : key });
              }}
              placeholder="🔍 Rechercher une famille..."
              footer={
                <small className="text-xs text-gray-500">
                  {formData.familyId ? '1 famille sélectionnée' : 'Aucune famille sélectionnée'}
                </small>
              }
              renderItem={(item) => (
                <label
                  key={item.key}
                  className={`flex items-center px-3 py-2 mb-2 rounded cursor-pointer transition-colors duration-200 ${
                    formData.familyId === item.key ? 'bg-purple/10 text-purple' : 'hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    checked={formData.familyId === item.key}
                    onChange={() =>
                      setFormData({ ...formData, familyId: formData.familyId === item.key ? '' : item.key })
                    }
                    className="mr-2 cursor-pointer"
                  />
                  <span className="text-sm text-gray-800">{item.label}</span>
                </label>
              )}
            />
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
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="Ex: 1"
                className="w-full px-4 py-3.5 border-2 border-gray-light rounded-xl text-base bg-white focus:outline-none focus:border-purple focus:ring-4 focus:ring-purple/20 transition-all duration-300 shadow-sm hover:border-purple/50 font-mono font-semibold"
              />
            </div>
            <div className="mb-5">
              <label className="block mb-2.5 text-gray-dark font-semibold text-sm uppercase tracking-wide">Type de variante</label>
              <div className="flex gap-4">
                {variantLevelOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center cursor-pointer px-3 py-2 border border-gray-300 rounded-lg transition-colors duration-200 hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="variant-level"
                      value={option.value}
                      checked={formData.variantLevel === option.value}
                      onChange={() => setFormData({ ...formData, variantLevel: option.value })}
                      className="mr-2 cursor-pointer"
                    />
                    <span className="select-none">{option.label}</span>
                  </label>
                ))}
              </div>
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
          columns={variantColumns}
          fetchData={fetchVariantsTable}
          limit={20}
          reloadKey={reloadKey}
          emptyMessage={
            tableSearchTerm
              ? 'Aucune variante ne correspond à votre recherche'
              : 'Créez votre première variante pour commencer'
          }
          renderActions={canEditContent ? renderVariantActions : undefined}
          searchPlaceholder="🔍 Rechercher par nom, code ou famille..."
          searchTerm={tableSearchTerm}
          onSearch={(term) => setTableSearchTerm(term)}
        />
      </div>
    </div>
  );
}

