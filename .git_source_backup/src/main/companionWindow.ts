import { BrowserWindow, screen } from 'electron';
import * as path from 'path';

export class CompanionWindowManager {
  private window: BrowserWindow | null = null;

  public create(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) {
      return this.window;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workArea;

    const width = 460;
    const height = 580;
    const x = Math.round(workArea.x + workArea.width - width - 60);
    const y = Math.round(workArea.y + workArea.height - height - 120);

    this.window = new BrowserWindow({
      width,
      height,
      x,
      y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      show: false,
      hasShadow: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload/companionPreload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    this.window.loadFile(path.join(__dirname, '../renderer/companion/index.html'));

    this.window.on('blur', () => {
      // Keep open or auto-hide on blur if desired, but keeping open allows easy interaction
    });

    this.window.on('close', (e) => {
      // Instead of destroying, just hide it so it pops up instantly next time
      if (this.window && !this.window.isDestroyed()) {
        e.preventDefault();
        this.window.hide();
      }
    });

    return this.window;
  }

  public getWindow(): BrowserWindow | null {
    return this.window;
  }

  public show(nearX?: number, nearY?: number): void {
    if (!this.window || this.window.isDestroyed()) {
      this.create();
    }

    if (!this.window) return;

    if (nearX !== undefined && nearY !== undefined) {
      const display = screen.getDisplayNearestPoint({ x: nearX, y: nearY });
      const workArea = display.workArea;
      const [width, height] = this.window.getSize();

      // Position to the left or right of the pet, nicely aligned
      let targetX = nearX - width - 20;
      if (targetX < workArea.x + 20) {
        targetX = nearX + 240; // show to the right
      }
      let targetY = nearY - height + 100;
      // Clamp within workArea
      targetX = Math.max(workArea.x + 10, Math.min(targetX, workArea.x + workArea.width - width - 10));
      targetY = Math.max(workArea.y + 10, Math.min(targetY, workArea.y + workArea.height - height - 10));

      this.window.setPosition(Math.round(targetX), Math.round(targetY));
    }

    this.window.show();
    this.window.focus();
  }

  public hide(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
    }
  }

  public toggle(nearX?: number, nearY?: number): void {
    if (!this.window || this.window.isDestroyed()) {
      this.show(nearX, nearY);
      return;
    }

    if (this.window.isVisible()) {
      this.hide();
    } else {
      this.show(nearX, nearY);
    }
  }

  public notifyRenderer(channel: string, ...args: any[]): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, ...args);
    }
  }

  public destroy(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.removeAllListeners('close');
      this.window.destroy();
      this.window = null;
    }
  }
}

