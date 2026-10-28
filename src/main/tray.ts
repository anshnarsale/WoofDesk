import { Tray, Menu, nativeImage, app } from 'electron';
import * as path from 'path';
import { PetWindowManager } from './petWindow';
import { CompanionWindowManager } from './companionWindow';
import { AppStore } from './store';

export class TrayManager {
  private tray: Tray | null = null;
  private petManager: PetWindowManager;
  private companionManager: CompanionWindowManager;
  private store: AppStore;

  constructor(petManager: PetWindowManager, companionManager: CompanionWindowManager, store: AppStore) {
    this.petManager = petManager;
    this.companionManager = companionManager;
    this.store = store;
  }

  public create(): Tray {
    const iconPath = path.join(__dirname, '../../assets/tray.png');
    const icon = nativeImage.createFromPath(iconPath);

    this.tray = new Tray(icon);
    this.tray.setToolTip('Desktop Pet Dog - Buddy 🐕');

    this.updateContextMenu();

    this.tray.on('click', () => {
      const petWin = this.petManager.getWindow();
      if (petWin) {
        const bounds = petWin.getBounds();
        this.companionManager.toggle(bounds.x, bounds.y);
      } else {
        this.companionManager.toggle();
      }
    });

    this.tray.on('double-click', () => {
      const petWin = this.petManager.getWindow();
      if (petWin) {
        const bounds = petWin.getBounds();
        this.companionManager.show(bounds.x, bounds.y);
      } else {
        this.companionManager.show();
      }
    });

    return this.tray;
  }

  public updateContextMenu(): void {
    if (!this.tray) return;

    const settings = this.store.getSettings();
    const isPaused = this.petManager.getIsPaused();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '🐕 Buddy - Desktop Pet',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: '📋 Companion Dashboard',
        click: () => {
          const petWin = this.petManager.getWindow();
          if (petWin) {
            const bounds = petWin.getBounds();
            this.companionManager.show(bounds.x, bounds.y);
          } else {
            this.companionManager.show();
          }
        },
      },
      {
        label: '🦴 Give Treat (Feed)',
        click: () => {
          this.petManager.triggerEat();
          this.store.updateStats({
            hunger: 100,
            happiness: Math.min(100, this.store.getStats().happiness + 10),
            totalTreatsEarned: this.store.getStats().totalTreatsEarned + 1,
          });
          this.companionManager.notifyRenderer('stats-updated', this.store.getStats());
        },
      },
      {
        label: '🎾 Play with Dog',
        click: () => {
          this.petManager.triggerPlay();
          this.store.updateStats({
            happiness: 100,
            energy: Math.max(10, this.store.getStats().energy - 10),
          });
          this.companionManager.notifyRenderer('stats-updated', this.store.getStats());
        },
      },
      {
        label: '💤 Put to Sleep',
        click: () => {
          this.petManager.triggerSleep();
          this.store.updateStats({
            energy: 100,
          });
          this.companionManager.notifyRenderer('stats-updated', this.store.getStats());
        },
      },
      { type: 'separator' },
      {
        label: isPaused ? '▶️ Resume Movement' : '⏸️ Pause Movement',
        click: () => {
          this.petManager.togglePauseMovement();
          this.updateContextMenu();
        },
      },
      {
        label: '👻 Click-Through Mode',
        type: 'checkbox',
        checked: settings.clickThrough,
        click: (item) => {
          this.petManager.setClickThrough(item.checked);
          this.updateContextMenu();
        },
      },
      {
        label: '🤫 Quiet Mode',
        type: 'checkbox',
        checked: settings.quietMode,
        click: (item) => {
          this.store.updateSettings({ quietMode: item.checked });
          this.updateContextMenu();
        },
      },
      { type: 'separator' },
      {
        label: '⚙️ Settings',
        click: () => {
          const petWin = this.petManager.getWindow();
          if (petWin) {
            const bounds = petWin.getBounds();
            this.companionManager.show(bounds.x, bounds.y);
          } else {
            this.companionManager.show();
          }
          this.companionManager.notifyRenderer('switch-tab', 'settings');
        },
      },
      {
        label: '❌ Exit',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

