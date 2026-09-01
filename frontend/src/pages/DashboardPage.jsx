import { useEffect, useState } from 'react';
import { Alert, Container, Stack, Typography } from '@mui/material';
import { fetchDashboardStats, fetchOrders } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatsCards from '../components/dashboard/StatsCards';
import OrdersTable from '../components/dashboard/OrdersTable';

/** Merchant dashboard: live cross-channel order feed + quick stat cards. */
export default function DashboardPage() {
  const { merchant } = useAuth();
  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchOrders()])
      .then(([statsRes, ordersRes]) => {
        setStats(statsRes);
        setOrders(ordersRes.orders ?? []);
      })
      .catch(() => setError('تعذر تحميل بيانات لوحة التحكم.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
      <Stack spacing={0.5} mb={3}>
        <Typography variant="h5" fontWeight={800}>
          مرحباً بك، {merchant?.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          الطلبات الحية عبر واتساب، إنستغرام، ماسنجر وتيك توك
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        <StatsCards stats={stats} currency={merchant?.default_currency ?? 'DZD'} />
        <OrdersTable orders={orders} loading={loading} />
      </Stack>
    </Container>
  );
}
