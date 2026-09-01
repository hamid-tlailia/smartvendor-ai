import { useState } from 'react';
import { Alert, Button, Card, CardContent, Container, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { updateMerchantSettings } from '../api/client';

const CURRENCIES = ['DZD', 'MAD', 'TND', 'EGP', 'SAR', 'USD', 'EUR'];

export default function AccountSettingsPage() {
  const { merchant, admin, setMerchant, logout } = useAuth();
  const [name, setName] = useState(merchant?.name ?? '');
  const [currency, setCurrency] = useState(merchant?.default_currency ?? 'DZD');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { merchant: updated } = await updateMerchantSettings({ name, defaultCurrency: currency });
      setMerchant(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 4 } }}>
      <Stack spacing={0.5} mb={3}>
        <Typography variant="h5" fontWeight={800}>
          الحساب والإعدادات
        </Typography>
        <Typography variant="body2" color="text.secondary">
          بيانات المتجر وحساب الدخول
        </Typography>
      </Stack>

      <Stack spacing={2.5}>
        {saved && <Alert severity="success">تم حفظ التغييرات</Alert>}

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              معلومات المتجر
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField fullWidth label="اسم المتجر" value={name} onChange={(e) => setName(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select fullWidth label="العملة الافتراضية" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            <Button sx={{ mt: 2 }} variant="contained" disabled={saving} onClick={handleSave}>
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              حساب الدخول
            </Typography>
            <Stack spacing={0.5} mb={2}>
              <Typography variant="body2">
                <strong>الاسم:</strong> {admin?.full_name}
              </Typography>
              <Typography variant="body2" sx={{ direction: 'ltr', textAlign: 'right' }}>
                <strong>البريد الإلكتروني:</strong> {admin?.email}
              </Typography>
              <Typography variant="body2">
                <strong>الصلاحية:</strong> {admin?.role === 'owner' ? 'مالك' : 'موظف'}
              </Typography>
            </Stack>
            <Button color="error" variant="outlined" onClick={logout}>
              تسجيل الخروج
            </Button>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
