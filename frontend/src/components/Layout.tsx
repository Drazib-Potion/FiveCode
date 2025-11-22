import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>Configurateur de Produits</h1>
        </div>
        <div className="navbar-menu">
          <NavLink 
            to="/product-types" 
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Types de produit
          </NavLink>
          <span className="nav-separator">|</span>
          <NavLink 
            to="/families" 
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Familles
          </NavLink>
          <span className="nav-separator">|</span>
          <NavLink 
            to="/products" 
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Produits
          </NavLink>
          <span className="nav-separator">|</span>
          <NavLink 
            to="/variants" 
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Variantes
          </NavLink>
          <span className="nav-separator">|</span>
          <NavLink 
            to="/fields" 
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Caractéristiques techniques
          </NavLink>
          <span className="nav-separator">|</span>
          <NavLink 
            to="/generator" 
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Générateur
          </NavLink>
          <span className="nav-separator">|</span>
          <NavLink 
            to="/generated-codes" 
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Codes Générés
          </NavLink>
        </div>
        <div className="navbar-user">
          <span>{user?.email}</span>
          <button onClick={handleLogout}>Déconnexion</button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

