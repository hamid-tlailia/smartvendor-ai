import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { confirmOrder, fetchCart } from '../api/client';
import OrderSummary from '../components/checkout/OrderSummary';
import CustomerForm from '../components/checkout/CustomerForm';
import PaymentMethodSelector from '../components/checkout/PaymentMethodSelector';

const EMPTY_FORM = { customerName: '', customerPhone: '', customerCity: '', customerAddress: '' };

function validate(values) {
  const errors = {};
  if (values.customerName.trim().length < 2) errors.customerName = 'الاسم قصير جداً';
  if (values.customerPhone.trim().length < 8) errors.customerPhone = 'رقم هاتف غير صالح';
  if (values.customerCity.trim().length < 2) errors.customerCity = 'الرجاء إدخال المدينة';
  if (values.customerAddress.trim().length < 4) errors.customerAddress = 'الرجاء إدخال عنوان تفصيلي';
  return errors;
}

/**
 * Micro-PWA checkout page. Loaded via the `checkoutUrl` the AI pipeline
 * generates (`/checkout/:cartId`); pre-fills whatever the AI already
 * extracted from the customer's chat, lets them fix it, then confirms.
 */
export default function CheckoutPage() {
  const { cartId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCart(cartId)
      .then((data) => {
        if (!active) return;
        setCart(data.cart);
        setItems(data.items);
        setForm({
          customerName: data.cart.customer_name ?? '',
          customerPhone: data.cart.customer_phone ?? '',
          customerCity: data.cart.customer_city ?? '',
          customerAddress: data.cart.customer_address ?? '',
        });
        setPaymentMethod(data.cart.payment_method ?? 'cod');
      })
      .catch(() => active && setError('تعذر العثور على الطلب. تأكد من الرابط.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [cartId]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await confirmOrder(cartId, { ...form, paymentMethod });
      setConfirmed(true);
    } catch {
      setError('فشل إرسال الطلب، الرجاء المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress color="primary" />
      </Container>
    );
  }

  if (error && !cart) {
    return (
      <Container sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (confirmed) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
        <CheckCircleRoundedIcon color="success" sx={{ fontSize: 72, mb: 2 }} />
        <Typography variant="h5" fontWeight={800} gutterBottom>
          تم استلام طلبك بنجاح!
        </Typography>
        <Typography color="text.secondary">سيتواصل معك فريقنا قريباً لتأكيد التوصيل.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 5 } }}>
      <Stack spacing={0.5} mb={3} textAlign="center">
        <Typography variant="h5" fontWeight={800}>
          إتمام الطلب
        </Typography>
        <Typography variant="body2" color="text.secondary">
          راجع طلبك وأكمل بياناتك لإتمام عملية الشراء
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        <OrderSummary
          items={items}
          subtotal={cart.subtotal}
          shippingFee={cart.shipping_fee}
          total={cart.total}
          currency={cart.currency}
        />

        <CustomerForm values={form} errors={errors} onChange={handleChange} />

        <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />

        <Box>
          <Button
            fullWidth
            size="large"
            variant="contained"
            color="primary"
            disabled={submitting || items.length === 0}
            onClick={handleSubmit}
          >
            {submitting ? 'جاري الإرسال...' : 'تأكيد وإرسال الطلب'}
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}
