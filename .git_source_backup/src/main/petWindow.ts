import { BrowserWindow, screen, ipcMain, Display } from 'electron';
import * as path from 'path';
import { PetSize, MovementFrequency, PetAnimationState, PetDirection } from '../shared/types';
import { AppStore } from './store';

export class PetWindowManager {
  private window: BrowserWindow | null = null;
  private store: AppStore;
  private currentX: number = 0;
  private currentY: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private isMoving: boolean = false;
  private isDragging: boolean = false;
  private isPaused: boolean = false;
  private direction: PetDirection = 'right';
  private wanderTimer: NodeJS.Timeout | null = null;
  private physicsTimer: NodeJS.Timeout | null = null;

  // Jump physics
  private isJumping: boolean = false;
  private jumpVelocityY: number = 0;
  private gravity: number = 1.2;

  constructor(store: AppStore) {
    this.store = store;
  }

  public getDimensions(): { width: number; height: number } {
    const size = this.store.getSettings().size;
    switch (size) {
      case 'small':
        return { width: 170, height: 190 };
      case 'large':
        return { width: 290, height: 310 };
      case 'medium':
      default:
        return { width: 230, height: 245 };
    }
  }

  public create(): BrowserWindow {
    const { width, height } = this.getDimensions();
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workArea;

    // Start in bottom-right corner of screen, above taskbar
    this.currentX = workArea.x + workArea.width - width - 120;
    this.currentY = workArea.y + workArea.height - height;
    this.targetX = this.currentX;
    this.targetY = this.currentY;

    this.window = new BrowserWindow({
      width,
      height,
      x: Math.round(this.currentX),
      y: Math.round(this.currentY),
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      focusable: false, // Prevents stealing keyboard focus when interacting!
      show: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload/petPreload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    this.window.setAlwaysOnTop(true, 'floating');
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });

    this.window.once('ready-to-show', () => {
      this.window?.showInactive();
    });

    // Load pet HTML
    this.window.loadFile(path.join(__dirname, '../renderer/pet/index.html'));

    // Show window immediately
    this.window.showInactive();

    // Apply click-through if configured
    if (this.store.getSettings().clickThrough) {
      this.window.setIgnoreMouseEvents(true, { forward: true });
    }

    this.startWanderingLoop();
    this.startPhysicsLoop();

    return this.window;
  }

  public getWindow(): BrowserWindow | null {
    return this.window;
  }

  public setSize(size: PetSize): void {
    if (!this.window) return;
    this.store.updateSettings({ size });
    const { width, height } = this.getDimensions();
    const bounds = this.window.getBounds();
    this.window.setBounds({
      x: bounds.x,
      y: bounds.y,
      width,
      height,
    });
    this.notifyRenderer('pet-size-changed', size);
  }

  public setClickThrough(enabled: boolean): void {
    if (!this.window) return;
    this.store.updateSettings({ clickThrough: enabled });
    if (enabled) {
      this.window.setIgnoreMouseEvents(true, { forward: true });
    } else {
      this.window.setIgnoreMouseEvents(false);
    }
    this.notifyRenderer('click-through-changed', enabled);
  }

