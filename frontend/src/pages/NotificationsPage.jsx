import { useEffect, useState } from 'react';
import { Button, Card, Container, Divider, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../api/client';

const TYPE_ICON = {
  new_order: '🛍️',
  order_confirmed: '✅',
  manual_order: '📝',
  receipt_sent: '📤',
  receipt_failed: '⚠️',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetchNotifications()
      .then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    load();
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack spacing={0.5}>
          <Typography variant="h5" fontWeight={800}>
            الإشعارات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'كل الإشعارات مقروءة'}
          </Typography>
        </Stack>
        {unreadCount > 0 && (
          <Button variant="outlined" onClick={handleMarkAll}>
            تعليم الكل كمقروء
          </Button>
        )}
      </Stack>

      <Card>
        {!loading && notifications.length === 0 && (
          <Stack p={4} alignItems="center" spacing={1}>
            <Typography variant="body1" fontWeight={700}>
              لا توجد إشعارات
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ستظهر هنا الطلبات الجديدة وتأكيدات الدفع وحالة إرسال الإيصالات.
            </Typography>
          </Stack>
        )}
        <List disablePadding>
          {notifications.map((n, idx) => (
            <div key={n.id}>
              <ListItem
                sx={{ opacity: n.is_read ? 0.6 : 1, cursor: 'pointer', py: 1.5 }}
                onClick={() => !n.is_read && markNotificationRead(n.id).then(load)}
              >
                <Typography sx={{ fontSize: 20, mr: 1.5 }}>{TYPE_ICON[n.type] ?? '🔔'}</Typography>
                <ListItemText
                  primary={n.title}
                  secondary={
                    <>
                      {n.body}
                      <Typography component="span" display="block" variant="caption" color="text.disabled">
                        {new Date(n.created_at).toLocaleString('ar-DZ')}
                      </Typography>
                    </>
                  }
                  primaryTypographyProps={{ fontWeight: 700, fontSize: 14 }}
                />
              </ListItem>
              {idx < notifications.length - 1 && <Divider component="li" />}
            </div>
          ))}
        </List>
      </Card>
    </Container>
  );
}
