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
}

export default function GeneratorPage() {
  const { showAlert } = useModal();
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [technicalCharacteristics, setTechnicalCharacteristics] = useState<TechnicalCharacteristic[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [variantSearch, setVariantSearch] = useState('');

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
        setSelectedVariantIds([]);
        setValues({});
        setVariantSearch('');
      }
    } else {
      setSelectedProduct(null);
      setVariants([]);
      setSelectedVariantIds([]);
      setTechnicalCharacteristics([]);
      setValues({});
      setVariantSearch('');
    }
  }, [selectedProductId, products]);

  useEffect(() => {
    if (selectedProduct && selectedVariantIds.length > 0) {
      loadTechnicalCharacteristics(selectedProduct.family.id, selectedVariantIds);
    } else {
      setTechnicalCharacteristics([]);
      setValues({});
    }
  }, [selectedProduct, selectedVariantIds]);

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
      const variantIdsParam = variantIds.join(',');
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

  const handleVariantToggle = async (variantId: string) => {
    // Si la variante est déjà sélectionnée, la désélectionner
    if (selectedVariantIds.includes(variantId)) {
      setSelectedVariantIds((prev) => prev.filter((id) => id !== variantId));
      return;
    }

    // Vérifier les conflits avant d'ajouter la variante
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return;

    // Vérifier si cette variante exclut des variantes déjà sélectionnées
    if (variant.excludedVariantIds) {
      const conflictingVariants = selectedVariantIds.filter((id) =>
        variant.excludedVariantIds?.includes(id),
      );
      if (conflictingVariants.length > 0) {
        const conflictingNames = conflictingVariants
          .map((id) => variants.find((v) => v.id === id)?.name)
          .filter(Boolean)
          .join(', ');
        await showAlert(
          `La variante "${variant.name}" ne peut pas être sélectionnée avec : ${conflictingNames}`,
          'warning',
        );
        return;
      }
    }

    // Vérifier si une variante déjà sélectionnée exclut cette variante
    const selectedVariants = variants.filter((v) => selectedVariantIds.includes(v.id));
    for (const selectedVariant of selectedVariants) {
      if (selectedVariant.excludedVariantIds?.includes(variantId)) {
        await showAlert(
          `La variante "${variant.name}" ne peut pas être sélectionnée avec "${selectedVariant.name}"`,
          'warning',
        );
        return;
      }
    }

    // Aucun conflit, ajouter la variante
    setSelectedVariantIds((prev) => [...prev, variantId]);
  };

  const handleGenerate = async () => {
    if (!selectedProductId || selectedVariantIds.length === 0) {
      await showAlert('Veuillez sélectionner un produit et au moins une variante', 'warning');
      return;
    }

    const valuesToSend =
      technicalCharacteristics.length > 0 && Object.keys(values).length > 0 ? values : undefined;

    try {
      setLoading(true);
      const result = await productGeneratedInfoService.create({
        productId: selectedProductId,
        variantIds: selectedVariantIds,
        values: valuesToSend,
      });
      
      // Afficher le code généré dans une popup de confirmation
      await showAlert(
        `Code généré avec succès !\n\nCode : ${result.generatedCode}`,
        'success',
      );
      
      // Réinitialiser les sélections après génération
      setSelectedVariantIds([]);
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
              <label>Variantes (sélection multiple)</label>
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
                        type="checkbox"
                        checked={selectedVariantIds.includes(variant.id)}
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

        {selectedProduct && selectedVariantIds.length > 0 && (
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

        {selectedProduct && selectedVariantIds.length === 0 && (
          <div className="empty-state">
            <p>Sélectionnez au moins une variante pour continuer</p>
          </div>
        )}
      </div>
    </div>
  );
}
