import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type TaskStatus = 
  | 'pending_upload'      // File selected, waiting for upload to start
  | 'uploading'           // File is currently being uploaded to Supabase
  | 'upload_failed'       // Supabase upload failed
  | 'uploaded'            // File successfully uploaded, ready for processing call
  | 'processing_queued'   // Backend API called to start processing (doc or URL)
  | 'processing'          // Backend is actively processing (via SSE updates)
  | 'processing_failed'   // Backend processing failed (via SSE or API response)
  | 'indexing_queued'     // Backend API called to start indexing
  | 'indexing'            // Backend is actively indexing (via SSE updates)
  | 'indexing_failed'     // Backend indexing failed (via SSE or API response)
  | 'completed'           // All steps successful, content source is ready
  | 'failed_permanently'  // Non-recoverable failure at some stage
  | 'cancelled';          // User cancelled the task

export interface IngestionTask {
  id: string;                     // Frontend-generated UUID for UI tracking
  name: string;                   // Filename or URL
  type: 'document' | 'url' | 'multimedia';
  status: TaskStatus;
  progress: number;               // Overall progress (0-100), stage-based or percentage
  currentStageMessage: string;    // User-friendly message
  
  // Document specific
  file?: File;                    // Original file object, if applicable (might not need to store full file in state long-term)
  storagePath?: string;           // Path in Supabase storage
  contentType?: string;
  fileSize?: number;
  
  // URL specific
  url?: string;
  title?: string;                 // Optional user-provided title for URL

  // Multimedia specific
  multimediaType?: 'video' | 'audio';  // Type of multimedia content
  estimatedDuration?: number;          // Estimated processing duration in seconds (for UI)

  // Backend related
  referenceId?: string;           // ID for the chatbot_content_sources record
  processingTaskId?: string;      // Task ID from backend for document/URL processing (for SSE)
  indexingTaskId?: string;        // Task ID from backend for indexing (for SSE)
  
  error?: string;                 // Error message if a stage fails
  createdAt: number;              // Timestamp of task creation
  updatedAt: number;              // Timestamp of last update
}

export type AddTaskData = Pick<IngestionTask, 'name' | 'type'> & 
  Partial<Pick<IngestionTask, 'file' | 'url' | 'title' | 'contentType' | 'fileSize' | 'multimediaType' | 'estimatedDuration'>>;

interface TaskStoreState {
  tasks: IngestionTask[];
  addTask: (taskData: AddTaskData) => IngestionTask;
  updateTask: (id: string, updates: Partial<Omit<IngestionTask, 'id' | 'createdAt'>>) => void;
  removeTask: (id: string) => void;
  getTask: (id: string) => IngestionTask | undefined;
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],

  addTask: (taskData) => {
    const newTask: IngestionTask = {
      id: uuidv4(),
      ...taskData,
      status: taskData.type === 'document' ? 'pending_upload' : 'processing_queued', // URLs start processing immediately
      progress: 0,
      currentStageMessage: taskData.type === 'document' ? 'Waiting to upload' : 'Preparing to process URL',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({ tasks: [newTask, ...state.tasks] }));
    return newTask;
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates, updatedAt: Date.now() } : task
      ),
    }));
  },

  removeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));
  },
  
  getTask: (id: string) => {
    return get().tasks.find(task => task.id === id);
  }
}));

// Example usage (optional, for quick testing in console or components):
// const { tasks, addTask, updateTask } = useTaskStore.getState();
// const newDocTask = addTask({ name: 'test.pdf', type: 'document', file: new File([""], "test.pdf"), contentType: 'application/pdf', fileSize: 1234 });
// updateTask(newDocTask.id, { status: 'uploading', progress: 50, currentStageMessage: 'Uploading... (50%)' }); 