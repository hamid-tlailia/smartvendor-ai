import PropTypes from 'prop-types';
import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import ShoppingCartCheckoutRoundedIcon from '@mui/icons-material/ShoppingCartCheckoutRounded';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: `${color}.light` }}
          >
            <Icon sx={{ color: `${color}.dark` }} />
          </Stack>
          <Stack>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {value}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

StatCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  color: PropTypes.string.isRequired,
};

export default function StatsCards({ stats, currency }) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={PaidRoundedIcon}
          label="إجمالي المبيعات"
          value={`${Number(stats.totalSales ?? 0).toLocaleString('ar-DZ')} ${currency}`}
          color="success"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={PendingActionsRoundedIcon}
          label="الطلبات المعلقة"
          value={stats.pendingOrders ?? 0}
          color="warning"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={ShoppingCartCheckoutRoundedIcon}
          label="الطلبات المؤكدة"
          value={stats.confirmedOrders ?? 0}
          color="primary"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={RestoreRoundedIcon}
          label="سلات مستعادة"
          value={stats.recoveredCarts ?? 0}
          color="secondary"
        />
      </Grid>
    </Grid>
  );
}

StatsCards.propTypes = {
  stats: PropTypes.object.isRequired,
  currency: PropTypes.string,
};

StatsCards.defaultProps = { currency: 'DZD' };
