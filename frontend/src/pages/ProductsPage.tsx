import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { productsService, familiesService, productTypesService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import Loader from '../components/Loader';
import DataTable from '../components/DataTable';
import SearchableSelectPanel from '../components/SearchableSelectPanel';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { Product, Family, ProductType } from '../utils/types';
import { useAuth } from '../contexts/AuthContext';

export default function ProductsPage() {
  const { showAlert, showConfirm } = useModal();
  const { canEditContent } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', familyId: '', productTypeId: '' });
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
        // Mettre à jour l'offset avec le nombre d'éléments reçus
        offsetRef.current = currentOffset + data.length;
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
        // Mettre à jour l'offset avec le nombre d'éléments reçus
        offsetRef.current = currentOffset + data.length;
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

  useEffect(() => {
    if (!canEditContent) {
      setShowForm(false);
    }
  }, [canEditContent]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    if (!canEditContent) return;
    e.preventDefault();
    setSubmitting(true);
    try {
      await productsService.create(formData);
      setFormData({ name: '', code: '', familyId: '', productTypeId: '' });
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
    if (!canEditContent) return;
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

  const fetchFamilies = useCallback(
    async ({
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
    },
    [],
  );

  const fetchProductTypes = useCallback(
    async ({
    offset,
    limit,
    search,
  }: {
    offset: number;
    limit: number;
    search?: string;
  }) => {
    const response = await productTypesService.getAll(offset, limit, search);
    const data: ProductType[] = Array.isArray(response) ? response : response.data || [];
    return data.map((productType) => ({
      key: productType.id,
      label: `${productType.name} (${productType.code})`,
      value: productType.id,
    }));
    },
    [],
  );

  const productColumns = useMemo(
    () => [
      {
        header: 'Nom',
        render: (product: Product) => (
          <strong className="text-gray-dark">{product.name}</strong>
        ),
      },
      {
        header: 'Code',
        render: (product: Product) => (
          <strong className="text-gray-dark font-mono font-semibold text-lg">
            {product.code}
          </strong>
        ),
      },
      {
        header: 'Type de produit',
        render: (product: Product) => (
          <strong className="text-gray-dark">{product.productType?.name || 'N/A'}</strong>
        ),
      },
      {
        header: 'Famille',
        render: (product: Product) => (
          <strong className="text-gray-dark">{product.family.name}</strong>
        ),
      },
      {
        header: 'Date de création',
        render: (product: Product) =>
          product.createdAt ? (
            new Date(product.createdAt).toLocaleString('fr-FR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          ) : (
            'N/A'
          ),
      },
    ],
    [],
  );

  const renderProductActions = (product: Product) => (
    <button
      onClick={() => handleDelete(product.id)}
      disabled={deletingId === product.id}
      className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple-dark text-white hover:opacity-90 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:opacity-100 flex items-center gap-2"
    >
      {deletingId === product.id && <Loader size="sm" />}
      {deletingId === product.id ? 'Suppression...' : 'Supprimer'}
    </button>
  );

  return (
    <div className="w-full animate-fade-in">
      <div className="flex justify-between items-center mb-10 pb-4 border-b-2 border-purple/20">
        <h1 className="m-0 text-3xl font-bold text-purple">Liste des Produits</h1>
        <div className="flex gap-4">
          {canEditContent && (
          <button
            onClick={() => {
              setShowForm(true);
              setFormData({ name: '', code: '', familyId: '', productTypeId: '' });
            }}
            className="bg-gradient-to-r from-purple to-purple-light text-white border-none px-6 py-3 rounded-lg cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
          >
            + Nouveau produit
          </button>
          )}
        </div>
      </div>

      {canEditContent && showForm && (
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
            <SearchableSelectPanel
              className="mb-5"
              label="Type de produit"
              fetchOptions={fetchProductTypes}
              limit={30}
              selectedKeys={formData.productTypeId ? [formData.productTypeId] : []}
              onToggle={(key) => {
                setFormData({ ...formData, productTypeId: formData.productTypeId === key ? '' : key });
              }}
              placeholder="🔍 Rechercher un type de produit..."
              footer={
                <small className="text-xs text-gray-500">
                  {formData.productTypeId ? '1 type de produit sélectionné' : 'Aucun type de produit sélectionné'}
                </small>
              }
              renderItem={(item) => (
                <label
                  key={item.key}
                  className={`flex items-center px-3 py-2 mb-2 rounded cursor-pointer transition-colors duration-200 ${
                    formData.productTypeId === item.key ? 'bg-purple/10 text-purple' : 'hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    checked={formData.productTypeId === item.key}
                    onChange={() =>
                      setFormData({ ...formData, productTypeId: formData.productTypeId === item.key ? '' : item.key })
                    }
                    className="mr-2 cursor-pointer"
                  />
                  <span className="text-sm text-gray-800">{item.label}</span>
                </label>
              )}
            />
            <SearchableSelectPanel
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
                onClick={() => { setShowForm(false); }}
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
          columns={productColumns}
          data={products}
          loading={loading}
          emptyMessage={
            products.length === 0
              ? tableSearchTerm
                ? 'Aucun produit ne correspond à votre recherche'
                : 'Créez votre premier produit pour commencer'
              : undefined
          }
          renderActions={canEditContent ? renderProductActions : undefined}
          searchPlaceholder="🔍 Rechercher par nom, code, famille ou type..."
          searchTerm={tableSearchTerm}
          onSearch={(term) => setTableSearchTerm(term)}
        />
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


