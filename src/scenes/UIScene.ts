import Phaser from 'phaser';
import { CONFIG } from '../config';
import { TimerData } from '../systems/TimerSystem';

export class UIScene extends Phaser.Scene {
  private timerGraphics!: Phaser.GameObjects.Graphics;
  private timerTexts!: Map<number, Phaser.GameObjects.Text>;
  private activeCharacterId: number = 1;
  private gameScene!: Phaser.Scene;
  private gameOverContainer?: Phaser.GameObjects.Container;
  private gameOverOverlay?: Phaser.GameObjects.Graphics;
  private victoryContainer?: Phaser.GameObjects.Container;
  private victoryOverlay?: Phaser.GameObjects.Graphics;
  private interactPrompt?: Phaser.GameObjects.Text;
  private energyBarBg?: Phaser.GameObjects.Rectangle;
  private energyBarFill?: Phaser.GameObjects.Rectangle;
  private energyBarText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    this.timerGraphics = this.add.graphics();
    this.timerTexts = new Map();
    
    this.gameScene = this.scene.get('GameScene');    this.setupEventListeners();
    this.createTimerDisplays();
    this.createEnergyBar();
    this.createInteractPrompt();
    this.createTipBar();
  }
  
  shutdown(): void {
    if (this.gameScene && this.gameScene.events) {
      this.gameScene.events.off('timersUpdated');
      this.gameScene.events.off('characterSwitched');
      this.gameScene.events.off('gameOver');
      this.gameScene.events.off('proximityChanged');
      this.gameScene.events.off('lowTimeWarning');
      this.gameScene.events.off('victory');
      this.gameScene.events.off('sprintEnergyUpdated');
    }

    if (this.timerTexts) {
      this.timerTexts.clear();
    }
  }

  private setupEventListeners(): void {
    this.gameScene.events.on('timersUpdated', (timers: TimerData[]) => {
      this.updateTimers(timers);
    });
    
    this.gameScene.events.on('characterSwitched', (charId: number) => {
      this.activeCharacterId = charId;
    });
    
    this.gameScene.events.on('gameOver', (data: { reason: string; characterId: number }) => {
      this.showGameOver(data);
    });
    
    this.gameScene.events.on('proximityChanged', (isNear: boolean) => {
      this.updateInteractPrompt(isNear);
    });
    
    this.gameScene.events.on('lowTimeWarning', (charId: number) => {
      this.playLowTimeWarning(charId);
    });
    
    this.gameScene.events.on('victory', (data: any) => {
      this.showVictory(data);
    });

    this.gameScene.events.on('sprintEnergyUpdated', (data: { energy: number; maxEnergy: number }) => {
      this.updateEnergyBar(data.energy, data.maxEnergy);
    });
  }

  private createTimerDisplays(): void {
    const positions = [
      { x: CONFIG.UI.HUD_PADDING + 35, y: CONFIG.UI.HUD_PADDING + 28 },
      { x: CONFIG.UI.HUD_PADDING + 105, y: CONFIG.UI.HUD_PADDING + 28 },
      { x: CONFIG.UI.HUD_PADDING + 175, y: CONFIG.UI.HUD_PADDING + 28 }
    ];
    
    positions.forEach((pos, index) => {
      const charId = index + 1;
      const charName = CONFIG.CHARACTER.NAMES[index];

      const nameText = this.add.text(pos.x, pos.y - 28, charName, {
        fontSize: '10px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      nameText.setOrigin(0.5, 0.5);

      const text = this.add.text(pos.x, pos.y + 24, '35.0', {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      text.setOrigin(0.5, 0.5);
      
      this.timerTexts.set(charId, text);
    });
  }

  private createEnergyBar(): void {
    const energyX = CONFIG.GAME_WIDTH - CONFIG.UI.HUD_PADDING - 52;
    const energyY = CONFIG.UI.HUD_PADDING + 28;

    const label = this.add.text(energyX, energyY - 28, 'Sprint', {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    label.setOrigin(0.5, 0.5);

    this.energyBarBg = this.add.rectangle(energyX, energyY, 104, 24, 0x333333);
    this.energyBarBg.setStrokeStyle(2, 0xffffff);

    this.energyBarFill = this.add.rectangle(energyX - 50, energyY, 100, 20, 0x00ff00);
    this.energyBarFill.setOrigin(0, 0.5);

    this.energyBarText = this.add.text(energyX, energyY + 24, '100%', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.energyBarText.setOrigin(0.5, 0.5);
  }

  private updateEnergyBar(energy: number, maxEnergy: number): void {
    if (!this.energyBarFill || !this.energyBarText) return;

    const energyPercent = energy / maxEnergy;
    this.energyBarFill.width = 100 * energyPercent;

    if (energyPercent > 0.6) {
      this.energyBarFill.setFillStyle(0x00ff00);
    } else if (energyPercent > 0.3) {
      this.energyBarFill.setFillStyle(0xffaa00);
    } else {
      this.energyBarFill.setFillStyle(0xff0000);
    }

    this.energyBarText.setText(`${Math.floor(energy)}%`);
  }

  private updateTimers(timers: TimerData[]): void {
    if (!this.timerGraphics || !this.timerGraphics.active) return;
    
    this.timerGraphics.clear();
    
    const positions = [
      { x: CONFIG.UI.HUD_PADDING + 35, y: CONFIG.UI.HUD_PADDING + 28 },
      { x: CONFIG.UI.HUD_PADDING + 105, y: CONFIG.UI.HUD_PADDING + 28 },
      { x: CONFIG.UI.HUD_PADDING + 175, y: CONFIG.UI.HUD_PADDING + 28 }
    ];
    
    const colors = [CONFIG.COLORS.CHAR_1, CONFIG.COLORS.CHAR_2, CONFIG.COLORS.CHAR_3];
    
    timers.forEach((timer) => {
      const index = timer.characterId - 1;
      const pos = positions[index];
      const color = colors[index];
      const isActive = timer.characterId === this.activeCharacterId;

      const maxTime = CONFIG.TIMER.INITIAL_TIME;
      const progress = timer.timeRemaining / maxTime;

      let displayColor = color;
      if (timer.timeRemaining <= CONFIG.TIMER.LOW_TIME_THRESHOLD) {
        displayColor = CONFIG.COLORS.WARNING as typeof color;
      }

      const radius = CONFIG.UI.TIMER_RADIUS;
      const lineWidth = CONFIG.UI.TIMER_LINE_WIDTH;

      if (!this.timerGraphics || !this.timerGraphics.active) return;

      this.timerGraphics.lineStyle(lineWidth, 0x333333, isActive ? 0.8 : 0.3);
      this.timerGraphics.strokeCircle(pos.x, pos.y, radius);

      if (progress > 0) {
        this.timerGraphics.lineStyle(lineWidth, displayColor, isActive ? 1 : 0.5);
        this.timerGraphics.beginPath();
        this.timerGraphics.arc(
          pos.x,
          pos.y,
          radius,
          Phaser.Math.DegToRad(-90),
          Phaser.Math.DegToRad(-90 + 360 * progress),
          false
        );
        this.timerGraphics.strokePath();
      }

      if (isActive) {
        this.timerGraphics.lineStyle(2, 0xffffff, 1);
        this.timerGraphics.strokeCircle(pos.x, pos.y, radius + 8);
      }

      const text = this.timerTexts.get(timer.characterId);
      if (text && text.active) {
        text.setText(timer.timeRemaining.toFixed(1));
        text.setColor(timer.timeRemaining <= CONFIG.TIMER.LOW_TIME_THRESHOLD ? '#ff0000' : '#ffffff');

        text.setAlpha(isActive ? 1 : 0.4);
        text.setFontSize('12px');
      }
    });
  }

  private createTipBar(): void {
    const width = CONFIG.GAME_WIDTH;
    const height = CONFIG.GAME_HEIGHT;

    const barHeight = 35;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x000000, 0.8);
    barBg.fillRect(0, height - barHeight, width, barHeight);
    barBg.lineStyle(2, 0x555555, 1);
    barBg.lineBetween(0, height - barHeight, width, height - barHeight);

    const tipText = this.add.text(width / 2, height - barHeight / 2, 
      '[1/2/3] Switch  •  [WASD/Arrows] Move  •  [SHIFT] Sprint  •  [SPACE] Interact', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Courier New, monospace',
      fontStyle: 'bold'
    });
    tipText.setOrigin(0.5, 0.5);

    tipText.setStroke('#000000', 3);
  }

  private createInteractPrompt(): void {
    const x = CONFIG.GAME_WIDTH / 2;
    const y = CONFIG.GAME_HEIGHT - 80;
    
    this.interactPrompt = this.add.text(x, y, 'Press SPACE to interact', {
      fontSize: '18px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    });
    this.interactPrompt.setOrigin(0.5, 0.5);
    this.interactPrompt.setVisible(false);
  }

  private updateInteractPrompt(isNear: boolean): void {
    if (this.interactPrompt) {
      this.interactPrompt.setVisible(isNear);
    }
  }

  private showVictory(data: { tasksCompleted: number; timeRemaining: any }): void {
    const width = CONFIG.GAME_WIDTH;
    const height = CONFIG.GAME_HEIGHT;

    this.victoryOverlay = this.add.graphics();
    this.victoryOverlay.fillStyle(0x000000, 0.7);
    this.victoryOverlay.fillRect(0, 0, width, height);

    this.victoryContainer = this.add.container(width / 2, height / 2);

    const title = this.add.text(0, -100, 'EXTRACTION SUCCESSFUL', {
      fontSize: '48px',
      color: '#00ff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8
    });
    title.setOrigin(0.5, 0.5);

    const message = this.add.text(0, 0, 
      `Code Rewritten!\n${data.tasksCompleted} patches deployed`, {
      fontSize: '24px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10
    });
    message.setOrigin(0.5, 0.5);

    const subtitle = this.add.text(0, 80, 'Preparing extraction...', {
      fontSize: '18px',
      color: '#aaaaaa',
      align: 'center'
    });
    subtitle.setOrigin(0.5, 0.5);
    
    this.victoryContainer.add([title, message, subtitle]);

    this.tweens.add({
      targets: title,
      scale: { from: 0, to: 1.2 },
      duration: 500,
      ease: 'Back.easeOut'
    });
    
    this.tweens.add({
      targets: subtitle,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.createConfetti(width, height);
  }
  
  private createConfetti(width: number, height: number): void {
    const colors = [0x00CED1, 0xFF8C00, 0xFF00FF, 0x00FF00];
    
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = -20;
      const color = Phaser.Utils.Array.GetRandom(colors);
      
      const particle = this.add.rectangle(x, y, 10, 10, color);
      
      this.tweens.add({
        targets: particle,
        y: height + 20,
        x: x + Phaser.Math.Between(-100, 100),
        angle: Phaser.Math.Between(0, 360),
        duration: Phaser.Math.Between(2000, 4000),
        ease: 'Cubic.easeIn',
        delay: Phaser.Math.Between(0, 500),
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  private showGameOver(data: { reason: string; characterId: number }): void {
    const width = CONFIG.GAME_WIDTH;
    const height = CONFIG.GAME_HEIGHT;

    this.gameOverOverlay = this.add.graphics();
    this.gameOverOverlay.fillStyle(0x000000, 0.8);
    this.gameOverOverlay.fillRect(0, 0, width, height);

    this.gameOverContainer = this.add.container(width / 2, height / 2);

    const title = this.add.text(0, -100, 'SYSTEM FAILURE', {
      fontSize: '48px',
      color: '#ff0000',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5, 0.5);

    const charName = CONFIG.CHARACTER.NAMES[data.characterId - 1];
    const message = this.add.text(0, -20, `${charName} was deleted from the code.\nMission failed.`, {
      fontSize: '24px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 8
    });
    message.setOrigin(0.5, 0.5);

    const retryButton = this.add.text(0, 60, 'Press R to Retry', {
      fontSize: '20px',
      color: '#00ff00',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 }
    });
    retryButton.setOrigin(0.5, 0.5);
    retryButton.setInteractive({ useHandCursor: true });

    this.gameOverContainer.add([title, message, retryButton]);
 
    const rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    rKey.once('down', () => {
      this.restartGame();
    });
    
    retryButton.on('pointerdown', () => {
      this.restartGame();
    });
  }

  private restartGame(): void {
    if (this.gameOverOverlay) {
      this.gameOverOverlay.destroy();
      this.gameOverOverlay = undefined;
    }

    if (this.gameOverContainer) {
      this.gameOverContainer.destroy();
      this.gameOverContainer = undefined;
    }

    if (this.victoryOverlay) {
      this.victoryOverlay.destroy();
      this.victoryOverlay = undefined;
    }

    if (this.victoryContainer) {
      this.victoryContainer.destroy();
      this.victoryContainer = undefined;
    }

    (this.gameScene as any).restartGame();
  }

  private playLowTimeWarning(charId: number): void {
    const text = this.timerTexts.get(charId);
    if (text) {
      this.tweens.add({
        targets: text,
        scale: { from: 1.0, to: 1.3 },
        duration: 200,
        yoyo: true,
        repeat: 2
      });
    }
  }
}
