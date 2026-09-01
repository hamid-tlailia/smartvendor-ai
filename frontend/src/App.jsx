import { Navigate, Route, Routes } from 'react-router-dom';
import DirectionProvider from './theme/DirectionProvider';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppShell from './layouts/AppShell';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import NewOrderPage from './pages/NewOrderPage';
import NotificationsPage from './pages/NotificationsPage';
import AccountSettingsPage from './pages/AccountSettingsPage';

function Shell({ page }) {
  return (
    <ProtectedRoute>
      <AppShell>{page}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <DirectionProvider direction="rtl">
      <AuthProvider>
        <Routes>
          {/* Public — customer-facing checkout and admin auth */}
          <Route path="/checkout/:cartId" element={<CheckoutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected — merchant dashboard app shell (sidebar tabs) */}
          <Route path="/dashboard" element={<Shell page={<DashboardPage />} />} />
          <Route path="/orders/new" element={<Shell page={<NewOrderPage />} />} />
          <Route path="/notifications" element={<Shell page={<NotificationsPage />} />} />
          <Route path="/account" element={<Shell page={<AccountSettingsPage />} />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </DirectionProvider>
  );
}
