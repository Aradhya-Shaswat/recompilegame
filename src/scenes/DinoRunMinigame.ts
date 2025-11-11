import Phaser from 'phaser';
import { MinigameScene } from './MinigameScene';
import { SoundManager } from '../utils/SoundManager';

export class DinoRunMinigame extends MinigameScene {
  
  private player?: Phaser.GameObjects.Rectangle;
  private ground?: Phaser.GameObjects.Graphics;
  private obstacles: Phaser.GameObjects.Rectangle[] = [];
  private scoreText?: Phaser.GameObjects.Text;
  private instructionsText?: Phaser.GameObjects.Text;
  
  
  private score: number = 0;
  private targetScore: number = 50;
  private isJumping: boolean = false;
  private velocityY: number = 0;
  private gravity: number = 1200; 
  private jumpPower: number = -500; 
  private groundY: number = 380;
  private playerY: number = 0;
  private gameSpeed: number = 300; 
  private spawnTimer: number = 0;
  private spawnInterval: number = 1.5; 
  private isGameOver: boolean = false;
  private soundManager!: SoundManager;

  constructor() {
    super({ key: 'DinoRunMinigame' });
  }

  init(data: any): void {
    super.init(data);
    
    this.obstacles = [];
    this.score = 0;
    this.isJumping = false;
    this.velocityY = 0;
    this.spawnTimer = 0;
    this.isGameOver = false;
    this.gameSpeed = 300;
    
    this.soundManager = new SoundManager(this);
  }

  protected getMinigameTitle(): string {
    return 'Dino Run';
  }

  protected createMinigameContent(): void {
    const containerWidth = 600;
    const centerX = containerWidth / 2;

    
    this.instructionsText = this.add.text(centerX, 80, 'CLICK to Jump!\nReach 50 points to win!', {
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 5
    });
    this.instructionsText.setOrigin(0.5, 0.5);

    
    this.scoreText = this.add.text(centerX, 120, `Score: ${this.score}/${this.targetScore}`, {
      fontSize: '20px',
      color: '#00ff00',
      fontStyle: 'bold'
    });
    this.scoreText.setOrigin(0.5, 0.5);

    
    this.ground = this.add.graphics();
    this.ground.lineStyle(3, 0x00CED1, 1);
    this.ground.lineBetween(0, this.groundY, containerWidth, this.groundY);

    
    this.playerY = this.groundY - 20;
    this.player = this.add.rectangle(120, this.playerY, 20, 20, 0x00CED1);
    this.player.setStrokeStyle(2, 0xffffff);

    
    this.input.on('pointerdown', () => {
      this.jump();
    });

    
    this.time.addEvent({
      delay: 16,
      callback: this.updateGame,
      callbackScope: this,
      loop: true
    });

    this.minigameContainer.add([this.instructionsText, this.scoreText, this.ground, this.player]);
  }

  private jump(): void {
    if (this.isGameOver) return;
    
    
    if (!this.isJumping && this.player) {
      this.isJumping = true;
      this.velocityY = this.jumpPower;
      
      this.soundManager.play('dino-jump');
    }
  }

  private updateGame(): void {
    if (this.isGameOver || !this.player) return;

    const deltaTime = 0.016; 

    
    if (this.isJumping) {
      this.velocityY += this.gravity * deltaTime;
      this.playerY += this.velocityY * deltaTime;

      
      if (this.playerY >= this.groundY - 20) {
        this.playerY = this.groundY - 20;
        this.velocityY = 0;
        this.isJumping = false;
      }

      this.player.y = this.playerY;
    }

    
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnObstacle();
      this.spawnTimer = 0;
      
      
      this.spawnInterval = Math.max(0.8, 1.5 - (this.score / 2000));
      this.gameSpeed = Math.min(500, 300 + (this.score / 5));
    }

    
    this.obstacles.forEach((obstacle, index) => {
      obstacle.x -= this.gameSpeed * deltaTime;

      
      if (obstacle.x < 0) {
        obstacle.destroy();
        this.obstacles.splice(index, 1);
        this.incrementScore();
      }

      
      if (this.player && this.checkCollision(this.player, obstacle)) {
        this.handleGameOver();
      }
    });

    
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${this.score}/${this.targetScore}`);
    }

    
    if (this.score >= this.targetScore) {
      this.handleSuccess();
    }
  }

  private spawnObstacle(): void {
    const containerWidth = 600;
    const height = Phaser.Math.Between(20, 40);
    
    const obstacle = this.add.rectangle(
      containerWidth - 50,
      this.groundY - height / 2,
      15,
      height,
      0xff0000
    );
    obstacle.setStrokeStyle(2, 0x880000);

    this.obstacles.push(obstacle);
    this.minigameContainer.add(obstacle);
  }

  private checkCollision(player: Phaser.GameObjects.Rectangle, obstacle: Phaser.GameObjects.Rectangle): boolean {
    const playerBounds = player.getBounds();
    const obstacleBounds = obstacle.getBounds();

    return Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, obstacleBounds);
  }

  private incrementScore(): void {
    this.score += 10; 
  }

  private handleGameOver(): void {
    if (this.isGameOver) return;
    
    this.isGameOver = true;

    this.soundManager.play('dino-hit');
    
    if (this.player) {
      this.player.setFillStyle(0xff0000);
    }

    
    if (this.scoreText) {
      this.scoreText.setText('GAME OVER! Try Again');
      this.scoreText.setColor('#ff0000');
    }

    if (this.instructionsText) {
      this.instructionsText.setText('Failed! Close and retry.');
    }

    
    this.obstacles.forEach(obs => {
      this.tweens.killTweensOf(obs);
    });

    
    this.time.delayedCall(1500, () => {
      
    });
  }

  private handleSuccess(): void {
    if (this.isGameOver) return;
    
    this.isGameOver = true;

    
    if (this.scoreText) {
      this.scoreText.setText('WINNER!');
      this.scoreText.setColor('#00ff00');
    }

    if (this.instructionsText) {
      this.instructionsText.setText('You made it!');
    }

    
    this.obstacles.forEach(obs => obs.destroy());
    this.obstacles = [];

    this.completeMinigame();
  }
}
