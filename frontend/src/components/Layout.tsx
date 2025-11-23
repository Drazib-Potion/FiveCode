import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../media/fives-logo-white.png';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        flexWrap: 'wrap',
        gap: '1rem',
        position: 'relative'
      }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
          <img 
            src={logo} 
            alt="Fives Logo" 
            className="nav-logo"
            style={{ height: '70px', width: 'auto', marginBottom: '10px' }}
          />
          <h1 className="nav-title" style={{ fontSize: '1.5rem', margin: 0, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            Configurateur de Produits
          </h1>
        </div>
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none',
            backgroundColor: 'transparent',
            border: '2px solid white',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1.5rem',
            lineHeight: 1
          }}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <div className="nav-links" style={{ 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
          margin: '0 2rem',
          flexWrap: 'wrap'
        }}>
          <NavLink 
            to="/product-types" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Types de produit
          </NavLink>
          <span className="nav-separator" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
          <NavLink 
            to="/families" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Familles
          </NavLink>
          <span className="nav-separator" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
          <NavLink 
            to="/products" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Produits
          </NavLink>
          <span className="nav-separator" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
          <NavLink 
            to="/variants" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Variantes
          </NavLink>
          <span className="nav-separator" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
          <NavLink 
            to="/technical-characteristics" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Caractéristiques techniques
          </NavLink>
          <span className="nav-separator" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
          <NavLink 
            to="/generator" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Générateur
          </NavLink>
          <span className="nav-separator" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
          <NavLink 
            to="/generated-codes" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Codes Générés
          </NavLink>
        </div>
        <div className="nav-user" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <span className="user-email" style={{ fontSize: '0.875rem' }}>{user?.email}</span>
          <button 
            onClick={handleLogout}
            className="logout-btn"
            style={{
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c0392b'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e74c3c'}
          >
            Déconnexion
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="mobile-menu" style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            marginTop: '1rem'
          }}>
            <NavLink 
              to="/product-types" 
              className={({ isActive }) => 
                `nav-link ${isActive ? 'nav-active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Types de produit
            </NavLink>
            <NavLink 
              to="/families" 
              className={({ isActive }) => 
                `nav-link ${isActive ? 'nav-active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Familles
            </NavLink>
            <NavLink 
              to="/products" 
              className={({ isActive }) => 
                `nav-link ${isActive ? 'nav-active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Produits
            </NavLink>
            <NavLink 
              to="/variants" 
              className={({ isActive }) => 
                `nav-link ${isActive ? 'nav-active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Variantes
            </NavLink>
            <NavLink 
              to="/technical-characteristics" 
              className={({ isActive }) => 
                `nav-link ${isActive ? 'nav-active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Caractéristiques techniques
            </NavLink>
            <NavLink 
              to="/generator" 
              className={({ isActive }) => 
                `nav-link ${isActive ? 'nav-active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Générateur
            </NavLink>
            <NavLink 
              to="/generated-codes" 
              className={({ isActive }) => 
                `nav-link ${isActive ? 'nav-active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Codes Générés
            </NavLink>
          </div>
        )}
      </nav>
      <main style={{ 
        flex: 1, 
        padding: '2rem', 
        maxWidth: '1400px', 
        width: '100%', 
        margin: '0 auto',
        boxSizing: 'border-box'
      }}>
        <Outlet />
      </main>
    </div>
  );
}

