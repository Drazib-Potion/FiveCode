import { useState, useEffect, useCallback, useRef } from 'react';
import { familiesService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import Loader from '../components/Loader';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

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
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const LIMIT = 20;


  const loadFamilies = useCallback(async (reset: boolean = false, search?: string) => {
    try {
      if (reset) {
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      
      // Pour un reset, toujours utiliser 0. Pour le scroll, utiliser l'offset actuel depuis le ref
      const currentOffset = reset ? 0 : offsetRef.current;
      const searchValue = search !== undefined ? search : searchTerm.trim() || undefined;
      const response = await familiesService.getAll(currentOffset, LIMIT, searchValue);
      const data = Array.isArray(response) ? response : (response.data || []);
      const hasMoreData = Array.isArray(response) ? data.length === LIMIT : (response.hasMore !== false && data.length === LIMIT);
      
      if (reset) {
        // Dédupliquer les données au cas où l'API renverrait des doublons
        const familiesMap = new Map<string, Family>();
        data.forEach((family: Family) => {
          if (!familiesMap.has(family.id)) {
            familiesMap.set(family.id, family);
          }
        });
        const newFamilies = Array.from(familiesMap.values());
        // Mettre à jour loading en premier pour éviter les problèmes de rendu
        setLoading(false);
        setFamilies(newFamilies);
        // Mettre à jour l'offset avec le nombre d'éléments reçus
        offsetRef.current = currentOffset + data.length;
        setHasMore(hasMoreData);
      } else {
        setFamilies(prev => {
          // Éviter les doublons en utilisant un Map avec l'id comme clé
          const familiesMap = new Map<string, Family>(prev.map(f => [f.id, f]));
          // Ajouter seulement les nouvelles familles qui n'existent pas déjà
          data.forEach((family: Family) => {
            if (!familiesMap.has(family.id)) {
              familiesMap.set(family.id, family);
            }
          });
          return Array.from(familiesMap.values());
        });
        // Mettre à jour l'offset avec le nombre d'éléments reçus
        offsetRef.current = currentOffset + data.length;
        setHasMore(hasMoreData);
      }
    } catch (error) {
      console.error('Error loading families:', error);
      setLoading(false);
      setLoadingMore(false);
    } finally {
      // Ne pas mettre à jour loading ici si on l'a déjà fait dans le if (reset)
      if (!reset) {
        setLoadingMore(false);
      }
    }
  }, [searchTerm]);

  // Charger les données au montage (une seule fois)
  useEffect(() => {
    offsetRef.current = 0;
    loadFamilies(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recharger quand la recherche change
  useEffect(() => {
    // Réinitialiser l'offset quand la recherche change
    offsetRef.current = 0;
    
    const timeoutId = setTimeout(() => {
      loadFamilies(true, searchTerm);
    }, searchTerm ? 300 : 0); // Debounce de 300ms seulement si on recherche

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !searchTerm.trim()) {
      loadFamilies(false);
    }
  }, [loadingMore, hasMore, searchTerm, loadFamilies]);

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
        await familiesService.update(editingId, formData);
      } else {
        await familiesService.create(formData);
      }
      setFormData({ name: '' });
      setShowForm(false);
      setEditingId(null);
      loadFamilies(true);
    } catch (error: any) {
      console.error('Error saving family:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (family: Family) => {
    setFormData({ name: family.name });
    setEditingId(family.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette famille ?');
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await familiesService.delete(id);
      loadFamilies(true);
    } catch (error) {
      console.error('Error deleting family:', error);
      await showAlert('Erreur lors de la suppression', 'error');
    } finally {
      setDeletingId(null);
    }
  };


  return (
    <div className="w-full animate-fade-in">
      <div className="flex justify-between items-center mb-10 pb-4 border-b-2 border-purple/20 page-header-responsive">
        <h1 className="m-0 text-3xl font-bold text-purple">Gestion des Familles</h1>
        <button 
          onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '' }); }}
          className="bg-gradient-to-r from-purple to-purple-light text-white border-none px-6 py-3 rounded-lg cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
        >
          + Nouvelle famille
        </button>
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-white to-gray-light/30 p-8 rounded-2xl shadow-xl mb-6 border-2 border-purple/20 animate-slide-in backdrop-blur-sm">
          <h2 className="mt-0 mb-6 text-2xl font-bold bg-gradient-to-r from-purple to-purple-light bg-clip-text text-transparent">
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
                className="flex-1 px-8 py-3.5 border-none rounded-xl cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg bg-gradient-to-r from-purple-light to-purple text-white hover:from-purple hover:to-purple-dark hover:shadow-xl hover:scale-105 active:scale-100 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center justify-center gap-2"
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
        <div className="p-4 bg-gray-light border-b-2 border-purple/20">
          <div className="relative w-full max-w-[400px]">
            <input
              type="text"
              placeholder="🔍 Rechercher par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border-2 border-purple rounded-lg text-sm bg-white text-gray-dark focus:outline-none focus:border-purple-light focus:ring-2 focus:ring-purple/20 transition-all shadow-sm"
            />
          </div>
        </div>
        <div className="table-responsive">
          <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-purple to-purple-dark text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Nom</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-6 py-16 text-center">
                    <div className="flex items-center justify-center gap-4 text-lg text-gray-600">
                      <Loader size="md" />
                      <span>Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : families.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-16 text-center bg-gray-light">
                    <div className="text-6xl block mb-4 opacity-20">📋</div>
                    <h3 className="text-2xl text-gray-dark mb-2 font-semibold">
                      {searchTerm ? 'Aucun résultat' : 'Aucune famille'}
                    </h3>
                    <p className="text-base text-gray-dark/70 m-0">
                      {searchTerm ? 'Aucune famille ne correspond à votre recherche' : 'Créez votre première famille pour commencer'}
                    </p>
                  </td>
                </tr>
              ) : (
                families.map((family, index) => (
                  <tr 
                    key={family.id}
                    className={`transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-light'} hover:bg-gray-hover`}
                  >
                    <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">{family.name}</td>
                    <td className="px-6 py-4 text-left border-b border-purple/20">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {hasMore && !searchTerm.trim() && (
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


