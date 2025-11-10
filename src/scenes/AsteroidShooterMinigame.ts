
import Phaser from 'phaser';
import { MinigameScene } from './MinigameScene';

export class AsteroidShooterMinigame extends MinigameScene {
  
  private crosshair?: Phaser.GameObjects.Graphics;
  private asteroids: Phaser.GameObjects.Image[] = [];
  private scoretext?: Phaser.GameObjects.Text;
  
  
  private score: number = 0;
  private targetScore: number = 10;
  private mousex: number = 0;
  private mousey: number = 0;
  private canshoot: boolean = true;
  private shootdelay: number = 300;

  constructor() {
    super({ key: 'AsteroidShooterMinigame' });
  }

  init(data: any): void {
    super.init(data);
    
    this.score = 0;
    this.asteroids = [];
    this.canshoot = true;
  }

  protected getMinigameTitle(): string {
    return 'Asteroid Shooter';
  }

  protected createMinigameContent(): void {
    const width = 600;
    const centerx = width / 2;

    
    this.input.setDefaultCursor('none');

    
    const instructions = this.add.text(centerx, 80, 'Click to shoot asteroids!\nDestroy 10 asteroids!', {
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 5
    });
    instructions.setOrigin(0.5, 0.5);

    
    this.scoretext = this.add.text(centerx, 120, `Score: ${this.score}/${this.targetScore}`, {
      fontSize: '20px',
      color: '#00ff00',
      fontStyle: 'bold'
    });
    this.scoretext.setOrigin(0.5, 0.5);

    
    this.crosshair = this.add.graphics();
    this.crosshair.lineStyle(2, 0xffff00);
    this.crosshair.strokeCircle(0, 0, 10);
    this.crosshair.lineBetween(-15, 0, 15, 0);
    this.crosshair.lineBetween(0, -15, 0, 15);

    
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.mousex = pointer.x - this.minigameContainer.x;
      this.mousey = pointer.y - this.minigameContainer.y;
    });

    
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const x = pointer.x - this.minigameContainer.x;
      const y = pointer.y - this.minigameContainer.y;
      this.shoot(x, y);
    });

    
    this.time.addEvent({
      delay: 1200,
      callback: this.makeasteroid,
      callbackScope: this,
      loop: true
    });

    
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 400, () => this.makeasteroid());
    }

    
    this.time.addEvent({
      delay: 16,
      callback: this.updategame,
      callbackScope: this,
      loop: true
    });

    this.minigameContainer.add([instructions, this.scoretext, this.crosshair]);
  }

  private makeasteroid(): void {
    const width = 600;
    const x = Phaser.Math.Between(50, width - 50);
    const y = Phaser.Math.Between(160, 350);
    const size = Phaser.Math.FloatBetween(0.15, 0.35); 
    
    
    const asteroid = this.add.image(x, y, 'asteroid');
    asteroid.setScale(size);
    asteroid.setData('spin', Phaser.Math.FloatBetween(-2, 2));
    
    this.asteroids.push(asteroid);
    this.minigameContainer.add(asteroid);
  }

  private shoot(x: number, y: number): void {
    if (!this.canshoot) return;

    this.canshoot = false;
    this.time.delayedCall(this.shootdelay, () => {
      this.canshoot = true;
    });

    
    const flash = this.add.circle(x, y, 15, 0xffff00, 0.8);
    this.minigameContainer.add(flash);
    
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 200,
      onComplete: () => flash.destroy()
    });

    
    this.asteroids.forEach((asteroid, index) => {
      const distance = Phaser.Math.Distance.Between(x, y, asteroid.x, asteroid.y);
      const hitRadius = (asteroid.displayWidth / 2) * 0.8; 
      
      if (distance < hitRadius) {
        
        const explosion = this.add.circle(asteroid.x, asteroid.y, asteroid.displayWidth / 2, 0xff6600, 0.8);
        this.minigameContainer.add(explosion);
        
        this.tweens.add({
          targets: explosion,
          alpha: 0,
          scale: 2,
          duration: 300,
          onComplete: () => explosion.destroy()
        });

        asteroid.destroy();
        this.asteroids.splice(index, 1);

        this.score++;
        if (this.scoretext) {
          this.scoretext.setText(`Score: ${this.score}/${this.targetScore}`);
        }

        
        if (this.score >= this.targetScore) {
          this.win();
        }
      }
    });
  }

  private updategame(): void {
    
    if (this.crosshair) {
      this.crosshair.setPosition(this.mousex, this.mousey);
      this.minigameContainer.bringToTop(this.crosshair);
    }
    
    
    this.asteroids.forEach(asteroid => {
      const spin = asteroid.getData('spin');
      asteroid.angle += spin;
    });
  }

  private win(): void {
    if (this.scoretext) {
      this.scoretext.setText('COMPLETE!');
      this.scoretext.setColor('#00ff00');
    }

    this.completeMinigame();
  }
}
