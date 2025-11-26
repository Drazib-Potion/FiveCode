import axios from 'axios';
import { User } from '../utils/types';

const API_BASE_URL = import.meta.env.VITE_API_URL

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL environment variable is required')
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      const isOnLoginPage = window.location.pathname === '/login';
      
      if (!isAuthEndpoint && !isOnLoginPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/register', { email, password });
    return response.data;
  },
  getProfile: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

export const familiesService = {
  getAll: async (offset: number = 0, limit: number = 50, search?: string) => {
    const params = new URLSearchParams();
    params.append('offset', offset.toString());
    params.append('limit', limit.toString());
    if (search && search.trim()) {
      params.append('search', search.trim());
    }
    const url = `/families?${params.toString()}`;
    const response = await apiClient.get(url);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/families/${id}`);
    return response.data;
  },
  create: async (data: { name: string }) => {
    const response = await apiClient.post('/families', data);
    return response.data;
  },
  update: async (id: string, data: { name: string }) => {
    const response = await apiClient.patch(`/families/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/families/${id}`);
    return response.data;
  },
};

export const variantsService = {
  getAll: async (familyId?: string, offset: number = 0, limit: number = 50, search?: string) => {
    const params = new URLSearchParams();
    if (familyId) params.append('familyId', familyId);
    params.append('offset', offset.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);
    const response = await apiClient.get(`/variants?${params}`);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/variants/${id}`);
    return response.data;
  },
  create: async (data: { familyId: string; name: string; code: string; variantLevel: 'FIRST' | 'SECOND' }) => {
    const response = await apiClient.post('/variants', data);
    return response.data;
  },
  update: async (id: string, data: { familyId?: string; name?: string; code?: string; variantLevel?: 'FIRST' | 'SECOND' }) => {
    const response = await apiClient.patch(`/variants/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/variants/${id}`);
    return response.data;
  },
};

export const technicalCharacteristicsService = {
  getAll: async (familyId?: string, variantIds?: string, offset: number = 0, limit: number = 50, search?: string) => {
    const params = new URLSearchParams();
    if (familyId) params.append('familyId', familyId);
    if (familyId && variantIds !== undefined) {
      params.append('variantIds', variantIds);
    }
    params.append('offset', offset.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);
    const url = `/technical-characteristics?${params}`;
    const response = await apiClient.get(url);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/technical-characteristics/${id}`);
    return response.data;
  },
  create: async (data: {
    name: string;
    type: string;
    familyIds?: string[];
    variantIds?: string[];
  }) => {
    const response = await apiClient.post('/technical-characteristics', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/technical-characteristics/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/technical-characteristics/${id}`);
    return response.data;
  },
};

export const productsService = {
  create: async (data: { name: string; code: string; familyId: string }) => {
    const response = await apiClient.post('/products', data);
    return response.data;
  },
  getAll: async (offset: number = 0, limit: number = 50, search?: string) => {
    const params = new URLSearchParams();
    params.append('offset', offset.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);
    const response = await apiClient.get(`/products?${params}`);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },
};

export const productGeneratedInfoService = {
  create: async (data: {
    productId: string;
    variant1Id?: string;
    variant2Id?: string;
    values?: Record<string, any>;
  }) => {
    const response = await apiClient.post('/product-generated-infos', data);
    return response.data;
  },
  getAll: async (productId?: string) => {
    const url = productId
      ? `/product-generated-infos?productId=${productId}`
      : '/product-generated-infos';
    const response = await apiClient.get(url);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/product-generated-infos/${id}`);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/product-generated-infos/${id}`);
    return response.data;
  },
  update: async (id: string, data: { values?: Record<string, any> }) => {
    const response = await apiClient.patch(`/product-generated-infos/${id}`, data);
    return response.data;
  },
};

export const productTypesService = {
  getAll: async (offset: number = 0, limit: number = 50, search?: string) => {
    const params = new URLSearchParams();
    params.append('offset', offset.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);
    const response = await apiClient.get(`/product-types?${params}`);
    return response.data;
  },
  getOne: async (id: string) => {
    const response = await apiClient.get(`/product-types/${id}`);
    return response.data;
  },
  create: async (data: { name: string; code: string }) => {
    const response = await apiClient.post('/product-types', data);
    return response.data;
  },
  update: async (id: string, data: { name?: string; code?: string }) => {
    const response = await apiClient.patch(`/product-types/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/product-types/${id}`);
    return response.data;
  },
};

export const usersService = {
  getAll: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },
  updateRole: async (id: string, role: User['role']) => {
    const response = await apiClient.patch(`/users/${id}/role`, { role });
    return response.data;
  },
};


