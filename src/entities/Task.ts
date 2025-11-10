import Phaser from 'phaser';
import { CONFIG } from '../config';

export class Task extends Phaser.GameObjects.Sprite {
  private completed: boolean = false;
  private proximityIndicator: Phaser.GameObjects.Graphics;
  public taskType: 'wire' | 'card' | 'asteroid' | 'golf' | 'dino' | 'telescope';

  constructor(scene: Phaser.Scene, x: number, y: number, taskType: 'wire' | 'card' | 'asteroid' | 'golf' | 'dino' | 'telescope' = 'wire') {
    const textureKey = 'task';
    super(scene, x, y, textureKey);
    
    this.taskType = taskType;
    this.setOrigin(0.5, 0.5);
    this.setDisplaySize(CONFIG.MAP.TILE_SIZE, CONFIG.MAP.TILE_SIZE);
    
    
    let tintColor: number;
    let glowColor: number;
    
    switch(taskType) {
      case 'wire':
        tintColor = 0x00ff88;  
        glowColor = 0x00ff00;
        break;
      case 'card':
        tintColor = 0xff8800;  
        glowColor = 0xff6600;
        break;
      case 'asteroid':
        tintColor = 0xff0088;  
        glowColor = 0xff0066;
        break;
      case 'golf':
        tintColor = 0x00ffff;  
        glowColor = 0x00cccc;
        break;
      case 'dino':
        tintColor = 0xffff00;  
        glowColor = 0xffcc00;
        break;
      case 'telescope':
        tintColor = 0x8800ff;  
        glowColor = 0x6600cc;
        break;
      default:
        tintColor = 0x00ff88;
        glowColor = 0x00ff00;
    }
    
    
    this.setTint(tintColor);
    this.preFX?.addGlow(glowColor, 4, 0, false, 0.3, 10);
    
    
    this.proximityIndicator = scene.add.graphics();
    this.updateProximityIndicator(false);
    
    scene.add.existing(this);
  }

  updateProximityIndicator(isNear: boolean): void {
    this.proximityIndicator.clear();
    
    if (isNear && !this.completed) {
      this.proximityIndicator.lineStyle(2, CONFIG.COLORS.SUCCESS, 0.8);
      this.proximityIndicator.strokeCircle(
        this.x,
        this.y,
        CONFIG.TASK.PROXIMITY_RADIUS
      );
    }
  }

  complete(): void {
    if (this.completed) return;
    
    this.completed = true;
    this.setAlpha(0.3);
    this.proximityIndicator.clear();
    
    
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1.0, to: 1.3 },
      alpha: { from: 1.0, to: 0.3 },
      duration: 300,
      ease: 'Cubic.easeOut'
    });
  }

  isCompleted(): boolean {
    return this.completed;
  }

  reset(): void {
    this.completed = false;
    this.setAlpha(1.0);
    this.setScale(1.0);
    this.proximityIndicator.clear();
  }

  destroy(fromScene?: boolean): void {
    this.proximityIndicator.destroy();
    super.destroy(fromScene);
  }
}
