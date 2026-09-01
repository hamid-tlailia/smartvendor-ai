import { Navigate, Route, Routes } from 'react-router-dom';
import DirectionProvider from './theme/DirectionProvider';
import CheckoutPage from './pages/CheckoutPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  return (
    <DirectionProvider direction="rtl">
      <Routes>
        <Route path="/checkout/:cartId" element={<CheckoutPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DirectionProvider>
  );
}
