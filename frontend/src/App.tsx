import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import FamiliesPage from './pages/FamiliesPage';
import VariantsPage from './pages/VariantsPage';
import FieldsPage from './pages/FieldsPage';
import ProductsPage from './pages/ProductsPage';
import GeneratorPage from './pages/GeneratorPage';
import GeneratedCodesPage from './pages/GeneratedCodesPage';
import ProductTypesPage from './pages/ProductTypesPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuth();
  
  // Attendre que l'initialisation soit terminée avant de rediriger
  if (!isInitialized) {
    return <div className="loading">Chargement...</div>;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
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
        <Route index element={<Navigate to="/families" />} />
        <Route path="families" element={<FamiliesPage />} />
        <Route path="product-types" element={<ProductTypesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="variants" element={<VariantsPage />} />
        <Route path="fields" element={<FieldsPage />} />
        <Route path="generated-codes" element={<GeneratedCodesPage />} />
        <Route path="generator" element={<GeneratorPage />} />
      </Route>
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

