export interface Family {
  id: string;
  name: string;
}

export interface ProductType {
  id: string;
  name: string;
  code: string;
}

export interface Variant {
  id: string;
  name: string;
  code: string;
  familyId: string;
  variantLevel: 'FIRST' | 'SECOND';
  family?: {
    id: string;
    name: string;
  };
}

export interface Product {
  id: string;
  name: string;
  code: string;
  family: {
    id: string;
    name: string;
  };
  productType?: {
    id: string;
    name: string;
    code: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface TechnicalCharacteristic {
  id: string;
  name: string;
  type: string;
  enumOptions?: string[] | null;
  enumMultiple?: boolean | null;
  families?: Array<{ family: { id: string; name: string } }>;
  variants?: Array<{ variant: { id: string; name: string; variantLevel?: 'FIRST' | 'SECOND' } }>;
}

export interface ProductGeneratedInfo {
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
  variant1: {
    id: string;
    name: string;
    code: string;
  } | null;
  variant2: {
    id: string;
    name: string;
    code: string;
  } | null;
  technicalCharacteristics: Array<{
    technicalCharacteristic: {
      id: string;
      name: string;
      type: string;
    };
    value: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

