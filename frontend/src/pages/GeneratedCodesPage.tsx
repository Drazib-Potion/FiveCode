import { useState, useEffect } from 'react';
import { productGeneratedInfoService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import * as XLSX from 'xlsx';
import './CRUDPage.css';

interface ProductGeneratedInfo {
  id: string;
  generatedCode: string;
  product: {
    id: string;
    name: string;
    code: string;
    family: {
      id: string;
      name: string;
    };
  };
  variants: Array<{
    variant: {
      id: string;
      name: string;
      code: string;
    };
  }>;
  technicalCharacteristics: Array<{
    technicalCharacteristic: {
      id: string;
      name: string;
      type: string;
    };
    value: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

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
        'Variantes': info.variants.map((pv) => pv.variant.name).join(', '),
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
      { wch: 30 }, // Variantes
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

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="crud-page">
      <div className="page-header">
        <h1>Codes Générés</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleExportToExcel}
            style={{ backgroundColor: '#27ae60' }}
          >
            📥 Exporter en Excel
          </button>
          <button onClick={loadGeneratedInfos}>Actualiser</button>
        </div>
      </div>

      <div className="table-container">
        {generatedInfos.length === 0 ? (
          <div className="empty-state-placeholder">
            <h3>Aucun code généré</h3>
            <p>Utilisez le générateur pour créer vos premiers codes produits</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code généré</th>
                <th>Produit</th>
                <th>Famille</th>
                <th>Variantes</th>
                <th>Caractéristiques techniques</th>
                <th>Date de création</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {generatedInfos.map((info) => (
                <tr key={info.id}>
                  <td>
                    <strong style={{ fontFamily: 'monospace', fontSize: '1.1em', color: '#27ae60' }}>
                      {info.generatedCode}
                    </strong>
                  </td>
                  <td>
                    <div>
                      <strong>{info.product.name}</strong>
                      <br />
                      <span style={{ fontSize: '0.9em', color: '#7f8c8d' }}>
                        Code: {info.product.code}
                      </span>
                    </div>
                  </td>
                  <td>
                    <strong>{info.product.family.name}</strong>
                  </td>
                  <td>
                    {info.variants.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {info.variants.map((pv) => (
                          <span key={pv.variant.id} style={{ fontSize: '0.9em' }}>
                            {pv.variant.name} ({pv.variant.code})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#7f8c8d', fontStyle: 'italic' }}>Aucune</span>
                    )}
                  </td>
                  <td>
                    {info.technicalCharacteristics && info.technicalCharacteristics.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {info.technicalCharacteristics.map((pf) => {
                          // Essayer de parser la valeur comme JSON (pour les enums)
                          let displayValue = pf.value;
                          try {
                            const parsed = JSON.parse(pf.value);
                            if (Array.isArray(parsed)) {
                              displayValue = parsed.join(', ');
                            }
                          } catch {
                            // Ce n'est pas du JSON, utiliser la valeur telle quelle
                          }
                          return (
                            <span key={pf.technicalCharacteristic.id} style={{ fontSize: '0.9em' }}>
                              <strong>{pf.technicalCharacteristic.name}:</strong> {displayValue}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ color: '#7f8c8d', fontStyle: 'italic' }}>Aucun</span>
                    )}
                  </td>
                  <td>{formatDate(info.createdAt)}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(info.id)}
                      className="delete"
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

