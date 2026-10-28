export type PetAnimationState =
  | 'idle'
  | 'walking'
  | 'running'
  | 'jumping'
  | 'sitting'
  | 'lying_down'
  | 'sleeping'
  | 'stretching'
  | 'curious'
  | 'excited'
  | 'sniffing'
  | 'playful_hop'
  | 'eating'
  | 'pet_react'
  | 'dragged'
  | 'wake_up'
  | 'celebrate';

export type PetDirection = 'left' | 'right';

export type PetMood = 'happy' | 'sleepy' | 'curious' | 'excited' | 'focused' | 'hungry' | 'playful';

export type PetSize = 'small' | 'medium' | 'large';

export type AnimationSpeed = 'relaxed' | 'normal' | 'energetic';

export type MovementFrequency = 'rare' | 'normal' | 'frequent' | 'stay_put';

export interface PetStats {
  hunger: number; // 0 - 100
  happiness: number; // 0 - 100
  energy: number; // 0 - 100
  totalTreatsEarned: number;
  totalTasksCompleted: number;
  totalFocusSessions: number;
}

export interface PetSettings {
  size: PetSize;
  animationSpeed: AnimationSpeed;
  movementFrequency: MovementFrequency;
  soundEnabled: boolean;
  quietMode: boolean;
  launchOnStartup: boolean;
  clickThrough: boolean;
  startMinimized: boolean;
  showSpeechBubbles: boolean;
}

export interface Reminder {
  id: string;
  text: string;
  dueTime: number; // timestamp in ms
  createdAt: number;
  isCompleted: boolean;
  snoozeCount: number;
}

export interface PomodoroState {
  isRunning: boolean;
  isBreak: boolean;
  timeLeftSeconds: number;
  focusDurationMinutes: number;
  breakDurationMinutes: number;
  sessionsCompletedToday: number;
  lastSessionDate: string; // YYYY-MM-DD
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface QuickNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface SpeechBubbleData {
  id: string;
  text: string;
  icon?: string;
  type?: 'thought' | 'alert' | 'celebrate' | 'reminder';
  durationMs?: number;
}

export interface PetPosition {
  x: number;
  y: number;
}

export interface AppStoreData {
  settings: PetSettings;
  stats: PetStats;
  reminders: Reminder[];
  pomodoro: PomodoroState;
  tasks: TaskItem[];
  notes: QuickNote[];
}

