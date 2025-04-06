import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import styles from './Tasks.module.css';
import { tasksApi, Task } from '../api/tasks';
import { useAuth } from '../contexts/AuthContext';

// Item types for drag and drop
const ItemTypes = {
  TASK: 'task'
};

// TaskItem component for individual tasks
const TaskItem = ({ 
  task, 
  index, 
  moveTask, 
  changeStatus,
  deleteTask
}: { 
  task: Task; 
  index: number; 
  moveTask: (dragIndex: number, hoverIndex: number) => void;
  changeStatus: (id: number, status: 'bag' | 'shelf') => void;
  deleteTask: (id: number) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  // Set up drag source
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TASK,
    item: { id: task.id, index, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<{ status: 'bag' | 'shelf' }>();
      if (item && dropResult && item.status !== dropResult.status) {
        changeStatus(item.id, dropResult.status);
      }
    },
  });

  // Set up drop target
  const [, drop] = useDrop({
    accept: ItemTypes.TASK,
    hover: (item: { index: number; status: string }, monitor) => {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves and only reorder within the same container
      if (dragIndex === hoverIndex || task.status !== item.status) {
        return;
      }

      // Time to actually perform the action
      moveTask(dragIndex, hoverIndex);
      
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for performance reasons
      item.index = hoverIndex;
    },
  });

  // Initialize drag and drop refs
  drag(drop(ref));

  return (
    <div 
      ref={ref}
      className={`${styles.task} ${styles[task.priority_hint || '']} ${isDragging ? styles.dragging : ''}`}
    >
      <div className={styles.taskContent}>
        <span>{task.text}</span>
        {task.status === 'shelf' && (
          <button 
            className={styles.deleteButton}
            onClick={() => deleteTask(task.id)}
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
};

// TaskContainer component for bag and shelf sections
const TaskContainer = ({ 
  title, 
  status, 
  tasks, 
  moveTask,
  changeStatus,
  deleteTask
}: { 
  title: string; 
  status: 'bag' | 'shelf'; 
  tasks: Task[]; 
  moveTask: (dragIndex: number, hoverIndex: number) => void;
  changeStatus: (id: number, status: 'bag' | 'shelf') => void;
  deleteTask: (id: number) => void;
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.TASK,
    drop: () => ({ status }),
    collect: monitor => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div 
      ref={drop} 
      className={`${styles.taskContainer} ${isOver ? styles.isOver : ''}`}
    >
      <h2 className={styles.containerTitle}>{title}</h2>
      <div className={styles.taskList}>
        {tasks
          .filter(task => task.status === status)
          .map((task, index) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              index={index}
              moveTask={moveTask}
              changeStatus={changeStatus}
              deleteTask={deleteTask}
            />
          ))}
        {tasks.filter(task => task.status === status).length === 0 && (
          <div className={styles.emptyContainer}>
            No tasks
          </div>
        )}
      </div>
    </div>
  );
};

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [suggestions, setSuggestions] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, []);

  // Update suggestions when the text changes
  useEffect(() => {
    if (newTaskText.trim() === '') {
      setSuggestions([]);
      return;
    }

    // Filter tasks from the shelf that match the text
    const filteredSuggestions = tasks.filter(task => 
      task.status === 'shelf' && 
      task.text.toLowerCase().includes(newTaskText.toLowerCase())
    );
    
    setSuggestions(filteredSuggestions);
  }, [newTaskText, tasks]);

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
        priority_hint: 'medium',
        status: 'bag'
      });
      
      setTasks([...tasks, newTask]);
      setNewTaskText('');
      setError(null);
    } catch (err) {
      setError('Failed to add task');
      console.error(err);
    }
  };

  const moveTask = async (dragIndex: number, hoverIndex: number) => {
    // Create a copy of tasks
    const updatedTasks = [...tasks];
    // Get dragged task
    const draggedTask = tasks[dragIndex];
    
    // Remove the dragged task
    updatedTasks.splice(dragIndex, 1);
    // Insert it at the new position
    updatedTasks.splice(hoverIndex, 0, draggedTask);
    
    // Update positions in the state immediately for smooth UI
    setTasks(updatedTasks);
    
    // Update the position in the database
    try {
      await tasksApi.updateTaskPosition(draggedTask.id, hoverIndex);
    } catch (err) {
      console.error('Failed to update task position', err);
      // Revert to the original state if there's an error
      setTasks(tasks);
    }
  };

  const changeStatus = async (id: number, status: 'bag' | 'shelf') => {
    try {
      // Find the task to update
      const taskIndex = tasks.findIndex(t => t.id === id);
      if (taskIndex === -1) return;
      
      // Update the task status in the API
      const updatedTask = await tasksApi.updateTask(id, { status });
      
      // Update the local state
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex] = updatedTask;
      setTasks(updatedTasks);
    } catch (err) {
      console.error('Failed to change task status', err);
      setError('Failed to move task');
    }
  };

  const deleteTask = async (id: number) => {
    try {
      // Delete from the API
      await tasksApi.deleteTask(id);
      
      // Update the local state
      setTasks(tasks.filter(task => task.id !== id));
    } catch (err) {
      console.error('Failed to delete task', err);
      setError('Failed to delete task');
    }
  };

  // Handle a suggestion being selected
  const handleSelectSuggestion = async (task: Task) => {
    try {
      // Update the task status in the API
      await changeStatus(task.id, 'bag');
      
      // Clear the input and suggestions
      setNewTaskText('');
      setSuggestions([]);
    } catch (err) {
      console.error('Failed to select suggestion', err);
      setError('Failed to move task');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Tasks</h1>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        </div>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleAddTask} className={styles.addForm}>
          <div className={styles.inputContainer}>
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a new task..."
              className={styles.input}
            />
            {suggestions.length > 0 && (
              <div className={styles.suggestions}>
                {suggestions.map(suggestion => (
                  <div 
                    key={suggestion.id} 
                    className={styles.suggestion}
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    <span>{suggestion.text}</span>
                    <small>Move from shelf</small>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className={styles.button}>Add Task</button>
        </form>

        <div className={styles.tasksLayout}>
          <TaskContainer 
            title="Tasks Shelf" 
            status="shelf" 
            tasks={tasks} 
            moveTask={moveTask} 
            changeStatus={changeStatus} 
            deleteTask={deleteTask}
          />
          <TaskContainer 
            title="Tasks Bag" 
            status="bag" 
            tasks={tasks} 
            moveTask={moveTask} 
            changeStatus={changeStatus}
            deleteTask={deleteTask}
          />
        </div>
      </div>
    </DndProvider>
  );
} 