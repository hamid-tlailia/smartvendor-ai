import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

export async function fetchCart(cartId) {
  const { data } = await apiClient.get(`/checkout/${cartId}`);
  return data;
}

export async function confirmOrder(cartId, payload) {
  const { data } = await apiClient.post(`/checkout/${cartId}/confirm`, payload);
  return data;
}

export async function fetchDashboardStats(merchantId) {
  const { data } = await apiClient.get('/dashboard/stats', { params: { merchantId } });
  return data;
}

export async function fetchDashboardOrders(merchantId) {
  const { data } = await apiClient.get('/dashboard/orders', { params: { merchantId } });
  return data;
}
