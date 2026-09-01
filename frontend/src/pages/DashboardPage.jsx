import { useEffect, useState } from 'react';
import { Alert, Container, Stack, Typography } from '@mui/material';
import { fetchDashboardOrders, fetchDashboardStats } from '../api/client';
import StatsCards from '../components/dashboard/StatsCards';
import OrdersTable from '../components/dashboard/OrdersTable';

/** Merchant dashboard: live cross-channel order feed + quick stat cards. */
export default function DashboardPage() {
  const merchantId = import.meta.env.VITE_DEMO_MERCHANT_ID;
  const [stats, setStats] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!merchantId) {
      setError('لم يتم تعيين VITE_DEMO_MERCHANT_ID.');
      setLoading(false);
      return;
    }
    Promise.all([fetchDashboardStats(merchantId), fetchDashboardOrders(merchantId)])
      .then(([statsRes, ordersRes]) => {
        setStats(statsRes);
        setOrders(ordersRes.orders ?? []);
      })
      .catch(() => setError('تعذر تحميل بيانات لوحة التحكم.'))
      .finally(() => setLoading(false));
  }, [merchantId]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
      <Stack spacing={0.5} mb={3}>
        <Typography variant="h5" fontWeight={800}>
          لوحة تحكم التاجر
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
        <StatsCards stats={stats} currency={orders[0]?.currency ?? 'DZD'} />
        <OrdersTable orders={orders} loading={loading} />
      </Stack>
    </Container>
  );
}
