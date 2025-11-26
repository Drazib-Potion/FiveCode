import { useEffect, useState } from 'react';
import { usersService } from '../services/api';
import { useModal } from '../contexts/ModalContext';
import Loader from '../components/Loader';
import { User } from '../utils/types';

const ROLE_OPTIONS: Array<{ value: User['role']; label: string }> = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'MANAGER', label: 'Gestionnaire' },
  { value: 'ADMIN', label: 'Administrateur' },
];

export default function AdminUsersPage() {
  const { showAlert } = useModal();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersService.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      await showAlert('Impossible de charger les utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (id: string, role: User['role']) => {
    if (role === users.find((user) => user.id === id)?.role) {
      return;
    }
    setUpdatingId(id);
    try {
      const updated = await usersService.updateRole(id, role);
      setUsers((prev) => prev.map((user) => (user.id === id ? updated : user)));
      await showAlert('Rôle mis à jour', 'success');
    } catch (error) {
      console.error('Error updating role:', error);
      await showAlert('Impossible de mettre à jour le rôle', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-4 border-b-2 border-purple/20">
        <div>
          <h1 className="m-0 text-3xl font-bold text-purple">Administration des rôles</h1>
          <p className="text-sm text-gray-500 max-w-xl">
            Gérez les comptes et définissez le niveau d'accès de chaque utilisateur.
          </p>
        </div>
        <button
          type="button"
          onClick={loadUsers}
          disabled={loading}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-purple to-purple-light text-white font-semibold shadow-lg hover:from-purple hover:to-purple-dark transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-lg border-2 border-purple/20 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader size="md" />
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[2fr_2fr_1fr] gap-4 px-6 py-3 uppercase text-xs tracking-wide text-gray-500 border-b border-purple/20 bg-purple/5">
              <span>Email</span>
              <span>Rôle</span>
              <span className="text-right">État</span>
            </div>
            {users.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[2fr_2fr_1fr] gap-4 px-6 py-4 border-b border-purple/10 items-center"
              >
                <div>
                  <p className="text-gray-900 font-medium">{user.email}</p>
                  <p className="text-xs uppercase tracking-wide text-gray-400 mt-1">{user.id}</p>
                </div>
                <div>
                  <select
                    value={user.role}
                    onChange={(event) => handleRoleChange(user.id, event.target.value as User['role'])}
                    disabled={!!updatingId && updatingId !== user.id}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-purple focus:ring-2 focus:ring-purple/20"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end">
                  {updatingId === user.id ? (
                    <div className="flex items-center gap-2 text-sm text-purple">
                      <Loader size="sm" />
                      <span>En cours...</span>
                    </div>
                  ) : (
                    <span className="text-xs uppercase tracking-wide text-gray-500">
                      {user.role === 'ADMIN' ? 'Administrateur' : user.role === 'MANAGER' ? 'Gestionnaire' : 'Consultation'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

