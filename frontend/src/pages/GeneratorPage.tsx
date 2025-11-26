import { useState, useEffect } from 'react';
import {
  productsService,
  productGeneratedInfoService,
  variantsService,
  technicalCharacteristicsService,
} from '../services/api';
import { useModal } from '../contexts/ModalContext';
import { formatFieldType } from '../utils/fieldTypeFormatter';
import Loader from '../components/Loader';
import { Product, Variant, TechnicalCharacteristic } from '../utils/types';

type VariantSelectionState = {
  variant1Id: string;
  variant2Id: string;
  sansVariantFirst: boolean;
  sansVariantSecond: boolean;
};

const SANS_VARIANT_LABEL = 'Sans Variante (code 0)';

const createInitialVariantSelection = (): VariantSelectionState => ({
  variant1Id: '',
  variant2Id: '',
  sansVariantFirst: false,
  sansVariantSecond: false,
});

const getEffectiveVariantId = (selection: VariantSelectionState, level: 'FIRST' | 'SECOND') => {
  const variantId = level === 'FIRST' ? selection.variant1Id : selection.variant2Id;
  const sansVariant = level === 'FIRST' ? selection.sansVariantFirst : selection.sansVariantSecond;
  if (sansVariant || !variantId) {
    return undefined;
  }
  return variantId;
};

