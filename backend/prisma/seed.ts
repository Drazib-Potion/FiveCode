import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
async function main() {
  console.log('🌱 Starting seeding...');

  // Fonction helper pour créer ou récupérer une famille
  async function getOrCreateFamily(name: string) {
    let family = await prisma.family.findFirst({
      where: { name: name.toLowerCase() },
    });
    if (!family) {
      family = await prisma.family.create({
        data: {
          name: name.toLowerCase(),
        },
      });
    }
    return family;
  }

  // Fonction helper pour créer une variante
  async function createVariant(familyId: string, name: string, code: string) {
    await prisma.variant.upsert({
      where: {
        familyId_code: {
          familyId: familyId,
          code: code,
        },
      },
      update: {},
      create: {
        familyId: familyId,
        name: name,
        code: code,
      },
    });
  }

  // Fonction helper pour créer une caractéristique technique et l'associer à une famille
  async function createTechnicalCharacteristic(
    name: string,
    type: string,
    enumOptions: string[],
    familyId: string,
    enumMultiple: boolean = false,
  ) {
    // Créer ou récupérer la caractéristique technique
    let techChar = await prisma.technicalCharacteristic.findFirst({
      where: { name: name },
    });

    if (!techChar) {
      techChar = await prisma.technicalCharacteristic.create({
        data: {
          name: name,
          type: type,
          enumOptions: enumOptions,
          enumMultiple: enumMultiple,
        },
      });
    }

    // Associer la caractéristique à la famille
    await prisma.technicalCharacteristicFamily.upsert({
      where: {
        technicalCharacteristicId_familyId: {
          technicalCharacteristicId: techChar.id,
          familyId: familyId,
        },
      },
      update: {},
      create: {
        technicalCharacteristicId: techChar.id,
        familyId: familyId,
      },
    });

    return techChar;
  }

  // Créer le type de produit Commerce
  const productTypeCommerce = await prisma.productType.upsert({
    where: { code: 'C' },
    update: {},
    create: {
      name: 'Commerce',
      code: 'C',
    },
  });

  console.log('✅ Product type Commerce created');

  // Créer toutes les familles
  const familleChaudiere = await getOrCreateFamily('Chaudière');
  const famillePompe = await getOrCreateFamily('Pompe');
  const familleVentilateur = await getOrCreateFamily('Ventilateur');
  const familleVerin = await getOrCreateFamily('Vérin');
  const familleVanne = await getOrCreateFamily('Vanne');
  const familleRechauffeurs = await getOrCreateFamily('Réchauffeurs');
  const familleMotoReducteurs = await getOrCreateFamily('Moto-réducteurs');
  const familleDebitmetresRoues = await getOrCreateFamily('Débitmètres à roues');
  const familleDebitmetresTransmetteur = await getOrCreateFamily('Débitmètres à transmetteur');
  const familleFiltres = await getOrCreateFamily('Filtres');
  const familleVentilateursNanoxCompact = await getOrCreateFamily('Ventilateurs Nanox Compact');

  console.log('✅ Families created');

  // Variantes Variante 1

  // Chaudière - Variante 1
  await createVariant(familleChaudiere.id, 'Sans variante', '0');

  // Débitmètres à roues - Variante 1
  await createVariant(familleDebitmetresRoues.id, 'Sans variante', '0');

  // Débitmètres à transmetteur - Variante 1
  await createVariant(familleDebitmetresTransmetteur.id, '1 tête', '1');
  await createVariant(familleDebitmetresTransmetteur.id, '2 têtes', '2');

  // Réchauffeurs - Variante 1
  await createVariant(familleRechauffeurs.id, 'Sans variante', '0');

  // Vannes - Variante 1
  await createVariant(familleVanne.id, 'Manuelle', 'H');
  await createVariant(familleVanne.id, 'Motorisée', 'M');

  // Ventilateur Nanox compact - Variante 1
  // Note: Le tableau montre "Ventilateur Nanox compact" mais la famille est "Ventilateur"
  // On crée ces variantes pour la famille Ventilateur
  await createVariant(familleVentilateur.id, 'taille 1 gauche', '1');
  await createVariant(familleVentilateur.id, 'taille 1 droite', '2');
  await createVariant(familleVentilateur.id, 'taille 2 gauche', '3');
  await createVariant(familleVentilateur.id, 'taille 2 droite', '4');
  await createVariant(familleVentilateur.id, 'taille 3 gauche', '5');
  await createVariant(familleVentilateur.id, 'taille 3 droite', '6');
  await createVariant(familleVentilateur.id, 'Avec Silencieux', 'S');
  await createVariant(familleVentilateur.id, 'Nu', '0');

  // Variantes Variante 2

  // Débitmètres à roues - Variante 2
  await createVariant(familleDebitmetresRoues.id, 'Entre-Bride', 'E');
  await createVariant(familleDebitmetresRoues.id, 'à Brides', 'A');
  await createVariant(familleDebitmetresRoues.id, 'Fileté', 'F');

  // Débitmètres à transmetteur - Variante 2
  await createVariant(familleDebitmetresTransmetteur.id, 'Entre-Bride', 'E');
  await createVariant(familleDebitmetresTransmetteur.id, 'à Brides', 'A');
  await createVariant(familleDebitmetresTransmetteur.id, 'Fileté', 'F');

  // Vannes - Variante 2
  await createVariant(familleVanne.id, 'Entre-Bride', 'E');
  await createVariant(familleVanne.id, 'à Brides', 'A');
  await createVariant(familleVanne.id, 'SW', 'S');
  await createVariant(familleVanne.id, 'BW', 'B');
  await createVariant(familleVanne.id, 'Fileté', 'F');

  // Ventilateur Nanox compact - Variante 2
  await createVariant(familleVentilateur.id, 'Sans insonorisation', '0');
  await createVariant(familleVentilateur.id, 'Calorifuge', 'C');
  await createVariant(familleVentilateur.id, 'Insonorisation', 'I');

  // Ventilateurs - Variante 2
  await createVariant(familleVentilateur.id, 'Sans calo, sans insonorisation', '0');
  await createVariant(familleVentilateur.id, 'Calorifuge', 'C');
  await createVariant(familleVentilateur.id, 'Insonorisation', 'I');

  console.log('✅ Variants created');

  // Créer les caractéristiques techniques pour la famille Chaudière
  await createTechnicalCharacteristic(
    'FLUIDE THERMIQUE',
    'enum',
    ['FLUIDE THERMIQUE'],
    familleChaudiere.id,
    false,
  );

  await createTechnicalCharacteristic(
    'Combustion',
    'enum',
    ['FIOUL DOMESTIQUE', 'FIOUL LOURD'],
    familleChaudiere.id,
    false,
  );

  await createTechnicalCharacteristic(
    'Pthermique',
    'enum',
    ['1300,00 kW', '1200,00 kW'],
    familleChaudiere.id,
    false,
  );

  await createTechnicalCharacteristic(
    'Pos',
    'enum',
    ['VERTICALE', 'HORIZONTALE'],
    familleChaudiere.id,
    false,
  );

  console.log('✅ Technical characteristics created for Chaudière');

  // Fonction helper pour créer un produit
  async function createProduct(
    name: string,
    code: string,
    familyId: string,
    productTypeId: string,
  ) {
    await prisma.product.upsert({
      where: { code: code },
      update: {},
      create: {
        name: name,
        code: code,
        familyId: familyId,
        productTypeId: productTypeId,
      },
    });
  }

  // Créer tous les produits
  await createProduct('Chaudières', 'CH', familleChaudiere.id, productTypeCommerce.id);
  await createProduct('Débitmètre (type Kobold)', 'DR', familleDebitmetresRoues.id, productTypeCommerce.id);
  await createProduct('Débitmètre massique', 'DM', familleDebitmetresTransmetteur.id, productTypeCommerce.id);
  await createProduct('Débitmètre vortex', 'DV', familleDebitmetresTransmetteur.id, productTypeCommerce.id);
  await createProduct('Filtre à panier duplex fioul', 'FD', familleFiltres.id, productTypeCommerce.id);
  await createProduct('Filtre à panier poste de détente', 'FG', familleFiltres.id, productTypeCommerce.id);
  await createProduct('Filtre à panier simplex fioul', 'FS', familleFiltres.id, productTypeCommerce.id);
  await createProduct('Filtre auto-nettoyant', 'FN', familleFiltres.id, productTypeCommerce.id);
  await createProduct('Filtre rampe air', 'FA', familleFiltres.id, productTypeCommerce.id);
  await createProduct('Filtres Y', 'FY', familleFiltres.id, productTypeCommerce.id);
  await createProduct('Moto-réducteur', 'MR', familleMotoReducteurs.id, productTypeCommerce.id);
  await createProduct('Pompes à palette', 'PP', famillePompe.id, productTypeCommerce.id);
  await createProduct('Pompes à vis', 'PV', famillePompe.id, productTypeCommerce.id);
  await createProduct('Réchauffeurs', 'RE', familleRechauffeurs.id, productTypeCommerce.id);
  await createProduct('Vanne à opercule', 'VO', familleVanne.id, productTypeCommerce.id);
  await createProduct('Vanne à pointeau', 'VT', familleVanne.id, productTypeCommerce.id);
  await createProduct('Vanne à soupape (tous type)', 'VS', familleVanne.id, productTypeCommerce.id);
  await createProduct('Vanne BS', 'VB', familleVanne.id, productTypeCommerce.id);
  await createProduct('Vanne guillotine', 'VG', familleVanne.id, productTypeCommerce.id);
  await createProduct('Vanne papillon', 'VP', familleVanne.id, productTypeCommerce.id);
  await createProduct('Ventilateur Air Primaire', 'AP', familleVentilateur.id, productTypeCommerce.id);
  await createProduct('Ventilateur Air Secondaire', 'AS', familleVentilateur.id, productTypeCommerce.id);
  await createProduct('Ventilateur de dilution', 'AD', familleVentilateur.id, productTypeCommerce.id);
  await createProduct('Ventilateur de secours', 'AR', familleVentilateur.id, productTypeCommerce.id);
  await createProduct('Ventilateur Nanox compact', 'AN', familleVentilateursNanoxCompact.id, productTypeCommerce.id);
  await createProduct('Vérins hydrauliques', 'VH', familleVerin.id, productTypeCommerce.id);
  await createProduct('Vérins pneumatiques', 'VZ', familleVerin.id, productTypeCommerce.id);

  console.log('✅ Products created');
  console.log('🌱 Seeding finished!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
