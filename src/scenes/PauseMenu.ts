import Phaser from 'phaser';
import { CONFIG } from '../config';

export class PauseMenu extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseMenu' });
  }

  create(): void {
    const width = CONFIG.GAME_WIDTH;
    const height = CONFIG.GAME_HEIGHT;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);

    const title = this.add.text(width / 2, height / 4, 'PAUSED', {
      fontSize: '64px',
      color: '#00CED1',
      fontFamily: '"Press Start 2P", monospace',
      stroke: '#000000',
      strokeThickness: 4
    });
    title.setOrigin(0.5, 0.5);

    this.createButton(width / 2, height / 2 - 60, 'RESUME', () => {
      this.resumeGame();
    });

    this.createButton(width / 2, height / 2 + 20, 'RESTART', () => {
      this.restartGame();
    });

    this.createButton(width / 2, height / 2 + 100, 'MAIN MENU', () => {
      this.returnToMenu();
    });

    const controls = this.add.text(width / 2, height - 80, 
      'Press ESC or P to Resume', {
      fontSize: '14px',
      color: '#888888',
      fontFamily: '"Press Start 2P", monospace'
    });
    controls.setOrigin(0.5, 0.5);

    this.input.keyboard?.on('keydown-ESC', () => {
      this.resumeGame();
    });

    this.input.keyboard?.on('keydown-P', () => {
      this.resumeGame();
    });
  }

  private createButton(x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x333333, 1);
    bg.fillRoundedRect(-140, -30, 280, 60, 10);
    bg.lineStyle(2, 0x00CED1, 1);
    bg.strokeRoundedRect(-140, -30, 280, 60, 10);

    const label = this.add.text(0, 0, text, {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: '"Press Start 2P", monospace'
    });
    label.setOrigin(0.5, 0.5);

    container.add([bg, label]);
    container.setSize(280, 60);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x444444, 1);
      bg.fillRoundedRect(-140, -30, 280, 60, 10);
      bg.lineStyle(3, 0x00ff00, 1);
      bg.strokeRoundedRect(-140, -30, 280, 60, 10);
      label.setScale(1.05);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x333333, 1);
      bg.fillRoundedRect(-140, -30, 280, 60, 10);
      bg.lineStyle(2, 0x00CED1, 1);
      bg.strokeRoundedRect(-140, -30, 280, 60, 10);
      label.setScale(1.0);
    });

    container.on('pointerdown', onClick);

    return container;
  }

  private resumeGame(): void {
    this.scene.resume('GameScene');
    this.scene.resume('UIScene');
    this.scene.stop();
  }

  private restartGame(): void {
    this.scene.stop();
    this.scene.stop('GameScene');
    this.scene.stop('UIScene');
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }

  private returnToMenu(): void {
    this.scene.stop();
    this.scene.stop('GameScene');
    this.scene.stop('UIScene');
    this.scene.start('MenuScene');
  }
}
