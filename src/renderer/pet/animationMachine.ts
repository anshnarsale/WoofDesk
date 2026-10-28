import { PetAnimationState } from '../../shared/types';
import { DogRenderer } from './dogRenderer';
import { PetSoundEngine } from './soundEngine';

export class AnimationMachine {
  private renderer: DogRenderer;
  private soundEngine: PetSoundEngine;
  private stateTimer: number = 0;
  private currentState: PetAnimationState = 'idle';
  private lockedUntil: number = 0; // State cannot be interrupted by random actions until this time

  constructor(renderer: DogRenderer, soundEngine: PetSoundEngine) {
    this.renderer = renderer;
    this.soundEngine = soundEngine;
  }

  public getState(): PetAnimationState {
    return this.currentState;
  }

  public setState(newState: PetAnimationState, force: boolean = false): void {
    const now = performance.now();
    if (!force && now < this.lockedUntil && this.currentState !== newState) {
      return;
    }

    if (this.currentState === newState && newState !== 'celebrate' && newState !== 'pet_react') {
      return;
    }

    this.currentState = newState;
    this.stateTimer = 0;
    this.renderer.setState(newState);

    // Play sounds corresponding to transitions
    switch (newState) {
      case 'celebrate':
        this.soundEngine.playCelebration();
        this.lockedUntil = now + 4000;
        break;
      case 'eating':
        this.soundEngine.playEat();
        this.lockedUntil = now + 3500;
        break;
      case 'pet_react':
        this.soundEngine.playPetting();
        this.lockedUntil = now + 2000;
        break;
      case 'playful_hop':
      case 'jumping':
        this.soundEngine.playHop();
        this.lockedUntil = now + 1200;
        break;
      case 'curious':
        this.lockedUntil = now + 2500;
        break;
      case 'sniffing':
      case 'stretching':
        this.lockedUntil = now + 3000;
        break;
      case 'dragged':
        this.lockedUntil = now + 999999; // Locked while dragging
        break;
      default:
        this.lockedUntil = 0;
        break;
    }
  }

  public update(dt: number): void {
    this.stateTimer += dt;
    const now = performance.now();

    // Auto-revert temporary states back to idle
    if (now >= this.lockedUntil) {
      if (
        this.currentState === 'celebrate' ||
        this.currentState === 'eating' ||
        this.currentState === 'pet_react' ||
        this.currentState === 'curious' ||
        this.currentState === 'sniffing' ||
        this.currentState === 'stretching' ||
        this.currentState === 'playful_hop'
      ) {
        this.setState('idle', true);
      }
    }
  }
}

