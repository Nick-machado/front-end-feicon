import apiClient from './api';
import { User, CreateUserPayload } from '../types/api';

export const userService = {
  async getAll(): Promise<User[]> {
    const response = await apiClient.get<{ data: User[] }>('/users');
    return response.data.data || [];
  },

  async getByUuid(uuid: string): Promise<User> {
    const response = await apiClient.get<{ data: User }>(`/users/${uuid}`);
    return response.data.data;
  },

  async create(data: CreateUserPayload): Promise<User> {
    const { data: result } = await apiClient.post<User>('/users', data);
    return result;
  },

  async update(uuid: string, data: Partial<CreateUserPayload>): Promise<User> {
    const { data: result } = await apiClient.put<User>(`/users/${uuid}`, data);
    return result;
  },

  async remove(uuid: string): Promise<void> {
    await apiClient.delete(`/users/${uuid}`);
  },
};
