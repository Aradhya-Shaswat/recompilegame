import Phaser from 'phaser';
import { MinigameScene } from './MinigameScene';

export class MiniGolfMinigame extends MinigameScene {
  private ball?: Phaser.GameObjects.Arc;
  private hole?: Phaser.GameObjects.Arc;
  private powerBar?: Phaser.GameObjects.Rectangle;
  private aimLine?: Phaser.GameObjects.Line;
  private crosshair?: Phaser.GameObjects.Graphics;
  private power: number = 0;
  private isAiming: boolean = false;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private shots: number = 0;
  private maxShots: number = 5;
  private statusText?: Phaser.GameObjects.Text;
  private obstacles: Phaser.GameObjects.Rectangle[] = [];
  private mouseX: number = 0;
  private mouseY: number = 0;
  private powerText?: Phaser.GameObjects.Text;
  private maxPower: number = 100;
  private powerScrollSpeed: number = 5;

  constructor() {
    super({ key: 'MiniGolfMinigame' });
  }

  init(data: any): void {
    super.init(data);
    this.power = 0;
    this.isAiming = false;
    this.velocityX = 0;
    this.velocityY = 0;
    this.shots = 0;
    this.obstacles = [];
    this.mouseX = 0;
    this.mouseY = 0;
  }

  protected getMinigameTitle(): string {
    return 'Mini Golf';
  }

  protected createMinigameContent(): void {
    const containerWidth = 600;
    const centerX = containerWidth / 2;

    this.input.setDefaultCursor('none');

    const instructions = this.add.text(centerX, 80, 'Click on ball to aim, use SCROLL WHEEL to adjust power!\nGet ball in hole within 5 shots!', {
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 5
    });
    instructions.setOrigin(0.5, 0.5);

    this.statusText = this.add.text(centerX, 120, `Shots: ${this.shots}/${this.maxShots}`, {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.statusText.setOrigin(0.5, 0.5);

    this.powerText = this.add.text(centerX, 470, 'Power: 0%', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.powerText.setOrigin(0.5, 0.5);

    const holeX = Phaser.Math.Between(100, 500);
    const holeY = Phaser.Math.Between(160, 280);

    this.hole = this.add.circle(holeX, holeY, 15, 0x000000);
    this.hole.setStrokeStyle(3, 0xffffff);

    this.ball = this.add.circle(centerX, 400, 10, 0xffffff);
    this.ball.setStrokeStyle(2, 0x000000);

    const obstacle1 = this.add.rectangle(centerX - 100, 280, 80, 15, 0x8B4513);
    obstacle1.setStrokeStyle(2, 0x654321);
    const obstacle2 = this.add.rectangle(centerX + 100, 320, 80, 15, 0x8B4513);
    obstacle2.setStrokeStyle(2, 0x654321);
    this.obstacles.push(obstacle1, obstacle2);

    this.aimLine = this.add.line(0, 0, 0, 0, 0, 0, 0xffffff);
    this.aimLine.setLineWidth(3);
    this.aimLine.setAlpha(0);

    const powerBarBg = this.add.rectangle(centerX, 450, 200, 20, 0x333333);
    powerBarBg.setStrokeStyle(2, 0xffffff);
    
    this.powerBar = this.add.rectangle(centerX - 100, 450, 0, 16, 0x00ff00);
    this.powerBar.setOrigin(0, 0.5);

    this.crosshair = this.add.graphics();
    this.crosshair.lineStyle(2, 0xffffff);
    this.crosshair.strokeCircle(0, 0, 8);
    this.crosshair.lineBetween(-12, 0, 12, 0);
    this.crosshair.lineBetween(0, -12, 0, 12);

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.mouseX = pointer.x - this.minigameContainer.x;
      this.mouseY = pointer.y - this.minigameContainer.y;

      if (this.crosshair) {
        this.crosshair.setPosition(this.mouseX, this.mouseY);
      }
    });

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      if (this.isAiming) {
        this.power -= Math.sign(deltaY) * this.powerScrollSpeed;
        this.power = Phaser.Math.Clamp(this.power, 0, this.maxPower);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.velocityX === 0 && this.velocityY === 0 && this.ball) {
        const localX = pointer.x - this.minigameContainer.x;
        const localY = pointer.y - this.minigameContainer.y;

        const distToBall = Phaser.Math.Distance.Between(localX, localY, this.ball.x, this.ball.y);
        if (distToBall < 50) {
          this.isAiming = true;
          this.power = 0; 
        }
      }
    });

    this.input.on('pointerup', () => {
      if (this.isAiming) {
        this.shoot();
      }
    });

    this.time.addEvent({
      delay: 16,
      callback: this.updateGame,
      callbackScope: this,
      loop: true
    });

