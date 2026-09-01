import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import { createManualOrder, searchProducts } from '../api/client';
import PaymentMethodSelector from '../components/checkout/PaymentMethodSelector';

const SOURCES = [
  { value: 'whatsapp', label: 'واتساب', icon: '🟢' },
  { value: 'instagram', label: 'إنستغرام', icon: '📸' },
  { value: 'messenger', label: 'ماسنجر', icon: '🔵' },
  { value: 'tiktok', label: 'تيك توك', icon: '🎵' },
  { value: 'manual', label: 'مكالمة هاتفية / حضوري / آخر', icon: '☎️' },
];

const EMPTY_FORM = { source: 'manual', customerName: '', customerPhone: '', customerCity: '', customerAddress: '' };

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [items, setItems] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSearch = async (query) => {
    if (!query || query.length < 2) return;
    setSearching(true);
    try {
      const products = await searchProducts(query);
      setProductOptions(products);
    } finally {
      setSearching(false);
    }
  };

  const handleAddProduct = (product) => {
    if (!product) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleQtyChange = (id, quantity) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)));
  };

  const handleRemove = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  const total = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  const handleSubmit = async () => {
    setError(null);
    if (items.length === 0) {
      setError('أضف منتجاً واحداً على الأقل');
      return;
    }
    setSubmitting(true);
    try {
      await createManualOrder({
        ...form,
        paymentMethod,
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
      });
      setSuccess(true);
      setForm(EMPTY_FORM);
      setItems([]);
      setTimeout(() => navigate('/dashboard'), 1400);
    } catch (err) {
      setError(err.response?.data?.error ?? 'تعذر إنشاء الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 } }}>
      <Stack spacing={0.5} mb={3}>
        <Typography variant="h5" fontWeight={800}>
          طلب يدوي جديد
        </Typography>
        <Typography variant="body2" color="text.secondary">
          لإدخال طلب استلمته هاتفياً أو حضورياً أو من محادثة لم يعالجها الذكاء الاصطناعي
        </Typography>
      </Stack>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          تم إنشاء الطلب بنجاح — جاري التحويل للوحة التحكم...
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              مصدر الطلب
            </Typography>
            <TextField select fullWidth value={form.source} onChange={handleChange('source')}>
              {SOURCES.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.icon} &nbsp; {s.label}
                </MenuItem>
              ))}
            </TextField>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              المنتجات
            </Typography>
            <Autocomplete
              options={productOptions}
              loading={searching}
              getOptionLabel={(o) => o.name ?? ''}
              filterOptions={(x) => x}
              onInputChange={(_, value) => handleSearch(value)}
              onChange={(_, value) => handleAddProduct(value)}
              value={null}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar src={option.image_url ?? undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
                      <Inventory2RoundedIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary" className="nums">
                        {option.price} {option.currency}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              )}
              renderInput={(params) => <TextField {...params} label="ابحث عن منتج لإضافته..." />}
            />

            <Stack spacing={1.5} mt={2}>
              {items.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  لم تتم إضافة أي منتج بعد.
                </Typography>
              )}
              {items.map((item) => (
                <Stack key={item.id} direction="row" alignItems="center" spacing={1.5}>
                  <Avatar src={item.image_url ?? undefined} variant="rounded" sx={{ width: 40, height: 40 }}>
                    <Inventory2RoundedIcon fontSize="small" />
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={700}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.price} {item.currency}
                    </Typography>
                  </Box>
                  <TextField
                    type="number"
                    size="small"
                    value={item.quantity}
                    onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                    sx={{ width: 76 }}
                    inputProps={{ min: 1 }}
                  />
                  <IconButton size="small" color="error" onClick={() => handleRemove(item.id)}>
                    <DeleteRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              {items.length > 0 && (
                <Stack direction="row" justifyContent="flex-end">
                  <Chip label={`الإجمالي: ${total.toLocaleString('ar-DZ')}`} color="primary" sx={{ fontWeight: 700 }} />
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              معلومات العميل والتوصيل
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="الاسم الكامل" value={form.customerName} onChange={handleChange('customerName')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="رقم الهاتف"
                  value={form.customerPhone}
                  onChange={handleChange('customerPhone')}
                  inputProps={{ inputMode: 'tel', dir: 'ltr' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="المدينة" value={form.customerCity} onChange={handleChange('customerCity')} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="العنوان التفصيلي"
                  value={form.customerAddress}
                  onChange={handleChange('customerAddress')}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />

        <Button variant="contained" size="large" disabled={submitting} onClick={handleSubmit}>
          {submitting ? 'جاري الحفظ...' : 'حفظ الطلب'}
        </Button>
      </Stack>
    </Container>
  );
}
