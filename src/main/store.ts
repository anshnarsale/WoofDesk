import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { AppStoreData, PetSettings, PetStats, Reminder, PomodoroState, TaskItem, QuickNote } from '../shared/types';

const DEFAULT_SETTINGS: PetSettings = {
  size: 'medium',
  animationSpeed: 'normal',
  movementFrequency: 'normal',
  soundEnabled: true,
  quietMode: false,
  launchOnStartup: false,
  clickThrough: false,
  startMinimized: false,
  showSpeechBubbles: true,
};

const DEFAULT_STATS: PetStats = {
  hunger: 85,
  happiness: 90,
  energy: 95,
  totalTreatsEarned: 0,
  totalTasksCompleted: 0,
  totalFocusSessions: 0,
};

const getTodayDateStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DEFAULT_POMODORO: PomodoroState = {
  isRunning: false,
  isBreak: false,
  timeLeftSeconds: 25 * 60,
  focusDurationMinutes: 25,
  breakDurationMinutes: 5,
  sessionsCompletedToday: 0,
  lastSessionDate: getTodayDateStr(),
};

const DEFAULT_STORE: AppStoreData = {
  settings: DEFAULT_SETTINGS,
  stats: DEFAULT_STATS,
  reminders: [
    {
      id: 'welcome-rem-1',
      text: 'Drink water and stretch your legs! 💧',
      dueTime: Date.now() + 45 * 60 * 1000,
      createdAt: Date.now(),
      isCompleted: false,
      snoozeCount: 0,
    },
  ],
  pomodoro: DEFAULT_POMODORO,
  tasks: [
    {
      id: 'task-1',
      title: 'Adopt your new desktop dog 🐕',
      completed: true,
      createdAt: Date.now() - 60000,
      completedAt: Date.now(),
    },
    {
      id: 'task-2',
      title: 'Click the dog or right-click to open actions 🦴',
      completed: false,
      createdAt: Date.now(),
    },
    {
      id: 'task-3',
      title: 'Try a 25-minute study focus session ⏱️',
      completed: false,
      createdAt: Date.now(),
    },
  ],
  notes: [
    {
      id: 'note-1',
      title: 'Welcome Notes',
      content: 'Hello! I am your desktop companion puppy. I will keep you company while you work or study. Click me to play, feed me treats when you finish tasks, or let me nap while you focus!',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
};

export class AppStore {
  private filePath: string;
  private data: AppStoreData;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'desktop-pet-data.json');
    this.data = this.loadData();
  }

  private loadData(): AppStoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        // Merge with defaults to ensure all keys exist
        return {
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          stats: { ...DEFAULT_STATS, ...(parsed.stats || {}) },
          reminders: Array.isArray(parsed.reminders) ? parsed.reminders : DEFAULT_STORE.reminders,
          pomodoro: { ...DEFAULT_POMODORO, ...(parsed.pomodoro || {}) },
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : DEFAULT_STORE.tasks,
          notes: Array.isArray(parsed.notes) ? parsed.notes : DEFAULT_STORE.notes,
        };
      }
    } catch (err) {
      console.error('Failed to load store data, using defaults:', err);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STORE));
  }

  public save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Write to temp file then rename for atomic write safety
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('Failed to save store data:', err);
    }
  }

  public getData(): AppStoreData {
    return this.data;
  }

  public getSettings(): PetSettings {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<PetSettings>): PetSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
    return this.data.settings;
  }

  public getStats(): PetStats {
    return this.data.stats;
  }

  public updateStats(updates: Partial<PetStats>): PetStats {
    this.data.stats = {
      ...this.data.stats,
      ...updates,
      hunger: Math.max(0, Math.min(100, updates.hunger ?? this.data.stats.hunger)),
      happiness: Math.max(0, Math.min(100, updates.happiness ?? this.data.stats.happiness)),
      energy: Math.max(0, Math.min(100, updates.energy ?? this.data.stats.energy)),
    };
    this.save();
    return this.data.stats;
  }

  // Reminders
  public getReminders(): Reminder[] {
    return this.data.reminders;
  }

  public addReminder(text: string, dueTime: number): Reminder {
    const reminder: Reminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text,
      dueTime,
      createdAt: Date.now(),
      isCompleted: false,
      snoozeCount: 0,
    };
    this.data.reminders.push(reminder);
    this.save();
    return reminder;
  }

  public completeReminder(id: string): void {
    const rem = this.data.reminders.find((r) => r.id === id);
    if (rem) {
      rem.isCompleted = true;
      this.save();
    }
  }

  public snoozeReminder(id: string, minutes: number = 5): Reminder | null {
    const rem = this.data.reminders.find((r) => r.id === id);
    if (rem) {
      rem.dueTime = Date.now() + minutes * 60 * 1000;
      rem.snoozeCount += 1;
      rem.isCompleted = false;
      this.save();
      return rem;
    }
    return null;
  }

  public deleteReminder(id: string): void {
    this.data.reminders = this.data.reminders.filter((r) => r.id !== id);
    this.save();
  }

  // Tasks
  public getTasks(): TaskItem[] {
    return this.data.tasks;
  }

  public addTask(title: string): TaskItem {
    const task: TaskItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      completed: false,
      createdAt: Date.now(),
    };
    this.data.tasks.unshift(task);
    this.save();
    return task;
  }

  public toggleTask(id: string): { task: TaskItem | null; becameCompleted: boolean } {
    const task = this.data.tasks.find((t) => t.id === id);
    if (task) {
      const becameCompleted = !task.completed;
      task.completed = becameCompleted;
      task.completedAt = becameCompleted ? Date.now() : undefined;
      if (becameCompleted) {
        this.data.stats.totalTasksCompleted += 1;
        this.data.stats.happiness = Math.min(100, this.data.stats.happiness + 8);
        this.data.stats.totalTreatsEarned += 1;
      }
      this.save();
      return { task, becameCompleted };
    }
    return { task: null, becameCompleted: false };
  }

  public deleteTask(id: string): void {
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);
    this.save();
  }

  // Notes
  public getNotes(): QuickNote[] {
    return this.data.notes;
  }

  public saveNote(title: string, content: string, id?: string): QuickNote {
    const now = Date.now();
    if (id) {
      const existing = this.data.notes.find((n) => n.id === id);
      if (existing) {
        existing.title = title;
        existing.content = content;
        existing.updatedAt = now;
        this.save();
        return existing;
      }
    }
    const newNote: QuickNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title || 'Untitled Note',
      content,
      createdAt: now,
      updatedAt: now,
    };
    this.data.notes.unshift(newNote);
    this.save();
    return newNote;
  }

  public deleteNote(id: string): void {
    this.data.notes = this.data.notes.filter((n) => n.id !== id);
    this.save();
  }

  // Pomodoro
  public getPomodoro(): PomodoroState {
    const today = getTodayDateStr();
    if (this.data.pomodoro.lastSessionDate !== today) {
      this.data.pomodoro.lastSessionDate = today;
      this.data.pomodoro.sessionsCompletedToday = 0;
      this.save();
    }
    return this.data.pomodoro;
  }

  public updatePomodoro(updates: Partial<PomodoroState>): PomodoroState {
    this.data.pomodoro = { ...this.data.pomodoro, ...updates };
    this.save();
    return this.data.pomodoro;
  }
}

