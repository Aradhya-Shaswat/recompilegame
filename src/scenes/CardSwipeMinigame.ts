import Phaser from 'phaser';
import { MinigameScene } from './MinigameScene';
import { SoundManager } from '../utils/SoundManager';

export class CardSwipeMinigame extends MinigameScene {
  private card?: Phaser.GameObjects.Rectangle;
  private cardStripe?: Phaser.GameObjects.Rectangle;
  private cardReader?: Phaser.GameObjects.Graphics;
  private startX: number = 0;
  private swipeSpeed: number = 0;
  private lastX: number = 0;
  private lastTime: number = 0;
  private statusText?: Phaser.GameObjects.Text;
  private attempts: number = 0;
  private readonly MAX_ATTEMPTS = 5;
  private readonly IDEAL_SPEED_MIN = 80; 
  private readonly IDEAL_SPEED_MAX = 600;
  private soundManager!: SoundManager;
  private tutorialHand?: Phaser.GameObjects.Graphics;
  private tutorialCard?: Phaser.GameObjects.Rectangle;
  private tutorialCardStripe?: Phaser.GameObjects.Rectangle;
  private tutorialActive: boolean = false;
  private hasPlayedCardSwipe: boolean = false;

  constructor() {
    super({ key: 'CardSwipeMinigame' });
  }

  init(data: any): void {
    super.init(data);
    
    this.attempts = 0;
    this.swipeSpeed = 0;
    this.lastX = 0;
    this.lastTime = 0;
    
    this.soundManager = new SoundManager(this);

    const isTutorialScene = this.gameScene.scene.key === 'TutorialScene';
    const cardSwipePlayed = localStorage.getItem('tripoint_cardswipe_played');
    this.hasPlayedCardSwipe = cardSwipePlayed === 'true';
    
    if (!this.hasPlayedCardSwipe || isTutorialScene) {
      this.tutorialActive = true;
    }
  }

  protected getMinigameTitle(): string {
    return 'Swipe Your Card';
  }

