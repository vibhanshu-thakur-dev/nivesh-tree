import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
};

// Investments API
export const investmentsAPI = {
  getInvestments: (memberId = null) => api.get('/investments', { params: memberId ? { memberId } : {} }),
  addInvestment: (investment) => api.post('/investments', investment),
  updateInvestment: (id, investment) => api.put(`/investments/${id}`, investment),
  deleteInvestment: (id) => api.delete(`/investments/${id}`),
  syncTrading212: (memberId) => api.post('/investments/sync/trading212', { memberId }),
  importTickertapeCSV: (formData, memberId) => {
    const data = new FormData();
    data.append('csvFile', formData.get('csvFile'));
    data.append('memberId', memberId);
    return api.post('/investments/import/tickertape', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getPortfolioSummary: (memberId = null) => api.get('/investments/portfolio/summary', { params: memberId ? { memberId } : {} }),
  // Trading212 specific endpoints
  getTrading212Account: () => api.get('/investments/trading212/account'),
  getTrading212Instruments: () => api.get('/investments/trading212/instruments'),
  getTrading212Orders: (ticker = null, limit = 20) => api.get('/investments/trading212/orders', { params: { ticker, limit } }),
  getTrading212Dividends: (ticker = null, limit = 20) => api.get('/investments/trading212/dividends', { params: { ticker, limit } }),
  // Stored Trading212 data endpoints
  getTrading212StoredOrders: (ticker = null, limit = 100, offset = 0) => api.get('/investments/trading212/orders/stored', { params: { ticker, limit, offset } }),
  getTrading212OrderStats: () => api.get('/investments/trading212/orders/stats'),
  getTrading212Summary: () => api.get('/investments/trading212/summary'),
  clearTrading212Data: () => api.delete('/investments/trading212/clear'),
  clearAllInvestmentData: () => api.delete('/investments/clear-all'),
  clearPlatformData: (platform) => api.delete(`/investments/clear/${platform}`),
};

// Goals API
export const goalsAPI = {
  getGoals: () => api.get('/goals'),
  createGoal: (goal) => api.post('/goals', goal),
  updateGoal: (id, goal) => api.put(`/goals/${id}`, goal),
  deleteGoal: (id) => api.delete(`/goals/${id}`),
  updateGoalProgress: (id) => api.post(`/goals/${id}/update-progress`),
  getGoalProgress: () => api.get('/goals/progress'),
};

// External APIs
export const externalAPI = {
  searchStocks: (query) => api.get(`/external/stocks/search?q=${query}`),
  getStockPrice: (symbol) => api.get(`/external/stocks/${symbol}/price`),
  getMutualFunds: () => api.get('/external/mutual-funds'),
};

// API Keys API
export const apiKeysAPI = {
  getApiKeys: () => api.get('/api-keys'),
  updateApiKeys: (apiKeys) => api.put('/api-keys', apiKeys),
  deleteApiKey: (platform) => api.delete(`/api-keys/${platform}`),
  testTrading212Key: (apiKey) => api.post('/api-keys/test/trading212', { apiKey }),
};

export const householdsAPI = {
  getHousehold: () => api.get('/households'),
  updateHousehold: (data) => api.put('/households', data),
  getMembers: () => api.get('/households/members'),
  addMember: (memberData) => api.post('/households/members', memberData),
  updateMember: (memberId, memberData) => api.put(`/households/members/${memberId}`, memberData),
  deleteMember: (memberId) => api.delete(`/households/members/${memberId}`),
};

export const memberApiKeysAPI = {
  getMemberApiKeys: (memberId) => api.get(`/member-api-keys/${memberId}`),
  updateMemberApiKeys: (memberId, apiKeys) => api.put(`/member-api-keys/${memberId}`, apiKeys),
  deleteMemberApiKey: (memberId, platform) => api.delete(`/member-api-keys/${memberId}/${platform}`),
  testMemberTrading212Key: (memberId, apiKey) => api.post(`/member-api-keys/${memberId}/test/trading212`, { apiKey }),
};

// Currency API
export const currencyAPI = {
  getSupportedCurrencies: () => api.get('/currency/currencies'),
  getExchangeRates: () => api.get('/currency/rates'),
  convertAmount: (amount, fromCurrency, toCurrency) => api.post('/currency/convert', { amount, fromCurrency, toCurrency }),
  convertPortfolioData: (portfolioData, targetCurrency) => api.post('/currency/convert-portfolio', { portfolioData, targetCurrency }),
};

export default api;
