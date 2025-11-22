import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seeding...');

  // Créer 2 types de produit
  const productType1 = await prisma.productType.upsert({
    where: { code: 'TYPE1' },
    update: {},
    create: {
      name: 'Type de produit 1',
      code: 'TYPE1',
    },
  });

  const productType2 = await prisma.productType.upsert({
    where: { code: 'TYPE2' },
    update: {},
    create: {
      name: 'Type de produit 2',
      code: 'TYPE2',
    },
  });

  console.log('✅ Product types created');

  // Créer 2 familles : ventilo et chaudiere
  // Laisser Prisma générer les UUIDs automatiquement
  let familyVentilo = await prisma.family.findFirst({
    where: { name: 'ventilo' },
  });
  if (!familyVentilo) {
    familyVentilo = await prisma.family.create({
      data: {
        name: 'ventilo',
      },
    });
  }

  let familyChaudiere = await prisma.family.findFirst({
    where: { name: 'chaudiere' },
  });
  if (!familyChaudiere) {
    familyChaudiere = await prisma.family.create({
      data: {
        name: 'chaudiere',
      },
    });
  }

  console.log('✅ Families created');

  // Créer 2 variantes pour la famille ventilo
  const variantVentilo1 = await prisma.variant.upsert({
    where: {
      familyId_code: {
        familyId: familyVentilo.id,
        code: 'V1',
      },
    },
    update: {},
    create: {
      familyId: familyVentilo.id,
      name: 'Variante Ventilo 1',
      code: 'V1',
    },
  });

  await prisma.variant.upsert({
    where: {
      familyId_code: {
        familyId: familyVentilo.id,
        code: 'V2',
      },
    },
    update: {},
    create: {
      familyId: familyVentilo.id,
      name: 'Variante Ventilo 2',
      code: 'V2',
    },
  });

  // Créer 2 variantes pour la famille chaudiere
  await prisma.variant.upsert({
    where: {
      familyId_code: {
        familyId: familyChaudiere.id,
        code: 'C1',
      },
    },
    update: {},
    create: {
      familyId: familyChaudiere.id,
      name: 'Variante Chaudiere 1',
      code: 'C1',
    },
  });

  await prisma.variant.upsert({
    where: {
      familyId_code: {
        familyId: familyChaudiere.id,
        code: 'C2',
      },
    },
    update: {},
    create: {
      familyId: familyChaudiere.id,
      name: 'Variante Chaudiere 2',
      code: 'C2',
    },
  });

  console.log('✅ Variants created');

  // Créer 2 produits : un de chaque famille
  // Produit 1 : famille ventilo avec une variante
  const product1 = await prisma.product.upsert({
    where: { code: 'PROD-VENTILO-001' },
    update: {},
    create: {
      name: 'Produit Ventilo',
      code: 'PROD-VENTILO-001',
      familyId: familyVentilo.id,
      productTypeId: productType1.id,
    },
  });

  // Créer une ProductGeneratedInfo pour le produit 1 avec une variante
  await prisma.productGeneratedInfo.create({
    data: {
      productId: product1.id,
      generatedCode: 'PROD-VENTILO-001-GEN1',
      variants: {
        create: {
          variantId: variantVentilo1.id,
        },
      },
    },
  });

  // Produit 2 : famille chaudiere sans variante
  const product2 = await prisma.product.upsert({
    where: { code: 'PROD-CHAUDIERE-001' },
    update: {},
    create: {
      name: 'Produit Chaudiere',
      code: 'PROD-CHAUDIERE-001',
      familyId: familyChaudiere.id,
      productTypeId: productType2.id,
    },
  });

  // Créer une ProductGeneratedInfo pour le produit 2 sans variante
  await prisma.productGeneratedInfo.create({
    data: {
      productId: product2.id,
      generatedCode: 'PROD-CHAUDIERE-001-GEN1',
    },
  });

  console.log('✅ Products created');
  console.log('✅ Product generated infos created');

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
