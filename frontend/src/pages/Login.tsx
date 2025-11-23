import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import fivesLogo from '../media/fivesLoginimg.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue');
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-purple via-purple/70 to-white/30">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[400px]">
        <img 
          src={fivesLogo} 
          alt="Fives Pillard Logo" 
          className="w-full max-w-[400px] h-auto mb-8 block mx-auto"
        />
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-gray-dark font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-3 border border-gray-light rounded text-base focus:outline-none focus:border-purple"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 text-gray-dark font-medium">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-3 border border-gray-light rounded text-base focus:outline-none focus:border-purple"
            />
          </div>
          {error && (
            <div className="text-purple-dark mb-4 p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          <button 
            type="submit"
            className="w-full py-3 bg-purple text-white border-none rounded text-base cursor-pointer transition-colors duration-200 hover:bg-purple/90"
          >
            {isRegister ? 'S\'inscrire' : 'Se connecter'}
          </button>
        </form>
        <p className="mt-4 text-center">
          {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
          <button
            type="button"
            className="bg-transparent border-none text-purple cursor-pointer underline text-base hover:text-purple-dark"
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? 'Se connecter' : 'S\'inscrire'}
          </button>
        </p>
      </div>
    </div>
  );
}

