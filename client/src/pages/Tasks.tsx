import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Tasks.module.css';
import { tasksApi, Task } from '../api/tasks';
import { useAuth } from '../contexts/AuthContext';

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const tasks = await tasksApi.getTasks();
      setTasks(tasks);
      setError(null);
    } catch (err) {
      setError('Failed to load tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    
    try {
      const newTask = await tasksApi.createTask({
        text: newTaskText,
        priority_hint: 'medium'
      });
      
      setTasks([...tasks, newTask]);
      setNewTaskText('');
      setError(null);
    } catch (err) {
      setError('Failed to add task');
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Tasks</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </div>
      
      {error && <div className={styles.error}>{error}</div>}
      
      <form onSubmit={handleAddTask} className={styles.addForm}>
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          placeholder="Add a new task..."
          className={styles.input}
        />
        <button type="submit" className={styles.button}>Add Task</button>
      </form>

      <div className={styles.taskList}>
        {tasks.map(task => (
          <div key={task.id} className={`${styles.task} ${styles[task.priority_hint || '']}`}>
            {task.text}
          </div>
        ))}
      </div>
    </div>
  );
} 