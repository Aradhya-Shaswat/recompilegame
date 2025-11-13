import Phaser from 'phaser';
import { CONFIG } from '../config';
import { SoundManager } from '../utils/SoundManager';

export class EndCreditsScene extends Phaser.Scene {
  private creditsText: Phaser.GameObjects.Text[] = [];
  private scrollSpeed: number = 30;
  private isScrolling: boolean = true;
  private skipText?: Phaser.GameObjects.Text;
  private glitchTimer?: Phaser.Time.TimerEvent;
  private glitchGraphics?: Phaser.GameObjects.Graphics;
  private gameData?: { tasksCompleted: number; timeRemaining: any };
  private soundManager!: SoundManager;

  constructor() {
    super({ key: 'EndCreditsScene' });
  }

  init(data: { tasksCompleted: number; timeRemaining: any }): void {
    this.gameData = data;
  }

  create(): void {
    this.soundManager = new SoundManager(this);

    const width = CONFIG.GAME_WIDTH;
    const height = CONFIG.GAME_HEIGHT;

    this.cameras.main.setBackgroundColor(0x0a0a0a);

    
    this.glitchGraphics = this.add.graphics();
    this.glitchGraphics.setDepth(100);
    this.glitchGraphics.setAlpha(0.3);

    
    const credits = this.getCreditsContent();

    let currentY = height + 50;
    const lineHeight = 40;

    credits.forEach((line) => {
      const textConfig: Phaser.Types.GameObjects.Text.TextStyle = {
        fontSize: line.size || '24px',
        color: line.color || '#ffffff',
        fontFamily: '"Press Start 2P", monospace',
        align: 'center',
        wordWrap: { width: width - 100 },
        lineSpacing: 10
      };

      const text = this.add.text(width / 2, currentY, line.text, textConfig);
      text.setOrigin(0.5, 0);
      text.setAlpha(0);

      this.creditsText.push(text);
      
      currentY += (line.spacing || lineHeight);

      
      this.tweens.add({
        targets: text,
        alpha: 1,
        duration: 1000,
        ease: 'Power2',
        delay: (currentY - height) * 10
      });
    });

    
    this.skipText = this.add.text(width - 20, height - 20, 
      'Press ESC to skip', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: '"Press Start 2P", monospace'
    });
    this.skipText.setOrigin(1, 1);
    this.skipText.setScrollFactor(0);
    this.skipText.setAlpha(0.7);

    
    this.tweens.add({
      targets: this.skipText,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    
    this.setupInput();

    
    this.startGlitchEffects();

    
    if (this.sound.get('menu-music')) {
      this.sound.play('menu-music', { loop: true, volume: 0.3 });
    }
  }

  update(_time: number, delta: number): void {
    if (!this.isScrolling) return;

    
    this.creditsText.forEach(text => {
      text.y -= this.scrollSpeed * delta / 1000;
    });

    
    const lastText = this.creditsText[this.creditsText.length - 1];
    if (lastText && lastText.y < -100) {
      this.completeCredits();
    }
  }

  private getCreditsContent(): Array<{ text: string; size?: string; color?: string; spacing?: number }> {
    const characterNames = CONFIG.CHARACTER.NAMES;
    const timers = this.gameData?.timeRemaining || [];

    return [
      { text: '', spacing: 100 },
      { text: 'THE FINAL ESCAPE', size: '48px', color: '#00ffff', spacing: 80 },
      { text: '', spacing: 50 },
      
      { text: 'You did it.', size: '28px', color: '#ffffff', spacing: 60 },
      { text: '', spacing: 30 },
      { text: 'The corrupted code has been\nrewritten. The system is stable.', size: '20px', color: '#aaaaaa', spacing: 80 },
      { text: '', spacing: 30 },
      { text: 'Your team managed to escape\nthe digital prison before\ntime ran out.', size: '20px', color: '#aaaaaa', spacing: 100 },
      
      { text: '', spacing: 50 },
      { text: '════════════════════════', size: '20px', color: '#00CED1', spacing: 60 },
      { text: 'MISSION STATISTICS', size: '32px', color: '#FFD700', spacing: 50 },
      { text: '════════════════════════', size: '20px', color: '#00CED1', spacing: 60 },
      
      { text: '', spacing: 30 },
      { text: `Tasks Completed: ${this.gameData?.tasksCompleted || 0}`, size: '24px', color: '#00ff00', spacing: 50 },
      
      { text: '', spacing: 30 },
      { text: 'Team Status:', size: '28px', color: '#FF8C00', spacing: 50 },
      { text: `${characterNames[0]}: ${timers[0]?.timeRemaining.toFixed(1) || '0.0'}s remaining`, size: '20px', color: '#00CED1', spacing: 40 },
      { text: `${characterNames[1]}: ${timers[1]?.timeRemaining.toFixed(1) || '0.0'}s remaining`, size: '20px', color: '#FF8C00', spacing: 40 },
      { text: `${characterNames[2]}: ${timers[2]?.timeRemaining.toFixed(1) || '0.0'}s remaining`, size: '20px', color: '#FF00FF', spacing: 80 },
      
      { text: '', spacing: 50 },
      { text: '════════════════════════', size: '20px', color: '#00CED1', spacing: 60 },
      { text: 'CREDITS', size: '36px', color: '#FFD700', spacing: 50 },
      { text: '════════════════════════', size: '20px', color: '#00CED1', spacing: 80 },
      
      { text: '', spacing: 30 },
      { text: 'A Game by', size: '28px', color: '#FFD700', spacing: 40 },
      { text: 'Code Warriors 42', size: '32px', color: '#00ffff', spacing: 80 },
      
      { text: '', spacing: 30 },
      { text: 'Game Design', size: '28px', color: '#FF8C00', spacing: 40 },
      { text: 'Avinash Prakash', size: '24px', color: '#ffffff', spacing: 80 },
      
      { text: '', spacing: 30 },
      { text: 'Programming & Development', size: '28px', color: '#FF8C00', spacing: 40 },
      { text: 'Aradhya Shaswat', size: '24px', color: '#ffffff', spacing: 30 },
      { text: 'Core Game Engine', size: '18px', color: '#aaaaaa', spacing: 30 },
      { text: 'Task System Architecture', size: '18px', color: '#aaaaaa', spacing: 30 },
      { text: 'Minigame Development', size: '18px', color: '#aaaaaa', spacing: 80 },
      
      { text: '', spacing: 30 },
      { text: 'Art & Animation : Aditya Verma', size: '28px', color: '#FF8C00', spacing: 40 },
      { text: 'Character Sprites: Wraith Series', size: '20px', color: '#ffffff', spacing: 30 },
      { text: 'Environment Design : Aradhya Shaswat', size: '20px', color: '#ffffff', spacing: 30 },
      { text: 'Visual Effects : Aditya Verma', size: '20px', color: '#ffffff', spacing: 80 },
      
      { text: '', spacing: 30 },
      { text: 'Audio', size: '28px', color: '#FF8C00', spacing: 40 },
      { text: 'Sound Design - Unity Asset Library', size: '20px', color: '#888888', spacing: 30 },
      { text: 'Music Composition - Aradhya Shaswat', size: '20px', color: '#888888', spacing: 80 },
      
      { text: '', spacing: 30 },
      { text: 'Special Thanks', size: '28px', color: '#FF8C00', spacing: 40 },
      { text: 'Phaser Game Framework', size: '20px', color: '#ffffff', spacing: 30 },
      { text: 'The Among Us Game Community', size: '20px', color: '#ffffff', spacing: 30 },
      { text: 'You, for playing!', size: '20px', color: '#00ffff', spacing: 100 },
      
      { text: '', spacing: 50 },
      { text: '════════════════════════', size: '20px', color: '#00CED1', spacing: 60 },
      { text: '', spacing: 30 },
      
      { text: '"In a world of corrupted code,\nthree souls fought for freedom.\nTheir story ends here,\nbut yours continues..."', 
        size: '20px', color: '#888888', spacing: 120 },
      
      { text: '', spacing: 50 },
      { text: 'THE END', size: '48px', color: '#FFD700', spacing: 80 },
      { text: '', spacing: 50 },
      { text: '...or is it?', size: '24px', color: '#00ffff', spacing: 200 },
      
      { text: '', spacing: 50 },
      { text: 'Thank you for playing!', size: '32px', color: '#ffffff', spacing: 150 },
    ];
  }

  private setupInput(): void {
    const escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey.on('down', () => {
      this.soundManager.play('menu-click');
      this.skipCredits();
    });

    this.input.on('pointerdown', () => {
      this.soundManager.play('menu-click');
      this.skipCredits();
    });

    
    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    spaceKey.on('down', () => {
      this.scrollSpeed = this.scrollSpeed < 100 ? 100 : 30;
    });
  }

  private startGlitchEffects(): void {
    
    this.glitchTimer = this.time.addEvent({
      delay: Phaser.Math.Between(3000, 8000),
      callback: () => {
        this.createGlitch();
      },
      loop: true
    });
  }

  private createGlitch(): void {
    if (!this.glitchGraphics) return;

    const width = CONFIG.GAME_WIDTH;
    const height = CONFIG.GAME_HEIGHT;

    this.glitchGraphics.clear();

    
    for (let i = 0; i < 3; i++) {
      const y = Phaser.Math.Between(0, height);
      const barHeight = Phaser.Math.Between(2, 10);
      const color = Phaser.Math.RND.pick([0x00ffff, 0xff00ff, 0xffffff]);
      
      this.glitchGraphics.fillStyle(color, 0.5);
      this.glitchGraphics.fillRect(0, y, width, barHeight);
    }

    
    this.tweens.add({
      targets: this.glitchGraphics,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.glitchGraphics?.clear();
        this.glitchGraphics?.setAlpha(0.3);
      }
    });

    
    const randomText = Phaser.Math.RND.pick(this.creditsText);
    if (randomText) {
      const originalX = randomText.x;
      
      this.tweens.add({
        targets: randomText,
        x: originalX + Phaser.Math.Between(-5, 5),
        duration: 50,
        yoyo: true,
        repeat: 2,
        ease: 'Power2'
      });
    }
  }

  private skipCredits(): void {
    if (!this.isScrolling) return;
    
    this.isScrolling = false;
    this.scrollSpeed = 0;

    
    this.cameras.main.fadeOut(500, 0, 0, 0);
    
    this.sound.stopAll();

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.returnToMenu();
    });
  }

  private completeCredits(): void {
    this.isScrolling = false;
    
    
    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      
      this.sound.stopAll();

      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.returnToMenu();
      });
    });
  }

  private returnToMenu(): void {
    if (this.glitchTimer) {
      this.glitchTimer.remove();
    }
    
    this.scene.stop('GameScene');
    this.scene.stop('UIScene');
    this.scene.start('MenuScene');
  }

  shutdown(): void {
    if (this.glitchTimer) {
      this.glitchTimer.remove();
    }
    this.creditsText = [];
    this.sound.stopAll();
  }
}
