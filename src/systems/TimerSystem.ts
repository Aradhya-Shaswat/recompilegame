import Phaser from 'phaser';
import { CONFIG } from '../config';

export interface TimerData {
  characterId: number;
  timeRemaining: number;
  isActive: boolean;
}

export type TimeoutCallback = (characterId: number) => void;
export type TimerResetCallback = (characterId: number) => void;

export class TimerSystem {
  private timers: Map<number, number>;
  private assistMode: boolean;
  private onTimeoutCallbacks: TimeoutCallback[];
  private onTimerResetCallbacks: TimerResetCallback[];
  private onLowTimeCallbacks: TimeoutCallback[];
  private lowTimeTriggered: Set<number>;

  constructor(assistMode: boolean = false) {
    this.timers = new Map();
    this.assistMode = assistMode;
    this.onTimeoutCallbacks = [];
    this.onTimerResetCallbacks = [];
    this.onLowTimeCallbacks = [];
    this.lowTimeTriggered = new Set();
  
    this.initializeTimers();
  }

  private initializeTimers(): void {
    const initialTime = this.assistMode 
      ? CONFIG.TIMER.ASSIST_MODE_TIME 
      : CONFIG.TIMER.INITIAL_TIME;
    
    for (let i = 1; i <= 3; i++) {
      this.timers.set(i, initialTime);
    }
  }

  /**
   * @param delta
   * @param activeCharacterId 
   */
  update(delta: number, activeCharacterId: number): void {
    const deltaSeconds = delta / 1000;

    const time = this.timers.get(activeCharacterId);
    if (time !== undefined) {
      const newTime = Math.max(0, time - deltaSeconds);
      this.timers.set(activeCharacterId, newTime);

      if (newTime <= 0 && time > 0) {
        this.triggerTimeout(activeCharacterId);
      }

      if (newTime <= CONFIG.TIMER.LOW_TIME_THRESHOLD && 
          time > CONFIG.TIMER.LOW_TIME_THRESHOLD) {
        this.triggerLowTime(activeCharacterId);
      }
    }
  }

  resetTimer(characterId: number): void {
    const resetTime = this.assistMode 
      ? CONFIG.TIMER.ASSIST_MODE_TIME 
      : CONFIG.TIMER.INITIAL_TIME;
    
    this.timers.set(characterId, resetTime);
    this.lowTimeTriggered.delete(characterId);
    this.triggerTimerReset(characterId);
  }

  getTimeRemaining(characterId: number): number {
    return this.timers.get(characterId) || 0;
  }

  getAllTimers(): TimerData[] {
    const result: TimerData[] = [];
    this.timers.forEach((time, id) => {
      result.push({
        characterId: id,
        timeRemaining: time,
        isActive: time > 0
      });
    });
    return result;
  }

  hasExpiredTimer(): boolean {
    for (const time of this.timers.values()) {
      if (time <= 0) return true;
    }
    return false;
  }

  getExpiredTimerId(): number | null {
    for (const [id, time] of this.timers.entries()) {
      if (time <= 0) return id;
    }
    return null;
  }

  onTimeout(callback: TimeoutCallback): void {
    this.onTimeoutCallbacks.push(callback);
  }

  onTimerReset(callback: TimerResetCallback): void {
    this.onTimerResetCallbacks.push(callback);
  }

  onLowTime(callback: TimeoutCallback): void {
    this.onLowTimeCallbacks.push(callback);
  }

  private triggerTimeout(characterId: number): void {
    this.onTimeoutCallbacks.forEach(cb => cb(characterId));
  }

  private triggerTimerReset(characterId: number): void {
    this.onTimerResetCallbacks.forEach(cb => cb(characterId));
  }

  private triggerLowTime(characterId: number): void {
    if (!this.lowTimeTriggered.has(characterId)) {
      this.lowTimeTriggered.add(characterId);
      this.onLowTimeCallbacks.forEach(cb => cb(characterId));
    }
  }

  setAssistMode(enabled: boolean): void {
    this.assistMode = enabled;
    this.initializeTimers();
  }

  destroy(): void {
    this.timers.clear();
    this.onTimeoutCallbacks = [];
    this.onTimerResetCallbacks = [];
    this.onLowTimeCallbacks = [];
    this.lowTimeTriggered.clear();
  }
}
