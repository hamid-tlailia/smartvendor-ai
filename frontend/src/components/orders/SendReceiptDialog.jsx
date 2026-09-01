import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { sendOrderReceipt } from '../../api/client';

const CHANNEL_LABEL_AR = { whatsapp: 'واتساب', instagram: 'إنستغرام', messenger: 'ماسنجر', tiktok: 'تيك توك', manual: 'يدوي', web: 'الموقع' };

/** Dialog for sending the order's PDF/image receipt back to the customer, via the channel it came from or WhatsApp directly. */
export default function SendReceiptDialog({ open, order, onClose }) {
  const [format, setFormat] = useState('pdf');
  const [via, setVia] = useState('origin');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  if (!order) return null;

  const originIsAddressable = ['whatsapp', 'instagram', 'messenger', 'tiktok'].includes(order.channel);

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const data = await sendOrderReceipt(order.id, { format, via });
      setResult({ type: 'success', message: `تم الإرسال عبر ${CHANNEL_LABEL_AR[data.channel] ?? data.channel}` });
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error ?? 'فشل إرسال الإيصال' });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>إرسال إيصال الطلب</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={0.5}>
          {result && <Alert severity={result.type}>{result.message}</Alert>}

          <Stack spacing={1}>
            <Typography variant="subtitle2">الوجهة</Typography>
            <RadioGroup value={via} onChange={(e) => setVia(e.target.value)}>
              <FormControlLabel
                value="origin"
                control={<Radio />}
                disabled={!originIsAddressable}
                label={originIsAddressable ? `القناة الأصلية (${CHANNEL_LABEL_AR[order.channel]})` : 'القناة الأصلية غير متاحة لهذا الطلب'}
              />
              <FormControlLabel value="whatsapp" control={<Radio />} label={`واتساب (${order.customer_phone ?? 'بدون رقم'})`} />
            </RadioGroup>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2">صيغة الإيصال</Typography>
            <RadioGroup row value={format} onChange={(e) => setFormat(e.target.value)}>
              <FormControlLabel value="pdf" control={<Radio />} label="PDF" />
              <FormControlLabel value="image" control={<Radio />} label="صورة" />
            </RadioGroup>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose}>إغلاق</Button>
        <Button variant="contained" disabled={sending} onClick={handleSend}>
          {sending ? 'جاري الإرسال...' : 'إرسال'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

SendReceiptDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  order: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};
