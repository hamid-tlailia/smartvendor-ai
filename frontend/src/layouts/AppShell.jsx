import { useState } from 'react';
import PropTypes from 'prop-types';
import { NavLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/common/NotificationBell';

const DRAWER_WIDTH = 248;

const NAV_ITEMS = [
  { to: '/dashboard', label: 'لوحة التحكم', icon: DashboardRoundedIcon },
  { to: '/orders/new', label: 'طلب يدوي جديد', icon: AddShoppingCartRoundedIcon },
  { to: '/notifications', label: 'الإشعارات', icon: NotificationsRoundedIcon },
  { to: '/account', label: 'الحساب والإعدادات', icon: SettingsRoundedIcon },
];

function SidebarContent({ onNavigate }) {
  return (
    <Box height="100%" display="flex" flexDirection="column">
      <Stack direction="row" alignItems="center" gap={1.5} px={2.5} py={2.5}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            background: 'linear-gradient(155deg, #1E6F5C, #123C31)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>SV</Typography>
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={800} lineHeight={1.1}>
            SmartVendor AI
          </Typography>
          <Typography variant="caption" color="text.secondary">
            البائع الذكي
          </Typography>
        </Box>
      </Stack>

      <List sx={{ px: 1.5, flex: 1 }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <ListItemButton
            key={to}
            component={NavLink}
            to={to}
            onClick={onNavigate}
            sx={{
              borderRadius: 2.5,
              mb: 0.5,
              '&.active': { bgcolor: 'primary.main', color: 'primary.contrastText' },
              '&.active .MuiListItemIcon-root': { color: 'primary.contrastText' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: 700 }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

SidebarContent.propTypes = { onNavigate: PropTypes.func };

/** Persistent sidebar + topbar shell wrapping every authenticated dashboard route — replaces the old single scrolling page. */
export default function AppShell({ children }) {
  const { admin, merchant, logout } = useAuth();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:900px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const currentLabel = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))?.label ?? 'لوحة التحكم';

  return (
    <Box display="flex" minHeight="100vh" bgcolor="background.default">
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{ sx: { width: DRAWER_WIDTH, border: 'none' } }}
        >
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          PaperProps={{ sx: { width: DRAWER_WIDTH, border: 'none', borderInlineEnd: '1px solid', borderColor: 'divider' } }}
        >
          <SidebarContent />
        </Drawer>
      )}

      <Box flex={1} minWidth={0} sx={{ marginInlineStart: isMobile ? 0 : `${DRAWER_WIDTH}px` }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Toolbar sx={{ gap: 1 }}>
            {isMobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)}>
                <MenuRoundedIcon />
              </IconButton>
            )}
            <Typography variant="subtitle1" fontWeight={800} flex={1}>
              {currentLabel}
            </Typography>

            <NotificationBell />

            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ ml: 0.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 13, fontWeight: 800 }}>
                {(admin?.full_name ?? '؟').trim().charAt(0)}
              </Avatar>
            </IconButton>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
              <Box px={2} py={1}>
                <Typography variant="body2" fontWeight={700}>
                  {admin?.full_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {merchant?.name}
                </Typography>
              </Box>
              <MenuItem onClick={logout}>
                <ListItemIcon>
                  <LogoutRoundedIcon fontSize="small" />
                </ListItemIcon>
                تسجيل الخروج
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box component="main">{children}</Box>
      </Box>
    </Box>
  );
}

AppShell.propTypes = { children: PropTypes.node };
