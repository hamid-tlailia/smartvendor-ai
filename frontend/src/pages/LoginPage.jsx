import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error === 'invalid email or password' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'فشل تسجيل الدخول');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="background.default" px={2}>
      <Paper sx={{ width: '100%', maxWidth: 400, p: 4, borderRadius: 4 }}>
        <Stack spacing={0.5} mb={3} textAlign="center">
          <Typography variant="h5" fontWeight={800}>
            تسجيل دخول التاجر
          </Typography>
          <Typography variant="body2" color="text.secondary">
            SmartVendor AI — لوحة التحكم
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              type="email"
              label="البريد الإلكتروني"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              inputProps={{ dir: 'ltr' }}
            />
            <TextField
              type="password"
              label="كلمة المرور"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              inputProps={{ dir: 'ltr' }}
            />
            <Button type="submit" variant="contained" size="large" disabled={submitting}>
              {submitting ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </Button>
          </Stack>
        </Box>

        <Typography variant="body2" textAlign="center" mt={3} color="text.secondary">
          ليس لديك حساب؟{' '}
          <Link component={RouterLink} to="/register" fontWeight={700}>
            أنشئ متجرك الآن
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
