import { useState, useEffect, useCallback, useRef } from 'react';
import { productTypesService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import Loader from '../components/Loader';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { ProductType } from '../utils/types';

export default function ProductTypesPage() {
  const { showAlert, showConfirm } = useModal();
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const LIMIT = 20;

  useEffect(() => {
    offsetRef.current = 0;
    loadData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {    
    const timeoutId = setTimeout(() => {
      loadData(true, searchTerm);
    }, searchTerm ? 300 : 0);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const loadData = useCallback(async (reset: boolean = false, search?: string) => {
    try {
      if (reset) {
        offsetRef.current = 0;
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      
      const currentOffset = offsetRef.current;
      const searchValue = search !== undefined ? search : searchTerm.trim() || undefined;
      const response = await productTypesService.getAll(currentOffset, LIMIT, searchValue);
      const data = response.data;
      
      // if (reset) {
      //   setProductTypes(data);
      //   setLoading(false);
      // } else {
      //   setProductTypes(prev => [...prev, ...data]);
      // }
      // offsetRef.current = currentOffset + data.length;
      // setHasMore(response.hasMore);

      // Si doublon :
      if (reset) {
        // Dédupliquer les données au cas où l'API renverrait des doublons
        const productTypesMap = new Map<string, ProductType>();
        data.forEach((productType: ProductType) => {
          if (!productTypesMap.has(productType.id)) {
            productTypesMap.set(productType.id, productType);
          }
        });
        const newProductTypes = Array.from(productTypesMap.values());
        setLoading(false);
        setProductTypes(newProductTypes);
        // Mettre à jour l'offset avec le nombre d'éléments reçus
        offsetRef.current = currentOffset + data.length;
        setHasMore(response.hasMore);
      } else {
        setProductTypes(prev => {
          const productTypesMap = new Map<string, ProductType>(prev.map(pt => [pt.id, pt]));
          data.forEach((productType: ProductType) => {
            if (!productTypesMap.has(productType.id)) {
              productTypesMap.set(productType.id, productType);
            }
          });
          return Array.from(productTypesMap.values());
        });
        // Mettre à jour l'offset avec le nombre d'éléments reçus
        offsetRef.current = currentOffset + data.length;
        setHasMore(response.hasMore);
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
  }, [searchTerm]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !searchTerm.trim()) {
      loadData(false);
    }
  }, [loadingMore, hasMore, searchTerm, loadData]);

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
        await productTypesService.update(editingId, formData);
      } else {
        await productTypesService.create(formData);
      }
      setFormData({ name: '', code: '' });
      setShowForm(false);
      setEditingId(null);
      loadData(true);
    } catch (error: any) {
      console.error('Error saving product type:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (productType: ProductType) => {
    setFormData({
      name: productType.name,
      code: productType.code,
    });
    setEditingId(productType.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer ce type de produit ?');
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await productTypesService.delete(id);
      loadData(true);
    } catch (error: any) {
      console.error('Error deleting product type:', error);
      const message = error.response?.data?.message || 'Erreur lors de la suppression';
      await showAlert(message, 'error');
    } finally {
      setDeletingId(null);
    }
  };


  return (
    <div className="w-full animate-fade-in">
      <div className="flex justify-between items-center mb-10 pb-4 border-b-2 border-purple/20">
        <h1 className="m-0 text-3xl font-bold text-purple">Gestion des Types de produit</h1>
        <button 
          onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', code: '' }); }}
          className="bg-gradient-to-r from-purple to-purple-light text-white border-none px-6 py-3 rounded-lg cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
        >
          + Nouveau type de produit
        </button>
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-white to-gray-light/30 p-8 rounded-2xl shadow-xl mb-6 border-2 border-purple/20 animate-slide-in backdrop-blur-sm">
          <h2 className="mt-0 mb-6 text-2xl font-bold bg-gradient-to-r from-purple to-purple-light bg-clip-text text-transparent">
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
              placeholder="🔍 Rechercher par nom ou code..."
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
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-16 text-center">
                    <div className="flex items-center justify-center gap-4 text-lg text-gray-600">
                      <Loader size="md" />
                      <span>Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : productTypes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-16 text-center bg-gray-light">
                    <div className="text-6xl block mb-4 opacity-20">📋</div>
                    <h3 className="text-2xl text-gray-dark mb-2 font-semibold">
                      {searchTerm ? 'Aucun résultat' : 'Aucun type de produit'}
                    </h3>
                    <p className="text-base text-gray-dark/70 m-0">
                      {searchTerm ? 'Aucun type de produit ne correspond à votre recherche' : 'Créez votre premier type de produit pour commencer'}
                    </p>
                  </td>
                </tr>
              ) : (
                productTypes.map((productType, index) => (
                <tr 
                  key={productType.id}
                  className={`transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-light'} hover:bg-gray-hover`}
                >
                  <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">{productType.name}</td>
                  <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-mono font-semibold">{productType.code}</td>
                  <td className="px-6 py-4 text-left border-b border-purple/20">
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