  protected createMinigameContent(): void {
    const containerWidth = 600;
    const centerX = containerWidth / 2;
    const centerY = 250;

    
    this.cardReader = this.add.graphics();
    this.cardReader.fillStyle(0x333333, 1);
    this.cardReader.fillRect(centerX - 150, centerY - 60, 300, 120);
    
    
    this.cardReader.fillStyle(0x000000, 1);
    this.cardReader.fillRect(centerX - 140, centerY - 50, 280, 100);
    
    
    this.cardReader.lineStyle(3, 0x00ff00, 0.5);
    this.cardReader.lineBetween(centerX - 130, centerY, centerX + 130, centerY);

    
    this.card = this.add.rectangle(centerX - 200, centerY, 80, 50, 0xffaa00);
    this.card.setStrokeStyle(2, 0x000000);
    this.card.setInteractive({ draggable: true, useHandCursor: true });

    
    this.cardStripe = this.add.rectangle(centerX - 200, centerY, 80, 10, 0x000000);

    
    const instructions = this.add.text(centerX, 150, 'Swipe the card through the reader\nNot too fast, not too slow!', {
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 5
    });
    instructions.setOrigin(0.5, 0.5);

    
    this.statusText = this.add.text(centerX, 380, `Attempts: ${this.attempts}/${this.MAX_ATTEMPTS}`, {
      fontSize: '20px',
      color: '#888888'
    });
    this.statusText.setOrigin(0.5, 0.5);

    
    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (gameObject === this.card && this.card) {
        this.removeTutorial();
        
        this.startX = this.card.x;
        this.lastX = this.card.x;
        this.lastTime = Date.now();
        this.swipeSpeed = 0;
        
        this.soundManager.play('card-swipe');
      }
    });

    this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number) => {
      if (gameObject === this.card && this.card && this.cardStripe) {
        const containerPos = this.minigameContainer;
        const localX = dragX - containerPos.x;
        
        
        const minX = centerX - 200;
        const maxX = centerX + 200;
        const constrainedX = Phaser.Math.Clamp(localX, minX, maxX);
        
        this.card.x = constrainedX;
        this.cardStripe.x = constrainedX;

        
        const now = Date.now();
        const timeDelta = (now - this.lastTime) / 1000; 
        if (timeDelta > 0) {
          const distance = Math.abs(pointer.x - this.lastX);
          this.swipeSpeed = distance / timeDelta;
          this.lastX = pointer.x;
          this.lastTime = now;
        }

        
      }
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (gameObject === this.card && this.card) {
        
        const endX = this.card.x;
        const swipeDistance = endX - this.startX;
        
        
        if (swipeDistance > 200) {
          
          if (this.swipeSpeed >= this.IDEAL_SPEED_MIN && this.swipeSpeed <= this.IDEAL_SPEED_MAX) {
            
            this.handleSuccess();
            return;
          }
        }
        
        
        this.handleFailure();
      }
    });

    this.minigameContainer.add([this.cardReader, this.card, this.cardStripe, instructions, this.statusText]);

    if (this.tutorialActive) {
      this.createTutorialAnimation(centerX, centerY);
    }
  }

  private handleSuccess(): void {
    if (this.statusText) {
      this.statusText.setText('ACCESS GRANTED!');
      this.statusText.setColor('#00ff00');
    }
    
    if (this.card) {
      this.card.setFillStyle(0x00ff00);
    }

    localStorage.setItem('tripoint_cardswipe_played', 'true');

    this.soundManager.play('swipe-success');
    
    this.time.delayedCall(500, () => {
      this.completeMinigame();
    });
  }

  private handleFailure(): void {
    this.attempts++;

    this.soundManager.play('swipe-fail');

    if (this.card && this.cardStripe) {
      const containerWidth = 600;
      const centerX = containerWidth / 2;
      const resetX = centerX - 200; 
      
      
      this.tweens.add({
        targets: [this.card, this.cardStripe],
        x: resetX,
        duration: 300,
        ease: 'Back.easeOut'
      });
      
      this.card.setFillStyle(0xffaa00); 
    }

    if (this.attempts === 3 && !this.tutorialActive) {
      const containerWidth = 600;
      const centerX = containerWidth / 2;
      const centerY = 250;
      this.showTutorialAgain(centerX, centerY);
    }

    if (this.attempts >= this.MAX_ATTEMPTS) {
      
      if (this.statusText) {
        this.statusText.setText('Too many attempts! Try again.');
        this.statusText.setColor('#ff0000');
      }
      
      this.time.delayedCall(1500, () => {
        this.closeMinigame(false);
      });
    } else {
      
      let message = '';
      if (this.swipeSpeed > this.IDEAL_SPEED_MAX) {
        message = 'TOO FAST! Swipe slower.';
      } else if (this.swipeSpeed < this.IDEAL_SPEED_MIN) {
        message = 'TOO SLOW! Swipe faster.';
      } else {
        message = 'Swipe through completely!';
      }

      if (this.statusText) {
        this.statusText.setText(message + `\nAttempts: ${this.attempts}/${this.MAX_ATTEMPTS}`);
        this.statusText.setColor('#ff8888');
      }

      
      if (this.card) {
        this.card.setFillStyle(0xff0000);
        this.time.delayedCall(200, () => {
          if (this.card) {
            this.card.setFillStyle(0xffaa00);
          }
        });
      }
    }
  }

  private createTutorialAnimation(centerX: number, centerY: number): void {
    this.tutorialCard = this.add.rectangle(centerX - 200, centerY, 80, 50, 0xffaa00);
    this.tutorialCard.setStrokeStyle(2, 0x000000);
    this.tutorialCard.setAlpha(0.6);

    this.tutorialCardStripe = this.add.rectangle(centerX - 200, centerY, 80, 10, 0x000000);
    this.tutorialCardStripe.setAlpha(0.6);

    this.tutorialHand = this.add.graphics();
    this.tutorialHand.setAlpha(0.7);
    
    const handX = centerX - 200;
    const handY = centerY;
    
    this.tutorialHand.fillStyle(0xffffff, 1);
    this.tutorialHand.fillCircle(handX, handY, 8);
    this.tutorialHand.fillStyle(0xffffff, 1);
    this.tutorialHand.fillCircle(handX - 6, handY + 10, 5);
    this.tutorialHand.fillCircle(handX + 6, handY + 10, 5);
    this.tutorialHand.fillCircle(handX - 12, handY + 8, 4);
    this.tutorialHand.fillCircle(handX + 12, handY + 8, 4);
    this.tutorialHand.lineStyle(3, 0xffffff, 1);
    this.tutorialHand.strokeCircle(handX, handY, 12);

    this.minigameContainer.add([this.tutorialCard, this.tutorialCardStripe, this.tutorialHand]);

    this.tweens.add({
      targets: [this.tutorialCard, this.tutorialCardStripe, this.tutorialHand],
      x: '+=400',
      duration: 2000,
      ease: 'Sine.inOut',
      yoyo: false,
      repeat: -1,
      repeatDelay: 500
    });
  }

  private removeTutorial(): void {
    if (this.tutorialActive) {
      this.tutorialActive = false;
      
      if (this.tutorialCard) {
        this.tutorialCard.destroy();
        this.tutorialCard = undefined;
      }
      if (this.tutorialCardStripe) {
        this.tutorialCardStripe.destroy();
        this.tutorialCardStripe = undefined;
      }
      if (this.tutorialHand) {
        this.tutorialHand.destroy();
        this.tutorialHand = undefined;
      }
    }
  }

  private showTutorialAgain(centerX: number, centerY: number): void {
    this.tutorialActive = true;
    this.createTutorialAnimation(centerX, centerY);
  }
}
