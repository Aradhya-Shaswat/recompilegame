import Phaser from 'phaser';
import { CONFIG } from '../config';
import { SceneTransition } from '../utils/SceneTransition';
import { SoundManager } from '../utils/SoundManager';

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  texts: Phaser.GameObjects.Text[];
  glitchTimer: number;
}

export class MenuScene extends Phaser.Scene {
  private matrixColumns: MatrixColumn[] = [];
  private matrixContainer?: Phaser.GameObjects.Container;
  private glitchOverlay?: Phaser.GameObjects.Graphics;
  private readonly MATRIX_CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
  private soundManager!: SoundManager;
  
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const width = CONFIG.GAME_WIDTH;
    const height = CONFIG.GAME_HEIGHT;

    this.sound.stopAll();
    
    this.soundManager = new SoundManager(this);
    
    const settings = localStorage.getItem(CONFIG.STORAGE.SETTINGS);
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.masterVolume !== undefined) {
        this.soundManager.setMasterVolume(parsed.masterVolume);
      }
      if (parsed.musicVolume !== undefined) {
        this.soundManager.setMusicVolume(parsed.musicVolume);
      }
      if (parsed.sfxVolume !== undefined) {
        this.soundManager.setSfxVolume(parsed.sfxVolume);
      }
    }
    
    this.soundManager.playMusic('menu-music', 2000);

    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }

    this.matrixColumns = [];

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 1);
    bg.fillRect(0, 0, width, height);

    this.createMatrixRain(width, height);

    const title = this.add.text(width / 2, height / 4, 'Re:Compile', {
      fontSize: '56px',
      color: '#FF0000',
      fontFamily: '"Press Start 2P", monospace',
      stroke: '#000000',
      strokeThickness: 6
    });
    title.setOrigin(0.5, 0.5);

    const subtitle = this.add.text(width / 2, height / 4 + 75, "Your Team Is Trapped. Don't Panic", {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: '"Press Start 2P", monospace',
      align: 'center',
      lineSpacing: 8
    });
    subtitle.setOrigin(0.5, 0.5);
    
    const strikethrough = this.add.graphics();
    strikethrough.lineStyle(2, 0xff0000, 1);
    const strikeY = height / 4 + 75;
    strikethrough.lineBetween(width / 2 + 85, strikeY, width / 2 + 175, strikeY);
    strikethrough.setDepth(100);

    this.createButton(width / 2, height / 2 - 40, 'START', () => {
      SceneTransition.glitchTransition(this, 'GameScene', 800, () => {
        this.scene.launch('UIScene');
      });
    });

    this.createButton(width / 2, height / 2 + 40, 'TUTORIAL', () => {
      SceneTransition.glitchTransition(this, 'TutorialScene', 800, () => {
        this.scene.launch('UIScene');
      });
    });

    this.createButton(width / 2, height / 2 + 120, 'SETTINGS', () => {
      this.scene.start('SettingsScene');
    });

    this.createButton(width / 2, height / 2 + 200, 'CREDITS', () => {
      this.showCredits();
    });

    const instructions = this.add.text(width / 2, height - 80, 
      'Do you have what it takes? • Escape.', {
      fontSize: '16px',
      color: '#888888',
      align: 'center'
    });
    instructions.setOrigin(0.5, 0.5);

    const version = this.add.text(20, height - 20, 'v2.0.0', {
      fontSize: '14px',
      color: '#555555'
    });
    version.setOrigin(0, 1);
  }

  private createButton(x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x333333, 1);
    bg.fillRoundedRect(-120, -30, 240, 60, 10);
    bg.lineStyle(2, 0x00CED1, 1);
    bg.strokeRoundedRect(-120, -30, 240, 60, 10);
    
    const label = this.add.text(0, 0, text, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: '"Press Start 2P", monospace',
      fontStyle: 'bold'
    });
    label.setOrigin(0.5, 0.5);
    
    container.add([bg, label]);
    container.setSize(240, 60);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x444444, 1);
      bg.fillRoundedRect(-120, -30, 240, 60, 10);
      bg.lineStyle(3, 0x00CED1, 1);
      bg.strokeRoundedRect(-120, -30, 240, 60, 10);
      label.setScale(1.05);
      
      this.soundManager.play('menu-hover');
    });
    
    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x333333, 1);
      bg.fillRoundedRect(-120, -30, 240, 60, 10);
      bg.lineStyle(2, 0x00CED1, 1);
      bg.strokeRoundedRect(-120, -30, 240, 60, 10);
      label.setScale(1.0);
    });
    
    container.on('pointerdown', () => {
      this.soundManager.play('menu-click');
      onClick();
    });
    
    return container;
  }

  private showCredits(): void {
    const width = CONFIG.GAME_WIDTH;
    const height = CONFIG.GAME_HEIGHT;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.95);
    overlay.fillRect(0, 0, width, height);
    
    const container = this.add.container(width / 2, height / 2);

    const creditText = this.add.text(0, -200, 'CREDITS', {
      fontSize: '56px',
      color: '#00CED1',
      fontStyle: 'bold'
    });
    creditText.setOrigin(0.5, 0.5);

    const studioText = this.add.text(0, -120, 'Code Warriors 42', {
      fontSize: '38px',
      color: '#00ff00',
      fontStyle: 'bold'
    });
    studioText.setOrigin(0.5, 0.5);

    const gameTitle = this.add.text(0, -60, 'Re:Compile', {
      fontSize: '22px',
      color: '#ffffff'
    });
    gameTitle.setOrigin(0.5, 0.5);

    const techStack = this.add.text(0, -20, 'Phaser 3 • TypeScript • Vite', {
      fontSize: '18px',
      color: '#888888'
    });
    techStack.setOrigin(0.5, 0.5);

    const divider1 = this.add.graphics();
    divider1.lineStyle(2, 0x00CED1, 0.5);
    divider1.lineBetween(-200, 20, 200, 20);

    const devCredit = this.add.text(0, 60, 
      'Game Design & Programming\nCode Warriors 42 Development Team', {
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 5
    });
    devCredit.setOrigin(0.5, 0.5);

    const divider2 = this.add.graphics();
    divider2.lineStyle(2, 0x00CED1, 0.5);
    divider2.lineBetween(-200, 110, 200, 110);

    const thanks = this.add.text(0, 150, 
      'Special Thanks\nPhaser Community • Among Us (Inspiration)', {
      fontSize: '16px',
      color: '#aaaaaa',
      align: 'center',
      lineSpacing: 5
    });
    thanks.setOrigin(0.5, 0.5);

    const closeBtn = this.add.text(0, 220, 'CLOSE', {
      fontSize: '26px',
      color: '#000000',
      backgroundColor: '#00CED1',
      padding: { x: 40, y: 14 }
    });
    closeBtn.setOrigin(0.5, 0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerover', () => {
      closeBtn.setScale(1.1);
      closeBtn.setStyle({ backgroundColor: '#00ff00' });
    });
    
    closeBtn.on('pointerout', () => {
      closeBtn.setScale(1.0);
      closeBtn.setStyle({ backgroundColor: '#00CED1' });
    });
    
    closeBtn.on('pointerdown', () => {
      container.destroy();
      overlay.destroy();
    });
    
    container.add([creditText, studioText, gameTitle, techStack, divider1, devCredit, divider2, thanks, closeBtn]);
  }
  
  private createMatrixRain(width: number, height: number): void {
    this.matrixContainer = this.add.container(0, 0);
    this.matrixContainer.setDepth(0);
    
    this.glitchOverlay = this.add.graphics();
    this.glitchOverlay.setDepth(1);

    const columnWidth = 20;
    const numColumns = Math.floor(width / columnWidth);
    
    for (let i = 0; i < numColumns; i++) {
      const column: MatrixColumn = {
        x: i * columnWidth + 5,
        y: Phaser.Math.Between(-height, 0),
        speed: Phaser.Math.FloatBetween(80, 250),
        texts: [],
        glitchTimer: 0
      };

      const numChars = Math.floor(height / 18) + 10;
      for (let j = 0; j < numChars; j++) {
        const text = this.add.text(column.x, 0, this.getRandomMatrixChar(), {
          fontSize: '16px',
          color: '#00ff00',
          fontFamily: 'Courier New, monospace'
        });
        text.setAlpha(0);
        column.texts.push(text);
        this.matrixContainer.add(text);
      }
      
      this.matrixColumns.push(column);
    }
  }
  
  private getRandomMatrixChar(): string {
    return this.MATRIX_CHARS[Math.floor(Math.random() * this.MATRIX_CHARS.length)];
  }
  
  update(_time: number, delta: number): void {
    if (!this.glitchOverlay) return;
    
    const width = CONFIG.GAME_WIDTH;
    const height = CONFIG.GAME_HEIGHT;
    const deltaSeconds = delta / 1000;
    
    this.glitchOverlay.clear();

    this.matrixColumns.forEach((column) => {
      column.y += column.speed * deltaSeconds;

      if (column.y > height + 100) {
        column.y = -100;
        column.speed = Phaser.Math.FloatBetween(80, 250);
      }

      column.glitchTimer += deltaSeconds;
      if (column.glitchTimer > 0.08) {
        column.glitchTimer = 0;
        if (Math.random() < 0.2) {
          const charIndex = Math.floor(Math.random() * column.texts.length);
          column.texts[charIndex].setText(this.getRandomMatrixChar());
        }
      }
      
      column.texts.forEach((text, i) => {
        if (!text || !text.active) return;
        
        const charY = column.y + (i * 18);
        text.setY(charY);
        
        if (charY > -20 && charY < height + 20) {
          const fade = Math.max(0, 1 - (i * 0.05));
          text.setAlpha(fade);

          if (Math.random() < 0.02) {
            text.setColor('#ff0000');
          } else if (Math.random() < 0.01) {
            text.setColor('#00ffff'); 
          } else if (i === 0) {
            text.setColor('#ffffff'); 
          } else {
            text.setColor('#00ff00');
          }
        } else {
          text.setAlpha(0);
        }
      });
    });

    if (Math.random() < 0.3) {
      const scanY = Phaser.Math.Between(0, height);
      this.glitchOverlay.fillStyle(0x00ff00, 0.08);
      this.glitchOverlay.fillRect(0, scanY, width, 1);
    }

    if (Math.random() < 0.15) {
      const glitchX = Phaser.Math.Between(0, width - 100);
      const glitchY = Phaser.Math.Between(0, height - 50);
      this.glitchOverlay.fillStyle(0xff0000, 0.2);
      this.glitchOverlay.fillRect(glitchX, glitchY, Phaser.Math.Between(50, 200), Phaser.Math.Between(1, 8));
    }

    if (Math.random() < 0.1) {
      const glitchX = Phaser.Math.Between(0, width);
      this.glitchOverlay.fillStyle(0x00ffff, 0.15);
      this.glitchOverlay.fillRect(glitchX, 0, 2, height);
    }
  }

  shutdown(): void {
    if (this.soundManager) {
      this.soundManager.destroy();
    }
  }
}
