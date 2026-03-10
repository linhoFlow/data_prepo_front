import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PreprocessingPipeline from './pages/PreprocessingPipeline';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import AdminLayout from './components/admin/AdminLayout';
import AdminStats from './pages/admin/AdminStats';
import AdminManagers from './pages/admin/AdminManagers';
import AdminClients from './pages/admin/AdminClients';
import TierBlockedListener from './components/TierBlockedListener';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <TierBlockedListener />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/app" element={<PreprocessingPipeline />} />

          {/* Admin Routes */}
          <Route path="/admin">
            <Route index element={<AdminLoginPage />} />
            <Route path="register" element={<AdminRegisterPage />} />
            <Route element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminStats />} />
              <Route path="managers" element={<AdminManagers />} />
              <Route path="clients" element={<AdminClients />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
