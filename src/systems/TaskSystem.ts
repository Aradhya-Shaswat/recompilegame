import Phaser from 'phaser';
import { CONFIG } from '../config';
import { Task } from '../entities/Task';
import { Character } from '../entities/Character';

export type TaskCompleteCallback = (taskId: number, characterId: number) => void;

export class TaskSystem {
  private tasks: Map<number, Task>;
  private completionCallbacks: TaskCompleteCallback[];
  private nextTaskId: number;
  private taskTypes: Map<number, 'wire' | 'card' | 'asteroid' | 'golf' | 'dino' | 'telescope'>;

  constructor() {
    this.tasks = new Map();
    this.completionCallbacks = [];
    this.nextTaskId = 1;
    this.taskTypes = new Map();
  }

  addTask(task: Task): number {
    const taskId = this.nextTaskId++;
    this.tasks.set(taskId, task);
    this.taskTypes.set(taskId, task.taskType);
    return taskId;
  }

  removeTask(taskId: number): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.destroy();
      this.tasks.delete(taskId);
    }
  }

  checkProximity(character: Character): number | null {
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.isCompleted()) continue;
      
      const distance = Phaser.Math.Distance.Between(
        character.x,
        character.y,
        task.x,
        task.y
      );
      
      if (distance <= CONFIG.TASK.PROXIMITY_RADIUS) {
        return taskId;
      }
    }
    return null;
  }

  getTask(taskId: number): Task | undefined {
    return this.tasks.get(taskId);
  }

  completeTask(taskId: number, characterId: number): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.isCompleted()) {
      return false;
    }
    
    task.complete();
    this.triggerCompletion(taskId, characterId);
    return true;
  }

  onTaskComplete(callback: TaskCompleteCallback): void {
    this.completionCallbacks.push(callback);
  }

  private triggerCompletion(taskId: number, characterId: number): void {
    this.completionCallbacks.forEach(cb => cb(taskId, characterId));
  }

  getTaskType(taskId: number): 'wire' | 'card' | 'asteroid' | 'golf' | 'dino' | 'telescope' | undefined {
    return this.taskTypes.get(taskId);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getIncompleteCount(): number {
    let count = 0;
    for (const task of this.tasks.values()) {
      if (!task.isCompleted()) count++;
    }
    return count;
  }

  reset(): void {
    this.tasks.forEach(task => {
      task.reset();
    });
  }

  destroy(): void {
    this.tasks.forEach(task => task.destroy());
    this.tasks.clear();
    this.completionCallbacks = [];
  }
}
