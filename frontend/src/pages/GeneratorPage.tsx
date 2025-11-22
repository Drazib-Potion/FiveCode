import { useState, useEffect } from 'react';
import {
  productsService,
  productGeneratedInfoService,
  variantsService,
  technicalCharacteristicsService,
} from '../services/api';
import { useModal } from '../contexts/ModalContext';
import { formatFieldType } from '../utils/fieldTypeFormatter';
import './GeneratorPage.css';

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
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(technicalCharacteristic.id, parseFloat(e.target.value) || 0)}
            required
          />
        );

      case 'select':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(technicalCharacteristic.id, e.target.value)}
            required
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
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '10px',
              maxHeight: '200px',
              overflowY: 'auto',
              backgroundColor: '#f9f9f9',
            }}>
              {filteredOptions.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
                  {searchTerm ? 'Aucune option ne correspond à votre recherche' : 'Aucune option disponible'}
                </p>
              ) : (
                filteredOptions.map((option) => (
                  <label
                    key={option}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f0f0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
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
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    <span>{option}</span>
                  </label>
                ))
              )}
            </div>
            {selectedValues.length > 0 && (
              <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
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
    <div className="generator-page">
      <h1>Générateur de Produits</h1>

      <div className="generator-container">
        <div className="selection-section">
          <div className="form-group">
            <label>Produit</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
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
            <div className="form-group">
              <label>Variante (sélection unique)</label>
              <input
                type="text"
                placeholder="Rechercher une variante..."
                value={variantSearch}
                onChange={(e) => setVariantSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
              <div className="variants-checkboxes">
                {getFilteredVariants().length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
                    {variantSearch 
                      ? 'Aucune variante ne correspond à votre recherche'
                      : 'Aucune variante disponible pour cette famille'}
                  </p>
                ) : (
                  getFilteredVariants().map((variant) => (
                    <label key={variant.id} className="checkbox-label">
                      <input
                        type="radio"
                        name="variant-selection"
                        checked={selectedVariantId === variant.id}
                        onChange={() => handleVariantToggle(variant.id)}
                      />
                      <span>{variant.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {selectedProduct && selectedVariantId && (
          <div className="fields-section">
            {technicalCharacteristics.length > 0 ? (
              <>
                <h2>Caractéristiques techniques (optionnelles)</h2>
                <div className="fields-form">
                  {technicalCharacteristics.map((technicalCharacteristic) => (
                    <div key={technicalCharacteristic.id} className="form-group">
                      <label>
                        {technicalCharacteristic.name} ({formatFieldType(technicalCharacteristic.type)})
                      </label>
                      {renderTechnicalCharacteristicInput(technicalCharacteristic)}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>Aucune caractéristique technique définie pour cette combinaison famille/variante</p>
              </div>
            )}

            <div className="actions">
              <button onClick={handleGenerate} disabled={loading}>
                {loading ? 'Génération...' : 'Générer le code'}
              </button>
            </div>
          </div>
        )}

        {!selectedProductId && (
          <div className="empty-state">
            <p>Sélectionnez un produit pour commencer</p>
          </div>
        )}

        {selectedProduct && !selectedVariantId && (
          <div className="empty-state">
            <p>Sélectionnez une variante pour continuer</p>
          </div>
        )}
      </div>
    </div>
  );
}
