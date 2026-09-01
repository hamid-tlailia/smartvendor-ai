import PropTypes from 'prop-types';
import { Card, CardContent, Grid, TextField, Typography } from '@mui/material';

export default function CustomerForm({ values, errors, onChange }) {
  const handle = (field) => (event) => onChange(field, event.target.value);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          معلومات التوصيل
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="الاسم الكامل"
              value={values.customerName}
              onChange={handle('customerName')}
              error={Boolean(errors.customerName)}
              helperText={errors.customerName}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="رقم الهاتف"
              value={values.customerPhone}
              onChange={handle('customerPhone')}
              error={Boolean(errors.customerPhone)}
              helperText={errors.customerPhone}
              inputProps={{ inputMode: 'tel', dir: 'ltr' }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="المدينة"
              value={values.customerCity}
              onChange={handle('customerCity')}
              error={Boolean(errors.customerCity)}
              helperText={errors.customerCity}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="العنوان التفصيلي"
              value={values.customerAddress}
              onChange={handle('customerAddress')}
              error={Boolean(errors.customerAddress)}
              helperText={errors.customerAddress}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

CustomerForm.propTypes = {
  values: PropTypes.shape({
    customerName: PropTypes.string,
    customerPhone: PropTypes.string,
    customerCity: PropTypes.string,
    customerAddress: PropTypes.string,
  }).isRequired,
  errors: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};
