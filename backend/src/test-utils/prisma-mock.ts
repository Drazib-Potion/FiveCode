import { PrismaService } from '../prisma/prisma.service';

type DelegateMock = {
  findMany?: jest.Mock;
  findUnique?: jest.Mock;
  create?: jest.Mock;
  update?: jest.Mock;
  delete?: jest.Mock;
};

type PrismaDelegateMocks = {
  family: DelegateMock;
  variant: DelegateMock;
  productType: DelegateMock;
  product: DelegateMock;
  technicalCharacteristic: DelegateMock;
  technicalCharacteristicFamily: DelegateMock;
  technicalCharacteristicVariant: DelegateMock;
  productGeneratedInfo: DelegateMock;
  productTechnicalCharacteristic: DelegateMock;
};

export type PrismaServiceMock = PrismaDelegateMocks & PrismaService;

export const createPrismaMock = (): PrismaDelegateMocks => ({
  family: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  variant: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  productType: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  technicalCharacteristic: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  technicalCharacteristicFamily: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  technicalCharacteristicVariant: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  productGeneratedInfo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  productTechnicalCharacteristic: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});
