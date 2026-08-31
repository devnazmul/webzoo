import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import AppShell from '@/pages/AppShell';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function InviteRedirect() {
  const { token } = useParams<{ token: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  
  if (isAuthenticated) {
    return <Navigate to={`/app?invite=${token}`} replace />;
  } else {
    return <Navigate to={`/register?invite=${token}`} replace />;
  }
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<InviteRedirect />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
