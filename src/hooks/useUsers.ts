import { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { User, CreateUserPayload } from '../types/api';

interface UseUsersReturn {
  users: User[];
  isLoading: boolean;
  error: string | null;
  createUser: (data: CreateUserPayload) => Promise<User>;
  updateUser: (uuid: string, data: Partial<CreateUserPayload>) => Promise<User>;
  deleteUser: (uuid: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      console.log('[useUsers] Iniciando carregamento...');
      setIsLoading(true);
      setError(null);
      const data = await userService.getAll();
      console.log('[useUsers] Dados recebidos:', data?.length, 'usuários');
      // Garantir que é sempre um array
      const usersData = Array.isArray(data) ? data : [];
      setUsers(usersData);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar usuários';
      console.error('[useUsers] ERRO:', message, err);
      setError(message);
      setUsers([]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const createUser = async (data: CreateUserPayload): Promise<User> => {
    try {
      const newUser = await userService.create(data);
      setUsers((prev) => [...prev, newUser]);
      return newUser;
    } catch (err) {
      throw err;
    }
  };

  const updateUser = async (uuid: string, data: Partial<CreateUserPayload>): Promise<User> => {
    try {
      const updated = await userService.update(uuid, data);
      setUsers((prev) => prev.map((u) => (u.uuid === uuid ? updated : u)));
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteUser = async (uuid: string): Promise<void> => {
    try {
      await userService.remove(uuid);
      setUsers((prev) => prev.filter((u) => u.uuid !== uuid));
    } catch (err) {
      throw err;
    }
  };

  return {
    users,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    refetch: fetchUsers,
  };
}