  public togglePauseMovement(): boolean {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.isMoving = false;
      this.notifyRenderer('set-animation-state', 'idle');
    }
    return this.isPaused;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public notifyRenderer(channel: string, ...args: any[]): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, ...args);
    }
  }

  public showSpeechBubble(text: string, icon?: string, durationMs: number = 4000): void {
    if (this.store.getSettings().quietMode && !text.includes('🚨') && !text.includes('Reminder')) {
      return;
    }
    this.notifyRenderer('show-speech-bubble', { text, icon, durationMs });
  }

  public triggerCelebration(message?: string): void {
    this.notifyRenderer('set-animation-state', 'celebrate');
    if (message) {
      this.showSpeechBubble(message, '🎉', 5000);
    }
  }

  public triggerEat(): void {
    this.notifyRenderer('set-animation-state', 'eating');
    this.showSpeechBubble('Yummy! Thank you! 🦴', '❤️', 3500);
  }

  public triggerPlay(): void {
    this.notifyRenderer('set-animation-state', 'playful_hop');
    this.showSpeechBubble('So fun! Woof woof! 🎾', '⭐', 3500);
  }

  public triggerSleep(): void {
    this.notifyRenderer('set-animation-state', 'sleeping');
    this.showSpeechBubble('Nap time... Zzz 💤', '💤', 3500);
  }

  public triggerPetReact(): void {
    this.notifyRenderer('set-animation-state', 'pet_react');
  }

  // Dragging handling
  public handleDragStart(): void {
    this.isDragging = true;
    this.isMoving = false;
    this.notifyRenderer('set-animation-state', 'dragged');
  }

  public handleDragMove(deltaX: number, deltaY: number): void {
    if (!this.window || !this.isDragging) return;
    this.currentX += deltaX;
    this.currentY += deltaY;
    this.clampToNearestScreen();
    this.window.setPosition(Math.round(this.currentX), Math.round(this.currentY));
  }

  public handleDragEnd(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.targetX = this.currentX;
    this.targetY = this.currentY;

    // After drag release, initiate gentle fall to bottom if high up, or land safely
    const display = screen.getDisplayNearestPoint({ x: Math.round(this.currentX), y: Math.round(this.currentY) });
    const { height } = this.getDimensions();
    const groundY = display.workArea.y + display.workArea.height - height;

    if (this.currentY < groundY - 20) {
      // Let it hop or fall down to ground
      this.isJumping = true;
      this.jumpVelocityY = 1.0;
    } else {
      this.currentY = groundY;
      if (this.window) {
        this.window.setPosition(Math.round(this.currentX), Math.round(this.currentY));
      }
      this.notifyRenderer('set-animation-state', 'idle');
    }
  }

  private clampToNearestScreen(): void {
    const { width, height } = this.getDimensions();
    const display = screen.getDisplayNearestPoint({ x: Math.round(this.currentX), y: Math.round(this.currentY) });
    const workArea = display.workArea;

    this.currentX = Math.max(workArea.x, Math.min(this.currentX, workArea.x + workArea.width - width));
    this.currentY = Math.max(workArea.y, Math.min(this.currentY, workArea.y + workArea.height - height));
  }

  private startPhysicsLoop(): void {
    const TICK_RATE_MS = 20; // 50fps physics update

    this.physicsTimer = setInterval(() => {
      if (!this.window || this.isDragging) return;

      const { height } = this.getDimensions();
      const display = screen.getDisplayNearestPoint({ x: Math.round(this.currentX), y: Math.round(this.currentY) });
      const groundY = display.workArea.y + display.workArea.height - height;

      let positionChanged = false;

      // Handle jumping physics
      if (this.isJumping) {
        this.currentY += this.jumpVelocityY;
        this.jumpVelocityY += this.gravity;

        if (this.currentY >= groundY) {
          this.currentY = groundY;
          this.isJumping = false;
          this.jumpVelocityY = 0;
          this.notifyRenderer('set-animation-state', 'idle');
        }
        positionChanged = true;
      }

      // Handle horizontal walking movement towards targetX
      if (this.isMoving && !this.isJumping) {
        const dx = this.targetX - this.currentX;
        const speed = this.store.getSettings().animationSpeed === 'energetic' ? 3.5 : 2.0;

        if (Math.abs(dx) <= speed) {
          this.currentX = this.targetX;
          this.isMoving = false;
          this.notifyRenderer('set-animation-state', 'idle');
        } else {
          const moveStep = Math.sign(dx) * speed;
          this.currentX += moveStep;
          const newDir: PetDirection = dx > 0 ? 'right' : 'left';
          if (newDir !== this.direction) {
            this.direction = newDir;
            this.notifyRenderer('set-direction', this.direction);
          }
        }
        positionChanged = true;
      }

      if (positionChanged && this.window) {
        this.clampToNearestScreen();
        this.window.setPosition(Math.round(this.currentX), Math.round(this.currentY));
      }
    }, TICK_RATE_MS);
  }

  private startWanderingLoop(): void {
    const scheduleNextDecision = () => {
      const freq = this.store.getSettings().movementFrequency;
      if (freq === 'stay_put') {
        this.wanderTimer = setTimeout(scheduleNextDecision, 10000);
        return;
      }

      let minDelay = 8000;
      let maxDelay = 18000;
      if (freq === 'frequent') {
        minDelay = 4000;
        maxDelay = 10000;
      } else if (freq === 'rare') {
        minDelay = 15000;
        maxDelay = 35000;
      }

      const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;

      this.wanderTimer = setTimeout(() => {
        this.decideNextAction();
        scheduleNextDecision();
      }, delay);
    };

    scheduleNextDecision();
  }

  private decideNextAction(): void {
    if (this.isPaused || this.isDragging || this.isJumping) return;
    if (this.store.getSettings().movementFrequency === 'stay_put') return;

    // Pick a natural random activity
    const rand = Math.random();
    const display = screen.getDisplayNearestPoint({ x: Math.round(this.currentX), y: Math.round(this.currentY) });
    const { width, height } = this.getDimensions();
    const workArea = display.workArea;

    if (rand < 0.45) {
      // Walk to a new position along bottom
      const minX = workArea.x + 30;
      const maxX = workArea.x + workArea.width - width - 30;
      this.targetX = Math.floor(Math.random() * (maxX - minX)) + minX;
      this.isMoving = true;
      const newDir: PetDirection = this.targetX > this.currentX ? 'right' : 'left';
      this.direction = newDir;
      this.notifyRenderer('set-direction', this.direction);
      this.notifyRenderer('set-animation-state', 'walking');
    } else if (rand < 0.65) {
      // Playful hop / jump
      this.isJumping = true;
      this.jumpVelocityY = -12; // Initial upward impulse
      this.notifyRenderer('set-animation-state', 'jumping');
    } else if (rand < 0.80) {
      // Sniff ground
      this.notifyRenderer('set-animation-state', 'sniffing');
    } else if (rand < 0.90) {
      // Stretch or sit
      this.notifyRenderer('set-animation-state', Math.random() < 0.5 ? 'stretching' : 'sitting');
    } else {
      // Curious head tilt
      this.notifyRenderer('set-animation-state', 'curious');
      // Occasional gentle thought bubble
      if (!this.store.getSettings().quietMode && Math.random() < 0.4) {
        const thoughts = [
          'Woof! Having fun today? 🐾',
          'Remember to sit up straight! ✨',
          'I am guarding your desktop! 🐶',
          'Sniffing out some good vibes... 🌸',
          'You are doing awesome work! 🌟',
        ];
        const randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];
        this.showSpeechBubble(randomThought, '💭', 4000);
      }
    }
  }

  public destroy(): void {
    if (this.wanderTimer) clearInterval(this.wanderTimer);
    if (this.physicsTimer) clearInterval(this.physicsTimer);
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
      this.window = null;
    }
  }
}

