import { useState, useEffect, useCallback, useRef } from 'react';
import { variantsService, familiesService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import Loader from '../components/Loader';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { Variant, Family } from '../utils/types';

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
    variantLevel: 'FIRST' as 'FIRST' | 'SECOND',
  });
  const [familySearch, setFamilySearch] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const LIMIT = 20;

  const loadData = useCallback(async (reset: boolean = false, search?: string) => {
    try {
      if (reset) {
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      
      const currentOffset = reset ? 0 : offsetRef.current;
      const searchValue = search !== undefined ? search : tableSearchTerm.trim() || undefined;
      const response = await variantsService.getAll(undefined, currentOffset, LIMIT, searchValue);
      const data = Array.isArray(response) ? response : (response.data || []);
      const hasMoreData = Array.isArray(response) ? data.length === LIMIT : (response.hasMore !== false && data.length === LIMIT);
      
      if (reset) {
        // Dédupliquer les données
        const variantsMap = new Map<string, Variant>();
        data.forEach((variant: Variant) => {
          if (!variantsMap.has(variant.id)) {
            variantsMap.set(variant.id, variant);
          }
        });
        const newVariants = Array.from(variantsMap.values());
        setLoading(false);
        setVariants(newVariants);
        // Mettre à jour l'offset avec le nombre d'éléments reçus
        offsetRef.current = currentOffset + data.length;
        setHasMore(hasMoreData);
      } else {
        setVariants(prev => {
          const variantsMap = new Map<string, Variant>(prev.map(v => [v.id, v]));
          data.forEach((variant: Variant) => {
            if (!variantsMap.has(variant.id)) {
              variantsMap.set(variant.id, variant);
            }
          });
          return Array.from(variantsMap.values());
        });
        // Mettre à jour l'offset avec le nombre d'éléments reçus
        offsetRef.current = currentOffset + data.length;
        setHasMore(hasMoreData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
      setLoadingMore(false);
    } finally {
      if (!reset) {
        setLoadingMore(false);
      }
    }
  }, [tableSearchTerm]);

  // Charger les données au montage
  useEffect(() => {
    offsetRef.current = 0;
    loadData(true);
    loadFamilies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recharger quand la recherche change
  useEffect(() => {
    offsetRef.current = 0;
    
    const timeoutId = setTimeout(() => {
      loadData(true, tableSearchTerm);
    }, tableSearchTerm ? 300 : 0);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableSearchTerm]);

  const loadFamilies = async () => {
    try {
      const data = await familiesService.getAll(0, 9999);
      const familiesData = Array.isArray(data) ? data : (data.data || []);
      setFamilies(familiesData);
    } catch (error) {
      console.error('Error loading families:', error);
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !tableSearchTerm.trim()) {
      loadData(false);
    }
  }, [loadingMore, hasMore, tableSearchTerm, loadData]);

  const observerTarget = useInfiniteScroll({
    hasMore,
    loading: loadingMore,
    onLoadMore: loadMore,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await variantsService.update(editingId, formData);
      } else {
        await variantsService.create(formData as { familyId: string; name: string; code: string; variantLevel: 'FIRST' | 'SECOND' });
      }
      setFormData({ familyId: '', name: '', code: '', variantLevel: 'FIRST' });
      setFamilySearch('');
      setShowForm(false);
      setEditingId(null);
      loadData(true);
    } catch (error: any) {
      console.error('Error saving variant:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (variant: Variant) => {
    setFormData({ 
      familyId: variant.familyId, 
      name: variant.name, 
      code: variant.code,
      variantLevel: variant.variantLevel,
    });
    setFamilySearch('');
    setEditingId(variant.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette variante ?');
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await variantsService.delete(id);
      loadData(true);
    } catch (error) {
      console.error('Error deleting variant:', error);
      await showAlert('Erreur lors de la suppression', 'error');
    } finally {
      setDeletingId(null);
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

  const variantLevelOptions = [
    { value: 'FIRST' as const, label: 'Variante 1' },
    { value: 'SECOND' as const, label: 'Variante 2' },
  ];

  const getVariantLevelLabel = (level: 'FIRST' | 'SECOND') =>
    level === 'FIRST' ? 'Variante 1' : 'Variante 2';

  return (
    <div className="w-full animate-fade-in">
      <div className="flex justify-between items-center mb-10 pb-4 border-b-2 border-purple/20">
        <h1 className="m-0 text-3xl font-bold text-purple">Gestion des Variantes</h1>
        <button 
          onClick={() => { setShowForm(true); setEditingId(null); setFormData({ familyId: '', name: '', code: '', variantLevel: 'FIRST' }); setFamilySearch(''); }}
          className="bg-gradient-to-r from-purple to-purple-light text-white border-none px-6 py-3 rounded-lg cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
        >
          + Nouvelle variante
        </button>
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-white to-gray-light/30 p-8 rounded-2xl shadow-xl mb-6 border-2 border-purple/20 animate-slide-in backdrop-blur-sm">
          <h2 className="mt-0 mb-6 text-2xl font-bold bg-gradient-to-r from-purple to-purple-light bg-clip-text text-transparent">
            {editingId ? 'Modifier' : 'Créer'} une variante
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block mb-2.5 text-gray-dark font-semibold text-sm uppercase tracking-wide">Famille</label>
              <input
                type="text"
                placeholder="🔍 Rechercher une famille..."
                value={familySearch}
                onChange={(e) => setFamilySearch(e.target.value)}
                className="w-full px-2 py-2 mb-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
              />
              <div className="border border-gray-300 rounded p-2.5 max-h-[200px] overflow-y-auto bg-gray-50">
                {getFilteredFamilies().length === 0 ? (
                  <p className="text-gray-500 italic m-0">
                    {familySearch ? 'Aucune famille ne correspond à votre recherche' : 'Aucune famille disponible'}
                  </p>
                ) : (
                  getFilteredFamilies().map((family) => (
                    <label
                      key={family.id}
                      className="flex items-center px-2 py-2 cursor-pointer rounded mb-1 transition-colors duration-200 hover:bg-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={formData.familyId === family.id}
                        onChange={() => handleFamilyToggle(family.id)}
                        className="mr-1.5 cursor-pointer"
                      />
                      <span>{family.name}</span>
                    </label>
                  ))
                )}
              </div>
              <small className="block mt-1.5 text-gray-500">
                {formData.familyId ? '1 famille sélectionnée' : 'Aucune famille sélectionnée'}
              </small>
            </div>
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
                className="flex-1 px-8 py-3.5 border-none rounded-xl cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg bg-gradient-to-r from-purple-light to-purple text-white hover:from-purple hover:to-purple-dark hover:shadow-xl hover:scale-105 active:scale-100 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center justify-center gap-2"
              >
                {submitting && <Loader size="sm" />}
                {submitting ? 'Enregistrement...' : '✓ Enregistrer'}
              </button>
              <button 
                type="button" 
                onClick={() => { setShowForm(false); setEditingId(null); setFamilySearch(''); }}
                className="flex-1 px-8 py-3.5 border-none rounded-xl cursor-pointer text-base font-semibold transition-all duration-300 shadow-md bg-purple-dark text-white hover:opacity-90 hover:shadow-lg hover:scale-105 active:scale-100"
              >
                ✕ Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-purple/20 animate-fade-in">
        <div className="p-4 bg-gray-light border-b-2 border-purple/20">
          <div className="relative w-full max-w-[400px]">
            <input
              type="text"
              placeholder="🔍 Rechercher par nom, code ou famille..."
              value={tableSearchTerm}
              onChange={(e) => setTableSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border-2 border-purple rounded-lg text-sm bg-white text-gray-dark focus:outline-none focus:border-purple-light focus:ring-2 focus:ring-purple/20 transition-all shadow-sm"
            />
          </div>
        </div>
        <div className="table-responsive">
          <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-purple to-purple-dark text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Nom</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Famille</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex items-center justify-center gap-4 text-lg text-gray-600">
                      <Loader size="md" />
                      <span>Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : variants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center bg-gray-light">
                    <div className="text-6xl block mb-4 opacity-20">📋</div>
                    <h3 className="text-2xl text-gray-dark mb-2 font-semibold">
                      {tableSearchTerm ? 'Aucun résultat' : 'Aucune variante'}
                    </h3>
                    <p className="text-base text-gray-dark/70 m-0">
                      {tableSearchTerm ? 'Aucune variante ne correspond à votre recherche' : 'Créez votre première variante pour commencer'}
                    </p>
                  </td>
                </tr>
              ) : (
                variants.map((variant, index) => (
                  <tr 
                    key={variant.id}
                    className={`transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-light'} hover:bg-gray-hover`}
                  >
                    <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">{variant.name}</td>
                    <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-mono font-semibold">{variant.code}</td>
                    <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark">{getVariantLevelLabel(variant.variantLevel)}</td>
                    <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">{variant.family?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-left border-b border-purple/20">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {hasMore && !tableSearchTerm.trim() && (
          <div ref={observerTarget} className="py-4 flex items-center justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader size="sm" />
                <span>Chargement...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

