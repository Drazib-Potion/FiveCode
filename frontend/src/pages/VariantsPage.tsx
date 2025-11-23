import { useState, useEffect } from 'react';
import { variantsService, familiesService } from '../services/api';
import { useModal } from '../contexts/ModalContext';

interface Variant {
  id: string;
  name: string;
  code: string;
  familyId: string;
  family?: { name: string };
  excludedVariantIds?: string[];
}

interface Family {
  id: string;
  name: string;
}

export default function VariantsPage() {
  const { showAlert, showConfirm } = useModal();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    familyId: '', 
    name: '', 
    code: '',
    excludedVariantIds: [] as string[],
  });
  const [familySearch, setFamilySearch] = useState('');
  const [excludedVariantSearch, setExcludedVariantSearch] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [variantsData, familiesData] = await Promise.all([
        variantsService.getAll(),
        familiesService.getAll(),
      ]);
      setVariants(variantsData);
      setFamilies(familiesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await variantsService.update(editingId, formData);
      } else {
        await variantsService.create(formData as { familyId: string; name: string; code: string; excludedVariantIds?: string[] });
      }
      setFormData({ familyId: '', name: '', code: '', excludedVariantIds: [] });
      setFamilySearch('');
      setExcludedVariantSearch('');
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (error: any) {
      console.error('Error saving variant:', error);
      const message = error.response?.data?.message || 'Erreur lors de la sauvegarde';
      await showAlert(message, 'error');
    }
  };

  const handleEdit = (variant: Variant) => {
    setFormData({ 
      familyId: variant.familyId, 
      name: variant.name, 
      code: variant.code,
      excludedVariantIds: variant.excludedVariantIds || [],
    });
    setFamilySearch('');
    setExcludedVariantSearch('');
    setEditingId(variant.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer cette variante ?');
    if (!confirmed) return;
    try {
      await variantsService.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting variant:', error);
      await showAlert('Erreur lors de la suppression', 'error');
    }
  };

  // Filtrer les familles selon la recherche
  const getFilteredFamilies = () => {
    if (!familySearch) return families;
    const searchLower = familySearch.toLowerCase();
    return families.filter((family) => family.name.toLowerCase().includes(searchLower));
  };

  // Gérer la sélection d'une famille (une seule sélection)
  const handleFamilyToggle = (familyId: string) => {
    setFormData({ ...formData, familyId: formData.familyId === familyId ? '' : familyId });
  };

  // Filtrer les variantes exclues selon la recherche
  const getFilteredExcludedVariants = () => {
    let filtered = variants.filter(v => v.familyId === formData.familyId && v.id !== editingId);
    
    if (excludedVariantSearch) {
      const searchLower = excludedVariantSearch.toLowerCase();
      filtered = filtered.filter((variant) => 
        variant.name.toLowerCase().includes(searchLower) ||
        variant.code.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  };

  // Filtrer les variantes du tableau selon la recherche
  const getFilteredVariantsForTable = () => {
    if (!tableSearchTerm) return variants;
    const searchLower = tableSearchTerm.toLowerCase();
    return variants.filter((variant) => 
      variant.name.toLowerCase().includes(searchLower) ||
      variant.code.toLowerCase().includes(searchLower) ||
      (variant.family && variant.family.name.toLowerCase().includes(searchLower))
    );
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
        <h1 className="m-0 text-3xl font-bold text-purple">Gestion des Variantes</h1>
        <button 
          onClick={() => { setShowForm(true); setEditingId(null); setFormData({ familyId: '', name: '', code: '', excludedVariantIds: [] }); setFamilySearch(''); setExcludedVariantSearch(''); }}
          className="bg-gradient-to-r from-purple to-purple-light text-white border-none px-6 py-3 rounded-lg cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
        >
          + Nouvelle variante
        </button>
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-white to-gray-light/30 p-8 rounded-2xl shadow-xl mb-6 border-2 border-purple/20 animate-slide-in backdrop-blur-sm">
          <h2 className="mt-0 mb-6 text-2xl font-bold bg-gradient-to-r from-purple to-purple-light bg-clip-text text-transparent">
            {editingId ? 'Modifier' : 'Créer'} une variante
          </h2>
          <form onSubmit={handleSubmit}>
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
                placeholder="Ex: 1"
                className="w-full px-4 py-3.5 border-2 border-gray-light rounded-xl text-base bg-white focus:outline-none focus:border-purple focus:ring-4 focus:ring-purple/20 transition-all duration-300 shadow-sm hover:border-purple/50 font-mono font-semibold"
              />
            </div>
            <div className="mb-5">
              <label className="block mb-2.5 text-gray-dark font-semibold text-sm uppercase tracking-wide">Variantes exclues (ne peuvent pas être sélectionnées avec cette variante)</label>
              <input
                type="text"
                placeholder="🔍 Rechercher une variante..."
                value={excludedVariantSearch}
                onChange={(e) => setExcludedVariantSearch(e.target.value)}
                disabled={!formData.familyId}
                className={`w-full px-2 py-2 mb-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-purple focus:ring-2 focus:ring-purple/20 ${!formData.familyId ? 'opacity-50' : ''}`}
              />
              <div className="flex flex-col gap-3 mt-2 max-h-[200px] overflow-y-auto p-2 border border-gray-300 rounded bg-gray-50">
                {getFilteredExcludedVariants().length === 0 ? (
                  <p className="text-gray-500 italic m-0">
                    {!formData.familyId 
                      ? 'Sélectionnez d\'abord une famille pour voir les variantes'
                      : excludedVariantSearch
                      ? 'Aucune variante ne correspond à votre recherche'
                      : 'Aucune autre variante disponible pour cette famille'}
                  </p>
                ) : (
                  getFilteredExcludedVariants().map((variant) => (
                    <label key={variant.id} className="flex items-center cursor-pointer px-2 py-2 rounded transition-colors duration-200 hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={formData.excludedVariantIds.includes(variant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              excludedVariantIds: [...formData.excludedVariantIds, variant.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              excludedVariantIds: formData.excludedVariantIds.filter(id => id !== variant.id),
                            });
                          }
                        }}
                        disabled={!formData.familyId}
                        className="mr-1.5 cursor-pointer"
                      />
                      <span className="select-none">{variant.name}</span>
                    </label>
                  ))
                )}
              </div>
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
                onClick={() => { setShowForm(false); setEditingId(null); setFamilySearch(''); setExcludedVariantSearch(''); }}
                className="flex-1 px-8 py-3.5 border-2 border-gray-dark rounded-xl cursor-pointer text-base font-semibold transition-all duration-300 shadow-md bg-white text-gray-dark hover:bg-gray-dark hover:text-white hover:shadow-lg hover:scale-105 active:scale-100"
              >
                ✕ Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-purple/20 animate-fade-in">
        {variants.length > 0 && (
          <div className="p-4 bg-gray-light border-b-2 border-purple/20">
            <div className="relative w-full max-w-[400px]">
              <input
                type="text"
                placeholder="🔍 Rechercher par nom, code ou famille..."
                value={tableSearchTerm}
                onChange={(e) => setTableSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border-2 border-purple rounded-lg text-sm bg-white text-gray-dark focus:outline-none focus:border-purple-light focus:ring-2 focus:ring-purple/20 transition-all shadow-sm"
              />
            </div>
          </div>
        )}
        {getFilteredVariantsForTable().length === 0 ? (
          <div className="py-16 px-8 text-center bg-gray-light">
            <div className="text-6xl block mb-4 opacity-20">📋</div>
            <h3 className="text-2xl text-gray-dark mb-2 font-semibold">
              {tableSearchTerm ? 'Aucun résultat' : 'Aucune variante'}
            </h3>
            <p className="text-base text-gray-dark/70 m-0">
              {tableSearchTerm ? 'Aucune variante ne correspond à votre recherche' : 'Créez votre première variante pour commencer'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-purple to-purple-dark text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Nom</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Famille</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredVariantsForTable().map((variant, index) => (
                <tr 
                  key={variant.id}
                  className={`transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-light'} hover:bg-gray-hover`}
                >
                  <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">{variant.name}</td>
                  <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-mono font-semibold">{variant.code}</td>
                  <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark font-medium">{variant.family?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-left border-b border-purple/20">
                    <button 
                      onClick={() => handleEdit(variant)}
                      className="mr-2 px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple text-white hover:opacity-90 hover:shadow-lg"
                    >
                      Modifier
                    </button>
                    <button 
                      onClick={() => handleDelete(variant.id)}
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

