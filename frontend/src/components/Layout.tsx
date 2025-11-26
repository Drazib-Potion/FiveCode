import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../media/fives-logo-white.png';

export default function Layout() {
  const { user, logout, canEditContent, isAdmin } = useAuth();
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
            Base Article
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
          margin: '0 1rem',
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
            Carac. techniques
          </NavLink>
          <span className="nav-separator" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
          {canEditContent && (
            <>
              <NavLink 
                to="/generator" 
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'nav-active' : ''}`
                }
              >
                Générateur
              </NavLink>
              <span className="nav-separator" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
            </>
          )}
          <NavLink 
            to="/generated-codes" 
            className={({ isActive }) => 
              `nav-link ${isActive ? 'nav-active' : ''}`
            }
          >
            Codes Générés
          </NavLink>
          {isAdmin && (
            <>
              <span className="nav-separator" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.2rem', userSelect: 'none' }}>|</span>
              <NavLink 
                to="/admin/users" 
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'nav-active' : ''}`
                }
              >
                Administration
              </NavLink>
            </>
          )}
        </div>
        <div
          className="nav-user"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexShrink: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            padding: '0.35rem 0.75rem',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 0 10px rgba(0,0,0,0.15)',
          }}
        >
          <span
            className="user-email"
            style={{
              fontSize: '0.9rem',
              fontWeight: 500,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
              }}
            >
              {user?.email?.[0] ?? 'U'}
            </span>
            {user?.email}
          </span>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin/users')}
              className="nav-admin-btn"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.4)',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Panel admin
            </button>
          )}
          <button
            onClick={handleLogout}
            className="logout-btn"
            style={{
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '0.4rem 1rem',
              borderRadius: '999px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#c0392b')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e74c3c')}
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
            {canEditContent && (
              <NavLink 
                to="/generator" 
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'nav-active' : ''}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                Générateur
              </NavLink>
            )}
            <NavLink 
              to="/generated-codes" 
              className={({ isActive }) => 
                `nav-link ${isActive ? 'nav-active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              Codes Générés
            </NavLink>
            {isAdmin && (
              <NavLink 
                to="/admin/users" 
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'nav-active' : ''}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                Administration
              </NavLink>
            )}
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

