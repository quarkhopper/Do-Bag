import React, { useState } from 'react'
import styles from './App.module.css'

interface Task {
  id: string;
  text: string;
  priority?: 'low' | 'medium' | 'high';
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', text: 'First task', priority: 'high' },
    { id: '2', text: 'Second task', priority: 'medium' },
  ]);
  const [newTaskText, setNewTaskText] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText,
      priority: 'medium'
    };
    
    setTasks([...tasks, newTask]);
    setNewTaskText('');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>DoBag</h1>
      
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
          <div key={task.id} className={`${styles.task} ${styles[task.priority || '']}`}>
            {task.text}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App 