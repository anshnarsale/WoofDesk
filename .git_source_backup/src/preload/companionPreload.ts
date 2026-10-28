import { contextBridge, ipcRenderer } from 'electron';
import {
  AppStoreData,
  PetSettings,
  PetStats,
  Reminder,
  PomodoroState,
  TaskItem,
  QuickNote,
} from '../shared/types';

export const companionAPI = {
  // Initialization
  getInitialData: (): Promise<AppStoreData> => ipcRenderer.invoke('get-initial-data'),

  // Window Controls
  closeWindow: () => ipcRenderer.send('close-companion'),
  quitApp: () => ipcRenderer.send('quit-app'),

  // Pet Actions
  feedPet: () => ipcRenderer.send('feed-pet'),
  playPet: () => ipcRenderer.send('play-pet'),
  sleepPet: () => ipcRenderer.send('sleep-pet'),
  togglePauseMovement: () => ipcRenderer.send('toggle-pause-movement'),

  // Settings
  updateSettings: (updates: Partial<PetSettings>): Promise<PetSettings> =>
    ipcRenderer.invoke('update-settings', updates),

  // Pomodoro
  getPomodoro: (): Promise<PomodoroState> => ipcRenderer.invoke('get-pomodoro'),
  updatePomodoro: (updates: Partial<PomodoroState>) => ipcRenderer.send('update-pomodoro', updates),
  pomodoroCompleted: () => ipcRenderer.send('pomodoro-completed'),
  breakCompleted: () => ipcRenderer.send('break-completed'),

  // Reminders
  getReminders: (): Promise<Reminder[]> => ipcRenderer.invoke('get-reminders'),
  addReminder: (text: string, dueTime: number): Promise<Reminder> =>
    ipcRenderer.invoke('add-reminder', text, dueTime),
  completeReminder: (id: string): Promise<boolean> => ipcRenderer.invoke('complete-reminder', id),
  snoozeReminder: (id: string, minutes: number): Promise<Reminder | null> =>
    ipcRenderer.invoke('snooze-reminder', id, minutes),
  deleteReminder: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-reminder', id),

  // Tasks
  getTasks: (): Promise<TaskItem[]> => ipcRenderer.invoke('get-tasks'),
  addTask: (title: string): Promise<TaskItem> => ipcRenderer.invoke('add-task', title),
  toggleTask: (id: string): Promise<TaskItem | null> => ipcRenderer.invoke('toggle-task', id),
  deleteTask: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-task', id),

  // Notes
  getNotes: (): Promise<QuickNote[]> => ipcRenderer.invoke('get-notes'),
  saveNote: (title: string, content: string, id?: string): Promise<QuickNote> =>
    ipcRenderer.invoke('save-note', title, content, id),
  deleteNote: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-note', id),

  // Listeners from Main Process
  onStatsUpdated: (callback: (stats: PetStats) => void) => {
    ipcRenderer.on('stats-updated', (_event, stats) => callback(stats));
  },
  onPomodoroUpdated: (callback: (pomodoro: PomodoroState) => void) => {
    ipcRenderer.on('pomodoro-updated', (_event, pomodoro) => callback(pomodoro));
  },
  onRemindersUpdated: (callback: (reminders: Reminder[]) => void) => {
    ipcRenderer.on('reminders-updated', (_event, reminders) => callback(reminders));
  },
  onReminderTriggered: (callback: (reminder: Reminder) => void) => {
    ipcRenderer.on('reminder-triggered', (_event, reminder) => callback(reminder));
  },
  onTasksUpdated: (callback: (tasks: TaskItem[]) => void) => {
    ipcRenderer.on('tasks-updated', (_event, tasks) => callback(tasks));
  },
  onNotesUpdated: (callback: (notes: QuickNote[]) => void) => {
    ipcRenderer.on('notes-updated', (_event, notes) => callback(notes));
  },
  onSettingsUpdated: (callback: (settings: PetSettings) => void) => {
    ipcRenderer.on('settings-updated', (_event, settings) => callback(settings));
  },
  onSwitchTab: (callback: (tabName: string) => void) => {
    ipcRenderer.on('switch-tab', (_event, tabName) => callback(tabName));
  },
  onMovementPausedChanged: (callback: (isPaused: boolean) => void) => {
    ipcRenderer.on('movement-paused-changed', (_event, isPaused) => callback(isPaused));
  },
};

contextBridge.exposeInMainWorld('companionAPI', companionAPI);

export type CompanionAPI = typeof companionAPI;

