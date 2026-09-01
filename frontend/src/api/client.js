import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const TOKEN_STORAGE_KEY = 'smartvendor_token';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function setAuthToken(token) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

// ------------------------------- public checkout -----------------------------
export async function fetchCart(cartId) {
  const { data } = await apiClient.get(`/checkout/${cartId}`);
  return data;
}

export async function confirmOrder(cartId, payload) {
  const { data } = await apiClient.post(`/checkout/${cartId}/confirm`, payload);
  return data;
}

// ------------------------------------ auth ------------------------------------
export async function registerMerchant(payload) {
  const { data } = await apiClient.post('/auth/register', payload);
  return data;
}

export async function loginAdmin(payload) {
  const { data } = await apiClient.post('/auth/login', payload);
  return data;
}

export async function fetchCurrentSession() {
  const { data } = await apiClient.get('/auth/me');
  return data;
}

export async function updateMerchantSettings(payload) {
  const { data } = await apiClient.patch('/auth/merchant', payload);
  return data;
}

// ----------------------------------- dashboard ---------------------------------
export async function fetchDashboardStats() {
  const { data } = await apiClient.get('/dashboard/stats');
  return data;
}

export async function fetchOrders() {
  const { data } = await apiClient.get('/orders');
  return data;
}

export async function createManualOrder(payload) {
  const { data } = await apiClient.post('/orders/manual', payload);
  return data;
}

export async function sendOrderReceipt(cartId, payload) {
  const { data } = await apiClient.post(`/orders/${cartId}/send-receipt`, payload);
  return data;
}

// --------------------------------- products (picker) ---------------------------
export async function searchProducts(search) {
  const { data } = await apiClient.get('/products', { params: { search } });
  return data.products;
}

// -------------------------------- notifications ---------------------------------
export async function fetchNotifications() {
  const { data } = await apiClient.get('/notifications');
  return data;
}

export async function markNotificationRead(id) {
  const { data } = await apiClient.patch(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.patch('/notifications/read-all');
  return data;
}
