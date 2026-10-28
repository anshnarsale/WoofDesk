import {
  AppStoreData,
  PetSettings,
  PetStats,
  Reminder,
  PomodoroState,
  TaskItem,
  QuickNote,
} from '../../shared/types';

declare global {
  interface Window {
    companionAPI: {
      getInitialData: () => Promise<AppStoreData>;
      closeWindow: () => void;
      quitApp: () => void;
      feedPet: () => void;
      playPet: () => void;
      sleepPet: () => void;
      togglePauseMovement: () => void;
      updateSettings: (updates: Partial<PetSettings>) => Promise<PetSettings>;
      getPomodoro: () => Promise<PomodoroState>;
      updatePomodoro: (updates: Partial<PomodoroState>) => void;
      pomodoroCompleted: () => void;
      breakCompleted: () => void;
      getReminders: () => Promise<Reminder[]>;
      addReminder: (text: string, dueTime: number) => Promise<Reminder>;
      completeReminder: (id: string) => Promise<boolean>;
      snoozeReminder: (id: string, minutes: number) => Promise<Reminder | null>;
      deleteReminder: (id: string) => Promise<boolean>;
      getTasks: () => Promise<TaskItem[]>;
      addTask: (title: string) => Promise<TaskItem>;
      toggleTask: (id: string) => Promise<TaskItem | null>;
      deleteTask: (id: string) => Promise<boolean>;
      getNotes: () => Promise<QuickNote[]>;
      saveNote: (title: string, content: string, id?: string) => Promise<QuickNote>;
      deleteNote: (id: string) => Promise<boolean>;
      onStatsUpdated: (callback: (stats: PetStats) => void) => void;
      onPomodoroUpdated: (callback: (pomodoro: PomodoroState) => void) => void;
      onRemindersUpdated: (callback: (reminders: Reminder[]) => void) => void;
      onReminderTriggered: (callback: (reminder: Reminder) => void) => void;
      onTasksUpdated: (callback: (tasks: TaskItem[]) => void) => void;
      onNotesUpdated: (callback: (notes: QuickNote[]) => void) => void;
      onSettingsUpdated: (callback: (settings: PetSettings) => void) => void;
      onSwitchTab: (callback: (tabName: string) => void) => void;
      onMovementPausedChanged: (callback: (isPaused: boolean) => void) => void;
    };
  }
}

class CompanionApp {
  private data!: AppStoreData;
  private pomodoroInterval: number | null = null;
  private selectedReminderMinutes: number = 30;
  private currentNoteId: string | null = null;
  private isMovementPaused: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    this.setupWindowControls();
    this.setupTabs();

