import { useState, useEffect } from 'react';
import { productGeneratedInfoService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import * as XLSX from 'xlsx';
import excelIcon from '../media/excel-icon.png';
import { ProductGeneratedInfo } from '../utils/types';

export default function GeneratedCodesPage() {
  const { showAlert, showConfirm } = useModal();
  const [generatedInfos, setGeneratedInfos] = useState<ProductGeneratedInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGeneratedInfos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadGeneratedInfos = async () => {
    try {
      setLoading(true);
      const data = await productGeneratedInfoService.getAll();
      setGeneratedInfos(data);
    } catch (error) {
      console.error('Error loading generated infos:', error);
      await showAlert('Erreur lors du chargement des codes générés', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm(
      'Êtes-vous sûr de vouloir supprimer ce code généré ?',
    );
    if (!confirmed) return;
    try {
      await productGeneratedInfoService.delete(id);
      await showAlert('Code généré supprimé avec succès', 'success');
      loadGeneratedInfos();
    } catch (error: any) {
      console.error('Error deleting generated info:', error);
      await showAlert(
        error.response?.data?.message || 'Erreur lors de la suppression',
        'error',
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExportToExcel = async () => {
    if (generatedInfos.length === 0) {
      await showAlert('Aucun code généré à exporter', 'warning');
      return;
    }

    // Collecter tous les noms de caractéristiques techniques uniques
    const allFieldNames = new Set<string>();
    generatedInfos.forEach((info) => {
      if (info.technicalCharacteristics) {
        info.technicalCharacteristics.forEach((pf) => {
          allFieldNames.add(pf.technicalCharacteristic.name);
        });
      }
    });
    const sortedFieldNames = Array.from(allFieldNames).sort();

    // Préparer les données pour l'export
    const exportData = generatedInfos.map((info) => {
      const row: any = {
        'Nom produit': info.product.name,
        'Code généré': info.generatedCode,
        'Famille': info.product.family.name,
        'Variante 1': info.variant1 ? `${info.variant1.name} (${info.variant1.code})` : 'Aucune (0)',
        'Variante 2': info.variant2 ? `${info.variant2.name} (${info.variant2.code})` : 'Aucune (0)',
        'Date de création': formatDate(info.createdAt),
      };

      // Ajouter toutes les caractéristiques techniques (même celles qui n'existent pas pour cette info)
      sortedFieldNames.forEach((fieldName) => {
        const field = info.technicalCharacteristics?.find(
          (pf) => pf.technicalCharacteristic.name === fieldName,
        );
        row[fieldName] = field ? field.value : '';
      });

      return row;
    });

    // Créer un workbook et une feuille
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Codes générés');

    // Ajuster la largeur des colonnes
    const colWidths = [
      { wch: 25 }, // Code généré
      { wch: 20 }, // Nom produit
      { wch: 15 }, // Famille
      { wch: 25 }, // Variante 1
      { wch: 25 }, // Variante 2
      { wch: 20 }, // Date de création
    ];
    // Ajouter des largeurs pour les caractéristiques techniques dynamiques (15 caractères par défaut)
    sortedFieldNames.forEach(() => {
      colWidths.push({ wch: 15 });
    });
    ws['!cols'] = colWidths;

    // Générer le nom du fichier avec la date
    const date = new Date().toISOString().split('T')[0];
    const fileName = `codes_generes_${date}.xlsx`;

    // Télécharger le fichier
    XLSX.writeFile(wb, fileName);
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
        <h1 className="m-0 text-3xl font-bold text-purple">Codes Générés</h1>
        <div className="flex gap-4">
          <button
            onClick={handleExportToExcel}
            className="bg-gradient-to-r from-purple to-purple-light text-white border-none px-6 py-3 rounded-lg cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg hover:from-purple hover:to-purple-dark hover:shadow-xl hover:scale-105 active:scale-100 flex items-center gap-2"
          >
            <img src={excelIcon} alt="Excel" className="w-5 h-5" />
            Exporter en Excel
          </button>
          <button 
            onClick={loadGeneratedInfos}
            className="bg-purple text-white border-none px-6 py-3 rounded-lg cursor-pointer text-base font-semibold transition-all duration-300 shadow-lg hover:bg-purple/90 hover:shadow-xl hover:scale-105 active:scale-100"
          >
            Actualiser
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-purple/20 animate-fade-in">
        {generatedInfos.length === 0 ? (
          <div className="py-16 px-8 text-center bg-gray-light">
            <div className="text-6xl block mb-4 opacity-20">📋</div>
            <h3 className="text-2xl text-gray-dark mb-2 font-semibold">Aucun code généré</h3>
            <p className="text-base text-gray-dark/70 m-0">Utilisez le générateur pour créer vos premiers codes produits</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-purple to-purple-dark text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Code généré</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Produit</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Famille</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Variante 1</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Variante 2</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Caractéristiques techniques</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Date de création</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Créé par</th>
                <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {generatedInfos.map((info, index) => (
                <tr 
                  key={info.id}
                  className={`transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-light'} hover:bg-gray-hover`}
                >
                  <td className="px-6 py-4 text-left border-b border-purple/20">
                    <strong className="font-mono text-lg text-green-600">
                      {info.generatedCode}
                    </strong>
                  </td>
                  <td className="px-6 py-4 text-left border-b border-purple/20">
                    <div>
                      <strong className="text-gray-dark">{info.product.name}</strong>
                      <br />
                      <span className="text-sm text-gray-500">
                        Code: {info.product.code}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-left border-b border-purple/20">
                    <strong className="text-gray-dark">{info.product.family.name}</strong>
                  </td>
                  <td className="px-6 py-4 text-left border-b border-purple/20">
                    {info.variant1 ? (
                      <span className="text-sm text-gray-dark">
                        {info.variant1.name} ({info.variant1.code})
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">Aucune</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-left border-b border-purple/20">
                    {info.variant2 ? (
                      <span className="text-sm text-gray-dark">
                        {info.variant2.name} ({info.variant2.code})
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">Aucune</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-left border-b border-purple/20">
                    {info.technicalCharacteristics && info.technicalCharacteristics.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {info.technicalCharacteristics.map((pf) => {
                          // Essayer de parser la valeur comme JSON (pour les enums)
                          let displayValue = pf.value;
                          try {
                            if (pf.value) {
                              const parsed = JSON.parse(pf.value);
                              if (Array.isArray(parsed)) {
                                displayValue = parsed.join(', ');
                              }
                            }
                          } catch {
                            // Ce n'est pas du JSON, utiliser la valeur telle quelle
                          }
                          return (
                            <span key={pf.technicalCharacteristic.id} className="text-sm text-gray-dark">
                              <strong>{pf.technicalCharacteristic.name}:</strong> {displayValue || 'N/A'}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">Aucun</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark">{formatDate(info.createdAt)}</td>
                  <td className="px-6 py-4 text-left border-b border-purple/20 text-gray-dark">{info.createdBy}</td>
                  <td className="px-6 py-4 text-left border-b border-purple/20">
                    <button
                      onClick={() => handleDelete(info.id)}
                      className="px-4 py-2 border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 shadow-md bg-purple-dark text-white hover:opacity-90 hover:shadow-lg"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

