import { app, ipcMain, BrowserWindow } from 'electron';
import { AppStore } from './store';
import { PetWindowManager } from './petWindow';
import { CompanionWindowManager } from './companionWindow';
import { ReminderScheduler } from './reminderScheduler';
import { TrayManager } from './tray';
import { PetSettings } from '../shared/types';

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let store: AppStore;
  let petManager: PetWindowManager;
  let companionManager: CompanionWindowManager;
  let reminderScheduler: ReminderScheduler;
  let trayManager: TrayManager;

  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus companion
    if (companionManager) {
      companionManager.show();
    }
  });

  app.whenReady().then(() => {
    store = new AppStore();
    petManager = new PetWindowManager(store);
    companionManager = new CompanionWindowManager();
    trayManager = new TrayManager(petManager, companionManager, store);
    reminderScheduler = new ReminderScheduler(store);

    // Setup Reminder Trigger Callback
    reminderScheduler.setOnTrigger((reminder) => {
      petManager.triggerCelebration();
      petManager.showSpeechBubble(`⏰ Reminder: ${reminder.text}`, '🚨', 6000);
      companionManager.notifyRenderer('reminder-triggered', reminder);
      companionManager.notifyRenderer('reminders-updated', store.getReminders());
    });
    reminderScheduler.start();

    // Create Pet Window
    petManager.create();

    // Create Companion Window (hidden initially unless configured otherwise)
    companionManager.create();

    // Create Tray Icon
    trayManager.create();

    // Configure launch on startup if set
    if (store.getSettings().launchOnStartup) {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath('exe'),
      });
    }

    setupIpcHandlers();
  });

  function setupIpcHandlers() {
    // Initial data
    ipcMain.handle('get-initial-data', () => {
      return store.getData();
    });

    // Pet window dragging
    ipcMain.on('pet-drag-start', () => {
      petManager.handleDragStart();
    });

    ipcMain.on('pet-drag-move', (_event, deltaX: number, deltaY: number) => {
      petManager.handleDragMove(deltaX, deltaY);
    });

    ipcMain.on('pet-drag-end', () => {
      petManager.handleDragEnd();
    });

    // Companion open / toggle
    ipcMain.on('open-companion', () => {
      const petWin = petManager.getWindow();
      if (petWin) {
        const bounds = petWin.getBounds();
        companionManager.show(bounds.x, bounds.y);
      } else {
        companionManager.show();
      }
    });

    ipcMain.on('toggle-companion', () => {
      const petWin = petManager.getWindow();
      if (petWin) {
        const bounds = petWin.getBounds();
        companionManager.toggle(bounds.x, bounds.y);
      } else {
        companionManager.toggle();
      }
    });

    ipcMain.on('close-companion', () => {
      companionManager.hide();
    });

    // Pet actions
    ipcMain.on('pet-clicked', () => {
      petManager.triggerPetReact();
      const currentStats = store.getStats();
      const updated = store.updateStats({
        happiness: Math.min(100, currentStats.happiness + 3),
      });
      companionManager.notifyRenderer('stats-updated', updated);
    });

    ipcMain.on('feed-pet', () => {
      petManager.triggerEat();
      const currentStats = store.getStats();
      const updated = store.updateStats({
        hunger: 100,
        happiness: Math.min(100, currentStats.happiness + 8),
        totalTreatsEarned: currentStats.totalTreatsEarned + 1,
      });
      companionManager.notifyRenderer('stats-updated', updated);
    });

    ipcMain.on('play-pet', () => {
      petManager.triggerPlay();
      const currentStats = store.getStats();
      const updated = store.updateStats({
        happiness: 100,
        energy: Math.max(10, currentStats.energy - 10),
      });
      companionManager.notifyRenderer('stats-updated', updated);
    });

    ipcMain.on('sleep-pet', () => {
      petManager.triggerSleep();
      const updated = store.updateStats({
        energy: 100,
      });
      companionManager.notifyRenderer('stats-updated', updated);
    });

    ipcMain.on('toggle-pause-movement', () => {
      const isPaused = petManager.togglePauseMovement();
      trayManager.updateContextMenu();
      companionManager.notifyRenderer('movement-paused-changed', isPaused);
    });

    // Settings
    ipcMain.handle('update-settings', (_event, updates: Partial<PetSettings>) => {
      const newSettings = store.updateSettings(updates);
      if (updates.size !== undefined) {
        petManager.setSize(updates.size);
      }
      if (updates.clickThrough !== undefined) {
        petManager.setClickThrough(updates.clickThrough);
      }
      if (updates.launchOnStartup !== undefined) {
        app.setLoginItemSettings({
          openAtLogin: updates.launchOnStartup,
          path: app.getPath('exe'),
        });
      }
      trayManager.updateContextMenu();
      petManager.notifyRenderer('settings-updated', newSettings);
      companionManager.notifyRenderer('settings-updated', newSettings);
      return newSettings;
    });

    // Pomodoro
    ipcMain.handle('get-pomodoro', () => {
      return store.getPomodoro();
    });

    ipcMain.on('update-pomodoro', (_event, updates) => {
      const pomodoro = store.updatePomodoro(updates);
      companionManager.notifyRenderer('pomodoro-updated', pomodoro);
    });

    ipcMain.on('pomodoro-completed', () => {
      const pomodoro = store.getPomodoro();
      const newSessions = pomodoro.sessionsCompletedToday + 1;
      store.updatePomodoro({ sessionsCompletedToday: newSessions });

      const stats = store.getStats();
      const updatedStats = store.updateStats({
        totalFocusSessions: stats.totalFocusSessions + 1,
        happiness: Math.min(100, stats.happiness + 15),
        totalTreatsEarned: stats.totalTreatsEarned + 1,
      });

      petManager.triggerCelebration('Focus session finished! Wonderful job! 🎉⭐');
      companionManager.notifyRenderer('pomodoro-updated', store.getPomodoro());
      companionManager.notifyRenderer('stats-updated', updatedStats);
    });

    ipcMain.on('break-completed', () => {
      petManager.showSpeechBubble('Break time over! Ready to focus again? 🐾', '⏱️', 4500);
    });

    // Reminders
    ipcMain.handle('get-reminders', () => {
      return store.getReminders();
    });

    ipcMain.handle('add-reminder', (_event, text: string, dueTime: number) => {
      const rem = store.addReminder(text, dueTime);
      reminderScheduler.resetNotified(rem.id);
      companionManager.notifyRenderer('reminders-updated', store.getReminders());
      return rem;
    });

    ipcMain.handle('complete-reminder', (_event, id: string) => {
      store.completeReminder(id);
      companionManager.notifyRenderer('reminders-updated', store.getReminders());
      return true;
    });

    ipcMain.handle('snooze-reminder', (_event, id: string, minutes: number) => {
      const updated = store.snoozeReminder(id, minutes);
      if (updated) {
        reminderScheduler.resetNotified(updated.id);
      }
      companionManager.notifyRenderer('reminders-updated', store.getReminders());
      return updated;
    });

    ipcMain.handle('delete-reminder', (_event, id: string) => {
      store.deleteReminder(id);
      companionManager.notifyRenderer('reminders-updated', store.getReminders());
      return true;
    });

    // Tasks
    ipcMain.handle('get-tasks', () => {
      return store.getTasks();
    });

    ipcMain.handle('add-task', (_event, title: string) => {
      const task = store.addTask(title);
      companionManager.notifyRenderer('tasks-updated', store.getTasks());
      return task;
    });

    ipcMain.handle('toggle-task', (_event, id: string) => {
      const { task, becameCompleted } = store.toggleTask(id);
      if (becameCompleted) {
        petManager.triggerCelebration('Task completed! +1 Treat 🦴✨');
        companionManager.notifyRenderer('stats-updated', store.getStats());
      }
      companionManager.notifyRenderer('tasks-updated', store.getTasks());
      return task;
    });

    ipcMain.handle('delete-task', (_event, id: string) => {
      store.deleteTask(id);
      companionManager.notifyRenderer('tasks-updated', store.getTasks());
      return true;
    });

    // Notes
    ipcMain.handle('get-notes', () => {
      return store.getNotes();
    });

    ipcMain.handle('save-note', (_event, title: string, content: string, id?: string) => {
      const note = store.saveNote(title, content, id);
      companionManager.notifyRenderer('notes-updated', store.getNotes());
      return note;
    });

    ipcMain.handle('delete-note', (_event, id: string) => {
      store.deleteNote(id);
      companionManager.notifyRenderer('notes-updated', store.getNotes());
      return true;
    });

    // Quit app
    ipcMain.on('quit-app', () => {
      app.quit();
    });
  }

  app.on('window-all-closed', () => {
    // Keep app running in background / tray even if windows close
  });

  app.on('before-quit', () => {
    if (reminderScheduler) reminderScheduler.stop();
    if (petManager) petManager.destroy();
    if (companionManager) companionManager.destroy();
    if (trayManager) trayManager.destroy();
  });
}
