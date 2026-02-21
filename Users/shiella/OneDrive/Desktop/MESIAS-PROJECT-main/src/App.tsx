import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import BeneficiaryDashboard from './pages/BeneficiaryDashboard';
import ApplicationForm from './pages/ApplicationForm';
import BHWDashboard from './pages/BHWDashboard';
import MswdoDashboard from './pages/MswdoDashboard';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children, allowedTypes }: { children: React.ReactNode; allowedTypes?: string[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedTypes && !allowedTypes.includes(user.user_type)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.user_type) {
    case 'beneficiary':
      return <Navigate to="/beneficiary/dashboard" replace />;
    case 'bhw':
      return <Navigate to="/bhw/dashboard" replace />;
    case 'mswdo':
      return <Navigate to="/mswdo/dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            path="/beneficiary/dashboard"
            element={
              <ProtectedRoute allowedTypes={['beneficiary']}>
                <BeneficiaryDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/beneficiary/apply/:programId"
            element={
              <ProtectedRoute allowedTypes={['beneficiary']}>
                <ApplicationForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bhw/dashboard"
            element={
              <ProtectedRoute allowedTypes={['bhw']}>
                <BHWDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mswdo/dashboard"
            element={
              <ProtectedRoute allowedTypes={['mswdo']}>
                <MswdoDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedTypes={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
