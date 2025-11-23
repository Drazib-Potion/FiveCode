import axios from 'axios';

// Utilise la variable d'environnement VITE_API_URL (obligatoire)
// En dev et prod: /api (proxyfié par Vite en dev, par Nginx en prod)
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

// Intercepteur pour ajouter le token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Ne pas rediriger si on est déjà sur la page de login
      // ou si la requête est vers les endpoints d'authentification
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                            error.config?.url?.includes('/auth/register');
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

// Auth Service
export const authService = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/register', { email, password });
    return response.data;
  },
};

// Families Service
export const familiesService = {
  getAll: async () => {
    const response = await apiClient.get('/families');
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

// Variants Service
export const variantsService = {
  getAll: async (familyId?: string) => {
    const url = familyId ? `/variants?familyId=${familyId}` : '/variants';
    const response = await apiClient.get(url);
    return response.data;
  },
  getById: async (id: string) => {
    const response = await apiClient.get(`/variants/${id}`);
    return response.data;
  },
  create: async (data: { familyId: string; name: string; code: string; excludedVariantIds?: string[] }) => {
    const response = await apiClient.post('/variants', data);
    return response.data;
  },
  update: async (id: string, data: { familyId?: string; name?: string; code?: string; excludedVariantIds?: string[] }) => {
    const response = await apiClient.patch(`/variants/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/variants/${id}`);
    return response.data;
  },
};

// Technical Characteristics Service
export const technicalCharacteristicsService = {
  getAll: async (familyId?: string, variantIds?: string) => {
    const params = new URLSearchParams();
    if (familyId) params.append('familyId', familyId);
    // Toujours passer variantIds si familyId est présent, même si c'est une chaîne vide
    // Cela permet au backend de distinguer entre "toutes les caractéristiques" et "caractéristiques sans variante"
    if (familyId && variantIds !== undefined) {
      params.append('variantIds', variantIds);
    }
    const url = params.toString() ? `/technical-characteristics?${params}` : '/technical-characteristics';
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

// Products Service
export const productsService = {
  create: async (data: { name: string; code: string; familyId: string }) => {
    const response = await apiClient.post('/products', data);
    return response.data;
  },
  getAll: async () => {
    const response = await apiClient.get('/products');
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

// Product Generated Info Service
export const productGeneratedInfoService = {
  create: async (data: {
    productId: string;
    variantId?: string;
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
};

// Product Types Service
export const productTypesService = {
  getAll: async () => {
    const response = await apiClient.get('/product-types');
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


