import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import styles from './Tasks.module.css';
import { tasksApi, Task } from '../api/tasks';
import { TaskModifier } from '../api/modifiers';
import { useAuth } from '../contexts/AuthContext';

// Extended Task interface with optional modifiers
interface ExtendedTask extends Task {
  modifiers?: TaskModifier[];
}

// Item types for drag and drop
const ItemTypes = {
  TASK: 'task'
};

// Generic function to get styling class based on available modifiers
// This doesn't hardcode any specific modifier types
const getTaskStyle = (task: ExtendedTask): string => {
  if (!task.modifiers || task.modifiers.length === 0) {
    return 'default'; // Default styling class when no modifiers are present
  }
  
  // Let the style system determine the appearance based on whatever modifiers are present
  // We don't make assumptions about which specific modifiers might affect styling
  return 'with-modifiers';
};

// TaskItem component for individual tasks
const TaskItem = ({ 
  task, 
  index, 
  moveTask, 
  instantiateTemplate,
  deleteTask
}: { 
  task: Task; 
  index: number; 
  moveTask: (dragIndex: number, hoverIndex: number) => void;
  instantiateTemplate?: (templateId: string) => void;
  deleteTask: (id: string) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isTemplate = task.is_template || task.status === 'shelf';
  
  // Set up drag source - only allow dragging bag items (not templates)
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TASK,
    item: { id: task.id, index, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !isTemplate, // Templates cannot be dragged
  });

  // Set up drop target - only allow dropping in the same container
  const [, drop] = useDrop({
    accept: ItemTypes.TASK,
    hover: (item: { index: number; status: string }) => {
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

  // Initialize drag and drop refs - only for non-templates
  if (!isTemplate) {
    drag(drop(ref));
  }
  
  return (
    <div 
      ref={ref}
      className={`${styles.task} ${styles[getTaskStyle(task)]} ${isDragging ? styles.dragging : ''} ${isTemplate ? styles.templateTask : ''}`}
    >      <div className={styles.taskContent}>
        <span>
          {task.text}
          {/* Show usage count for templates */}
          {isTemplate && task.usage_count !== undefined && task.usage_count > 0 && (
            <span className={styles.usageCount} title={`Used ${task.usage_count} times`}>
              {task.usage_count}
            </span>
          )}
        </span>
        
        {/* Template actions */}
        {isTemplate && (
          <div className={styles.templateActions}>
            {/* Instantiate button */}
            <button 
              className={styles.instantiateButton}
              onClick={() => instantiateTemplate && instantiateTemplate(task.id)}
              title="Create a task from this template"
            >
              📋
            </button>
            
            {/* Delete button */}
            <button 
              className={styles.deleteButton}
              onClick={() => deleteTask(task.id)}
              title="Delete this template"
            >
              🗑️
            </button>
          </div>
        )}
          {/* Regular task actions */}
        {!isTemplate && task.template_id && (
          <div 
            className={styles.templateIndicator} 
            title={task.template_info ? `Created from template: ${task.template_info.text}` : "Created from a template"}
          >
            📋
          </div>
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
  instantiateTemplate,
  deleteTask
}: { 
  title: string; 
  status: 'bag' | 'shelf'; 
  tasks: Task[]; 
  moveTask: (dragIndex: number, hoverIndex: number) => void;
  instantiateTemplate: (templateId: string) => void;
  deleteTask: (id: string) => void;
}) => {
  // Only allow dropping in the bag, not in the templates shelf
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.TASK,
    drop: () => ({ status }),
    collect: monitor => ({
      isOver: monitor.isOver(),
    }),
    canDrop: () => status === 'bag', // Only allow dropping in the bag
  });

  return (
    <div 
      ref={status === 'bag' ? drop : null} 
      className={`${styles.taskContainer} ${isOver ? styles.isOver : ''} ${status === 'shelf' ? styles.templatesContainer : ''}`}
    >
      <h2 className={styles.containerTitle}>
        {status === 'shelf' ? 'Templates' : title}
        {status === 'shelf' && (
          <span className={styles.templateHint}>
            (Click a template to create a task from it)
          </span>
        )}
      </h2>
      <div className={styles.taskList}>
        {tasks
          .filter(task => task.status === status)
          .map((task, index) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              index={index}
              moveTask={moveTask}
              instantiateTemplate={status === 'shelf' ? instantiateTemplate : undefined}
              deleteTask={deleteTask}
            />
          ))}
        {tasks.filter(task => task.status === status).length === 0 && (
          <div className={styles.emptyContainer}>
            {status === 'shelf' ? 'No templates' : 'No tasks'}
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<string | null>(null);
  const { logout, deleteAccount } = useAuth();
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
      // Load both templates and regular tasks
      const [templates, bagTasks] = await Promise.all([
        tasksApi.getTemplates(),
        tasksApi.getNonTemplates()
      ]);
      
      // Combine them into a single array
      const allTasks = [...templates, ...bagTasks];
      setTasks(allTasks);
      setError(null);
    } catch (err) {
      setError('Failed to load tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    
    try {
      // Check if Shift key is pressed to create a template instead of a task
      const isTemplate = e.nativeEvent instanceof MouseEvent && e.nativeEvent.shiftKey;
        let newTask;
      if (isTemplate) {
        newTask = await tasksApi.createTemplate({
          text: newTaskText,
          updated_at: new Date().toISOString(),
          status: 'shelf' // Required status field
        });
      } else {
        newTask = await tasksApi.createTask({
          text: newTaskText,
          updated_at: new Date().toISOString(),
          status: 'bag'
        });
      }
      
      setTasks([...tasks, newTask]);
      setNewTaskText('');
      setError(null);
      
      // Show feedback about template creation
      if (isTemplate) {
        setApiTestResult('Template created successfully! It will appear in your Templates shelf.');
        setTimeout(() => setApiTestResult(null), 3000);
      }
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
  const changeStatus = async (id: string, status: 'bag' | 'shelf') => {
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

  const deleteTask = async (id: string) => {
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
  // Instantiate a task from a template
  const instantiateTemplate = async (templateId: string) => {
    try {
      // Create a new task from the template
      const newTask = await tasksApi.instantiateFromTemplate(templateId);
      
      // Update the local state
      setTasks([...tasks, newTask]);
      setError(null);
    } catch (err) {
      console.error('Failed to instantiate template', err);
      setError('Failed to create task from template');
    }
  };

  // Handle a suggestion being selected
  const handleSelectSuggestion = async (template: Task) => {
    try {
      // Create a new task from the template
      await instantiateTemplate(template.id);
      
      // Clear the input and suggestions
      setNewTaskText('');
      setSuggestions([]);
    } catch (err) {
      console.error('Failed to create from suggestion', err);
      setError('Failed to create task from template');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const testApiConnection = async () => {
    setApiTestResult("Testing API connection...");
    try {
      // Log environment information
      console.log("Current environment:", {
        windowLocation: window.location.href,
        hostname: window.location.hostname,
        apiUrl: import.meta.env.VITE_API_URL || 'not set'
      });
      
      // Try to fetch tasks endpoint instead of health endpoint
      const token = localStorage.getItem('token');
      if (!token) {
        setApiTestResult("Cannot test API: No authentication token found");
        return;
      }
      
      // Use a simple relative URL for the API
      const tasksUrl = '/api/tasks';
      console.log("Testing API with URL:", tasksUrl);
      
      const response = await fetch(tasksUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      setApiTestResult(`API test successful: ${JSON.stringify(data).slice(0, 50)}...`);
      setError(null);
    } catch (err) {
      console.error('API test error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setApiTestResult(`API test failed: ${errorMessage}. Check console for details.`);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      // No need to navigate, the deleteAccount function will call logout which will redirect
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to delete account: ${errorMessage}`);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <div className={styles.container}>Loading...</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Tasks</h1>
          <div>
            <button
              onClick={testApiConnection}
              className={styles.testButton}
              style={{ marginRight: '10px' }}
            >
              Test API
            </button>
            <button 
              onClick={() => setShowDeleteModal(true)} 
              className={styles.settingsButton}
            >
              Settings
            </button>
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>
        
        {error && <div className={styles.error}>{error}</div>}
        {apiTestResult && (
          <div className={apiTestResult.includes('failed') ? styles.error : styles.success}>
            {apiTestResult}
          </div>
        )}
          <div className={styles.instructions}>
          <p>
            <strong>Tip:</strong> Hold Shift when clicking "Add Task" to create a template instead of a regular task.
          </p>
        </div>

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
                {suggestions.map(suggestion => (                  <div 
                    key={suggestion.id} 
                    className={styles.suggestion}
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    <span>{suggestion.text}</span>
                    <small>Create from template</small>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className={styles.button}>Add Task</button>
        </form>        <div className={styles.tasksLayout}>
          <TaskContainer 
            title="Task Templates" 
            status="shelf" 
            tasks={tasks} 
            moveTask={moveTask} 
            instantiateTemplate={instantiateTemplate} 
            deleteTask={deleteTask}
          />
          <TaskContainer 
            title="Tasks Bag" 
            status="bag" 
            tasks={tasks} 
            moveTask={moveTask} 
            instantiateTemplate={instantiateTemplate}
            deleteTask={deleteTask}
          />
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3 className={styles.modalTitle}>Delete Account</h3>
              <p>Are you sure you want to delete your account? This action cannot be undone and will delete all your tasks.</p>
              <div className={styles.modalButtons}>
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className={styles.cancelButton}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAccount} 
                  className={styles.dangerButton}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}