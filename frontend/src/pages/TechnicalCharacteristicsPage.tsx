import { useState, useEffect, useCallback, useMemo } from 'react';
import { technicalCharacteristicsService, familiesService, variantsService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import { formatFieldType, getFieldTypeOptions } from '../utils/fieldTypeFormatter';
import Loader from '../components/Loader';
import DataTable from '../components/DataTable';
import SearchableSelectPanel from '../components/SearchableSelectPanel';
import { TechnicalCharacteristic, Family, Variant } from '../utils/types';
import { useAuth } from '../contexts/AuthContext';
import { FormDataState } from '../utils/types';
import { SANS_VARIANT_LABEL, MAX_ENUM_OPTION_LENGTH } from '../utils/constants.ts';


const createInitialFormData = (): FormDataState => ({
  name: '',
  type: 'string',
  enumOptions: [],
  enumMultiple: false,
  familyIds: [],
  variantIdsFirst: [],
  variantIdsSecond: [],
  sansVariantFirst: false,
  sansVariantSecond: false,
});

export default function TechnicalCharacteristicsPage() {
  const { showAlert, showConfirm } = useModal();
  const { canEditContent } = useAuth();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormDataState>(() => createInitialFormData());
  const [newEnumOption, setNewEnumOption] = useState('');
  const [enumOptionError, setEnumOptionError] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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

  const fetchTechnicalCharacteristicsTable = useCallback(
    async ({
      offset,
      limit,
      search,
    }: {
      offset: number;
      limit: number;
      search?: string;
    }) => {
      try {
        const response = await technicalCharacteristicsService.getAll(
          undefined,
          undefined,
          offset,
          limit,
          search,
        );
        const rawData: TechnicalCharacteristic[] = Array.isArray(response)
          ? response
          : response.data || [];
        const uniqueData = Array.from(
          new Map(rawData.map((tc) => [tc.id, tc])).values(),
        );
        return {
          data: uniqueData,
          hasMore:
            typeof response.hasMore === 'boolean'
              ? response.hasMore
              : uniqueData.length === limit,
        };
      } catch (error) {
        console.error('Error loading data:', error);
        await showAlert('Erreur lors du chargement des caractéristiques techniques', 'error');
        return [];
      }
    },
    [showAlert],
  );

  useEffect(() => {
    if (!canEditContent) {
      setShowForm(false);
      setEditingId(null);
    }
  }, [canEditContent]);

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

  const variantItemsByLevel = useMemo(() => {
    const mapItems = (level: 'FIRST' | 'SECOND') =>
      variants
        .filter(
          (variant) =>
            variant.variantLevel === level && formData.familyIds.includes(variant.familyId),
        )
        .map((variant) => ({
          key: variant.id,
          label: (
            <span>
              {variant.name}
              {variant.family && (
                <span className="text-xs text-gray-500 ml-1">
                  ({variant.family.name})
                </span>
              )}
            </span>
          ),
          value: variant.id,
        }));

    return {
      FIRST: mapItems('FIRST'),
      SECOND: mapItems('SECOND'),
    };
  }, [variants, formData.familyIds]);

  const getVariantSummaryText = (level: 'FIRST' | 'SECOND') => {
    const currentList = level === 'FIRST' ? formData.variantIdsFirst : formData.variantIdsSecond;
    const hasSans = level === 'FIRST' ? formData.sansVariantFirst : formData.sansVariantSecond;
    if (currentList.length > 0) {
      return `${currentList.length} sélectionnée(s)`;
    }
    if (hasSans) {
      return SANS_VARIANT_LABEL;
    }
    return 'Aucune sélection';
  };

  const renderSansVariantExtraSlot = (level: 'FIRST' | 'SECOND') => {
    const isDisabled = formData.familyIds.length === 0;
    const isFirst = level === 'FIRST';
    const isChecked = isFirst ? formData.sansVariantFirst : formData.sansVariantSecond;

    return (
      <label
        className="flex items-start gap-2 mb-3 px-3 py-2 rounded border border-dashed border-purple/40 bg-purple/5 text-sm cursor-pointer transition-colors duration-200 hover:bg-purple/10"
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => handleSansVariantToggle(level)}
          disabled={isDisabled}
          className="mt-1 cursor-pointer"
        />
        <div>
          <span className="font-semibold text-purple">{SANS_VARIANT_LABEL}</span>
          <p className="text-xs text-gray-600 m-0 mt-1">
            Cochez cette case pour valider cette caractéristique quand la variante n'est pas sélectionnée.
          </p>
        </div>
      </label>
    );
  };

const getAllSelectedVariantIds = () => [
  ...formData.variantIdsFirst,
  ...formData.variantIdsSecond,
];

const getVariantNamesByLevel = useCallback(
  (technicalCharacteristic: TechnicalCharacteristic, level: 'FIRST' | 'SECOND') => {
  if (!technicalCharacteristic.variants) return [];
  const variantNames = technicalCharacteristic.variants
    .map(({ variant }) => {
      if (!variant) return null;
      const variantLevel =
        variant.variantLevel ||
        variants.find((stateVariant) => stateVariant.id === variant.id)?.variantLevel ||
        'FIRST';
      return variantLevel === level ? variant.name : null;
    })
    .filter((name): name is string => Boolean(name));

  return variantNames.length > 0 ? variantNames : [SANS_VARIANT_LABEL];
  },
  [variants],
);

  const technicalColumns = useMemo(
    () => [
      {
        header: 'Nom',
        render: (technicalCharacteristic: TechnicalCharacteristic) => (
          <span className="text-gray-dark font-medium">{technicalCharacteristic.name}</span>
        ),
      },
      {
        header: 'Type',
        render: (technicalCharacteristic: TechnicalCharacteristic) => (
          <span className="text-gray-dark font-medium">
            {formatFieldType(technicalCharacteristic.type)}
          </span>
        ),
      },
      {
        header: 'Familles',
        render: (technicalCharacteristic: TechnicalCharacteristic) => {
          const familiesList = technicalCharacteristic.families?.map((f) => f.family.name) || [];
          return <span>{familiesList.length > 0 ? familiesList.join(', ') : 'N/A'}</span>;
        },
      },
      {
        header: 'Variantes 1',
        render: (technicalCharacteristic: TechnicalCharacteristic) => {
          const names = getVariantNamesByLevel(technicalCharacteristic, 'FIRST');
          return <span>{names.join(', ')}</span>;
        },
      },
      {
        header: 'Variantes 2',
        render: (technicalCharacteristic: TechnicalCharacteristic) => {
          const names = getVariantNamesByLevel(technicalCharacteristic, 'SECOND');
          return <span>{names.join(', ')}</span>;
        },
      },
    ],
    [getVariantNamesByLevel],
  );

  const renderTechnicalActions = (technicalCharacteristic: TechnicalCharacteristic) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleEdit(technicalCharacteristic)}
        className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple text-white hover:opacity-90 hover:shadow-lg"
      >
        Modifier
      </button>
      <button
        onClick={() => handleDelete(technicalCharacteristic.id)}
        disabled={deletingId === technicalCharacteristic.id}
        className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple-dark text-white hover:opacity-90 hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:opacity-100 flex items-center gap-2"
      >
        {deletingId === technicalCharacteristic.id && <Loader size="sm" />}
        {deletingId === technicalCharacteristic.id ? 'Suppression...' : 'Supprimer'}
      </button>
    </div>
  );


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
      sansVariantFirst: level === 'FIRST' ? false : formData.sansVariantFirst,
      sansVariantSecond: level === 'SECOND' ? false : formData.sansVariantSecond,
    });
  };

  const handleToggleAllVariants = (level: 'FIRST' | 'SECOND', visibleKeys: string[]) => {
    if (visibleKeys.length === 0) return;
    const currentList = level === 'FIRST' ? formData.variantIdsFirst : formData.variantIdsSecond;
    const allSelected = visibleKeys.every((variantId) => currentList.includes(variantId));

    const updatedList = allSelected
      ? currentList.filter((variantId) => !visibleKeys.includes(variantId))
      : [...new Set([...currentList, ...visibleKeys])];

      setFormData({
        ...formData,
        variantIdsFirst: level === 'FIRST' ? updatedList : formData.variantIdsFirst,
        variantIdsSecond: level === 'SECOND' ? updatedList : formData.variantIdsSecond,
        sansVariantFirst: level === 'FIRST' ? false : formData.sansVariantFirst,
        sansVariantSecond: level === 'SECOND' ? false : formData.sansVariantSecond,
      });
  };

  const handleAddEnumOption = () => {
    const option = newEnumOption.trim();
    if (!option) return;
    if (option.length > MAX_ENUM_OPTION_LENGTH) {
      setEnumOptionError(`Les options enum sont limitées à ${MAX_ENUM_OPTION_LENGTH} caractères.`);
      return;
    }
    setFormData({
      ...formData,
      enumOptions: [...formData.enumOptions, option],
    });
    setNewEnumOption('');
    setEnumOptionError('');
  };

  const handleSansVariantToggle = (level: 'FIRST' | 'SECOND') => {
    const isFirst = level === 'FIRST';
    const isActive = isFirst ? formData.sansVariantFirst : formData.sansVariantSecond;

    setFormData({
      ...formData,
      variantIdsFirst: isFirst && !isActive ? [] : formData.variantIdsFirst,
      variantIdsSecond: !isFirst && !isActive ? [] : formData.variantIdsSecond,
      sansVariantFirst: isFirst ? !isActive : formData.sansVariantFirst,
      sansVariantSecond: isFirst ? formData.sansVariantSecond : !isActive,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (!canEditContent) return;
    e.preventDefault();
    setSubmitting(true);
    if (enumOptionError) {
      await showAlert(enumOptionError, 'warning');
      setSubmitting(false);
      return;
    }
    try {
      const variant1SelectionValid = formData.sansVariantFirst || formData.variantIdsFirst.length > 0;
      const variant2SelectionValid = formData.sansVariantSecond || formData.variantIdsSecond.length > 0;
      if (!variant1SelectionValid || !variant2SelectionValid) {
        await showAlert(
          `Veuillez cocher au moins une option par niveau de variante (par exemple "${SANS_VARIANT_LABEL}").`,
          'warning',
        );
        return;
      }

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
      setFormData(createInitialFormData());
      setNewEnumOption('');
      setEnumOptionError('');
      setShowForm(false);
      setEditingId(null);
      setReloadKey((prev) => prev + 1);
    } catch (error: any) {
      console.error('Error saving technical characteristic:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (technicalCharacteristic: TechnicalCharacteristic) => {
    if (!canEditContent) return;
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

    const hasVariantFirst = variantIdsFirst.length > 0;
    const hasVariantSecond = variantIdsSecond.length > 0;

    setFormData({
      name: technicalCharacteristic.name,
      type: technicalCharacteristic.type,
      enumOptions: technicalCharacteristic.enumOptions || [],
      enumMultiple: technicalCharacteristic.enumMultiple ?? false,
      familyIds: technicalCharacteristic.families?.map(f => f.family.id) || [],
      variantIdsFirst,
      variantIdsSecond,
      sansVariantFirst: !hasVariantFirst,
      sansVariantSecond: !hasVariantSecond,
    });
    setNewEnumOption('');
    setEditingId(technicalCharacteristic.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!canEditContent) return;
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette caractéristique technique ?');
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await technicalCharacteristicsService.delete(id);
      setReloadKey((prev) => prev + 1);
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
        {canEditContent && (
          <button
            onClick={() => { 
              setShowForm(true); 
              setEditingId(null); 
              setFormData(createInitialFormData()); 
              setNewEnumOption(''); 
              setEnumOptionError('');
            }}
            className="bg-linear-to-r from-purple to-purple-light text-white border-none px-6 py-3 rounded-lg cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
          >
          + Nouvelle caractéristique technique
        </button>
        )}
      </div>

      {canEditContent && showForm && (
        <div className="bg-linear-to-br from-white to-gray-light/30 p-8 rounded-2xl shadow-xl mb-6 border-2 border-purple/20 animate-slide-in backdrop-blur-sm">
          <h2 className="mt-0 mb-6 text-2xl font-bold bg-linear-to-r from-purple to-purple-light bg-clip-text text-transparent">
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
                    if (newType !== 'enum') {
                      setEnumOptionError('');
                      setNewEnumOption('');
                    }
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
                  <label className="block mb-2.5 text-gray-dark font-semibold text-sm uppercase tracking-wide">Options enum (une par ligne ou séparées par des virgules)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Ajouter une option..."
                      value={newEnumOption}
                      onChange={(e) => {
                        setNewEnumOption(e.target.value);
                        if (e.target.value.length <= MAX_ENUM_OPTION_LENGTH) {
                          setEnumOptionError('');
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddEnumOption();
                        }
                      }}
                      className="flex-1 px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20"
                      maxLength={MAX_ENUM_OPTION_LENGTH}
                    />
                  <button
                    type="button"
                      onClick={handleAddEnumOption}
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
                {enumOptionError && (
                  <p className="text-xs text-red-600 mt-1">
                    {enumOptionError}
                  </p>
                )}
                <small className="block mt-1.5 text-gray-500">
                  {formData.enumOptions.length > 0 
                    ? `${formData.enumOptions.length} option(s) définie(s)` 
                    : 'Aucune option définie'}
                </small>
              </div>
              </>
            )}
            <SearchableSelectPanel
              className="mb-5"
              label="Familles"
              fetchOptions={fetchFamilies}
              limit={30}
              selectedKeys={formData.familyIds}
              onToggle={(key) => handleFamilyToggle(key)}
              placeholder="🔍 Rechercher une famille..."
              footer={
                <small className="text-xs text-gray-500">
                  {formData.familyIds.length > 0 ? `${formData.familyIds.length} famille(s) sélectionnée(s)` : 'Aucune famille sélectionnée'}
                </small>
              }
            />
            <div className="mb-5">
              <div className="grid gap-6 md:grid-cols-2">
                <SearchableSelectPanel
                  label="Variantes 1"
                  className="mb-0"
                  items={variantItemsByLevel.FIRST}
                  selectedKeys={formData.variantIdsFirst}
                  onToggle={(key) => handleVariantToggle(key, 'FIRST')}
                  showSelectAll={variantItemsByLevel.FIRST.length > 0}
                  onToggleAll={(visibleKeys) => handleToggleAllVariants('FIRST', visibleKeys)}
                  extraSlot={renderSansVariantExtraSlot('FIRST')}
                  loading={loadingVariants}
                  footer={
                    <small className="text-xs text-gray-500">
                      {getVariantSummaryText('FIRST')}
                    </small>
                  }
                  emptyMessage={
                    formData.familyIds.length === 0
                      ? 'Sélectionnez d’abord au moins une famille'
                      : 'Aucune variante 1 disponible pour les familles sélectionnées'
                  }
                />
                <SearchableSelectPanel
                  label="Variantes 2"
                  className="mb-0"
                  items={variantItemsByLevel.SECOND}
                  selectedKeys={formData.variantIdsSecond}
                  onToggle={(key) => handleVariantToggle(key, 'SECOND')}
                  showSelectAll={variantItemsByLevel.SECOND.length > 0}
                  onToggleAll={(visibleKeys) => handleToggleAllVariants('SECOND', visibleKeys)}
                  extraSlot={renderSansVariantExtraSlot('SECOND')}
                  loading={loadingVariants}
                  footer={
                    <small className="text-xs text-gray-500">
                      {getVariantSummaryText('SECOND')}
                    </small>
                  }
                  emptyMessage={
                    formData.familyIds.length === 0
                      ? 'Sélectionnez d’abord au moins une famille'
                      : 'Aucune variante 2 disponible pour les familles sélectionnées'
                  }
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8 pt-6 border-t-2 border-gray-light">
              <button 
                type="submit"
                disabled={submitting}
                className="flex-1 px-8 py-3.5 border-none rounded-xl cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg bg-linear-to-r from-purple-light to-purple text-white hover:from-purple hover:to-purple-dark hover:shadow-xl hover:scale-105 active:scale-100 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center justify-center gap-2"
              >
                {submitting && <Loader size="sm" />}
                {submitting ? 'Enregistrement...' : '✓ Enregistrer'}
              </button>
              <button 
                type="button" 
                onClick={() => { setShowForm(false); setEditingId(null); setEnumOptionError(''); setNewEnumOption(''); }}
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
          columns={technicalColumns}
          fetchData={fetchTechnicalCharacteristicsTable}
          limit={20}
          reloadKey={reloadKey}
          emptyMessage={
            tableSearchTerm
              ? 'Aucune caractéristique technique ne correspond à votre recherche'
              : 'Créez votre première caractéristique technique pour commencer'
          }
          renderActions={canEditContent ? renderTechnicalActions : undefined}
          searchPlaceholder="🔍 Rechercher par nom, type, famille ou variante..."
          searchTerm={tableSearchTerm}
          onSearch={(term) => setTableSearchTerm(term)}
        />
      </div>
    </div>
  );
}

