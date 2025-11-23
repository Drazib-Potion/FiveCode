import { useState, useEffect } from 'react';
import {
  productsService,
  productGeneratedInfoService,
  variantsService,
  technicalCharacteristicsService,
} from '../services/api';
import { useModal } from '../contexts/ModalContext';
import { formatFieldType } from '../utils/fieldTypeFormatter';

interface Product {
  id: string;
  name: string;
  code: string;
  family: {
    id: string;
    name: string;
  };
}

interface Variant {
  id: string;
  name: string;
  code: string;
  familyId: string;
  excludedVariantIds?: string[];
}

interface TechnicalCharacteristic {
  id: string;
  name: string;
  type: string;
  enumOptions?: string[] | null;
  enumMultiple?: boolean | null;
}

export default function GeneratorPage() {
  const { showAlert } = useModal();
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [technicalCharacteristics, setTechnicalCharacteristics] = useState<TechnicalCharacteristic[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [variantSearch, setVariantSearch] = useState('');
  const [enumSearch, setEnumSearch] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      const product = products.find((p) => p.id === selectedProductId);
      setSelectedProduct(product || null);
      if (product) {
        loadVariants(product.family.id);
        // Réinitialiser les sélections
        setSelectedVariantId('');
        setValues({});
        setVariantSearch('');
      }
    } else {
      setSelectedProduct(null);
      setVariants([]);
      setSelectedVariantId('');
      setTechnicalCharacteristics([]);
      setValues({});
      setVariantSearch('');
    }
  }, [selectedProductId, products]);

  useEffect(() => {
    if (selectedProduct && selectedVariantId) {
      loadTechnicalCharacteristics(selectedProduct.family.id, [selectedVariantId]);
    } else {
      setTechnicalCharacteristics([]);
      setValues({});
    }
  }, [selectedProduct, selectedVariantId]);

  const loadProducts = async () => {
    try {
      const data = await productsService.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadVariants = async (familyId: string) => {
    try {
      const data = await variantsService.getAll(familyId);
      setVariants(data);
    } catch (error) {
      console.error('Error loading variants:', error);
    }
  };

  const loadTechnicalCharacteristics = async (familyId: string, variantIds: string[]) => {
    try {
      // Utiliser findByFamilyAndVariant avec le tableau de variantIds
      const variantIdsParam = variantIds.length > 0 ? variantIds.join(',') : '';
      const data = await technicalCharacteristicsService.getAll(familyId, variantIdsParam);

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

  const handleVariantToggle = (variantId: string) => {
    // Si la variante est déjà sélectionnée, la désélectionner
    if (selectedVariantId === variantId) {
      setSelectedVariantId('');
      return;
    }

    // Sinon, sélectionner cette variante (remplace la précédente si elle existe)
    setSelectedVariantId(variantId);
  };

  const handleGenerate = async () => {
    if (!selectedProductId) {
      await showAlert('Veuillez sélectionner un produit', 'warning');
      return;
    }

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
        variantId: selectedVariantId || undefined,
        values: valuesToSend,
      });
      
      // Afficher le code généré dans une popup de confirmation
      await showAlert(
        `Code généré avec succès !\n\nCode : ${result.generatedCode}`,
        'success',
      );
      
      // Réinitialiser les sélections après génération
      setSelectedVariantId('');
      setValues({});
      setVariantSearch('');
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
          <input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(technicalCharacteristic.id, parseFloat(e.target.value) || 0)}
            required
            className="w-full px-3 py-3 border border-gray-300 rounded text-base focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
          />
        );

      case 'select':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(technicalCharacteristic.id, e.target.value)}
            required
            className="w-full px-3 py-3 border border-gray-300 rounded text-base focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
          />
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
          <input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(technicalCharacteristic.id, e.target.value)}
            required
            className="w-full px-3 py-3 border border-gray-300 rounded text-base focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
          />
        );
    }
  };

  // Filtrer les variantes selon la recherche
  const getFilteredVariants = () => {
    if (!variantSearch) return variants;
    const searchLower = variantSearch.toLowerCase();
    return variants.filter((variant) => 
      variant.name.toLowerCase().includes(searchLower) ||
      variant.code.toLowerCase().includes(searchLower)
    );
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
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded text-base focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
            >
              <option value="">Sélectionner un produit</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.code}) - {product.family.name}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="mb-4 ">
              <label className="block mb-2 text-gray-dark font-medium">Variante (sélection unique)</label>
              <input
                type="text"
                placeholder="🔍 Rechercher une variante..."
                value={variantSearch}
                onChange={(e) => setVariantSearch(e.target.value)}
                className="w-full px-3 py-2 mb-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
              />
              <div className="border border-gray-300 rounded p-2.5 max-h-[200px] overflow-y-auto bg-gray-50">
                {getFilteredVariants().length === 0 ? (
                  <p className="text-gray-500 italic m-0">
                    {variantSearch 
                      ? 'Aucune variante ne correspond à votre recherche'
                      : 'Aucune variante disponible pour cette famille'}
                  </p>
                ) : (
                  getFilteredVariants().map((variant) => (
                    <label key={variant.id} className="flex items-center cursor-pointer px-2 py-2 rounded transition-colors duration-200 hover:bg-gray-100">
                      <input
                        type="radio"
                        name="variant-selection"
                        checked={selectedVariantId === variant.id}
                        onChange={() => handleVariantToggle(variant.id)}
                        className="mr-3 cursor-pointer"
                      />
                      <span className="select-none">{variant.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {selectedProduct && selectedVariantId && (
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
                <p>Aucune caractéristique technique définie pour cette combinaison famille/variante</p>
              </div>
            )}

            <div className="mt-8 pt-8 border-t-2 border-gray-200 flex justify-center">
              <button 
                onClick={handleGenerate} 
                disabled={loading}
                className="bg-gradient-to-r from-purple-light to-purple text-white border-none px-12 py-5 rounded-xl cursor-pointer text-xl font-semibold transition-all duration-300 shadow-lg hover:from-purple hover:to-purple-dark hover:shadow-xl hover:scale-105 active:scale-100 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100 uppercase tracking-wide"
              >
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

        {selectedProduct && !selectedVariantId && (
          <div className="text-center py-12 text-gray-500 text-lg">
            <p>Sélectionnez une variante pour continuer</p>
          </div>
        )}
      </div>
    </div>
  );
}
