import PropTypes from 'prop-types';
import { Avatar, Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';

function formatMoney(value, currency) {
  return `${Number(value).toLocaleString('ar-DZ')} ${currency}`;
}

export default function OrderSummary({ items, subtotal, shippingFee, total, currency }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          ملخص الطلب
        </Typography>

        <Stack spacing={2} divider={<Divider flexItem />}>
          {items.length === 0 && (
            <Typography color="text.secondary" variant="body2">
              لا توجد منتجات في السلة بعد.
            </Typography>
          )}

          {items.map((item) => (
            <Stack key={item.id} direction="row" spacing={2} alignItems="center">
              <Avatar
                src={item.image_snapshot ?? undefined}
                variant="rounded"
                sx={{ width: 56, height: 56, bgcolor: 'secondary.light' }}
              >
                <Inventory2RoundedIcon />
              </Avatar>

              <Box flexGrow={1}>
                <Typography variant="subtitle2">{item.name_snapshot}</Typography>
                {Object.keys(item.selected_options ?? {}).length > 0 && (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={0.5}>
                    {Object.entries(item.selected_options).map(([key, value]) => (
                      <Chip key={key} size="small" label={`${key}: ${value}`} variant="outlined" />
                    ))}
                  </Stack>
                )}
                <Typography variant="caption" color="text.secondary">
                  الكمية: {item.quantity}
                </Typography>
              </Box>

              <Typography variant="subtitle2" whiteSpace="nowrap">
                {formatMoney(item.unit_price * item.quantity, currency)}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              المجموع الفرعي
            </Typography>
            <Typography variant="body2">{formatMoney(subtotal, currency)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              رسوم التوصيل
            </Typography>
            <Typography variant="body2">{formatMoney(shippingFee, currency)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={800}>
              الإجمالي
            </Typography>
            <Typography variant="subtitle1" fontWeight={800} color="primary.main">
              {formatMoney(total, currency)}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

OrderSummary.propTypes = {
  items: PropTypes.array.isRequired,
  subtotal: PropTypes.number.isRequired,
  shippingFee: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  currency: PropTypes.string.isRequired,
};
