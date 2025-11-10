import Phaser from 'phaser';
import { CONFIG } from '../config';

export interface MinigameConfig {
  taskId: number;
  characterId: number;
  gameScene: Phaser.Scene;
}

export abstract class MinigameScene extends Phaser.Scene {
  protected taskId!: number;
  protected characterId!: number;
  protected gameScene!: Phaser.Scene;
  protected isCompleted: boolean = false;
  protected minigameContainer!: Phaser.GameObjects.Container;
  protected timerText?: Phaser.GameObjects.Text;
  protected timerGraphics?: Phaser.GameObjects.Graphics;
  protected closeBtn?: Phaser.GameObjects.Text;

  init(data: MinigameConfig): void {
    this.taskId = data.taskId;
    this.characterId = data.characterId;
    this.gameScene = data.gameScene;
    this.isCompleted = false;
  }

  create(): void {
    this.createWindow();
    this.createTimerDisplay();
    this.createMinigameContent();

    this.gameScene.events.on('timersUpdated', this.updateTimer, this);
  }

  private createTimerDisplay(): void {
    const timerX = 100; 
    const timerY = CONFIG.GAME_HEIGHT / 2; 

    const timerBg = this.add.graphics();
    timerBg.fillStyle(0x000000, 0.8);
    timerBg.fillRoundedRect(timerX - 60, timerY - 55, 120, 110, 10);
    timerBg.lineStyle(3, 0x00CED1, 1);
    timerBg.strokeRoundedRect(timerX - 60, timerY - 55, 120, 110, 10);
    timerBg.setDepth(1000);

    const timerLabel = this.add.text(timerX, timerY - 30, 'TIME', {
      fontSize: '12px',
      color: '#888888',
      fontStyle: 'bold'
    });
    timerLabel.setOrigin(0.5, 0.5);
    timerLabel.setDepth(1001);

    this.timerText = this.add.text(timerX, timerY + 10, '25.0', {
      fontSize: '36px',
      color: '#00CED1',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.timerText.setOrigin(0.5, 0.5);
    this.timerText.setDepth(1001);
  }

  private updateTimer(timers: any[]): void {
    if (!this.timerText) return;
    
    const timer = timers.find(t => t.characterId === this.characterId);
    if (!timer) return;

    this.timerText.setText(timer.timeRemaining.toFixed(1));

    if (timer.timeRemaining <= 5) {
      this.timerText.setColor('#ff0000');
      if (!this.timerText.getData('pulsing')) {
        this.timerText.setData('pulsing', true);
        this.tweens.add({
          targets: this.timerText,
          alpha: 0.5,
          duration: 500,
          yoyo: true,
          repeat: -1
        });
      }
    } else {
      this.timerText.setColor('#00CED1');
      this.timerText.setAlpha(1);
      if (this.timerText.getData('pulsing')) {
        this.tweens.killTweensOf(this.timerText);
        this.timerText.setData('pulsing', false);
      }
    }
  }

  private createWindow(): void {
    const width = 600;
    const height = 500;
    const x = (this.cameras.main.width - width) / 2;
    const y = (this.cameras.main.height - height) / 2;

    this.minigameContainer = this.add.container(x, y);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(-x, -y, this.cameras.main.width, this.cameras.main.height);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a1a, 1);
    bg.fillRoundedRect(0, 0, width, height, 10);
    bg.lineStyle(3, 0x00CED1, 1);
    bg.strokeRoundedRect(0, 0, width, height, 10);

    const titleBar = this.add.graphics();
    titleBar.fillStyle(0x00CED1, 1);
    titleBar.fillRoundedRect(0, 0, width, 50, { tl: 10, tr: 10, bl: 0, br: 0 });

    const title = this.add.text(width / 2, 25, this.getMinigameTitle(), {
      fontSize: '24px',
      color: '#000000',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5, 0.5);

    this.closeBtn = this.add.text(width - 30, 25, '×', {
      fontSize: '32px',
      color: '#000000',
      fontStyle: 'bold'
    });
    this.closeBtn.setOrigin(0.5, 0.5);
    this.closeBtn.setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerdown', () => {
      this.closeMinigame(false);
    });

    this.minigameContainer.add([overlay, bg, titleBar, title, this.closeBtn]);
  }

  protected abstract createMinigameContent(): void;
  protected abstract getMinigameTitle(): string;

  update(_time: number, delta: number): void {
    if (this.updateMinigameContent) {
      this.updateMinigameContent(delta);
    }
  }

  protected updateMinigameContent?(delta: number): void;

  protected completeMinigame(): void {
    if (this.isCompleted) return;
    
    this.isCompleted = true;

    this.gameScene.events.emit('minigameCompleted', {
      taskId: this.taskId,
      characterId: this.characterId
    });

    if (this.closeBtn) {
      this.closeBtn.disableInteractive();
      this.closeBtn.setAlpha(0.3);
    }

    const successText = this.add.text(300, 250, 'COMPLETE!', {
      fontSize: '48px',
      color: '#00ff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });
    successText.setOrigin(0.5, 0.5);
    
    this.tweens.add({
      targets: successText,
      scale: { from: 0, to: 1.2 },
      alpha: { from: 0, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(800, () => {
          this.closeMinigame(true);
        });
      }
    });
    
    this.minigameContainer.add(successText);
  }

  protected closeMinigame(success: boolean): void {
    this.gameScene.events.off('timersUpdated', this.updateTimer, this);

    this.input.setDefaultCursor('default');
    
    if (success) {
        // idk ill do later
    } else {
      // call cancelminigame
      (this.gameScene as any).cancelMinigame();
    }
    
    this.scene.stop();
  }
}
