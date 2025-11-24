import { useState, useEffect, useCallback, useRef } from 'react';
import { technicalCharacteristicsService, familiesService, variantsService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import { formatFieldType, getFieldTypeOptions } from '../utils/fieldTypeFormatter';
import Loader from '../components/Loader';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface TechnicalCharacteristic {
  id: string;
  name: string;
  type: string;
  enumOptions?: string[] | null;
  enumMultiple?: boolean | null;
  families?: Array<{ family: { id: string; name: string } }>;
  variants?: Array<{ variant: { id: string; name: string; variantLevel?: 'FIRST' | 'SECOND' } }>;
}

interface Family {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
  familyId: string;
  variantLevel: 'FIRST' | 'SECOND';
  family?: {
    id: string;
    name: string;
  };
}

export default function TechnicalCharacteristicsPage() {
  const { showAlert, showConfirm } = useModal();
  const [technicalCharacteristics, setTechnicalCharacteristics] = useState<TechnicalCharacteristic[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'string',
    enumOptions: [] as string[],
    enumMultiple: false,
    familyIds: [] as string[],
    variantIdsFirst: [] as string[],
    variantIdsSecond: [] as string[],
  });
  const [newEnumOption, setNewEnumOption] = useState('');
  const [familySearch, setFamilySearch] = useState('');
  const [variant1Search, setVariant1Search] = useState('');
  const [variant2Search, setVariant2Search] = useState('');
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
      // Pour l'instant, on ne filtre pas par famille/variante dans le tableau principal
      // On charge toutes les caractéristiques techniques
      const response = await technicalCharacteristicsService.getAll(undefined, undefined, currentOffset, LIMIT, searchValue);
      const data = Array.isArray(response) ? response : (response.data || []);
      const hasMoreData = Array.isArray(response) ? data.length === LIMIT : (response.hasMore !== false && data.length === LIMIT);
      
      if (reset) {
        // Dédupliquer les données
        const tcMap = new Map<string, TechnicalCharacteristic>();
        data.forEach((tc: TechnicalCharacteristic) => {
          if (!tcMap.has(tc.id)) {
            tcMap.set(tc.id, tc);
          }
        });
        const newTCs = Array.from(tcMap.values());
        setLoading(false);
        setTechnicalCharacteristics(newTCs);
        // Mettre à jour l'offset avec le nombre d'éléments reçus
        offsetRef.current = currentOffset + data.length;
        setHasMore(hasMoreData);
      } else {
        setTechnicalCharacteristics(prev => {
          const tcMap = new Map<string, TechnicalCharacteristic>(prev.map(tc => [tc.id, tc]));
          data.forEach((tc: TechnicalCharacteristic) => {
            if (!tcMap.has(tc.id)) {
              tcMap.set(tc.id, tc);
            }
          });
          return Array.from(tcMap.values());
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
      const data = await familiesService.getAll();
      const familiesData = Array.isArray(data) ? data : (data.data || []);
      setFamilies(familiesData);
    } catch (error) {
      console.error('Error loading families:', error);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchVariantsForFamilies = async () => {
      if (formData.familyIds.length === 0) {
        setVariants([]);
        return;
      }

      setLoadingVariants(true);
      try {
        const responses = await Promise.all(
          formData.familyIds.map((familyId) => variantsService.getAll(familyId, 0, 500)),
        );

        const aggregatedVariants = responses.flatMap((response) =>
          Array.isArray(response) ? response : response.data || [],
        );

        if (!cancelled) {
          const uniqueVariants = Array.from(
            new Map(aggregatedVariants.map((variant) => [variant.id, variant])).values(),
          );
          setVariants(uniqueVariants);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading variants for selected families:', error);
          setVariants([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingVariants(false);
        }
      }
    };

    fetchVariantsForFamilies();

    return () => {
      cancelled = true;
    };
  }, [formData.familyIds]);

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

  // Filtrer les familles selon la recherche
  const getFilteredFamilies = () => {
    if (!familySearch) return families;
    const searchLower = familySearch.toLowerCase();
    return families.filter((family) => family.name.toLowerCase().includes(searchLower));
  };

  // Filtrer les variantes selon la famille sélectionnée, le type (1 ou 2) et la recherche
  const getFilteredVariantsByLevel = (level: 'FIRST' | 'SECOND', searchTerm: string) => {
    if (formData.familyIds.length === 0) {
      return [];
    }

    let filtered = variants.filter(
      (variant) =>
        variant.variantLevel === level && formData.familyIds.includes(variant.familyId),
    );

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (variant) =>
          variant.name.toLowerCase().includes(searchLower) ||
          (variant.family && variant.family.name.toLowerCase().includes(searchLower)),
      );
    }

    return filtered;
  };

const filteredVariant1 = getFilteredVariantsByLevel('FIRST', variant1Search);
const filteredVariant2 = getFilteredVariantsByLevel('SECOND', variant2Search);

const getAllSelectedVariantIds = () => [
  ...formData.variantIdsFirst,
  ...formData.variantIdsSecond,
];

const getVariantNamesByLevel = (
  technicalCharacteristic: TechnicalCharacteristic,
  level: 'FIRST' | 'SECOND',
) => {
  if (!technicalCharacteristic.variants) return [];
  return technicalCharacteristic.variants
    .map(({ variant }) => {
      if (!variant) return null;
      const variantLevel =
        variant.variantLevel ||
        variants.find((stateVariant) => stateVariant.id === variant.id)?.variantLevel ||
        'FIRST';
      return variantLevel === level ? variant.name : null;
    })
    .filter((name): name is string => Boolean(name));
};


  const handleFamilyToggle = (familyId: string) => {
    const isSelected = formData.familyIds.includes(familyId);
    if (isSelected) {
      // Désélectionner la famille et retirer les variantes de cette famille
      const newFamilyIds = formData.familyIds.filter((id) => id !== familyId);
      const filterVariantIds = (variantIds: string[]) =>
        variantIds.filter((variantId) => {
          const variant = variants.find((v) => v.id === variantId);
          return variant && variant.familyId !== familyId;
        });
      setFormData({
        ...formData,
        familyIds: newFamilyIds,
        variantIdsFirst: filterVariantIds(formData.variantIdsFirst),
        variantIdsSecond: filterVariantIds(formData.variantIdsSecond),
      });
    } else {
      // Sélectionner la famille
      setFormData({ ...formData, familyIds: [...formData.familyIds, familyId] });
    }
  };

  const handleVariantToggle = (variantId: string, level: 'FIRST' | 'SECOND') => {
    const currentList =
      level === 'FIRST' ? formData.variantIdsFirst : formData.variantIdsSecond;
    const isSelected = currentList.includes(variantId);
    const updatedList = isSelected
      ? currentList.filter((id) => id !== variantId)
      : [...currentList, variantId];

    setFormData({
      ...formData,
      variantIdsFirst: level === 'FIRST' ? updatedList : formData.variantIdsFirst,
      variantIdsSecond: level === 'SECOND' ? updatedList : formData.variantIdsSecond,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const submitData: any = {
        name: formData.name,
        type: formData.type,
      };
      if (formData.type === 'enum') {
        submitData.enumOptions = formData.enumOptions.filter(opt => opt.trim().length > 0);
        submitData.enumMultiple = formData.enumMultiple;
      }
      if (formData.familyIds.length > 0) submitData.familyIds = formData.familyIds;
      const combinedVariantIds = getAllSelectedVariantIds();
      if (combinedVariantIds.length > 0) submitData.variantIds = combinedVariantIds;

      if (editingId) {
        await technicalCharacteristicsService.update(editingId, submitData);
      } else {
        await technicalCharacteristicsService.create(submitData);
      }
      setFormData({
        name: '',
        type: 'string',
        enumOptions: [],
        enumMultiple: false,
        familyIds: [],
        variantIdsFirst: [],
        variantIdsSecond: [],
      });
      setNewEnumOption('');
      setFamilySearch('');
      setVariant1Search('');
      setVariant2Search('');
      setShowForm(false);
      setEditingId(null);
      loadData(true);
    } catch (error: any) {
      console.error('Error saving technical characteristic:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (technicalCharacteristic: TechnicalCharacteristic) => {
    const variantAssignments = technicalCharacteristic.variants || [];
    const variantIdsFirst: string[] = [];
    const variantIdsSecond: string[] = [];

    variantAssignments.forEach(({ variant }) => {
      if (!variant) return;
      const level =
        variant.variantLevel ||
        variants.find((v) => v.id === variant.id)?.variantLevel ||
        'FIRST';
      if (level === 'SECOND') {
        variantIdsSecond.push(variant.id);
      } else {
        variantIdsFirst.push(variant.id);
      }
    });

    setFormData({
      name: technicalCharacteristic.name,
      type: technicalCharacteristic.type,
      enumOptions: technicalCharacteristic.enumOptions || [],
      enumMultiple: technicalCharacteristic.enumMultiple ?? false,
      familyIds: technicalCharacteristic.families?.map(f => f.family.id) || [],
      variantIdsFirst,
      variantIdsSecond,
    });
    setNewEnumOption('');
    setVariant1Search('');
    setVariant2Search('');
    setEditingId(technicalCharacteristic.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette caractéristique technique ?');
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await technicalCharacteristicsService.delete(id);
      loadData(true);
    } catch (error) {
      console.error('Error deleting technical characteristic:', error);
      await showAlert('Erreur lors de la suppression', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="flex justify-between items-center mb-10 pb-4 border-b-2 border-purple/20">
        <h1 className="m-0 text-3xl font-bold text-purple">Gestion des Caractéristiques techniques</h1>
        <button 
          onClick={() => { 
            setShowForm(true); 
            setEditingId(null); 
            setFormData({ 
              name: '', 
              type: 'string', 
              enumOptions: [], 
              enumMultiple: false, 
              familyIds: [], 
              variantIdsFirst: [], 
              variantIdsSecond: [], 
            }); 
            setNewEnumOption(''); 
            setFamilySearch(''); 
            setVariant1Search(''); 
            setVariant2Search(''); 
          }}
          className="bg-gradient-to-r from-purple to-purple-light text-white border-none px-6 py-3 rounded-lg cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
        >
          + Nouvelle caractéristique technique
        </button>
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-white to-gray-light/30 p-8 rounded-2xl shadow-xl mb-6 border-2 border-purple/20 animate-slide-in backdrop-blur-sm">
          <h2 className="mt-0 mb-6 text-2xl font-bold bg-gradient-to-r from-purple to-purple-light bg-clip-text text-transparent">
            {editingId ? 'Modifier' : 'Créer'} une caractéristique technique
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
              <label className="block mb-2.5 text-gray-dark font-semibold text-sm uppercase tracking-wide">Type</label>
              <select
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  setFormData({ 
                    ...formData, 
                    type: newType,
                    enumOptions: newType === 'enum' ? formData.enumOptions : [],
                    enumMultiple: newType === 'enum' ? formData.enumMultiple : false
                  });
                }}
                required
                className="w-full px-4 py-3.5 border-2 border-gray-light rounded-xl text-base bg-white focus:outline-none focus:border-purple focus:ring-4 focus:ring-purple/20 transition-all duration-300 shadow-sm hover:border-purple/50"
              >
                {getFieldTypeOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {formData.type === 'enum' && (
              <>
                <div className="mb-5">
                  <label className="block mb-2.5 text-gray-dark font-semibold text-sm uppercase tracking-wide">Type de sélection</label>
                  <select
                    value={formData.enumMultiple ? 'multiple' : 'unique'}
                    onChange={(e) => setFormData({ ...formData, enumMultiple: e.target.value === 'multiple' })}
                    className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
                  >
                    <option value="unique">Sélection unique</option>
                    <option value="multiple">Sélection multiple</option>
                  </select>
                </div>
                <div className="mb-5">
                  <label className="block mb-2.5 text-gray-dark font-semibold text-sm uppercase tracking-wide">Options enum (une par ligne ou séparées par des virgules)</label>
                  <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Ajouter une option..."
                    value={newEnumOption}
                    onChange={(e) => setNewEnumOption(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newEnumOption.trim()) {
                          setFormData({
                            ...formData,
                            enumOptions: [...formData.enumOptions, newEnumOption.trim()],
                          });
                          setNewEnumOption('');
                        }
                      }
                    }}
                    className="flex-1 px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newEnumOption.trim()) {
                        setFormData({
                          ...formData,
                          enumOptions: [...formData.enumOptions, newEnumOption.trim()],
                        });
                        setNewEnumOption('');
                      }
                    }}
                    className="px-4 py-2 bg-purple text-white border-none rounded cursor-pointer hover:bg-purple/90 transition-colors"
                  >
                    Ajouter
                  </button>
                </div>
                {formData.enumOptions.length > 0 && (
                  <div className="border border-gray-300 rounded p-2 bg-gray-50 max-h-[150px] overflow-y-auto flex flex-col gap-1.5">
                    {formData.enumOptions.map((option, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center px-3 py-2 border border-gray-300 rounded bg-white transition-all duration-200 hover:border-purple hover:bg-purple/5"
                      >
                        <span className="text-gray-dark font-medium text-sm">{option}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              enumOptions: formData.enumOptions.filter((_, i) => i !== index),
                            });
                          }}
                          className="px-2.5 py-1 bg-red-600 text-white border-none rounded cursor-pointer text-xs font-medium transition-colors duration-200 hover:bg-red-700"
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <small className="block mt-1.5 text-gray-500">
                  {formData.enumOptions.length > 0 
                    ? `${formData.enumOptions.length} option(s) définie(s)` 
                    : 'Aucune option définie'}
                </small>
              </div>
              </>
            )}
            <div className="mb-5">
              <label className="block mb-2.5 text-gray-dark font-semibold text-sm uppercase tracking-wide">Familles (optionnel)</label>
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
                        checked={formData.familyIds.includes(family.id)}
                        onChange={() => handleFamilyToggle(family.id)}
                        className="mr-1.5 cursor-pointer"
                      />
                      <span>{family.name}</span>
                    </label>
                  ))
                )}
              </div>
              <small className="block mt-1.5 text-gray-500">
                {formData.familyIds.length > 0 ? `${formData.familyIds.length} famille(s) sélectionnée(s)` : 'Aucune famille sélectionnée'}
              </small>
            </div>
            <div className="mb-5">
              <label className="block mb-2.5 text-gray-dark font-semibold text-sm uppercase tracking-wide">
                Variantes (optionnel - filtrées selon les familles sélectionnées)
              </label>
              <p className="text-sm text-gray-500 mb-4">
                Associez la caractéristique aux variantes 1 et/ou 2 des familles sélectionnées.
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-dark font-semibold text-sm uppercase tracking-wide">
                      Variantes 1
                    </span>
                    <span className="text-xs text-gray-500">
                      {formData.variantIdsFirst.length > 0
                        ? `${formData.variantIdsFirst.length} sélectionnée(s)`
                        : 'Aucune sélection'}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="🔍 Rechercher une variante 1..."
                    value={variant1Search}
                    onChange={(e) => setVariant1Search(e.target.value)}
                    disabled={formData.familyIds.length === 0}
                    className={`w-full px-2 py-2 mb-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 ${
                      formData.familyIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                  <div className="border border-gray-300 rounded p-2.5 max-h-[200px] overflow-y-auto bg-gray-50">
                    {formData.familyIds.length === 0 ? (
                      <p className="text-gray-500 italic m-0">
                        Sélectionnez d&apos;abord au moins une famille
                      </p>
                    ) : loadingVariants ? (
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Loader size="sm" />
                        <span>Chargement des variantes...</span>
                      </div>
                    ) : filteredVariant1.length === 0 ? (
                      <p className="text-gray-500 italic m-0">
                        {variant1Search
                          ? 'Aucune variante 1 ne correspond à votre recherche'
                          : 'Aucune variante 1 disponible pour les familles sélectionnées'}
                      </p>
                    ) : (
                      filteredVariant1.map((variant) => (
                        <label
                          key={variant.id}
                          className="flex items-center px-2 py-2 cursor-pointer rounded mb-1 transition-colors duration-200 hover:bg-gray-100"
                        >
                          <input
                            type="checkbox"
                            checked={formData.variantIdsFirst.includes(variant.id)}
                            onChange={() => handleVariantToggle(variant.id, 'FIRST')}
                            className="mr-1.5 cursor-pointer"
                          />
                          <span>
                            {variant.name}
                            {variant.family && (
                              <span className="text-gray-500 ml-1">
                                ({variant.family.name})
                              </span>
                            )}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-dark font-semibold text-sm uppercase tracking-wide">
                      Variantes 2
                    </span>
                    <span className="text-xs text-gray-500">
                      {formData.variantIdsSecond.length > 0
                        ? `${formData.variantIdsSecond.length} sélectionnée(s)`
                        : 'Aucune sélection'}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="🔍 Rechercher une variante 2..."
                    value={variant2Search}
                    onChange={(e) => setVariant2Search(e.target.value)}
                    disabled={formData.familyIds.length === 0}
                    className={`w-full px-2 py-2 mb-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 ${
                      formData.familyIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                  <div className="border border-gray-300 rounded p-2.5 max-h-[200px] overflow-y-auto bg-gray-50">
                    {formData.familyIds.length === 0 ? (
                      <p className="text-gray-500 italic m-0">
                        Sélectionnez d&apos;abord au moins une famille
                      </p>
                    ) : loadingVariants ? (
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Loader size="sm" />
                        <span>Chargement des variantes...</span>
                      </div>
                    ) : filteredVariant2.length === 0 ? (
                      <p className="text-gray-500 italic m-0">
                        {variant2Search
                          ? 'Aucune variante 2 ne correspond à votre recherche'
                          : 'Aucune variante 2 disponible pour les familles sélectionnées'}
                      </p>
                    ) : (
                      filteredVariant2.map((variant) => (
                        <label
                          key={variant.id}
                          className="flex items-center px-2 py-2 cursor-pointer rounded mb-1 transition-colors duration-200 hover:bg-gray-100"
                        >
                          <input
                            type="checkbox"
                            checked={formData.variantIdsSecond.includes(variant.id)}
                            onChange={() => handleVariantToggle(variant.id, 'SECOND')}
                            className="mr-1.5 cursor-pointer"
                          />
                          <span>
                            {variant.name}
                            {variant.family && (
                              <span className="text-gray-500 ml-1">
                                ({variant.family.name})
                              </span>
                            )}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
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
                onClick={() => { setShowForm(false); setEditingId(null); setFamilySearch(''); setVariant1Search(''); setVariant2Search(''); }}
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
              placeholder="🔍 Rechercher par nom, type, famille ou variante..."
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
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Familles</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Variantes 1</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Variantes 2</th>
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
              ) : technicalCharacteristics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center bg-gray-light">
                    <div className="text-6xl block mb-4 opacity-20">📋</div>
                    <h3 className="text-2xl text-gray-dark mb-2 font-semibold">
                      {tableSearchTerm ? 'Aucun résultat' : 'Aucune caractéristique technique'}
                    </h3>
                    <p className="text-base text-gray-dark/70 m-0">
                      {tableSearchTerm ? 'Aucune caractéristique technique ne correspond à votre recherche' : 'Créez votre première caractéristique technique pour commencer'}
                    </p>
                  </td>
                </tr>
              ) : (
                technicalCharacteristics.map((technicalCharacteristic, index) => {
                  const variantNamesFirst = getVariantNamesByLevel(
                    technicalCharacteristic,
                    'FIRST',
                  );
                  const variantNamesSecond = getVariantNamesByLevel(
                    technicalCharacteristic,
                    'SECOND',
                  );

                  return (
                    <tr 
                      key={technicalCharacteristic.id}
                      className={`transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-light'} hover:bg-gray-hover`}
                    >
                      <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">{technicalCharacteristic.name}</td>
                      <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">{formatFieldType(technicalCharacteristic.type)}</td>
                      <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">
                        {technicalCharacteristic.families && technicalCharacteristic.families.length > 0
                          ? technicalCharacteristic.families.map(f => f.family.name).join(', ')
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">
                        {variantNamesFirst.length > 0 ? variantNamesFirst.join(', ') : 'Aucune'}
                      </td>
                      <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">
                        {variantNamesSecond.length > 0 ? variantNamesSecond.join(', ') : 'Aucune'}
                      </td>
                      <td className="px-6 py-4 text-left border-b border-purple/20">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEdit(technicalCharacteristic)}
                            className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all durée-300 shadow-md bg-purple text-white hover:opacity-90 hover:shadow-lg"
                          >
                            Modifier
                          </button>
                          <button 
                            onClick={() => handleDelete(technicalCharacteristic.id)}
                            disabled={deletingId === technicalCharacteristic.id}
                            className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all durée-300 shadow-md bg-purple-dark text-white hover:opacity-90 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:opacity-100 flex items-center gap-2"
                          >
                            {deletingId === technicalCharacteristic.id && <Loader size="sm" />}
                            {deletingId === technicalCharacteristic.id ? 'Suppression...' : 'Supprimer'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

