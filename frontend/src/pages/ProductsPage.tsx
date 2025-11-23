import { useState, useEffect, useCallback, useRef } from 'react';
import { productsService, familiesService, productTypesService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import Loader from '../components/Loader';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface Product {
  id: string;
  name: string;
  code: string;
  family: {
    id: string;
    name: string;
  };
  productType: {
    id: string;
    name: string;
    code: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Family {
  id: string;
  name: string;
}

interface ProductType {
  id: string;
  name: string;
  code: string;
}

export default function ProductsPage() {
  const { showAlert, showConfirm } = useModal();
  const [products, setProducts] = useState<Product[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', familyId: '', productTypeId: '' });
  const [familySearch, setFamilySearch] = useState('');
  const [productTypeSearch, setProductTypeSearch] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const LIMIT = 20;

  const loadProducts = useCallback(async (reset: boolean = false, search?: string) => {
    try {
      if (reset) {
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      
      const currentOffset = reset ? 0 : offsetRef.current;
      const searchValue = search !== undefined ? search : tableSearchTerm.trim() || undefined;
      const response = await productsService.getAll(currentOffset, LIMIT, searchValue);
      const data = Array.isArray(response) ? response : (response.data || []);
      const hasMoreData = Array.isArray(response) ? data.length === LIMIT : (response.hasMore !== false && data.length === LIMIT);
      
      if (reset) {
        // Dédupliquer les données
        const productsMap = new Map<string, Product>();
        data.forEach((product: Product) => {
          if (!productsMap.has(product.id)) {
            productsMap.set(product.id, product);
          }
        });
        const newProducts = Array.from(productsMap.values());
        setLoading(false);
        setProducts(newProducts);
        offsetRef.current = newProducts.length;
        setHasMore(hasMoreData);
      } else {
        setProducts(prev => {
          const productsMap = new Map<string, Product>(prev.map(p => [p.id, p]));
          data.forEach((product: Product) => {
            if (!productsMap.has(product.id)) {
              productsMap.set(product.id, product);
            }
          });
          return Array.from(productsMap.values());
        });
        offsetRef.current = offsetRef.current + data.length;
        setHasMore(hasMoreData);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      await showAlert('Erreur lors du chargement des produits', 'error');
      setLoading(false);
      setLoadingMore(false);
    } finally {
      if (!reset) {
        setLoadingMore(false);
      }
    }
  }, [tableSearchTerm, showAlert]);

  // Charger les données au montage
  useEffect(() => {
    offsetRef.current = 0;
    loadProducts(true);
    loadFamilies();
    loadProductTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recharger quand la recherche change
  useEffect(() => {
    offsetRef.current = 0;
    
    const timeoutId = setTimeout(() => {
      loadProducts(true, tableSearchTerm);
    }, tableSearchTerm ? 300 : 0);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableSearchTerm]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !tableSearchTerm.trim()) {
      loadProducts(false);
    }
  }, [loadingMore, hasMore, tableSearchTerm, loadProducts]);

  const observerTarget = useInfiniteScroll({
    hasMore,
    loading: loadingMore,
    onLoadMore: loadMore,
  });

  const loadFamilies = async () => {
    try {
      const data = await familiesService.getAll();
      setFamilies(data);
    } catch (error) {
      console.error('Error loading families:', error);
    }
  };

  const loadProductTypes = async () => {
    try {
      const data = await productTypesService.getAll();
      setProductTypes(data);
    } catch (error) {
      console.error('Error loading product types:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await productsService.create(formData);
      setFormData({ name: '', code: '', familyId: '', productTypeId: '' });
      setFamilySearch('');
      setProductTypeSearch('');
      setShowForm(false);
      loadProducts(true);
    } catch (error: any) {
      console.error('Error creating product:', error);
      await showAlert(error.response?.data?.message || 'Erreur lors de la création du produit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer ce produit ?');
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await productsService.delete(id);
      loadProducts(true);
    } catch (error) {
      console.error('Error deleting product:', error);
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

  // Filtrer les types de produit selon la recherche
  const getFilteredProductTypes = () => {
    if (!productTypeSearch) return productTypes;
    const searchLower = productTypeSearch.toLowerCase();
    return productTypes.filter((productType) => 
      productType.name.toLowerCase().includes(searchLower) ||
      productType.code.toLowerCase().includes(searchLower)
    );
  };

  // Gérer la sélection d'un type de produit (une seule sélection)
  const handleProductTypeToggle = (productTypeId: string) => {
    setFormData({ ...formData, productTypeId: formData.productTypeId === productTypeId ? '' : productTypeId });
  };

  // Gérer la sélection d'une famille (une seule sélection)
  const handleFamilyToggle = (familyId: string) => {
    setFormData({ ...formData, familyId: formData.familyId === familyId ? '' : familyId }    );
  };


  return (
    <div className="w-full animate-fade-in">
      <div className="flex justify-between items-center mb-10 pb-4 border-b-2 border-purple/20">
        <h1 className="m-0 text-3xl font-bold text-purple">Liste des Produits</h1>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setShowForm(true);
              setFormData({ name: '', code: '', familyId: '', productTypeId: '' });
              setFamilySearch('');
              setProductTypeSearch('');
            }}
            className="bg-gradient-to-r from-purple to-purple-light text-white border-none px-6 py-3 rounded-lg cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
          >
            + Nouveau produit
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-white to-gray-light/30 p-8 rounded-2xl shadow-xl mb-6 border-2 border-purple/20 animate-slide-in backdrop-blur-sm">
          <h2 className="mt-0 mb-6 text-2xl font-bold bg-gradient-to-r from-purple to-purple-light bg-clip-text text-transparent">
            Créer un produit
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
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="Code unique du produit"
                className="w-full px-4 py-3.5 border-2 border-gray-light rounded-xl text-base bg-white focus:outline-none focus:border-purple focus:ring-4 focus:ring-purple/20 transition-all duration-300 shadow-sm hover:border-purple/50 font-mono font-semibold"
              />
            </div>
            <div className="mb-5">
              <label className="block mb-2.5 text-gray-dark font-semibold text-sm uppercase tracking-wide">Type de produit</label>
              <input
                type="text"
                placeholder="🔍 Rechercher un type de produit..."
                value={productTypeSearch}
                onChange={(e) => setProductTypeSearch(e.target.value)}
                className="w-full px-2 py-2 mb-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
              />
              <div className="border border-gray-300 rounded p-2.5 max-h-[200px] overflow-y-auto bg-gray-50">
                {getFilteredProductTypes().length === 0 ? (
                  <p className="text-gray-500 italic m-0">
                    {productTypeSearch ? 'Aucun type de produit ne correspond à votre recherche' : 'Aucun type de produit disponible'}
                  </p>
                ) : (
                  getFilteredProductTypes().map((productType) => (
                    <label
                      key={productType.id}
                      className="flex items-center px-2 py-2 cursor-pointer rounded mb-1 transition-colors duration-200 hover:bg-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={formData.productTypeId === productType.id}
                        onChange={() => handleProductTypeToggle(productType.id)}
                        className="mr-1.5 cursor-pointer"
                      />
                      <span>{productType.name} ({productType.code})</span>
                    </label>
                  ))
                )}
              </div>
              <small className="block mt-1.5 text-gray-500">
                {formData.productTypeId ? '1 type de produit sélectionné' : 'Aucun type de produit sélectionné'}
              </small>
            </div>
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
                onClick={() => { setShowForm(false); setFamilySearch(''); setProductTypeSearch(''); }}
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
              placeholder="🔍 Rechercher par nom, code, famille ou type..."
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
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Type de produit</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Famille</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Date de création</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex items-center justify-center gap-4 text-lg text-gray-600">
                      <Loader size="md" />
                      <span>Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center bg-gray-light">
                    <div className="text-6xl block mb-4 opacity-20">📋</div>
                    <h3 className="text-2xl text-gray-dark mb-2 font-semibold">
                      {tableSearchTerm ? 'Aucun résultat' : 'Aucun produit'}
                    </h3>
                    <p className="text-base text-gray-dark/70 m-0">
                      {tableSearchTerm ? 'Aucun produit ne correspond à votre recherche' : 'Créez votre premier produit pour commencer'}
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((product, index) => (
                <tr 
                  key={product.id}
                  className={`transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-light'} hover:bg-gray-hover`}
                >
                  <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">
                    <strong>{product.name}</strong>
                  </td>
                  <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-mono font-semibold text-lg">
                    <strong>{product.code}</strong>
                  </td>
                  <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">
                    <strong>{product.productType?.name || 'N/A'}</strong>
                    {product.productType && (
                      <span className="text-gray-500 text-sm ml-2">
                        ({product.productType.code})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">
                    <strong>{product.family.name}</strong>
                  </td>
                  <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark">
                    {new Date(product.createdAt).toLocaleString('fr-FR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-4 text-left border-b border-purple/20">
                    <button 
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple-dark text-white hover:opacity-90 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:opacity-100 flex items-center gap-2"
                    >
                      {deletingId === product.id && <Loader size="sm" />}
                      {deletingId === product.id ? 'Suppression...' : 'Supprimer'}
                    </button>
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


