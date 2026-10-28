import { Notification } from 'electron';
import { AppStore } from './store';
import { Reminder } from '../shared/types';

export class ReminderScheduler {
  private store: AppStore;
  private timer: NodeJS.Timeout | null = null;
  private notifiedIds: Set<string> = new Set();
  private onTriggerCallback?: (reminder: Reminder) => void;

  constructor(store: AppStore) {
    this.store = store;
  }

  public setOnTrigger(callback: (reminder: Reminder) => void): void {
    this.onTriggerCallback = callback;
  }

  public start(): void {
    if (this.timer) return;
    this.checkReminders();
    this.timer = setInterval(() => {
      this.checkReminders();
    }, 4000); // Check every 4 seconds
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private checkReminders(): void {
    const reminders = this.store.getReminders();
    const settings = this.store.getSettings();
    const now = Date.now();

    for (const reminder of reminders) {
      if (!reminder.isCompleted && reminder.dueTime <= now) {
        if (!this.notifiedIds.has(reminder.id)) {
          this.notifiedIds.add(reminder.id);
          this.triggerReminder(reminder, settings.quietMode);
        }
      }
    }
  }

  private triggerReminder(reminder: Reminder, quietMode: boolean): void {
    // Notify through callback to pet window (speech bubble + animation)
    if (this.onTriggerCallback) {
      this.onTriggerCallback(reminder);
    }

    // Native Windows OS Notification (unless in quiet mode)
    if (!quietMode && Notification.isSupported()) {
      try {
        const notif = new Notification({
          title: '🐾 Desktop Pet Reminder!',
          body: reminder.text,
          silent: false,
        });
        notif.show();
      } catch (e) {
        console.error('Failed to show native notification:', e);
      }
    }
  }

  public resetNotified(id: string): void {
    this.notifiedIds.delete(id);
  }
}

