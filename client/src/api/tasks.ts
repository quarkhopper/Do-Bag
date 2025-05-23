// @ts-ignore: We're experiencing issues with axios typings
import axios from 'axios';

// Use non-null assertion for Vite's import.meta.env
// This is available in Vite by default
const API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Task {
  id: string;  // UUID
  text: string;
  position: number;
  created_at: string;
  updated_at: string;
  user_id: string;  // UUID
  status: 'bag' | 'shelf';
  is_template?: boolean;
  template_id?: string;
  usage_count?: number;         // Count of tasks instantiated from this template
  template_info?: Task;         // Information about the template a task was created from
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
  
  createTaskWithModifiers: async (
    task: Omit<Task, 'id' | 'created_at' | 'position' | 'user_id' | 'status'> & { status?: 'bag' | 'shelf' },
    modifiers?: Array<{
      modifier_type: string;
      value: Record<string, any>;
    }>
  ) => {
    // First create the task
    const createdTask = await tasksApi.createTask(task);
    
    // Then apply modifiers if provided
    if (modifiers && modifiers.length > 0) {
      const { applyModifiersToTask } = await import('./modifiers');
      await applyModifiersToTask(createdTask.id, modifiers);
    }
    
    return createdTask;
  },
  updateTask: async (id: string, task: Partial<Task>) => {
    const response = await api.patch<Task>(`/api/tasks/${id}`, task);
    return response.data;
  },

  updateTaskPosition: async (id: string, position: number) => {
    const response = await api.patch<Task>(`/api/tasks/${id}/position`, { position });
    return response.data;
  },  deleteTask: async (id: string) => {
    await api.delete(`/api/tasks/${id}`);
  },
  
  // Template-specific methods
  getTemplates: async () => {
    const response = await api.get<Task[]>('/api/tasks', { 
      params: { templates: 'true' } 
    });
    return response.data;
  },
  
  getNonTemplates: async () => {
    const response = await api.get<Task[]>('/api/tasks', { 
      params: { templates: 'false' } 
    });
    return response.data;
  },
  
  createTemplate: async (task: Omit<Task, 'id' | 'created_at' | 'position' | 'user_id' | 'is_template'>) => {
    // Set is_template to true and status to 'shelf' for templates
    const templateTask = {
      ...task,
      status: 'shelf',
      is_template: true
    };
    const response = await api.post<Task>('/api/tasks', templateTask);
    return response.data;
  },
  
  instantiateFromTemplate: async (templateId: string) => {
    const response = await api.post<Task>(`/api/tasks/${templateId}/instantiate`);
    return response.data;
  },
  
  getTaskWithModifiers: async (id: string) => {
    // First get the task
    const response = await api.get<Task>(`/api/tasks/${id}`);
    const task = response.data;
    
    // Then get its modifiers
    const { getTaskModifiers } = await import('./modifiers');
    const modifiers = await getTaskModifiers(id);
    
    // Return an enhanced object with both task and modifiers
    return {
      ...task,
      modifiers
    };
  },
  
  updateTaskWithModifiers: async (
    id: string,
    taskUpdates: Partial<Task>,
    modifiers?: Array<{
      modifier_type: string;
      value: Record<string, any>;
    }>
  ) => {
    // First update the task
    const updatedTask = await tasksApi.updateTask(id, taskUpdates);
    
    // Then update modifiers if provided
    if (modifiers && modifiers.length > 0) {
      const { applyModifiersToTask } = await import('./modifiers');
      await applyModifiersToTask(id, modifiers);
    }
    
    return updatedTask;
  }
};
