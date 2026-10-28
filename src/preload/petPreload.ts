import { contextBridge, ipcRenderer } from 'electron';
import { PetAnimationState, PetDirection, PetSize, PetSettings, SpeechBubbleData } from '../shared/types';

export const petAPI = {
  // Listeners from Main Process
  onSetAnimationState: (callback: (state: PetAnimationState) => void) => {
    ipcRenderer.on('set-animation-state', (_event, state) => callback(state));
  },
  onSetDirection: (callback: (dir: PetDirection) => void) => {
    ipcRenderer.on('set-direction', (_event, dir) => callback(dir));
  },
  onShowSpeechBubble: (callback: (data: SpeechBubbleData) => void) => {
    ipcRenderer.on('show-speech-bubble', (_event, data) => callback(data));
  },
  onPetSizeChanged: (callback: (size: PetSize) => void) => {
    ipcRenderer.on('pet-size-changed', (_event, size) => callback(size));
  },
  onSettingsUpdated: (callback: (settings: PetSettings) => void) => {
    ipcRenderer.on('settings-updated', (_event, settings) => callback(settings));
  },
  onClickThroughChanged: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on('click-through-changed', (_event, enabled) => callback(enabled));
  },

  // Emitters to Main Process
  startDrag: () => ipcRenderer.send('pet-drag-start'),
  dragMove: (deltaX: number, deltaY: number) => ipcRenderer.send('pet-drag-move', deltaX, deltaY),
  endDrag: () => ipcRenderer.send('pet-drag-end'),
  petClicked: () => ipcRenderer.send('pet-clicked'),
  openCompanion: () => ipcRenderer.send('open-companion'),
  toggleCompanion: () => ipcRenderer.send('toggle-companion'),
  feedPet: () => ipcRenderer.send('feed-pet'),
  playPet: () => ipcRenderer.send('play-pet'),
};

contextBridge.exposeInMainWorld('petAPI', petAPI);

export type PetAPI = typeof petAPI;

