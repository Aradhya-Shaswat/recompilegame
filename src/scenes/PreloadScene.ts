import Phaser from 'phaser';
import { CONFIG } from '../config';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {

    const newFont = new FontFace('Press Start 2P', 'url(assets/PressStart2P-Regular.ttf)');
    newFont.load().then((loaded) => {
      (document.fonts as any).add(loaded);
      console.log('Press Start 2P font loaded successfully');
    }).catch((error) => {
      console.error('Font loading failed:', error);
    });
    
    this.loadCharacterSprites();
    this.load.image('tile_zone1', 'assets/tile_zone1.png');
    this.load.image('tile_zone2', 'assets/tile_zone2.png');
    this.load.image('tile_zone3', 'assets/tile_zone3.png');
    this.load.image('asteroid', 'assets/asteroid.png');
    this.load.on('loaderror', (file: any) => {
      console.warn(`Failed to load: ${file.key}`);
    });
    
    this.createTaskTexture();
  }

  create(): void {
    this.createFallbackTiles();
    this.createCharacterAnimations();
    this.scene.start('MenuScene');
  }

  private createFallbackTiles(): void {
    const tileSize = CONFIG.MAP.TILE_SIZE;
    const colors = [0x00CED1, 0xFF8C00, 0xFF00FF]; 
    
    for (let i = 1; i <= 3; i++) {
      const key = `tile_zone${i}`;
      
      if (!this.textures.exists(key)) {
        const graphics = this.add.graphics();
               
        graphics.fillStyle(0x1a1a1a, 1);
        graphics.fillRect(0, 0, tileSize, tileSize);
               
        graphics.lineStyle(1, 0x333333, 0.5);
        graphics.strokeRect(0, 0, tileSize, tileSize);       
        
        graphics.lineStyle(2, colors[i - 1], 0.3);
        graphics.lineBetween(0, 0, tileSize, tileSize);       
        
        graphics.fillStyle(colors[i - 1], 0.2);
        graphics.fillCircle(tileSize / 2, tileSize / 2, 4);
        
        graphics.generateTexture(key, tileSize, tileSize);
        graphics.destroy();
      }
    }
  }

  private createCharacterAnimations(): void {
    for (let charId = 1; charId <= 3; charId++) {
      
      this.anims.create({
        key: `character_${charId}_idle`,
        frames: Array.from({ length: 12 }, (_, i) => ({
          key: `character_${charId}_idle_${i}`
        })),
        frameRate: 12,
        repeat: -1
      });
      
      this.anims.create({
        key: `character_${charId}_walk`,
        frames: Array.from({ length: 12 }, (_, i) => ({
          key: `character_${charId}_walk_${i}`
        })),
        frameRate: 12,
        repeat: -1
      });
    }
  }

  private loadCharacterSprites(): void {
    const wraithFolders = ['Wraith_01', 'Wraith_02', 'Wraith_03'];
    
    wraithFolders.forEach((folder, index) => {
      const charId = index + 1;
      
      for (let i = 0; i <= 11; i++) {
        const frameNum = i.toString().padStart(3, '0');
        const key = `character_${charId}_idle_${i}`;
        this.load.image(key, `assets/${folder}/PNG Sequences/Idle/${folder}_Idle_${frameNum}.png`);
      }
      
      for (let i = 0; i <= 11; i++) {
        const frameNum = i.toString().padStart(3, '0');
        const key = `character_${charId}_walk_${i}`;
        this.load.image(key, `assets/${folder}/PNG Sequences/Walking/${folder}_Moving Forward_${frameNum}.png`);
      }
    });
  }

  private createTaskTexture(): void {
    const size = CONFIG.MAP.TILE_SIZE;
    
    const graphics = this.add.graphics();
    graphics.fillStyle(CONFIG.COLORS.TASK, 1);
    graphics.fillRect(4, 4, size - 8, size - 8);
    
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeRect(4, 4, size - 8, size - 8);
    
    graphics.lineStyle(3, 0x000000, 0.8);
    graphics.lineBetween(8, 8, size - 8, size - 8);
    graphics.lineBetween(size - 8, 8, 8, size - 8);
    
    graphics.generateTexture('task', size, size);
    graphics.destroy();
  }
}
