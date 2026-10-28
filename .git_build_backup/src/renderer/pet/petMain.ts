import { PetAnimationState, PetDirection, PetSize, PetSettings, SpeechBubbleData } from '../../shared/types';
import { DogRenderer } from './dogRenderer';
import { PetSoundEngine } from './soundEngine';
import { AnimationMachine } from './animationMachine';

declare global {
  interface Window {
    petAPI: {
      onSetAnimationState: (callback: (state: PetAnimationState) => void) => void;
      onSetDirection: (callback: (dir: PetDirection) => void) => void;
      onShowSpeechBubble: (callback: (data: SpeechBubbleData) => void) => void;
      onPetSizeChanged: (callback: (size: PetSize) => void) => void;
      onSettingsUpdated: (callback: (settings: PetSettings) => void) => void;
      onClickThroughChanged: (callback: (enabled: boolean) => void) => void;
      startDrag: () => void;
      dragMove: (deltaX: number, deltaY: number) => void;
      endDrag: () => void;
      petClicked: () => void;
      openCompanion: () => void;
      toggleCompanion: () => void;
      feedPet: () => void;
      playPet: () => void;
    };
  }
}

class PetApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: DogRenderer;
  private soundEngine: PetSoundEngine;
  private animMachine: AnimationMachine;
  private speechBubble: HTMLElement;
  private bubbleText: HTMLElement;
  private bubbleIcon: HTMLElement;
  private bubbleTimeout: number | null = null;

  // Dragging state
  private isPointerDown: boolean = false;
  private isDragging: boolean = false;
  private startPointerX: number = 0;
  private startPointerY: number = 0;
  private lastScreenX: number = 0;
  private lastScreenY: number = 0;
  private pointerDownTime: number = 0;

  private lastTime: number = 0;

  constructor() {
    this.canvas = document.getElementById('dogCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.speechBubble = document.getElementById('speechBubble')!;
    this.bubbleText = document.getElementById('bubbleText')!;
    this.bubbleIcon = document.getElementById('bubbleIcon')!;

    this.soundEngine = new PetSoundEngine();
    this.renderer = new DogRenderer(this.ctx);
    this.animMachine = new AnimationMachine(this.renderer, this.soundEngine);

    this.setupCanvasSize();
    this.setupEvents();
    this.setupIpc();

    // Start rendering loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.renderLoop(t));

    // Welcome greeting
    setTimeout(() => {
      this.showBubble('Woof! I am Buddy! 🐕', '✨', 3500);
    }, 1000);
  }

  private setupCanvasSize(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.scale(dpr, dpr);
    this.renderer.setDimensions(width, height);
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => {
      this.setupCanvasSize();
    });

    const container = document.getElementById('petContainer')!;

    // Pointer events for smooth drag on Windows
    container.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button !== 0) return; // Only left mouse button initiates drag
      this.isPointerDown = true;
      this.isDragging = false;
      this.startPointerX = e.clientX;
      this.startPointerY = e.clientY;
      this.lastScreenX = e.screenX;
      this.lastScreenY = e.screenY;
      this.pointerDownTime = performance.now();
      container.setPointerCapture(e.pointerId);
    });

    container.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.isPointerDown) return;

      const totalDist = Math.hypot(e.clientX - this.startPointerX, e.clientY - this.startPointerY);

      if (!this.isDragging && totalDist > 5) {
        this.isDragging = true;
        window.petAPI.startDrag();
        this.animMachine.setState('dragged', true);
      }

      if (this.isDragging) {
        const deltaX = e.screenX - this.lastScreenX;
        const deltaY = e.screenY - this.lastScreenY;
        this.lastScreenX = e.screenX;
        this.lastScreenY = e.screenY;
        window.petAPI.dragMove(deltaX, deltaY);
      }
    });

    const handlePointerUp = (e: PointerEvent) => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;

      if (this.isDragging) {
        this.isDragging = false;
        window.petAPI.endDrag();
      } else {
        // It was a click!
        const elapsed = performance.now() - this.pointerDownTime;
        if (elapsed < 450) {
          this.handlePetClick();
        }
      }

      try {
        container.releasePointerCapture(e.pointerId);
      } catch (_) {}
    };

    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);

    // Double click or context menu opens companion
    container.addEventListener('dblclick', () => {
      window.petAPI.toggleCompanion();
    });

    container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      window.petAPI.toggleCompanion();
    });

    // Pill click
    const pill = document.getElementById('quickActionPill');
    if (pill) {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        window.petAPI.toggleCompanion();
      });
    }

    // Dismiss bubble on click
    this.speechBubble.addEventListener('click', () => {
      this.hideBubble();
    });
  }

  private handlePetClick(): void {
    window.petAPI.petClicked();
    this.animMachine.setState('pet_react', true);
    this.soundEngine.playBark();
    this.renderer.triggerHeart();
  }

  private setupIpc(): void {
    if (!window.petAPI) return;

    window.petAPI.onSetAnimationState((state: PetAnimationState) => {
      this.animMachine.setState(state, false);
    });

    window.petAPI.onSetDirection((dir: PetDirection) => {
      this.renderer.setDirection(dir);
    });

    window.petAPI.onShowSpeechBubble((data: SpeechBubbleData) => {
      this.showBubble(data.text, data.icon, data.durationMs);
    });

    window.petAPI.onPetSizeChanged((_size: PetSize) => {
      setTimeout(() => this.setupCanvasSize(), 50);
    });

    window.petAPI.onSettingsUpdated((settings: PetSettings) => {
      this.soundEngine.setPreferences(settings.soundEnabled, settings.quietMode);
    });
  }

  private showBubble(text: string, icon?: string, durationMs: number = 4000): void {
    if (this.bubbleTimeout) {
      clearTimeout(this.bubbleTimeout);
    }

    this.bubbleText.innerText = text;
    this.bubbleIcon.innerText = icon || '🐾';
    this.speechBubble.classList.add('visible');

    this.bubbleTimeout = window.setTimeout(() => {
      this.hideBubble();
    }, durationMs);
  }

  private hideBubble(): void {
    this.speechBubble.classList.remove('visible');
    if (this.bubbleTimeout) {
      clearTimeout(this.bubbleTimeout);
      this.bubbleTimeout = null;
    }
  }

  private renderLoop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.animMachine.update(dt);
    this.renderer.update(dt);
    this.renderer.render();

    requestAnimationFrame((t) => this.renderLoop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new PetApp();
});

