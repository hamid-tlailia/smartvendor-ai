import PropTypes from 'prop-types';
import { Card, CardContent, FormControlLabel, Paper, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';

const OPTIONS = [
  { value: 'cod', label: 'الدفع عند الاستلام', icon: LocalShippingRoundedIcon },
  { value: 'online', label: 'الدفع الإلكتروني', icon: CreditCardRoundedIcon },
  { value: 'bank_transfer', label: 'تحويل بنكي', icon: AccountBalanceRoundedIcon },
];

export default function PaymentMethodSelector({ value, onChange }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          طريقة الدفع
        </Typography>

        <RadioGroup value={value} onChange={(e) => onChange(e.target.value)}>
          <Stack spacing={1.5}>
            {OPTIONS.map(({ value: v, label, icon: Icon }) => (
              <Paper
                key={v}
                variant="outlined"
                sx={{
                  borderColor: value === v ? 'primary.main' : 'divider',
                  borderWidth: value === v ? 2 : 1,
                  borderRadius: 3,
                }}
              >
                <FormControlLabel
                  value={v}
                  sx={{ width: '100%', m: 0, px: 1.5, py: 1 }}
                  control={<Radio />}
                  label={
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Icon color={value === v ? 'primary' : 'action'} fontSize="small" />
                      <Typography variant="body2">{label}</Typography>
                    </Stack>
                  }
                />
              </Paper>
            ))}
          </Stack>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

PaymentMethodSelector.propTypes = {
  value: PropTypes.oneOf(['cod', 'online', 'bank_transfer']).isRequired,
  onChange: PropTypes.func.isRequired,
};
