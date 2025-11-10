import Phaser from 'phaser';
import { CONFIG, SPAWN_POSITIONS } from '../config';

export class Character extends Phaser.GameObjects.Sprite {
  public characterId: number;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private zoneIndex: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    characterId: number
  ) {
    
    const textureKey = `character_${characterId}_idle_0`;
    
    super(scene, x, y, textureKey);
    
    this.characterId = characterId;
    
    
    const spawnInfo = SPAWN_POSITIONS.find(p => p.id === characterId);
    this.zoneIndex = spawnInfo?.zone ?? 0;
    
    this.setOrigin(0.5, 0.5);
    
    
    this.setScale(CONFIG.CHARACTER.SCALE);
    
    
    scene.add.existing(this as any);
    
    
    this.play(`character_${characterId}_idle`);
  }

  update(delta: number): void {
    const deltaSeconds = delta / 1000;
    const moveDistance = CONFIG.CHARACTER.SPEED * deltaSeconds;
    
    this.x += this.velocityX * moveDistance;
    this.y += this.velocityY * moveDistance;
    
    
    if (this.velocityX < 0) {
      this.setFlipX(true); 
    } else if (this.velocityX > 0) {
      this.setFlipX(false); 
    }
    
    
    const isMoving = this.velocityX !== 0 || this.velocityY !== 0;
    const currentAnim = this.anims.currentAnim?.key;
    const idleKey = `character_${this.characterId}_idle`;
    const walkKey = `character_${this.characterId}_walk`;
    
    if (isMoving && currentAnim !== walkKey) {
      this.play(walkKey);
    } else if (!isMoving && currentAnim !== idleKey) {
      this.play(idleKey);
    }
    
    
    const tileSize = CONFIG.MAP.TILE_SIZE;
    const zoneWidth = CONFIG.MAP.WIDTH * tileSize;
    const spacing = CONFIG.MAP.ZONE_SPACING * tileSize;
    const zoneOffsetX = this.zoneIndex * (zoneWidth + spacing);
    
    this.x = Phaser.Math.Clamp(
      this.x,
      zoneOffsetX + CONFIG.CHARACTER.SIZE / 2,
      zoneOffsetX + zoneWidth - CONFIG.CHARACTER.SIZE / 2
    );
    this.y = Phaser.Math.Clamp(
      this.y,
      CONFIG.CHARACTER.SIZE / 2,
      CONFIG.MAP.HEIGHT * tileSize - CONFIG.CHARACTER.SIZE / 2
    );
  }

  setVelocity(x: number, y: number): void {
    this.velocityX = x;
    this.velocityY = y;
  }

  setCharacterActive(active: boolean): void {
    const baseScale = CONFIG.CHARACTER.SCALE;
    if (active) {
      this.setScale(baseScale * 1.2);
      this.setAlpha(1.0);
    } else {
      this.setScale(baseScale);
      this.setAlpha(0.7);
    }
  }

  getTilePosition(): { x: number; y: number } {
    return {
      x: Math.floor(this.x / CONFIG.MAP.TILE_SIZE),
      y: Math.floor(this.y / CONFIG.MAP.TILE_SIZE)
    };
  }
}
