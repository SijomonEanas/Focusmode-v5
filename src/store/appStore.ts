import { create } from 'zustand';

export interface Task {
  id: string;
  name: string;
  workspace: string;
  status: 'pending' | 'completed';
  type: 'quantity' | 'duration';
  targetValue: number;
  currentValue: number;
  endDate: string | null;
  notes: string;
  subtasks: { id: string; name: string; completed: boolean }[];
  
  // Advanced Timeline Tracking
  history: { type: 'started' | 'paused' | 'resumed' | 'completed'; timestamp: number }[];
  focusTimeElapsed: number; // total focus seconds
  breakTimeElapsed: number; // total break seconds
  lastTimeLeft: number; // to restore countdown state when switching back
}

export interface Habit {
  id: string;
  name: string;
  completed: boolean;
  streak: number;
}

export interface AppState {
  // Config
  settings: {
    autostart: boolean;
    notifications: boolean;
    dayResetHour: number;
    dailyGoalHours: number;
    focusDurationMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    soundVolume: number;
  };
  
  // Data
  tasks: Task[];
  habits: Habit[];
  
  // Runtime State (Syncs between windows)
  activeTaskId: string | null;
  timerMode: 'focus' | 'shortBreak' | 'longBreak';
  timerRunning: boolean;
  timeLeft: number; // in seconds
  sessionTimeElapsed: number; // elapsed in current session
  
  // Actions
  setTimerRunning: (running: boolean) => void;
  setTimeLeft: (time: number) => void;
  setActiveTask: (taskId: string | null) => void;
  switchTask: (newTaskId: string) => void;
  startBreak: () => void;
  endBreak: () => void;
  tick: () => void;
  addHistoryEvent: (taskId: string, eventType: 'started' | 'paused' | 'resumed' | 'completed') => void;
  
  // Persistence
  isInitialized: boolean;
  initStore: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  isInitialized: false,
  initStore: async () => {
    if (get().isInitialized || !window.electronAPI) return;
    const data = await window.electronAPI.loadData();
    if (data) {
      set({ ...data, timerRunning: false, isInitialized: true });
    } else {
      set({ isInitialized: true });
    }
  },
  settings: {
    autostart: false,
    notifications: true,
    dayResetHour: 5,
    dailyGoalHours: 8,
    focusDurationMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    soundVolume: 0.5,
  },
  tasks: [
    {
      id: 'task-1',
      name: 'Learn React',
      workspace: 'Personal',
      status: 'pending',
      type: 'duration',
      targetValue: 120,
      currentValue: 0,
      startDate: null,
      endDate: null,
      notes: '',
      subtasks: [],
      history: [],
      focusTimeElapsed: 0,
      breakTimeElapsed: 0,
      lastTimeLeft: 25 * 60
    },
    {
      id: 'task-2',
      name: 'Company Work',
      workspace: 'Work',
      status: 'pending',
      type: 'duration',
      targetValue: 240,
      currentValue: 0,
      startDate: null,
      endDate: null,
      notes: '',
      subtasks: [],
      history: [],
      focusTimeElapsed: 0,
      breakTimeElapsed: 0,
      lastTimeLeft: 45 * 60
    }
  ],
  habits: [],
  
  activeTaskId: null,
  timerMode: 'focus',
  timerRunning: false,
  timeLeft: 25 * 60,
  sessionTimeElapsed: 0,
  
  setTimerRunning: (running) => set({ timerRunning: running }),
  setTimeLeft: (time) => set({ timeLeft: time }),
  
  setActiveTask: (taskId) => set({ activeTaskId: taskId }),
  
  addHistoryEvent: (taskId, eventType) => set((state) => ({
    tasks: state.tasks.map(t => 
      t.id === taskId 
        ? { ...t, history: [...t.history, { type: eventType, timestamp: Date.now() }] } 
        : t
    )
  })),

  switchTask: (newTaskId) => {
    const { activeTaskId, timerRunning, timeLeft, tasks, addHistoryEvent } = get();
    
    // 1. Pause and save state for the currently active task
    if (activeTaskId) {
      if (timerRunning) addHistoryEvent(activeTaskId, 'paused');
      
      // Save the remaining time to the task so it doesn't get lost
      set((state) => ({
        tasks: state.tasks.map(t => 
          t.id === activeTaskId ? { ...t, lastTimeLeft: timeLeft } : t
        )
      }));
    }
    
    // 2. Start or resume the new task
    const newTask = tasks.find(t => t.id === newTaskId);
    const timeToRestore = newTask && newTask.lastTimeLeft > 0 
        ? newTask.lastTimeLeft 
        : get().settings.focusDurationMinutes * 60;

    set({ 
      activeTaskId: newTaskId,
      timeLeft: timeToRestore, // Restore previous time or start fresh
      timerMode: 'focus'
    });
    
    if (timerRunning) {
      addHistoryEvent(newTaskId, newTask?.history.length ? 'resumed' : 'started');
    }
  },

  startBreak: () => {
    const { activeTaskId, timerRunning, timeLeft, addHistoryEvent } = get();
    
    if (activeTaskId) {
      if (timerRunning) addHistoryEvent(activeTaskId, 'paused');
      
      // Save the focus time remaining before switching to break
      set((state) => ({
        tasks: state.tasks.map(t => 
          t.id === activeTaskId ? { ...t, lastTimeLeft: timeLeft } : t
        )
      }));
    }
    
    set((state) => ({
      timerMode: 'shortBreak',
      timeLeft: state.settings.shortBreakMinutes * 60,
      timerRunning: true
    }));
  },

  endBreak: () => {
    const { activeTaskId, tasks, timerRunning, addHistoryEvent } = get();
    
    let timeToRestore = get().settings.focusDurationMinutes * 60;
    const activeTask = tasks.find(t => t.id === activeTaskId);
    if (activeTask && activeTask.lastTimeLeft > 0) {
      timeToRestore = activeTask.lastTimeLeft;
    }

    set({
      timerMode: 'focus',
      timeLeft: timeToRestore,
      timerRunning: false // Optionally auto-start depending on settings, but false is safer
    });

    if (activeTaskId && timerRunning) {
       addHistoryEvent(activeTaskId, 'resumed');
    }
  },

  tick: () => set((state) => {
    if (!state.timerRunning || state.timeLeft <= 0) return state;
    
    const newTimeLeft = state.timeLeft - 1;
    
    if (state.timerMode === 'focus' && state.activeTaskId) {
      return {
        timeLeft: newTimeLeft,
        sessionTimeElapsed: state.sessionTimeElapsed + 1,
        tasks: state.tasks.map(t => 
          t.id === state.activeTaskId 
            ? { ...t, focusTimeElapsed: t.focusTimeElapsed + 1 }
            : t
        )
      };
    } else if (state.timerMode === 'shortBreak' || state.timerMode === 'longBreak') {
       if (state.activeTaskId) {
         return {
           timeLeft: newTimeLeft,
           tasks: state.tasks.map(t => 
             t.id === state.activeTaskId 
               ? { ...t, breakTimeElapsed: t.breakTimeElapsed + 1 }
               : t
           )
         };
       }
    }
    
    return { timeLeft: newTimeLeft };
  })
}));
