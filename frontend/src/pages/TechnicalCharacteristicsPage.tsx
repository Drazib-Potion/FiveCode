import { useState, useEffect } from 'react';
import { technicalCharacteristicsService, familiesService, variantsService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import { formatFieldType, getFieldTypeOptions } from '../utils/fieldTypeFormatter';

interface TechnicalCharacteristic {
  id: string;
  name: string;
  type: string;
  enumOptions?: string[] | null;
  enumMultiple?: boolean | null;
  families?: Array<{ family: { id: string; name: string } }>;
  variants?: Array<{ variant: { id: string; name: string } }>;
}

interface Family {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
  familyId: string;
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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'string',
    enumOptions: [] as string[],
    enumMultiple: false,
    familyIds: [] as string[],
    variantIds: [] as string[],
  });
  const [newEnumOption, setNewEnumOption] = useState('');
  const [familySearch, setFamilySearch] = useState('');
  const [variantSearch, setVariantSearch] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [technicalCharacteristicsData, familiesData, variantsData] = await Promise.all([
        technicalCharacteristicsService.getAll(),
        familiesService.getAll(),
        variantsService.getAll(),
      ]);
      setTechnicalCharacteristics(technicalCharacteristicsData);
      setFamilies(familiesData);
      setVariants(variantsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les familles selon la recherche
  const getFilteredFamilies = () => {
    if (!familySearch) return families;
    const searchLower = familySearch.toLowerCase();
    return families.filter((family) => family.name.toLowerCase().includes(searchLower));
  };

  // Filtrer les variantes selon les familles sélectionnées et la recherche
  const getFilteredVariants = () => {
    if (formData.familyIds.length === 0) {
      return []; // Aucune variante affichée si aucune famille n'est sélectionnée
    }
    let filtered = variants.filter((variant) => formData.familyIds.includes(variant.familyId));
    
    // Appliquer le filtre de recherche
    if (variantSearch) {
      const searchLower = variantSearch.toLowerCase();
      filtered = filtered.filter((variant) => 
        variant.name.toLowerCase().includes(searchLower) ||
        (variant.family && variant.family.name.toLowerCase().includes(searchLower))
      );
    }
    
    return filtered;
  };

  // Filtrer les caractéristiques techniques du tableau selon la recherche
  const getFilteredTechnicalCharacteristics = () => {
    if (!tableSearchTerm) return technicalCharacteristics;
    const searchLower = tableSearchTerm.toLowerCase();
    return technicalCharacteristics.filter((tc) => 
      tc.name.toLowerCase().includes(searchLower) ||
      tc.type.toLowerCase().includes(searchLower) ||
      (tc.families && tc.families.some((f: any) => f.family.name.toLowerCase().includes(searchLower))) ||
      (tc.variants && tc.variants.some((v: any) => v.variant.name.toLowerCase().includes(searchLower)))
    );
  };

  const handleFamilyToggle = (familyId: string) => {
    const isSelected = formData.familyIds.includes(familyId);
    if (isSelected) {
      // Désélectionner la famille et retirer les variantes de cette famille
      const newFamilyIds = formData.familyIds.filter((id) => id !== familyId);
      const newVariantIds = formData.variantIds.filter((variantId) => {
        const variant = variants.find((v) => v.id === variantId);
        return variant && variant.familyId !== familyId;
      });
      setFormData({ ...formData, familyIds: newFamilyIds, variantIds: newVariantIds });
    } else {
      // Sélectionner la famille
      setFormData({ ...formData, familyIds: [...formData.familyIds, familyId] });
    }
  };

  const handleVariantToggle = (variantId: string) => {
    const isSelected = formData.variantIds.includes(variantId);
    if (isSelected) {
      setFormData({
        ...formData,
        variantIds: formData.variantIds.filter((id) => id !== variantId),
      });
    } else {
      setFormData({
        ...formData,
        variantIds: [...formData.variantIds, variantId],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (formData.variantIds.length > 0) submitData.variantIds = formData.variantIds;

      if (editingId) {
        await technicalCharacteristicsService.update(editingId, submitData);
      } else {
        await technicalCharacteristicsService.create(submitData);
      }
      setFormData({ name: '', type: 'string', enumOptions: [], enumMultiple: false, familyIds: [], variantIds: [] });
      setNewEnumOption('');
      setFamilySearch('');
      setVariantSearch('');
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving technical characteristic:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    }
  };

  const handleEdit = (technicalCharacteristic: TechnicalCharacteristic) => {
    setFormData({
      name: technicalCharacteristic.name,
      type: technicalCharacteristic.type,
      enumOptions: technicalCharacteristic.enumOptions || [],
      enumMultiple: technicalCharacteristic.enumMultiple ?? false,
      familyIds: technicalCharacteristic.families?.map(f => f.family.id) || [],
      variantIds: technicalCharacteristic.variants?.map(v => v.variant.id) || [],
    });
    setNewEnumOption('');
    setEditingId(technicalCharacteristic.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette caractéristique technique ?');
    if (!confirmed) return;
    try {
      await technicalCharacteristicsService.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting technical characteristic:', error);
      await showAlert('Erreur lors de la suppression', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-4 py-12 text-lg text-gray-600">
        <div className="w-6 h-6 border-[3px] border-gray-300 border-t-purple rounded-full animate-spin"></div>
        Chargement...
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="flex justify-between items-center mb-10 pb-4 border-b-2 border-purple/20">
        <h1 className="m-0 text-3xl font-bold text-purple">Gestion des Caractéristiques techniques</h1>
        <button 
          onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', type: 'string', enumOptions: [], enumMultiple: false, familyIds: [], variantIds: [] }); setNewEnumOption(''); setFamilySearch(''); setVariantSearch(''); }}
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
              <label className="block mb-2.5 text-gray-dark font-semibold text-sm uppercase tracking-wide">Variantes (optionnel - filtrées selon les familles sélectionnées)</label>
              <input
                type="text"
                placeholder="🔍 Rechercher une variante..."
                value={variantSearch}
                onChange={(e) => setVariantSearch(e.target.value)}
                disabled={formData.familyIds.length === 0}
                className={`w-full px-2 py-2 mb-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 ${formData.familyIds.length === 0 ? 'opacity-50' : ''}`}
              />
              <div className="border border-gray-300 rounded p-2.5 max-h-[200px] overflow-y-auto bg-gray-50">
                {getFilteredVariants().length === 0 ? (
                  <p className="text-gray-500 italic m-0">
                    {formData.familyIds.length === 0 
                      ? 'Sélectionnez d\'abord une ou plusieurs familles pour voir les variantes'
                      : variantSearch
                      ? 'Aucune variante ne correspond à votre recherche'
                      : 'Aucune variante disponible pour les familles sélectionnées'}
                  </p>
                ) : (
                  getFilteredVariants().map((variant) => (
                    <label
                      key={variant.id}
                      className="flex items-center px-2 py-2 cursor-pointer rounded mb-1 transition-colors duration-200 hover:bg-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={formData.variantIds.includes(variant.id)}
                        onChange={() => handleVariantToggle(variant.id)}
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
              <small className="block mt-1.5 text-gray-500">
                {formData.variantIds.length > 0 ? `${formData.variantIds.length} variante(s) sélectionnée(s)` : 'Aucune variante sélectionnée'}
              </small>
            </div>
            <div className="flex gap-4 mt-8 pt-6 border-t-2 border-gray-light">
              <button 
                type="submit"
                className="flex-1 px-8 py-3.5 border-none rounded-xl cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg bg-gradient-to-r from-purple-light to-purple text-white hover:from-purple hover:to-purple-dark hover:shadow-xl hover:scale-105 active:scale-100"
              >
                ✓ Enregistrer
              </button>
              <button 
                type="button" 
                onClick={() => { setShowForm(false); setEditingId(null); setFamilySearch(''); setVariantSearch(''); }}
                className="flex-1 px-8 py-3.5 border-2 border-gray-dark rounded-xl cursor-pointer text-base font-semibold transition-all duration-300 shadow-md bg-white text-gray-dark hover:bg-gray-dark hover:text-white hover:shadow-lg hover:scale-105 active:scale-100"
              >
                ✕ Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-purple/20 animate-fade-in">
        {technicalCharacteristics.length > 0 && (
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
        )}
        {getFilteredTechnicalCharacteristics().length === 0 ? (
          <div className="py-16 px-8 text-center bg-gray-light">
            <div className="text-6xl block mb-4 opacity-20">📋</div>
            <h3 className="text-2xl text-gray-dark mb-2 font-semibold">
              {tableSearchTerm ? 'Aucun résultat' : 'Aucune caractéristique technique'}
            </h3>
            <p className="text-base text-gray-dark/70 m-0">
              {tableSearchTerm ? 'Aucune caractéristique technique ne correspond à votre recherche' : 'Créez votre première caractéristique technique pour commencer'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-purple to-purple-dark text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Nom</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Familles</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Variantes</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredTechnicalCharacteristics().map((technicalCharacteristic, index) => (
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
                    {technicalCharacteristic.variants && technicalCharacteristic.variants.length > 0
                      ? technicalCharacteristic.variants.map(v => v.variant.name).join(', ')
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-left border-b border-purple/20">
                    <button 
                      onClick={() => handleEdit(technicalCharacteristic)}
                      className="mr-2 px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple text-white hover:opacity-90 hover:shadow-lg"
                    >
                      Modifier
                    </button>
                    <button 
                      onClick={() => handleDelete(technicalCharacteristic.id)}
                      className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple-dark text-white hover:opacity-90 hover:shadow-lg"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