    try {
      this.data = await window.companionAPI.getInitialData();
      this.renderAll();
      this.setupIpcListeners();
      this.setupActionListeners();
      this.setupPomodoroControls();
      this.setupTaskControls();
      this.setupReminderControls();
      this.setupNoteControls();
      this.setupSettingsControls();
      this.startPomodoroTick();
    } catch (err) {
      console.error('Failed to initialize companion app:', err);
    }
  }

  private setupWindowControls() {
    const btnClose = document.getElementById('btnClose');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        window.companionAPI.closeWindow();
      });
    }

    const btnQuit = document.getElementById('btnQuitApp');
    if (btnQuit) {
      btnQuit.addEventListener('click', () => {
        window.companionAPI.quitApp();
      });
    }
  }

  private setupTabs() {
    const tabBtns = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });
  }

  private switchTab(tabName: string) {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `panel-${tabName}`);
    });
  }

  private renderAll() {
    this.renderStats(this.data.stats);
    this.renderPomodoro(this.data.pomodoro);
    this.renderTasks(this.data.tasks);
    this.renderReminders(this.data.reminders);
    this.renderNotes(this.data.notes);
    this.renderSettings(this.data.settings);
  }

  // 1. STATS & ACTIONS
  private renderStats(stats: PetStats) {
    const hungerVal = document.getElementById('valHunger');
    const hungerBar = document.getElementById('barHunger');
    if (hungerVal && hungerBar) {
      hungerVal.innerText = `${Math.round(stats.hunger)}%`;
      hungerBar.style.width = `${Math.round(stats.hunger)}%`;
    }

    const happyVal = document.getElementById('valHappiness');
    const happyBar = document.getElementById('barHappiness');
    if (happyVal && happyBar) {
      happyVal.innerText = `${Math.round(stats.happiness)}%`;
      happyBar.style.width = `${Math.round(stats.happiness)}%`;
    }

    const energyVal = document.getElementById('valEnergy');
    const energyBar = document.getElementById('barEnergy');
    if (energyVal && energyBar) {
      energyVal.innerText = `${Math.round(stats.energy)}%`;
      energyBar.style.width = `${Math.round(stats.energy)}%`;
    }

    const statTreats = document.getElementById('statTreats');
    if (statTreats) statTreats.innerText = String(stats.totalTreatsEarned);

    const statTasks = document.getElementById('statTasks');
    if (statTasks) statTasks.innerText = String(stats.totalTasksCompleted);

    const statSessions = document.getElementById('statSessions');
    if (statSessions) statSessions.innerText = String(stats.totalFocusSessions);

    const moodBadge = document.getElementById('petMoodBadge');
    if (moodBadge) {
      if (stats.hunger < 35) moodBadge.innerText = 'Hungry for a treat! 🦴';
      else if (stats.energy < 30) moodBadge.innerText = 'Sleepy & resting 💤';
      else if (stats.happiness > 80) moodBadge.innerText = 'Super Happy & Loving! 💖';
      else moodBadge.innerText = 'Content & Relaxed 🐾';
    }
  }

  private setupActionListeners() {
    document.getElementById('btnFeed')?.addEventListener('click', () => {
      window.companionAPI.feedPet();
    });

    document.getElementById('btnPlay')?.addEventListener('click', () => {
      window.companionAPI.playPet();
    });

    document.getElementById('btnSleep')?.addEventListener('click', () => {
      window.companionAPI.sleepPet();
    });

    document.getElementById('btnTogglePause')?.addEventListener('click', () => {
      window.companionAPI.togglePauseMovement();
    });

    document.querySelectorAll<HTMLButtonElement>('.btn-size').forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = btn.getAttribute('data-size') as any;
        if (size) {
          window.companionAPI.updateSettings({ size });
        }
      });
    });
  }

  // 2. POMODORO
  private renderPomodoro(pomodoro: PomodoroState) {
    const digits = document.getElementById('timerDigits');
    if (digits) {
      const mins = Math.floor(pomodoro.timeLeftSeconds / 60);
      const secs = pomodoro.timeLeftSeconds % 60;
      digits.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    const badge = document.getElementById('timerModeBadge');
    const statusMsg = document.getElementById('timerStatusMsg');
    if (badge && statusMsg) {
      if (pomodoro.isBreak) {
        badge.innerText = '☕ Short Break';
        badge.style.color = '#107C41';
        badge.style.background = 'rgba(16, 124, 65, 0.12)';
        statusMsg.innerText = 'Enjoy your break! Stretch and breathe 🌱';
      } else {
        badge.innerText = '🍅 Focus Session';
        badge.style.color = 'var(--accent)';
        badge.style.background = 'var(--accent-light)';
        statusMsg.innerText = pomodoro.isRunning
          ? 'Buddy is sitting quietly while you focus 🐾'
          : 'Ready for deep focus?';
      }
    }

    const btnToggle = document.getElementById('btnTimerToggle');
    if (btnToggle) {
      btnToggle.innerHTML = pomodoro.isRunning ? '<span>⏸️ Pause</span>' : '<span>▶️ Start Focus</span>';
    }

    const todaySessions = document.getElementById('badgeTodaySessions');
    if (todaySessions) {
      todaySessions.innerText = `${pomodoro.sessionsCompletedToday} sessions`;
    }

    const selFocus = document.getElementById('selFocusDuration') as HTMLSelectElement;
    if (selFocus) selFocus.value = String(pomodoro.focusDurationMinutes);

    const selBreak = document.getElementById('selBreakDuration') as HTMLSelectElement;
    if (selBreak) selBreak.value = String(pomodoro.breakDurationMinutes);
  }

  private setupPomodoroControls() {
    const btnToggle = document.getElementById('btnTimerToggle');
    btnToggle?.addEventListener('click', () => {
      const current = this.data.pomodoro;
      const isRunning = !current.isRunning;
      this.data.pomodoro.isRunning = isRunning;
      window.companionAPI.updatePomodoro({ isRunning });
      this.renderPomodoro(this.data.pomodoro);
    });

    const btnReset = document.getElementById('btnTimerReset');
    btnReset?.addEventListener('click', () => {
      const current = this.data.pomodoro;
      const totalSec = (current.isBreak ? current.breakDurationMinutes : current.focusDurationMinutes) * 60;
      this.data.pomodoro.isRunning = false;
      this.data.pomodoro.timeLeftSeconds = totalSec;
      window.companionAPI.updatePomodoro({ isRunning: false, timeLeftSeconds: totalSec });
      this.renderPomodoro(this.data.pomodoro);
    });

    document.getElementById('selFocusDuration')?.addEventListener('change', (e) => {
      const val = parseInt((e.target as HTMLSelectElement).value, 10);
      this.data.pomodoro.focusDurationMinutes = val;
      if (!this.data.pomodoro.isRunning && !this.data.pomodoro.isBreak) {
        this.data.pomodoro.timeLeftSeconds = val * 60;
      }
      window.companionAPI.updatePomodoro({
        focusDurationMinutes: val,
        timeLeftSeconds: this.data.pomodoro.timeLeftSeconds,
      });
      this.renderPomodoro(this.data.pomodoro);
    });

    document.getElementById('selBreakDuration')?.addEventListener('change', (e) => {
      const val = parseInt((e.target as HTMLSelectElement).value, 10);
      this.data.pomodoro.breakDurationMinutes = val;
      if (!this.data.pomodoro.isRunning && this.data.pomodoro.isBreak) {
        this.data.pomodoro.timeLeftSeconds = val * 60;
      }
      window.companionAPI.updatePomodoro({
        breakDurationMinutes: val,
        timeLeftSeconds: this.data.pomodoro.timeLeftSeconds,
      });
      this.renderPomodoro(this.data.pomodoro);
    });
  }

  private startPomodoroTick() {
    this.pomodoroInterval = window.setInterval(() => {
      const p = this.data.pomodoro;
      if (p.isRunning && p.timeLeftSeconds > 0) {
        p.timeLeftSeconds -= 1;
        this.renderPomodoro(p);

        if (p.timeLeftSeconds <= 0) {
          if (!p.isBreak) {
            // Finished focus!
            window.companionAPI.pomodoroCompleted();
            p.isBreak = true;
            p.timeLeftSeconds = p.breakDurationMinutes * 60;
            p.isRunning = false;
          } else {
            // Finished break!
            window.companionAPI.breakCompleted();
            p.isBreak = false;
            p.timeLeftSeconds = p.focusDurationMinutes * 60;
            p.isRunning = false;
          }
          window.companionAPI.updatePomodoro({
            isBreak: p.isBreak,
            timeLeftSeconds: p.timeLeftSeconds,
            isRunning: false,
          });
          this.renderPomodoro(p);
        }
      }
    }, 1000);
  }

  // 3. TASKS
  private renderTasks(tasks: TaskItem[]) {
    const list = document.getElementById('taskList');
    const badge = document.getElementById('taskCountBadge');
    if (!list) return;

    list.innerHTML = '';
    const pendingCount = tasks.filter((t) => !t.completed).length;
    if (badge) badge.innerText = `${pendingCount} pending`;

    if (tasks.length === 0) {
      list.innerHTML = `<div class="empty-state">No tasks yet! Add one above to get started. 🐾</div>`;
      return;
    }

    tasks.forEach((task) => {
      const item = document.createElement('div');
      item.className = 'list-item';

      const left = document.createElement('div');
      left.className = 'list-item-left';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => {
        window.companionAPI.toggleTask(task.id);
      });

      const text = document.createElement('span');
      text.className = `list-item-text ${task.completed ? 'completed' : ''}`;
      text.innerText = task.title;

      left.appendChild(checkbox);
      left.appendChild(text);

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn';
      delBtn.innerHTML = '✕';
      delBtn.title = 'Delete task';
      delBtn.addEventListener('click', () => {
        window.companionAPI.deleteTask(task.id);
      });

      item.appendChild(left);
      item.appendChild(delBtn);
      list.appendChild(item);
    });
  }

  private setupTaskControls() {
    const input = document.getElementById('inputNewTask') as HTMLInputElement;
    const btn = document.getElementById('btnAddTask');

    const handleAdd = async () => {
      const val = input.value.trim();
      if (val) {
        await window.companionAPI.addTask(val);
        input.value = '';
      }
    };

    btn?.addEventListener('click', handleAdd);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
    });
  }

  // 4. REMINDERS
  private renderReminders(reminders: Reminder[]) {
    const list = document.getElementById('reminderList');
    if (!list) return;

    list.innerHTML = '';
    const activeReminders = reminders.filter((r) => !r.isCompleted);

    if (activeReminders.length === 0) {
      list.innerHTML = `<div class="empty-state">No upcoming reminders. All clear! 🌿</div>`;
      return;
    }

    const now = Date.now();
    activeReminders.forEach((rem) => {
      const diffMs = rem.dueTime - now;
      let timeText = '';
      if (diffMs <= 0) {
        timeText = '⏰ Due now!';
      } else {
        const mins = Math.ceil(diffMs / 60000);
        timeText = mins >= 60 ? `in ${Math.floor(mins / 60)}h ${mins % 60}m` : `in ${mins}m`;
      }

      const item = document.createElement('div');
      item.className = 'list-item';

      const left = document.createElement('div');
      left.className = 'list-item-left';

      const content = document.createElement('div');
      content.style.display = 'flex';
      content.style.flexDirection = 'column';

      const title = document.createElement('span');
      title.style.fontWeight = '500';
      title.innerText = rem.text;

      const sub = document.createElement('span');
      sub.style.fontSize = '11.5px';
      sub.style.color = diffMs <= 0 ? '#E74C3C' : 'var(--text-muted)';
      sub.innerText = timeText;

      content.appendChild(title);
      content.appendChild(sub);
      left.appendChild(content);

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '4px';

      const snoozeBtn = document.createElement('button');
      snoozeBtn.className = 'btn';
      snoozeBtn.style.padding = '4px 8px';
      snoozeBtn.style.fontSize = '11px';
      snoozeBtn.innerText = '+5m';
      snoozeBtn.title = 'Snooze 5 minutes';
      snoozeBtn.addEventListener('click', () => {
        window.companionAPI.snoozeReminder(rem.id, 5);
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn';
      delBtn.innerHTML = '✕';
      delBtn.title = 'Dismiss reminder';
      delBtn.addEventListener('click', () => {
        window.companionAPI.deleteReminder(rem.id);
      });

      actions.appendChild(snoozeBtn);
      actions.appendChild(delBtn);

      item.appendChild(left);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  private setupReminderControls() {
    const chips = document.querySelectorAll<HTMLButtonElement>('.chip-time');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => (c.style.background = 'var(--bg-card)'));
        chip.style.background = 'var(--accent-light)';
        this.selectedReminderMinutes = parseInt(chip.getAttribute('data-minutes') || '30', 10);
      });
    });

    const input = document.getElementById('inputReminderText') as HTMLInputElement;
    const btn = document.getElementById('btnAddReminder');

    btn?.addEventListener('click', async () => {
      const text = input.value.trim();
      if (text) {
        const dueTime = Date.now() + this.selectedReminderMinutes * 60 * 1000;
        await window.companionAPI.addReminder(text, dueTime);
        input.value = '';
      }
    });
  }

  // 5. NOTES
  private renderNotes(notes: QuickNote[]) {
    const sel = document.getElementById('selNoteSelect') as HTMLSelectElement;
    if (!sel) return;

    sel.innerHTML = '';
    notes.forEach((note) => {
      const opt = document.createElement('option');
      opt.value = note.id;
      opt.innerText = note.title;
      sel.appendChild(opt);
    });

    if (notes.length > 0) {
      if (!this.currentNoteId || !notes.find((n) => n.id === this.currentNoteId)) {
        this.currentNoteId = notes[0].id;
      }
      sel.value = this.currentNoteId;
      this.loadNoteToEditor(notes.find((n) => n.id === this.currentNoteId)!);
    } else {
      this.currentNoteId = null;
      this.clearNoteEditor();
    }
  }

  private loadNoteToEditor(note: QuickNote) {
    const titleInput = document.getElementById('inputNoteTitle') as HTMLInputElement;
    const contentArea = document.getElementById('areaNoteContent') as HTMLTextAreaElement;
    if (titleInput) titleInput.value = note.title;
    if (contentArea) contentArea.value = note.content;
  }

  private clearNoteEditor() {
    const titleInput = document.getElementById('inputNoteTitle') as HTMLInputElement;
    const contentArea = document.getElementById('areaNoteContent') as HTMLTextAreaElement;
    if (titleInput) titleInput.value = '';
    if (contentArea) contentArea.value = '';
  }

  private setupNoteControls() {
    const sel = document.getElementById('selNoteSelect') as HTMLSelectElement;
    sel?.addEventListener('change', () => {
      this.currentNoteId = sel.value;
      const note = this.data.notes.find((n) => n.id === this.currentNoteId);
      if (note) this.loadNoteToEditor(note);
    });

    document.getElementById('btnNewNote')?.addEventListener('click', () => {
      this.currentNoteId = null;
      this.clearNoteEditor();
      document.getElementById('inputNoteTitle')?.focus();
    });

    document.getElementById('btnSaveNote')?.addEventListener('click', async () => {
      const titleInput = document.getElementById('inputNoteTitle') as HTMLInputElement;
      const contentArea = document.getElementById('areaNoteContent') as HTMLTextAreaElement;
      const title = titleInput.value.trim() || 'Untitled Note';
      const content = contentArea.value;

      const saved = await window.companionAPI.saveNote(title, content, this.currentNoteId || undefined);
      this.currentNoteId = saved.id;
    });

    document.getElementById('btnDeleteNote')?.addEventListener('click', async () => {
      if (this.currentNoteId) {
        await window.companionAPI.deleteNote(this.currentNoteId);
        this.currentNoteId = null;
      }
    });
  }

  // 6. SETTINGS
  private renderSettings(settings: PetSettings) {
    const selSize = document.getElementById('selSettingSize') as HTMLSelectElement;
    if (selSize) selSize.value = settings.size;

    const selMovement = document.getElementById('selSettingMovement') as HTMLSelectElement;
    if (selMovement) selMovement.value = settings.movementFrequency;

    const selSpeed = document.getElementById('selSettingSpeed') as HTMLSelectElement;
    if (selSpeed) selSpeed.value = settings.animationSpeed;

    const chkSound = document.getElementById('chkSettingSound') as HTMLInputElement;
    if (chkSound) chkSound.checked = settings.soundEnabled;

    const chkQuiet = document.getElementById('chkSettingQuiet') as HTMLInputElement;
    if (chkQuiet) chkQuiet.checked = settings.quietMode;

    const chkClickThrough = document.getElementById('chkSettingClickThrough') as HTMLInputElement;
    if (chkClickThrough) chkClickThrough.checked = settings.clickThrough;

    const chkStartup = document.getElementById('chkSettingStartup') as HTMLInputElement;
    if (chkStartup) chkStartup.checked = settings.launchOnStartup;
  }

  private setupSettingsControls() {
    document.getElementById('selSettingSize')?.addEventListener('change', (e) => {
      const size = (e.target as HTMLSelectElement).value as any;
      window.companionAPI.updateSettings({ size });
    });

    document.getElementById('selSettingMovement')?.addEventListener('change', (e) => {
      const movementFrequency = (e.target as HTMLSelectElement).value as any;
      window.companionAPI.updateSettings({ movementFrequency });
    });

    document.getElementById('selSettingSpeed')?.addEventListener('change', (e) => {
      const animationSpeed = (e.target as HTMLSelectElement).value as any;
      window.companionAPI.updateSettings({ animationSpeed });
    });

    document.getElementById('chkSettingSound')?.addEventListener('change', (e) => {
      const soundEnabled = (e.target as HTMLInputElement).checked;
      window.companionAPI.updateSettings({ soundEnabled });
    });

    document.getElementById('chkSettingQuiet')?.addEventListener('change', (e) => {
      const quietMode = (e.target as HTMLInputElement).checked;
      window.companionAPI.updateSettings({ quietMode });
    });

    document.getElementById('chkSettingClickThrough')?.addEventListener('change', (e) => {
      const clickThrough = (e.target as HTMLInputElement).checked;
      window.companionAPI.updateSettings({ clickThrough });
    });

    document.getElementById('chkSettingStartup')?.addEventListener('change', (e) => {
      const launchOnStartup = (e.target as HTMLInputElement).checked;
      window.companionAPI.updateSettings({ launchOnStartup });
    });
  }

  private setupIpcListeners() {
    window.companionAPI.onStatsUpdated((stats) => {
      this.data.stats = stats;
      this.renderStats(stats);
    });

    window.companionAPI.onPomodoroUpdated((pomodoro) => {
      this.data.pomodoro = pomodoro;
      this.renderPomodoro(pomodoro);
    });

    window.companionAPI.onRemindersUpdated((reminders) => {
      this.data.reminders = reminders;
      this.renderReminders(reminders);
    });

    window.companionAPI.onTasksUpdated((tasks) => {
      this.data.tasks = tasks;
      this.renderTasks(tasks);
    });

    window.companionAPI.onNotesUpdated((notes) => {
      this.data.notes = notes;
      this.renderNotes(notes);
    });

    window.companionAPI.onSettingsUpdated((settings) => {
      this.data.settings = settings;
      this.renderSettings(settings);
    });

    window.companionAPI.onSwitchTab((tabName) => {
      this.switchTab(tabName);
    });

    window.companionAPI.onMovementPausedChanged((isPaused) => {
      this.isMovementPaused = isPaused;
      const icon = document.getElementById('pauseIcon');
      const text = document.getElementById('pauseText');
      if (icon && text) {
        icon.innerText = isPaused ? '▶️' : '⏸️';
        text.innerText = isPaused ? 'Resume Walk' : 'Pause Walk';
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CompanionApp();
});