    this.minigameContainer.add([instructions, this.statusText, this.powerText, this.hole, obstacle1, obstacle2, this.aimLine, this.ball, powerBarBg, this.powerBar, this.crosshair]);
  }

  private updateGame(): void {
    if (!this.ball || !this.hole) return;
    if (this.isAiming) {
      if (this.aimLine) {
        this.aimLine.setTo(this.ball.x, this.ball.y, this.mouseX, this.mouseY);
        this.aimLine.setAlpha(0.8);
      }

      if (this.powerBar) {
        this.powerBar.width = (this.power / this.maxPower) * 200;
        
        if (this.power > 70) {
          this.powerBar.setFillStyle(0xff0000);
        } else if (this.power > 40) {
          this.powerBar.setFillStyle(0xffaa00); 
        } else {
          this.powerBar.setFillStyle(0x00ff00); 
        }
      }

      if (this.powerText) {
        this.powerText.setText(`Power: ${Math.round(this.power)}%`);

        if (this.power > 70) {
          this.powerText.setColor('#ff0000');
        } else if (this.power > 40) {
          this.powerText.setColor('#ffaa00');
        } else {
          this.powerText.setColor('#00ff00');
        }
      }
    } else {
      if (this.aimLine) {
        this.aimLine.setAlpha(0);
      }

      if (this.powerText && this.velocityX === 0 && this.velocityY === 0) {
        this.powerText.setText('Power: 0%');
        this.powerText.setColor('#ffffff');
      }
    }

    this.ball.x += this.velocityX;
    this.ball.y += this.velocityY;

    this.velocityX *= 0.98;
    this.velocityY *= 0.98;

    if (Math.abs(this.velocityX) < 0.1) this.velocityX = 0;
    if (Math.abs(this.velocityY) < 0.1) this.velocityY = 0;

    const containerWidth = 600;
    if (this.ball.x < 10) {
      this.ball.x = 10;
      this.velocityX *= -0.8;
    }
    if (this.ball.x > containerWidth - 10) {
      this.ball.x = containerWidth - 10;
      this.velocityX *= -0.8;
    }
    if (this.ball.y < 150) {
      this.ball.y = 150;
      this.velocityY *= -0.8;
    }
    if (this.ball.y > 470) {
      this.ball.y = 470;
      this.velocityY *= -0.8;
    }

    this.obstacles.forEach(obstacle => {
      const bounds = obstacle.getBounds();
      const ballRadius = 10;

      const closestX = Math.max(bounds.left, Math.min(this.ball!.x, bounds.right));
      const closestY = Math.max(bounds.top, Math.min(this.ball!.y, bounds.bottom));
      
      const distanceX = this.ball!.x - closestX;
      const distanceY = this.ball!.y - closestY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      
      if (distance < ballRadius) {
        const overlapX = Math.abs(this.ball!.x - closestX);
        const overlapY = Math.abs(this.ball!.y - closestY);
        
        if (overlapX > overlapY) {
          this.velocityX *= -0.7;
          this.ball!.x = this.ball!.x < closestX ? bounds.left - ballRadius : bounds.right + ballRadius;
        } else {
          this.velocityY *= -0.7;
          this.ball!.y = this.ball!.y < closestY ? bounds.top - ballRadius : bounds.bottom + ballRadius;
        }
      }
    });

    const distance = Phaser.Math.Distance.Between(
      this.ball.x, this.ball.y,
      this.hole.x, this.hole.y
    );

    if (distance < 12 && Math.abs(this.velocityX) < 0.3 && Math.abs(this.velocityY) < 0.3) {
      this.velocityX = 0;
      this.velocityY = 0;
      this.handleSuccess();
    }
  }

  private shoot(): void {
    if (!this.ball) return;

    this.isAiming = false;
    this.shots++;

    if (this.statusText) {
      this.statusText.setText(`Shots: ${this.shots}/${this.maxShots}`);
    }

    const angle = Phaser.Math.Angle.Between(
      this.ball.x, this.ball.y,
      this.mouseX, this.mouseY
    );

    const powerMultiplier = this.power / 15;
    this.velocityX = Math.cos(angle) * powerMultiplier;
    this.velocityY = Math.sin(angle) * powerMultiplier;

    this.power = 0;
    if (this.powerBar) {
      this.powerBar.width = 0;
      this.powerBar.setFillStyle(0x00ff00);
    }

    if (this.shots >= this.maxShots) {
      this.time.delayedCall(2000, () => {
        if (this.velocityX === 0 && this.velocityY === 0) {
          this.handleFailure();
        }
      });
    }
  }

  private handleSuccess(): void {
    if (this.statusText) {
      this.statusText.setText('HOLE IN ONE!');
      this.statusText.setColor('#00ff00');
    }

    this.completeMinigame();
  }

  private handleFailure(): void {
    if (this.statusText) {
      this.statusText.setText('Out of shots!');
      this.statusText.setColor('#ff0000');
    }

    this.time.delayedCall(1000, () => {
      this.closeMinigame(false);
    });
  }
}
