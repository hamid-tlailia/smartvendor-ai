import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const EMPTY = { merchantName: '', fullName: '', email: '', password: '' };

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error === 'email already registered' ? 'هذا البريد الإلكتروني مسجل مسبقاً' : 'فشل إنشاء الحساب');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="background.default" px={2} py={4}>
      <Paper sx={{ width: '100%', maxWidth: 440, p: 4, borderRadius: 4 }}>
        <Stack spacing={0.5} mb={3} textAlign="center">
          <Typography variant="h5" fontWeight={800}>
            أنشئ متجرك على SmartVendor AI
          </Typography>
          <Typography variant="body2" color="text.secondary">
            حساب واحد لإدارة طلباتك عبر كل القنوات
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField label="اسم المتجر" required value={form.merchantName} onChange={handleChange('merchantName')} />
            <TextField label="الاسم الكامل" required value={form.fullName} onChange={handleChange('fullName')} />
            <TextField
              type="email"
              label="البريد الإلكتروني"
              required
              value={form.email}
              onChange={handleChange('email')}
              inputProps={{ dir: 'ltr' }}
            />
            <TextField
              type="password"
              label="كلمة المرور"
              required
              helperText="8 أحرف على الأقل"
              value={form.password}
              onChange={handleChange('password')}
              inputProps={{ dir: 'ltr', minLength: 8 }}
            />
            <Button type="submit" variant="contained" size="large" disabled={submitting}>
              {submitting ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" textAlign="center" mt={3} color="text.secondary">
          لديك حساب بالفعل؟{' '}
          <Link component={RouterLink} to="/login" fontWeight={700}>
            تسجيل الدخول
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
