import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import FamiliesPage from './pages/FamiliesPage';
import VariantsPage from './pages/VariantsPage';
import TechnicalCharacteristicsPage from './pages/TechnicalCharacteristicsPage';
import ProductsPage from './pages/ProductsPage';
import GeneratorPage from './pages/GeneratorPage';
import GeneratedCodesPage from './pages/GeneratedCodesPage';
import ProductTypesPage from './pages/ProductTypesPage';
import AdminUsersPage from './pages/AdminUsersPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import { User } from './utils/types';

type ProtectedRouteProps = {
  children: React.ReactNode;
  roles?: Array<User['role']>;
};

function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized, user } = useAuth();

  if (!isInitialized) {
    return <div className="loading">Chargement...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (roles && roles.length > 0) {
    const userRole = user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }
  
  return <>{children}</>;
}

function NotFoundRoute() {
  const { isAuthenticated, isInitialized } = useAuth();
  
  if (!isInitialized) {
    return <div className="loading">Chargement...</div>;
  }
  
  return <Navigate to={isAuthenticated ? "/" : "/login"} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/product-types" />} />
        <Route path="families" element={<FamiliesPage />} />
        <Route path="product-types" element={<ProductTypesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="variants" element={<VariantsPage />} />
        <Route path="technical-characteristics" element={<TechnicalCharacteristicsPage />} />
        <Route
          path="generator"
          element={
            <ProtectedRoute roles={['MANAGER', 'ADMIN']}>
              <GeneratorPage />
            </ProtectedRoute>
          }
        />
        <Route path="generated-codes" element={<GeneratedCodesPage />} />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ModalProvider>
    </AuthProvider>
  );
}

export default App;

