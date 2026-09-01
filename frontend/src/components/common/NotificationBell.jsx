import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  Typography,
} from '@mui/material';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/client';

const TYPE_ICON = {
  new_order: '🛍️',
  order_confirmed: '✅',
  manual_order: '📝',
  receipt_sent: '📤',
  receipt_failed: '⚠️',
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return `منذ ${Math.floor(hours / 24)} ي`;
}

/** Bell icon + popover feed, polled every 20s so new AI-parsed/manual orders surface without a page reload. */
export default function NotificationBell() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const load = () => {
    fetchNotifications()
      .then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 20000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleItemClick = async (n) => {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      load();
    }
    handleClose();
    navigate('/orders');
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    load();
  };

  return (
    <>
      <IconButton onClick={handleOpen} size="large">
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsRoundedIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { width: 340, maxHeight: 440, borderRadius: 3 } }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" px={2} py={1.5}>
          <Typography variant="subtitle2" fontWeight={800}>
            الإشعارات
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAll}>
              تعليم الكل كمقروء
            </Button>
          )}
        </Stack>
        <Divider />

        {notifications.length === 0 ? (
          <Box p={3} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              لا توجد إشعارات بعد
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ overflowY: 'auto', maxHeight: 360 }}>
            {notifications.map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => handleItemClick(n)}
                sx={{ opacity: n.is_read ? 0.6 : 1, alignItems: 'flex-start', gap: 1 }}
              >
                <Box component="span" sx={{ fontSize: 18, mt: 0.3 }}>
                  {TYPE_ICON[n.type] ?? '🔔'}
                </Box>
                <ListItemText
                  primary={n.title}
                  secondary={
                    <>
                      {n.body}
                      <Box component="span" display="block" fontSize={11} color="text.disabled" mt={0.3}>
                        {timeAgo(n.created_at)}
                      </Box>
                    </>
                  }
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 700 }}
                  secondaryTypographyProps={{ variant: 'caption', component: 'div' }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}
