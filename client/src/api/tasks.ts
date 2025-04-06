import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Task {
  id: number;
  text: string;
  expected_duration?: string;
  is_divisible?: boolean;
  priority_hint?: 'low' | 'medium' | 'high';
  position: number;
  created_at: string;
  user_id: number;
  status: 'bag' | 'shelf';
}

export const tasksApi = {
  getTasks: async () => {
    const response = await api.get<Task[]>('/api/tasks');
    return response.data;
  },

  createTask: async (task: Omit<Task, 'id' | 'created_at' | 'position' | 'user_id' | 'status'> & { status?: 'bag' | 'shelf' }) => {
    const response = await api.post<Task>('/api/tasks', task);
    return response.data;
  },

  updateTask: async (id: number, task: Partial<Task>) => {
    const response = await api.patch<Task>(`/api/tasks/${id}`, task);
    return response.data;
  },

  updateTaskPosition: async (id: number, position: number) => {
    const response = await api.patch<Task>(`/api/tasks/${id}/position`, { position });
    return response.data;
  },

  deleteTask: async (id: number) => {
    await api.delete(`/api/tasks/${id}`);
  }
}; 