export default function GeneratorPage() {
  const { showAlert } = useModal();
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [technicalCharacteristics, setTechnicalCharacteristics] = useState<TechnicalCharacteristic[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variantSelection, setVariantSelection] = useState<VariantSelectionState>(() =>
    createInitialVariantSelection(),
  );
  const MAX_TECH_VALUE_LENGTH = 30;
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [variant1Search, setVariant1Search] = useState('');
  const [variant2Search, setVariant2Search] = useState('');
  const [enumSearch, setEnumSearch] = useState<Record<string, string>>({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [valueErrors, setValueErrors] = useState<Record<string, string>>({});

  const isSansVariantSelected = (level: 'FIRST' | 'SECOND') =>
    level === 'FIRST'
      ? variantSelection.sansVariantFirst
      : variantSelection.sansVariantSecond;

  const handleSansVariantToggle = (level: 'FIRST' | 'SECOND') => {
    setVariantSelection((prev) => {
      const isFirst = level === 'FIRST';
      const flagKey = isFirst ? 'sansVariantFirst' : 'sansVariantSecond';
      const variantKey = isFirst ? 'variant1Id' : 'variant2Id';
      const willBeChecked = !prev[flagKey];

      return {
        ...prev,
        [flagKey]: willBeChecked,
        [variantKey]: willBeChecked ? '' : prev[variantKey],
      };
    });
  };

  // Charger les produits au montage
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recharger les produits quand la recherche change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProducts(productSearch);
    }, productSearch ? 300 : 0);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSearch]);

  useEffect(() => {
    if (selectedProductId) {
      const product = products.find((p) => p.id === selectedProductId);
      setSelectedProduct(product || null);
      if (product) {
        loadVariants(product.family.id);
        // Réinitialiser les sélections
        setVariantSelection(createInitialVariantSelection());
        setValues({});
        setValueErrors({});
        setVariant1Search('');
        setVariant2Search('');
      }
    } else {
      setSelectedProduct(null);
      setVariants([]);
      setVariantSelection(createInitialVariantSelection());
      setTechnicalCharacteristics([]);
      setValues({});
      setValueErrors({});
      setVariant1Search('');
      setVariant2Search('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId, products]);

  useEffect(() => {
    if (selectedProduct) {
      // Charger les caractéristiques techniques dès qu'un produit est sélectionné
      // Si une variante est sélectionnée, on charge les caractéristiques pour cette variante
      // Sinon, on charge les caractéristiques qui ne sont pas liées à une variante (tableau vide)
      const variantIds = [
        getEffectiveVariantId(variantSelection, 'FIRST'),
        getEffectiveVariantId(variantSelection, 'SECOND'),
      ].filter((id) => !!id) as string[];
      loadTechnicalCharacteristics(selectedProduct.family.id, variantIds);
    } else {
      setTechnicalCharacteristics([]);
      setValues({});
    }
  }, [selectedProduct, variantSelection]);

  const loadProducts = async (search?: string) => {
    try {
      setProductsLoading(true);
      const searchValue = search !== undefined ? search : productSearch.trim() || undefined;
      // Charger tous les produits sans limite
      let allProducts: Product[] = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const response = await productsService.getAll(offset, limit, searchValue);
        const data = Array.isArray(response) ? response : (response.data || []);
        allProducts = [...allProducts, ...data];
        hasMore = Array.isArray(response) ? data.length === limit : (response.hasMore !== false && data.length === limit);
        offset += data.length;
      }

      setProducts(allProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const loadVariants = async (familyId: string) => {
    try {
      setVariantsLoading(true);
      // Charger toutes les variantes sans limite
      let allVariants: Variant[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const response = await variantsService.getAll(familyId, offset, limit);
        const data = Array.isArray(response) ? response : (response.data || []);
        allVariants = [...allVariants, ...data];
        hasMore = Array.isArray(response) ? data.length === limit : (response.hasMore !== false && data.length === limit);
        offset += data.length;
      }

      setVariants(allVariants);
    } catch (error) {
      console.error('Error loading variants:', error);
    } finally {
      setVariantsLoading(false);
    }
  };

  const loadTechnicalCharacteristics = async (familyId: string, variantIds: string[]) => {
    try {
      // Utiliser findByFamilyAndVariant avec le tableau de variantIds
      const variantIdsParam = variantIds.length > 0 ? variantIds.join(',') : '';
      const response = await technicalCharacteristicsService.getAll(familyId, variantIdsParam, 0, 1000); // Charger un grand nombre

      // Extraire les données de la réponse paginée
      const data = Array.isArray(response) ? response : (response.data || []);

      // Dédupliquer par ID
      const uniqueTechnicalCharacteristics: TechnicalCharacteristic[] = Array.from(
        new Map(data.map((technicalCharacteristic: any) => [technicalCharacteristic.id, technicalCharacteristic])).values(),
      ) as TechnicalCharacteristic[];

      setTechnicalCharacteristics(uniqueTechnicalCharacteristics);
    } catch (error) {
      console.error('Error loading technical characteristics:', error);
    }
  };

  const handleValueChange = (technicalCharacteristicId: string, value: any) => {
    setValues({ ...values, [technicalCharacteristicId]: value });
  };

  const setCharacteristicError = (technicalCharacteristicId: string | null, message?: string) => {
    if (!technicalCharacteristicId) return;
    setValueErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[technicalCharacteristicId] = message;
      } else {
        delete next[technicalCharacteristicId];
      }
      return next;
    });
  };

  const handleValueChangeWithLimit = (
    technicalCharacteristicId: string,
    value: any,
    rawValue?: string,
  ) => {
    if (rawValue && rawValue.length > MAX_TECH_VALUE_LENGTH) {
      setCharacteristicError(
        technicalCharacteristicId,
        `Limité à ${MAX_TECH_VALUE_LENGTH} caractères.`,
      );
      return;
    }
    setCharacteristicError(technicalCharacteristicId);
    handleValueChange(technicalCharacteristicId, value);
  };

  const getMatchingVariants = (level: 'FIRST' | 'SECOND', searchTerm: string) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return variants
      .filter((variant) => variant.variantLevel === level)
      .filter((variant) => {
        if (!normalizedSearch) return true;
        return (
          variant.name.toLowerCase().includes(normalizedSearch) ||
          variant.code.toLowerCase().includes(normalizedSearch)
        );
      });
  };

  const variant1Matches = getMatchingVariants('FIRST', variant1Search);
  const variant2Matches = getMatchingVariants('SECOND', variant2Search);

  const variant1Options = selectedProduct ? variant1Matches : [];
  const variant2Options = selectedProduct ? variant2Matches : [];

  const hasSelectedRealVariant = Boolean(
    getEffectiveVariantId(variantSelection, 'FIRST') ||
    getEffectiveVariantId(variantSelection, 'SECOND'),
  );

  const handleVariant1Toggle = (variantId: string) => {
    setVariantSelection((prev) => ({
      ...prev,
      variant1Id: prev.variant1Id === variantId ? '' : variantId,
      sansVariantFirst: false,
    }));
  };

  const handleVariant2Toggle = (variantId: string) => {
    setVariantSelection((prev) => ({
      ...prev,
      variant2Id: prev.variant2Id === variantId ? '' : variantId,
      sansVariantSecond: false,
    }));
  };

  const handleResetForm = () => {
    setVariantSelection(createInitialVariantSelection());
    setValues({});
    setValueErrors({});
    setVariant1Search('');
    setVariant2Search('');
    setEnumSearch({});
  };

  const handleGenerate = async () => {
    if (!selectedProductId) {
      await showAlert('Veuillez sélectionner un produit', 'warning');
      return;
    }

    const variant1HasSelection = variantSelection.variant1Id || variantSelection.sansVariantFirst;
    const variant2HasSelection = variantSelection.variant2Id || variantSelection.sansVariantSecond;

    if (!variant1HasSelection) {
      await showAlert(
        `Veuillez sélectionner une variante 1 ou cocher "${SANS_VARIANT_LABEL}"`,
        'warning',
      );
      return;
    }

    if (!variant2HasSelection) {
      await showAlert(
        `Veuillez sélectionner une variante 2 ou cocher "${SANS_VARIANT_LABEL}"`,
        'warning',
      );
      return;
    }

    if (Object.keys(valueErrors).length > 0) {
      await showAlert('Corrigez les champs qui dépassent 30 caractères avant de générer.', 'warning');
      return;
    }

    const variant1RequestId = getEffectiveVariantId(variantSelection, 'FIRST');
    const variant2RequestId = getEffectiveVariantId(variantSelection, 'SECOND');

    // Convertir les valeurs enum (tableaux pour multiple, string pour unique) en JSON strings
    const processedValues: Record<string, any> = {};
    if (technicalCharacteristics.length > 0 && Object.keys(values).length > 0) {
      for (const [key, value] of Object.entries(values)) {
        const technicalCharacteristic = technicalCharacteristics.find(tc => tc.id === key);
        if (technicalCharacteristic?.type === 'enum') {
          const isMultiple = technicalCharacteristic.enumMultiple ?? false;
          if (Array.isArray(value)) {
            if (isMultiple) {
              // Pour les enums multiples, convertir le tableau en JSON string
              processedValues[key] = JSON.stringify(value);
            } else {
              // Pour les enums uniques, prendre le premier élément du tableau comme string
              processedValues[key] = value.length > 0 ? value[0] : '';
            }
          } else {
            // Fallback pour compatibilité
            processedValues[key] = value;
          }
        } else {
          processedValues[key] = value;
        }
      }
    }

    const valuesToSend = Object.keys(processedValues).length > 0 ? processedValues : undefined;

    try {
      setLoading(true);
      const result = await productGeneratedInfoService.create({
        productId: selectedProductId,
        variant1Id: variant1RequestId,
        variant2Id: variant2RequestId,
        values: valuesToSend,
      });
      
      // Afficher le code généré dans une popup de confirmation
      await showAlert(
        `Code généré avec succès !\n\nCode : ${result.generatedCode}`,
        'success',
      );
      
    } catch (error: any) {
      console.error('Error generating info:', error);
      await showAlert(
        error.response?.data?.message || 'Erreur lors de la génération',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  const renderTechnicalCharacteristicInput = (technicalCharacteristic: TechnicalCharacteristic) => {
    const value = values[technicalCharacteristic.id] || '';

    switch (technicalCharacteristic.type) {
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value === true || value === 'true'}
            onChange={(e) => handleValueChange(technicalCharacteristic.id, e.target.checked)}
            className="w-auto mr-2 cursor-pointer"
          />
        );

      case 'number':
        return (
          <div>
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => handleValueChangeWithLimit(
                technicalCharacteristic.id,
                e.target.value,
                e.target.value,
              )}
              required
              className={`w-full px-3 py-3 border border-gray-300 rounded text-base focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 ${valueErrors[technicalCharacteristic.id] ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
              placeholder="Nombre"
              maxLength={MAX_TECH_VALUE_LENGTH}
            />
            {valueErrors[technicalCharacteristic.id] && (
              <small className="block mt-1 text-xs text-red-600">
                {valueErrors[technicalCharacteristic.id]}
              </small>
            )}
          </div>
        );

      case 'enum': {
        const enumOptions = technicalCharacteristic.enumOptions || [];
        const isMultiple = technicalCharacteristic.enumMultiple ?? false;
        const searchTerm = enumSearch[technicalCharacteristic.id] || '';
        const filteredOptions = enumOptions.filter(opt => 
          opt.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Normaliser les valeurs : toujours utiliser un tableau pour faciliter la gestion
        const selectedValues = Array.isArray(value) 
          ? value 
          : (value ? [value] : []);
        return (
          <div>
            <input
              type="text"
              placeholder="🔍 Rechercher une option..."
              value={searchTerm}
              onChange={(e) => setEnumSearch({ ...enumSearch, [technicalCharacteristic.id]: e.target.value })}
              className="w-full px-2 py-2 mb-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
            />
            <div className="border border-gray-300 rounded p-2.5 max-h-[200px] overflow-y-auto bg-gray-50">
              {filteredOptions.length === 0 ? (
                <p className="text-gray-500 italic m-0">
                  {searchTerm ? 'Aucune option ne correspond à votre recherche' : 'Aucune option disponible'}
                </p>
              ) : (
                filteredOptions.map((option) => (
                  <label
                    key={option}
                    className="flex items-center px-2 py-2 cursor-pointer rounded mb-1 transition-colors duration-200 hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(option)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (isMultiple) {
                            // Sélection multiple : ajouter à la liste
                            handleValueChange(technicalCharacteristic.id, [...selectedValues, option]);
                          } else {
                            // Sélection unique : remplacer la sélection précédente
                            handleValueChange(technicalCharacteristic.id, [option]);
                          }
                        } else {
                          // Décocher : retirer de la liste
                          handleValueChange(technicalCharacteristic.id, selectedValues.filter(v => v !== option));
                        }
                      }}
                      className="mr-2 cursor-pointer"
                    />
                    <span>{option}</span>
                  </label>
                ))
              )}
            </div>
            {selectedValues.length > 0 && (
              <small className="block mt-1.5 text-gray-500">
                {isMultiple 
                  ? `${selectedValues.length} option(s) sélectionnée(s)`
                  : `1 option sélectionnée`}
              </small>
            )}
          </div>
        );
      }

      default:
        return (
          <div>
            <input
              type="text"
              value={value}
              onChange={(e) => handleValueChangeWithLimit(technicalCharacteristic.id, e.target.value, e.target.value)}
              required
              className={`w-full px-3 py-3 border border-gray-300 rounded text-base focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 ${valueErrors[technicalCharacteristic.id] ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
            />
            {valueErrors[technicalCharacteristic.id] && (
              <small className="block mt-1 text-xs text-red-600">
                {valueErrors[technicalCharacteristic.id]}
              </small>
            )}
          </div>
        );
    }
  };


  return (
    <div className="w-full bg-gradient-to-br from-gray-50 to-gray-200 min-h-[calc(100vh-80px)] p-8 -m-8">
      <h1 className="text-gray-dark mb-8 text-4xl text-center bg-gradient-to-r from-purple to-purple-light bg-clip-text text-transparent font-bold">
        Générateur de Produits
      </h1>

      <div className="bg-gradient-to-br from-white to-gray-light/30 p-12 rounded-2xl shadow-xl border-2 border-purple/20 max-w-[1200px] mx-auto relative animate-slide-in backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b-2 border-gray-200">
          <div className="mb-4">
            <label className="block mb-2 text-gray-dark font-medium">Produit</label>
            <input
              type="text"
              placeholder="🔍 Rechercher un produit..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full px-3 py-2 mb-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
            />
            <div className="border border-gray-300 rounded p-2.5 max-h-[200px] overflow-y-auto bg-gray-50">
              {productsLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader size="md" />
                    <span>Chargement...</span>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <p className="text-gray-500 italic m-0">
                  {productSearch 
                    ? 'Aucun produit ne correspond à votre recherche'
                    : 'Aucun produit disponible'}
                </p>
              ) : (
                <>
                  {products.map((product) => (
                    <label 
                      key={product.id} 
                      className="flex items-center cursor-pointer px-2 py-2 rounded transition-colors duration-200 hover:bg-gray-100"
                    >
                      <input
                        type="radio"
                        name="product-selection"
                        checked={selectedProductId === product.id}
                        onChange={() => setSelectedProductId(product.id)}
                        className="mr-3 cursor-pointer"
                      />
                      <span className="select-none">
                        {product.name} ({product.code}) - {product.family.name}
                      </span>
                    </label>
                      ))}
                    </>
                  )}
            </div>
          </div>
          {selectedProduct && (
            <div className="mb-4 grid gap-6 md:grid-cols-2">
              <div>
                <label className="flex items-center justify-between mb-2 text-gray-dark font-medium">
                  <span>Variante 1</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Obligatoire</span>
                </label>
                <input
                  type="text"
                  placeholder="🔍 Rechercher une variante 1..."
                  value={variant1Search}
                  onChange={(e) => setVariant1Search(e.target.value)}
                  className="w-full px-3 py-2 mb-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
                />
                <div className="border border-gray-300 rounded p-2.5 max-h-[200px] overflow-y-auto bg-gray-50">
                  {variantsLoading ? (
                    <div className="py-8 flex items-center justify-center">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Loader size="md" />
                        <span>Chargement...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="flex items-start gap-2 mb-3 px-3 py-2 rounded border border-dashed border-purple/40 bg-purple/5 text-sm cursor-pointer transition-colors duration-200 hover:bg-purple/10">
                        <input
                          type="checkbox"
                          checked={isSansVariantSelected('FIRST')}
                          onChange={() => handleSansVariantToggle('FIRST')}
                          className="mt-1 cursor-pointer"
                        />
                        <div>
                          <span className="font-semibold text-purple">{SANS_VARIANT_LABEL}</span>
                          {/* <p className="text-xs text-gray-600 m-0 mt-1">
                            Cochez cette case pour forcer le code 0 quand aucune variante 1 réelle n’est sélectionnée.
                          </p> */}
                        </div>
                      </label>
                      {variant1Options.map((variant) => (
                        <label
                          key={variant.id}
                          className="flex items-center cursor-pointer px-2 py-2 rounded transition-colors duration-200 hover:bg-gray-100"
                        >
                          <input
                            type="checkbox"
                            checked={variantSelection.variant1Id === variant.id}
                            onChange={() => handleVariant1Toggle(variant.id)}
                            className="mr-3 cursor-pointer"
                          />
                          <span className="select-none">{variant.name} ({variant.code})</span>
                        </label>
                      ))}
                      {variant1Matches.length === 0 && (
                        <p className="text-gray-500 italic text-sm mt-2">
                          {variant1Search
                            ? 'Aucune variante 1 ne correspond à votre recherche — cochez la case "Sans Variante (code 0)" ci-dessus.'
                            : 'Aucune variante 1 disponible pour cette famille — cochez la case "Sans Variante (code 0)" ci-dessus.'}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="flex items-center justify-between mb-2 text-gray-dark font-medium">
                  <span>Variante 2</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Obligatoire</span>
                </label>
                <input
                  type="text"
                  placeholder="🔍 Rechercher une variante 2..."
                  value={variant2Search}
                  onChange={(e) => setVariant2Search(e.target.value)}
                  className="w-full px-3 py-2 mb-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
                />
                <div className="border border-gray-300 rounded p-2.5 max-h-[200px] overflow-y-auto bg-gray-50">
                  {variantsLoading ? (
                    <div className="py-8 flex items-center justify-center">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Loader size="md" />
                        <span>Chargement...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="flex items-start gap-2 mb-3 px-3 py-2 rounded border border-dashed border-purple/40 bg-purple/5 text-sm cursor-pointer transition-colors duration-200 hover:bg-purple/10">
                        <input
                          type="checkbox"
                          checked={isSansVariantSelected('SECOND')}
                          onChange={() => handleSansVariantToggle('SECOND')}
                          className="mt-1 cursor-pointer"
                        />
                        <div>
                          <span className="font-semibold text-purple">{SANS_VARIANT_LABEL}</span>
                          {/* <p className="text-xs text-gray-600 m-0 mt-1">
                            Cochez cette case pour valider le code 0 lorsque la variante 2 reste non spécifiée.
                          </p> */}
                        </div>
                      </label>
                      {variant2Options.map((variant) => (
                        <label
                          key={variant.id}
                          className="flex items-center cursor-pointer px-2 py-2 rounded transition-colors duration-200 hover:bg-gray-100"
                        >
                          <input
                            type="checkbox"
                            checked={variantSelection.variant2Id === variant.id}
                            onChange={() => handleVariant2Toggle(variant.id)}
                            className="mr-3 cursor-pointer"
                          />
                          <span className="select-none">{variant.name} ({variant.code})</span>
                        </label>
                      ))}
                      {variant2Matches.length === 0 && (
                        <p className="text-gray-500 italic text-sm mt-2">
                          {variant2Search
                            ? 'Aucune variante 2 ne correspond à votre recherche — cochez la case "Sans Variante (code 0)" ci-dessus.'
                            : 'Aucune variante 2 disponible pour cette famille — cochez la case "Sans Variante (code 0)" ci-dessus.'}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedProduct && (
          <div className="mt-8">
            {technicalCharacteristics.length > 0 ? (
              <>
                <h2 className="text-gray-dark mb-6 text-2xl font-semibold">Caractéristiques techniques (optionnelles)</h2>
                <div className="grid gap-6 mb-8">
                  {technicalCharacteristics.map((technicalCharacteristic) => (
                    <div key={technicalCharacteristic.id} className="mb-4">
                      <label className="block mb-2 text-gray-dark font-medium">
                        {technicalCharacteristic.name} ({formatFieldType(technicalCharacteristic.type)})
                      </label>
                      {renderTechnicalCharacteristicInput(technicalCharacteristic)}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500 text-lg">
                <p>
                  {hasSelectedRealVariant
                    ? 'Aucune caractéristique technique définie pour cette combinaison famille/variantes'
                    : 'Aucune caractéristique technique définie pour cette famille (sans variante)'}
                </p>
              </div>
            )}

            <div className="mt-8 pt-8 border-t-2 border-gray-200 flex justify-center gap-4">
              <button
                type="button"
                onClick={handleResetForm}
                disabled={loading}
                className="px-10 py-4 border-2 border-purple text-purple font-semibold rounded-xl transition-all duration-300 hover:bg-purple/10 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Réinitialiser
              </button>
              <button 
                onClick={handleGenerate} 
                disabled={loading}
                className="bg-gradient-to-r from-purple-light to-purple text-white border-none px-12 py-5 rounded-xl cursor-pointer text-xl font-semibold transition-all duration-300 shadow-lg hover:from-purple hover:to-purple-dark hover:shadow-xl hover:scale-105 active:scale-100 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100 uppercase tracking-wide flex items-center gap-3"
              >
                {loading && <Loader size="md" />}
                {loading ? 'Génération...' : 'Générer le code'}
              </button>
            </div>
          </div>
        )}

        {!selectedProductId && (
          <div className="text-center py-12 text-gray-500 text-lg">
            <p>Sélectionnez un produit pour commencer</p>
          </div>
        )}

      </div>
    </div>
  );
}
