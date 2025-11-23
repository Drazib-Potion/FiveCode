import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../media/fives-logo-white.png';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ 
        backgroundColor: '#A62182', 
        color: 'white', 
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img 
            src={logo} 
            alt="Fives Logo" 
            style={{ height: '70px', width: 'auto', marginBottom: '10px' }}
          />
          <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Configurateur de Produits
          </h1>
        </div>
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
          margin: '0 2rem'
        }}>
          <NavLink 
            to="/product-types" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Types de produit
          </NavLink>
          <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
          <NavLink 
            to="/families" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Familles
          </NavLink>
          <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
          <NavLink 
            to="/products" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Produits
          </NavLink>
          <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
          <NavLink 
            to="/variants" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Variantes
          </NavLink>
          <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
          <NavLink 
            to="/technical-characteristics" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Caractéristiques techniques
          </NavLink>
          <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
          <NavLink 
            to="/generator" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Générateur
          </NavLink>
          <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
          <NavLink 
            to="/generated-codes" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Codes Générés
          </NavLink>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.875rem' }}>{user?.email}</span>
          <button 
            onClick={handleLogout}
            style={{
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              fontSize: '0.875rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c0392b'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e74c3c'}
          >
            Déconnexion
          </button>
        </div>
      </nav>
      <main style={{ 
        flex: 1, 
        padding: '2rem', 
        maxWidth: '1400px', 
        width: '100%', 
        margin: '0 auto'
      }}>
        <Outlet />
      </main>
    </div>
  );
}

